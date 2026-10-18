// SPDX-License-Identifier: GPL-2.0-or-later
// Self-test for tools/run-inline.mjs: drives a two-step fixture workflow
// (a plan, then an independent review) through the state file runner and
// checks how reviewer answers are handed back and collected.
// Usage: node tools/test-run-inline.mjs
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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
const r = await agent('Read the plan and report problems. Do not edit anything.', { schema: { type: 'object', properties: { ok: { type: 'boolean' }, problems: { type: 'array' } }, required: ['ok', 'problems'] }, phase: 'Review', label: 'review', independent: true })
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

rmSync(dir, { recursive: true, force: true })
if (failures.length) { console.error(`\n${failures.length} failed:\n- ${failures.join('\n- ')}`); process.exit(1) }
console.log('\nall checks passed')
