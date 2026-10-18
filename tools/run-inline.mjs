// SPDX-License-Identifier: GPL-2.0-or-later
// Drive a workflow's inline run mode from a state file, so each step sends
// only its new answers instead of the whole results blob.
// Usage:
//   node tools/run-inline.mjs <workflow.js> <state.json> [--args '<JSON>' | --args-file <file>]
//     [--answer <key>=<file|->]... [--reviewer <key>=<name>]... [--redo <key>]... [--fresh]
//   node tools/run-inline.mjs <workflow.js> <state.json> --review-prompt <key>
// The first call needs the args; they are stored in the state file and reused.
// Each independent brief is also written as a ready reviewer prompt to
// <state.json>.review/<key>.md; --review-prompt prints one to stdout. The
// reviewer writes its answer to <key>.answer.json (or .txt) next to it, and
// the next call collects that file by itself. Every answer is checked
// against its step's schema; one that does not fit, or names no step the
// run reaches, exits 2 and leaves the state file as it was. A run that
// stops short prints the --redo command that resumes it.
// Spec: docs/reference/workflow-run-modes.md, "State file runner".
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const argv = process.argv.slice(2)
const [file, statePath] = argv
if (!file || !statePath || file.startsWith('--') || statePath.startsWith('--')) {
  console.error("usage: node tools/run-inline.mjs <workflow.js> <state.json> [--args '<JSON>' | --args-file <file>] [--answer <key>=<file|->]... [--reviewer <key>=<name>]... [--redo <key>]... [--fresh] | --review-prompt <key>")
  process.exit(2)
}
const state = existsSync(statePath)
  ? JSON.parse(readFileSync(statePath, 'utf8'))
  : { workflow: file, args: undefined, results: {}, reviewers: {} }
const pair = (s, flag) => {
  const i = s.indexOf('=')
  if (i < 1) { console.error(`${flag} needs <key>=<value>, got "${s}"`); process.exit(2) }
  return [s.slice(0, i), s.slice(i + 1)]
}
// A self-contained prompt for a fresh reviewer agent, one per independent
// brief, kept next to the state file so the caller can hand it over as is.
const reviewDir = resolve(`${statePath}.review`)
const slug = (k) => k.replace(/[^A-Za-z0-9._-]/g, '_')
const review = (n) => {
  const base = join(reviewDir, slug(n.key))
  return { prompt: `${base}.md`, answer: `${base}.answer.${n.schema ? 'json' : 'txt'}` }
}
// Every printed command is one shell line: each argument that is not plain
// is single-quoted, so a path or reviewer name with spaces or quotes stays
// one argument when the line is run as is (pasted, or sh -c "$line").
const shq = (s) => /^[A-Za-z0-9_@%+=:,./-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`
const self = `node ${shq(process.argv[1])} ${shq(file)} ${shq(statePath)}`
const recordCmd = (n) => `${self} --reviewer ${shq(`${n.key}=<reviewer name>`)}`
// A handback is often the reviewer's whole reply: prose around a fenced JSON
// block. For a brief with a schema, take the JSON out of it so nobody has to
// copy it out by hand; a text brief keeps its reply verbatim. With no waiting
// brief to go by, parse the whole text as JSON or keep it as text.
const parseAnswer = (text, n) => {
  const t = text.trim()
  if (n && !n.schema) return t
  try { return JSON.parse(t) } catch {}
  if (!n) return t
  const fences = [...t.matchAll(/```(?:json)?\s*\n([\s\S]*?)\n```/g)].map((m) => m[1])
  for (const f of fences.reverse()) { try { return JSON.parse(f) } catch {} }
  const a = t.indexOf('{'), b = t.lastIndexOf('}')
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)) } catch {} }
  return t
}
// The run-modes block's rule (an object answer carries every required
// field), plus the declared type and enum of each field given, checked
// here so a wrong-shaped answer fails loudly, not as a silent re-ask.
const typeOf = (x) => (x === null ? 'null' : Array.isArray(x) ? 'array' : typeof x)
const fits = (x, t) => (t === 'integer' ? Number.isInteger(x) : t === typeOf(x))
const answerGap = (v, schema) => {
  if (!schema || schema.type !== 'object') return null
  if (!v || typeof v !== 'object' || Array.isArray(v)) return 'not a JSON object'
  const gaps = []
  const miss = (schema.required || []).filter((k) => !(k in v) || v[k] === undefined)
  if (miss.length) gaps.push(`missing ${miss.join(', ')}`)
  for (const [k, p] of Object.entries(schema.properties || {})) {
    if (!(k in v) || !p) continue
    const types = [].concat(p.type || [])
    if (types.length && !types.some((t) => fits(v[k], t))) { gaps.push(`${k} must be ${types.join(' or ')}, got ${typeOf(v[k])}`); continue }
    if (Array.isArray(p.enum) && !p.enum.includes(v[k])) gaps.push(`${k} must be one of ${p.enum.map((e) => JSON.stringify(e)).join(', ')}, got ${JSON.stringify(v[k])}`)
    const it = p.items && p.items.type
    if (it && Array.isArray(v[k])) {
      const bad = v[k].findIndex((e) => !fits(e, it))
      if (bad >= 0) gaps.push(`${k}[${bad}] must be ${it}, got ${typeOf(v[k][bad])}`)
    }
  }
  return gaps.length ? gaps.join('; ') : null
}
// The brief an answer is for: the one waiting, else the last brief asked
// under that key (kept in state.schemas, so a --redo answer is checked too).
const schemas = state.schemas && typeof state.schemas === 'object' ? state.schemas : {}
const waiting = (k) => (state.next || []).find((b) => b.key === k) || (k in schemas ? { key: k, schema: schemas[k] } : undefined)
const reviewText = (n) => [
  `# Independent review: ${n.key} (phase ${n.phase})`,
  '',
  'You are a reviewer with no part in the work below: you did not write, plan or change it. Only read and report. Change no files: do not edit, commit, push, comment on or merge anything, even where the brief would let you fix something; list it instead.',
  '',
  '## Brief',
  '',
  n.prompt,
  '',
  '## Answer',
  '',
  n.schema
    ? `Your answer is one JSON object. It must match this schema and carry every required field (${(n.schema.required || []).join(', ') || 'none'}):\n\n\`\`\`json\n${JSON.stringify(n.schema, null, 2)}\n\`\`\``
    : 'Your answer is a short plain-text answer.',
  '',
  `Write your answer, and nothing else, to this file: ${review(n).answer}. It is the one file you may create; it is outside the work under review. Then end your reply with the same answer${n.schema ? ' in a ```json block' : ''}.`,
  '',
  '## For the caller, not the reviewer',
  '',
  `The reviewer writes its answer to ${review(n).answer}; the next run collects it from there. Never write that file yourself. If the reviewer could not write files, pass its reply as handed back instead: --answer ${shq(`${n.key}=-`)} with the reply on stdin (the JSON is taken out of any surrounding text). Then record it, naming the reviewer, with:`,
  '',
  `    ${recordCmd(n)}`,
  '',
  'Reviewer: do not run this yourself.',
  '',
].join('\n')
let reviewKey = null
let fresh = false
let stdinUsed = false
const given = new Set()
for (let i = 2; i < argv.length; i++) {
  const flag = argv[i]
  // A re-run after a check-in (CI pending, main moved, waiting on a
  // reviewer) starts from the current state, so drop every stored answer.
  if (flag === '--fresh') { state.results = {}; state.reviewers = {}; fresh = true; continue }
  const val = argv[++i]
  if (val === undefined) { console.error(`${flag} needs a value`); process.exit(2) }
  if (flag === '--args') state.args = JSON.parse(val)
  else if (flag === '--args-file') state.args = JSON.parse(readFileSync(val, 'utf8'))
  else if (flag === '--answer') {
    const [k, f] = pair(val, flag)
    if (f === '-') {
      if (stdinUsed) { console.error(`stdin is read once: only one --answer <key>=- per call (got a second for "${k}")`); process.exit(2) }
      stdinUsed = true
    }
    const n = waiting(k)
    const v = parseAnswer(readFileSync(f === '-' ? 0 : f, 'utf8'), n)
    const gap = n && answerGap(v, n.schema)
    if (gap) { console.error(`answer for "${k}" does not fit its schema (${gap}); nothing recorded`); process.exit(2) }
    state.results[k] = v
    given.add(k)
  } else if (flag === '--reviewer') {
    const [k, name] = pair(val, flag)
    state.reviewers[k] = name
  } else if (flag === '--review-prompt') {
    reviewKey = val
  } else if (flag === '--redo') {
    delete state.results[val]
    delete state.reviewers[val]
  } else { console.error(`unknown flag ${flag}`); process.exit(2) }
}

if (reviewKey !== null) {
  // Print one stored independent brief as a reviewer prompt; runs nothing
  // and leaves the state file as it is.
  if (argv.length !== 4) { console.error('--review-prompt takes no other flags'); process.exit(2) }
  const n = (state.next || []).find((b) => b.key === reviewKey)
  if (!n || !n.independent) {
    const keys = (state.next || []).filter((b) => b.independent).map((b) => b.key)
    console.error(`no independent brief "${reviewKey}" waiting in ${statePath}; waiting: ${keys.join(', ') || 'none'}`)
    process.exit(2)
  }
  process.stdout.write(reviewText(n))
  process.exit(0)
}

const src = readFileSync(file, 'utf8').replace(/^export const meta/m, 'const meta')
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor
const fn = new AsyncFunction('args', 'agent', 'phase', 'log', 'pipeline', 'parallel', 'budget', src)
const pipeline = (items, ...stages) => Promise.all(items.map(async (it, i) => {
  let r = it
  try { for (const st of stages) r = await st(r, it, i) } catch { return null }
  return r
}))
const parallel = (thunks) => Promise.all(thunks.map((t) => Promise.resolve().then(t).catch(() => null)))
const budget = { total: null, spent: () => 0, remaining: () => Infinity }
// Inline mode never spawns; an agent call reaching here is a workflow bug.
const agent = () => { throw new Error('inline run tried to spawn an agent') }

// Collect the answer files reviewers wrote for the independent briefs still
// waiting, unless the caller passed that answer on this call. A collected
// file is renamed to .used, so a later round of the same key starts clean.
const collected = []
for (const n of fresh ? [] : (state.next || []).filter((b) => b.independent && !given.has(b.key) && !(b.key in state.results))) {
  const f = review(n).answer
  if (!existsSync(f)) continue
  const v = parseAnswer(readFileSync(f, 'utf8'), n)
  const gap = answerGap(v, n.schema)
  if (gap) { console.error(`${f}: answer for "${n.key}" does not fit its schema (${gap}); nothing recorded. Have the reviewer rewrite it, or pass --answer ${shq(`${n.key}=<file>`)}.`); process.exit(2) }
  state.results[n.key] = v
  collected.push([n.key, f])
}
for (const [k] of collected) {
  if (!state.reviewers[k]) { console.error(`collected the answer for "${k}" but no reviewer is named: add --reviewer ${shq(`${k}=<who>`)} (nothing recorded)`); process.exit(2) }
}
for (const [k, f] of collected) { renameSync(f, `${f}.used`); console.log(`collected ${k} from ${f}`) }

const wfArgs = state.args && typeof state.args === 'object' && !Array.isArray(state.args) ? state.args : {}
const run = Object.assign({}, wfArgs.run || {}, { mode: 'inline', results: state.results, reviewers: state.reviewers })
const out = await fn(Object.assign({}, wfArgs, { run }), agent, () => {}, () => {}, pipeline, parallel, budget)

if (!out || typeof out !== 'object' || !out.status) {
  // The workflow returned before the run-modes block could wrap it (usage or arg error).
  console.log(typeof out === 'string' ? out : JSON.stringify(out, null, 2))
  process.exit(1)
}
// Every --answer must be used by this call. One the run asked for again
// did not fit its schema; one the run never reached names no waiting step.
// Either way stop before writing, so the state file stays as it was.
const rejected = [...given].map((k) => {
  const again = out.status === 'next' && out.next.find((n) => n.key === k)
  if (again) return `answer for "${k}" does not fit its schema (${again.note || 'rejected'})`
  if (!out.results || !(k in out.results)) return `no step "${k}" is waiting or reached on this call; waiting: ${(state.next || []).map((n) => n.key).join(', ') || 'none'}`
  return null
}).filter(Boolean)
if (rejected.length) { console.error(`${rejected.join('\n')}\nnothing recorded; the state file is unchanged`); process.exit(2) }

state.results = out.results || state.results
state.reviewers = Object.assign({}, state.reviewers, out.reviewers || {})
state.status = out.status
state.next = out.status === 'next' ? out.next : []
for (const n of state.next) schemas[n.key] = n.schema
state.schemas = schemas
writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n')

if (out.status === 'done') {
  console.log(`status: done (state in ${statePath})`)
  if ((out.self_reviewed || []).length) console.log(`self-reviewed, report as such: ${out.self_reviewed.join(', ')}`)
  console.log(JSON.stringify(out.result, null, 2))
  const again = typeof out.result === 'string' ? /^(waiting|not merged)\b/.test(out.result) : !!(out.result && /\b(run (it |this |the workflow )?again|re-?run)\b/i.test(String(out.result.next || '')))
  if (again) console.log(`\nThis result asks for a later run. After your check-in, start it over from the current state with:\n  ${self} --fresh`)
  // A run that stopped short (blocked, changes requested, failed) resumes
  // at the last answered step, once the cause is fixed.
  const r = out.result
  const stopped = !again && (typeof r === 'string' ? /^(blocked|changes requested|failed)\b/i.test(r) : !!(r && typeof r === 'object' && (r.blocked === true || /^blocked\b/i.test(String(r.status || '')))))
  if (stopped) {
    const last = Object.keys(out.results || {}).pop()
    console.log('\nThis run stopped before the end. Fix the cause it names, then resume:')
    if (last) console.log(`  ${self} --redo ${shq(last)}\n(asks "${last}", the last answered step, again and replays every answer before it; add --redo for any earlier step that must also be redone)`)
    console.log(`  ${self} --fresh\n(starts over from the first step with the same args)`)
  }
} else {
  console.log(`status: next, ${out.next.length} brief(s). Do each, write its answer to a file, then run:`)
  console.log(`  ${self} ${out.next.filter((n) => !n.independent).map((n) => `--answer ${shq(`${n.key}=<file>`)}`).join(' ')}`)
  console.log('Add --reviewer \'<key>=<who>\' for each independent brief another reviewer answered.')
  const independent = out.next.filter((n) => n.independent)
  if (independent.length) {
    mkdirSync(reviewDir, { recursive: true })
    for (const n of independent) {
      // An answer file still here was written for an earlier brief (before
      // --fresh, or never collected): move it aside so it is not taken for this one.
      if (existsSync(review(n).answer)) renameSync(review(n).answer, `${review(n).answer}.stale`)
      writeFileSync(review(n).prompt, reviewText(n))
      console.log(`${n.key}: send ${review(n).prompt} to a fresh reviewer agent (e.g. the Agent tool with that file's content as the prompt, or --review-prompt ${shq(n.key)}); it writes its ${n.schema ? 'JSON ' : ''}answer to ${review(n).answer}, which the next run collects. Then run: ${recordCmd(n)}`)
    }
  }
  for (const n of out.next) {
    const req = n.schema && n.schema.required ? n.schema.required.join(', ') : ''
    console.log(`\n=== ${n.key} (phase ${n.phase})${n.independent ? ' INDEPENDENT: send to a reviewer with no part in the work' : ''}`)
    if (n.note) console.log(`note: ${n.note}`)
    console.log(n.schema ? `answer: JSON matching the schema in ${statePath} next[].schema; required: ${req || 'none'}` : 'answer: short text')
    console.log(n.prompt)
  }
}
