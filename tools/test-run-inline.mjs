// SPDX-License-Identifier: GPL-2.0-or-later
// Self-test for tools/run-inline.mjs: drives a two-step fixture workflow
// (a plan, then an independent review) through the state file runner and
// checks how reviewer answers are handed back and collected, how answers
// are checked against their schema, and the resume path of a stopped run.
// Usage: node tools/test-run-inline.mjs
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const dir = mkdtempSync(join(tmpdir(), 'run-inline-test-'))
const wf = join(dir, 'fixture.js')
writeFileSync(wf, `export const meta = {
  name: 'fixture',
  description: 'test fixture',
  phases: [{ title: 'Plan' }, { title: 'Review' }],
}
phase('Plan')
const p = await agent('Plan the change.', { schema: { type: 'object', properties: { steps: { type: 'array' } }, required: ['steps'] }, phase: 'Plan', label: 'plan' })
phase('Review')
const r = await agent('Read the plan and report problems. Do not edit anything.', { schema: { type: 'object', properties: { ok: { type: 'boolean' }, problems: { type: 'array', items: { type: 'string' } }, level: { type: 'string', enum: ['low', 'high'] } }, required: ['ok', 'problems'] }, phase: 'Review', label: 'review', independent: true })
if (!r.ok) return \`blocked: the review found problems: \${r.problems.join(', ')}\`
return { planned: p.steps.length, ok: r.ok }
`)
const apply = spawnSync('node', [join(here, 'apply-run-modes.mjs'), wf], { encoding: 'utf8' })
if (apply.status !== 0) { console.error(apply.stderr); process.exit(1) }

const runner = join(here, 'run-inline.mjs')
const run = (state, flags, input) => spawnSync('node', [runner, wf, state, ...flags], { encoding: 'utf8', input })
const read = (f) => JSON.parse(readFileSync(f, 'utf8'))
const failures = []
const check = (name, cond, detail) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}`); if (!cond) failures.push(`${name}${detail ? `: ${detail}` : ''}`) }
const planFile = join(dir, 'plan.json')
writeFileSync(planFile, JSON.stringify({ steps: ['a', 'b'] }))
const handback = 'I read the plan.\n\n```json\n{"ok": true, "problems": []}\n```\n'

// Reach the review brief and return the state path.
const toReview = (name) => {
  const state = join(dir, `${name}.json`)
  run(state, ['--args', '{}'])
  const r = run(state, ['--answer', `plan=${planFile}`])
  return { state, r, answer: `${state}.review/review.answer.json`, prompt: `${state}.review/review.md` }
}

{
  const { state, r, answer, prompt } = toReview('collect')
  check('review brief waits after the plan', read(state).next.some((b) => b.key === 'review' && b.independent), r.stdout)
  const text = existsSync(prompt) ? readFileSync(prompt, 'utf8') : ''
  check('reviewer prompt tells the reviewer to write its answer file', text.includes(`to this file: ${answer}`))
  check('caller section says the next run collects the file', text.includes('the next run collects it from there'))
  writeFileSync(answer, handback)
  const noName = run(state, [])
  check('a collected answer with no reviewer named stops with exit 2', noName.status === 2 && /no reviewer is named/.test(noName.stderr), noName.stderr)
  check('nothing is recorded when the reviewer is missing', !('review' in read(state).results) && existsSync(answer))
  const done = run(state, ['--reviewer', 'review=fresh reviewer agent'])
  const s = read(state)
  check('the reviewer\'s answer file is collected and the run finishes', done.status === 0 && s.status === 'done' && s.results.review && s.results.review.ok === true, done.stdout + done.stderr)
  check('JSON is taken out of a fenced block in the handback', s.results.review && Array.isArray(s.results.review.problems))
  check('the collected answer is not self-reviewed', !/self-reviewed/.test(done.stdout))
  check('the collected file is renamed to .used', !existsSync(answer) && existsSync(`${answer}.used`))
}

{
  const { state, answer } = toReview('gap')
  writeFileSync(answer, '{"ok": true}')
  const r = run(state, ['--reviewer', 'review=fresh reviewer agent'])
  check('an answer file missing a required field stops with exit 2', r.status === 2 && /missing problems/.test(r.stderr), r.stderr)
  check('nothing is recorded for a bad answer file', !('review' in read(state).results))
}

{
  const { state } = toReview('stdin')
  const r = run(state, ['--answer', 'review=-', '--reviewer', 'review=fresh reviewer agent'], handback)
  const s = read(state)
  check('--answer <key>=- reads a handback from stdin', r.status === 0 && s.status === 'done' && s.results.review && s.results.review.ok === true, r.stdout + r.stderr)
  const bad = run(join(dir, 'stdin-bad.json'), ['--args', '{}'])
  const bad2 = run(join(dir, 'stdin-bad.json'), ['--answer', 'plan=-'], 'no json here')
  check('a plain-text answer to a schema brief stops with exit 2', bad.status === 0 && bad2.status === 2 && /not a JSON object/.test(bad2.stderr), bad2.stderr)
}

{
  const { state, answer } = toReview('fresh')
  writeFileSync(answer, handback)
  const r = run(state, ['--fresh'])
  check('--fresh does not collect an answer left from before', r.status === 0 && !('review' in read(state).results), r.stdout + r.stderr)
  run(state, ['--answer', `plan=${planFile}`])
  check('a leftover answer file is moved aside when the brief is asked again', !existsSync(answer) && existsSync(`${answer}.stale`))
}

{
  const state = join(dir, 'twostdin.json')
  run(state, ['--args', '{}'])
  const r = run(state, ['--answer', 'plan=-', '--answer', 'review=-'], '{"steps": []}')
  check('a second --answer <key>=- on one call stops with exit 2', r.status === 2 && /stdin is read once/.test(r.stderr), r.stderr)
  check('nothing is recorded when stdin is named twice', !('plan' in read(state).results))
}

{
  // A run that ends blocked prints the command that resumes it.
  const { state } = toReview('blocked')
  const no = join(dir, 'review-no.json')
  writeFileSync(no, '{"ok": false, "problems": ["step b is missing"]}')
  const r = run(state, ['--answer', `review=${no}`, '--reviewer', 'review=fresh reviewer agent'])
  check('a blocked result prints a --redo command for the step that stopped it', r.status === 0 && r.stdout.includes(`${state} --redo review`), r.stdout + r.stderr)
  check('a blocked result also prints the --fresh command', r.stdout.includes(`${state} --fresh`))
  const again = run(state, ['--redo', 'review'])
  const s = read(state)
  check('--redo on the printed step asks it again and keeps earlier answers', again.status === 0 && s.status === 'next' && s.next.some((b) => b.key === 'review') && s.results.plan, again.stdout + again.stderr)
  const ok = toReview('notblocked')
  writeFileSync(ok.answer, handback)
  const done = run(ok.state, ['--reviewer', 'review=fresh reviewer agent'])
  check('a finished run prints no resume command', !/--redo/.test(done.stdout), done.stdout)
}

{
  // Every --answer is checked against the waiting step's schema, and a
  // rejected one leaves the state file byte for byte as it was.
  const { state } = toReview('shape')
  const before = readFileSync(state, 'utf8')
  const answer = (name, body) => { const f = join(dir, name); writeFileSync(f, body); return f }
  const wrongType = run(state, ['--answer', `review=${answer('wt.json', '{"ok": "yes", "problems": []}')}`, '--reviewer', 'review=r'])
  check('an answer with a field of the wrong type stops with exit 2 naming it', wrongType.status === 2 && /ok must be boolean, got string/.test(wrongType.stderr), wrongType.stderr)
  const wrongEnum = run(state, ['--answer', `review=${answer('we.json', '{"ok": true, "problems": [], "level": "mid"}')}`, '--reviewer', 'review=r'])
  check('an answer outside a field\'s enum stops with exit 2 naming it', wrongEnum.status === 2 && /level must be one of "low", "high"/.test(wrongEnum.stderr), wrongEnum.stderr)
  const wrongItem = run(state, ['--answer', `review=${answer('wi.json', '{"ok": true, "problems": [3]}')}`, '--reviewer', 'review=r'])
  check('an array item of the wrong type stops with exit 2 naming it', wrongItem.status === 2 && /problems\[0\] must be string/.test(wrongItem.stderr), wrongItem.stderr)
  const both = run(state, ['--answer', `review=${answer('wb.json', '{"problems": 1}')}`, '--reviewer', 'review=r'])
  check('every missing and wrong field is named at once', both.status === 2 && /missing ok/.test(both.stderr) && /problems must be array/.test(both.stderr), both.stderr)
  const stray = run(state, ['--answer', `nosuch=${planFile}`])
  check('an answer for a step that is not waiting or reached stops with exit 2', stray.status === 2 && /no step "nosuch"/.test(stray.stderr) && /waiting: review/.test(stray.stderr), stray.stderr)
  check('rejected answers leave the state file unchanged', readFileSync(state, 'utf8') === before)
  const ahead = join(dir, 'ahead.json')
  run(ahead, ['--args', '{}'])
  const aheadBefore = readFileSync(ahead, 'utf8')
  const r = run(ahead, ['--answer', `plan=${planFile}`, '--answer', `review=${answer('wa.json', '{"ok": true}')}`, '--reviewer', 'review=r'])
  check('an answer given ahead for a later step is checked when the run reaches it', r.status === 2 && /"review" does not fit its schema/.test(r.stderr) && /problems/.test(r.stderr), r.stderr)
  check('the state file is unchanged when a later answer is rejected', readFileSync(ahead, 'utf8') === aheadBefore)
  const redo = toReview('redo-shape')
  run(redo.state, ['--answer', `review=${answer('rs.json', '{"ok": true, "problems": []}')}`, '--reviewer', 'review=r'])
  const redoBefore = readFileSync(redo.state, 'utf8')
  const rr = run(redo.state, ['--redo', 'plan', '--answer', `plan=${answer('rp.json', '{"steps": "a"}')}`])
  check('an answer given with --redo is checked against the schema that step was last asked with', rr.status === 2 && /steps must be array, got string/.test(rr.stderr) && readFileSync(redo.state, 'utf8') === redoBefore, rr.stderr)
}

{
  // A text brief keeps its reply verbatim, even one that holds a fenced JSON block.
  const tw = join(dir, 'text-fixture.js')
  writeFileSync(tw, `export const meta = {
  name: 'text-fixture',
  description: 'test fixture',
  phases: [{ title: 'Note' }],
}
phase('Note')
const n = await agent('Write a short note.', { phase: 'Note', label: 'note' })
return { note: n }
`)
  spawnSync('node', [join(here, 'apply-run-modes.mjs'), tw], { encoding: 'utf8' })
  const state = join(dir, 'text.json')
  spawnSync('node', [runner, tw, state, '--args', '{}'], { encoding: 'utf8' })
  const reply = 'Here is an example config:\n\n```json\n{"a": 1}\n```'
  const r = spawnSync('node', [runner, tw, state, '--answer', 'note=-'], { encoding: 'utf8', input: reply })
  const s = read(state)
  check('a text brief stores a reply with a fenced JSON block verbatim', r.status === 0 && s.results.note === reply, JSON.stringify(s.results.note) + r.stderr)
}

{
  // Printed commands stay whole when run as one shell line, even with a
  // space and a quote in the paths and a reviewer name with spaces.
  const odd = join(dir, "dir with 'quote'")
  mkdirSync(odd)
  const state = join(odd, 'state file.json')
  run(state, ['--args', '{}'])
  run(state, ['--answer', `plan=${planFile}`])
  const prompt = readFileSync(`${state}.review/review.md`, 'utf8')
  const line = (prompt.match(/^ {4}(node .*--reviewer .*)$/m) || [])[1] || ''
  writeFileSync(`${state}.review/review.answer.json`, '{"ok": false, "problems": ["x"]}')
  const rec = spawnSync('sh', ['-c', line.replace('<reviewer name>', 'code reviewer thread')], { encoding: 'utf8' })
  check('the printed record command runs as one shell line and keeps a reviewer name with spaces', rec.status === 0 && read(state).reviewers.review === 'code reviewer thread', line + rec.stderr)
  const redo = (rec.stdout.match(/^ {2}(node .* --redo .*)$/m) || [])[1] || ''
  const again = spawnSync('sh', ['-c', redo], { encoding: 'utf8' })
  check('the printed --redo command runs as one shell line with a space and a quote in the paths', again.status === 0 && read(state).next.some((b) => b.key === 'review'), redo + again.stderr)
}

rmSync(dir, { recursive: true, force: true })
if (failures.length) { console.error(`\n${failures.length} failed:\n- ${failures.join('\n- ')}`); process.exit(1) }
console.log('\nall checks passed')
