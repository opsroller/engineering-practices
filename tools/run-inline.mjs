// SPDX-License-Identifier: GPL-2.0-or-later
// Drive a workflow's inline run mode from a state file, so each step sends
// only its new answers instead of the whole results blob.
// Usage:
//   node tools/run-inline.mjs <workflow.js> <state.json> [--args '<JSON>' | --args-file <file>]
//     [--answer <key>=<file>]... [--reviewer <key>=<name>]... [--redo <key>]...
// The first call needs the args; they are stored in the state file and reused.
// Spec: docs/reference/workflow-run-modes.md, "State file runner".
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const argv = process.argv.slice(2)
const [file, statePath] = argv
if (!file || !statePath || file.startsWith('--') || statePath.startsWith('--')) {
  console.error("usage: node tools/run-inline.mjs <workflow.js> <state.json> [--args '<JSON>' | --args-file <file>] [--answer <key>=<file>]... [--reviewer <key>=<name>]... [--redo <key>]...")
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
for (let i = 2; i < argv.length; i++) {
  const flag = argv[i]
  const val = argv[++i]
  if (val === undefined) { console.error(`${flag} needs a value`); process.exit(2) }
  if (flag === '--args') state.args = JSON.parse(val)
  else if (flag === '--args-file') state.args = JSON.parse(readFileSync(val, 'utf8'))
  else if (flag === '--answer') {
    const [k, f] = pair(val, flag)
    const text = readFileSync(f, 'utf8')
    let v
    try { v = JSON.parse(text) } catch { v = text.trim() }
    state.results[k] = v
  } else if (flag === '--reviewer') {
    const [k, name] = pair(val, flag)
    state.reviewers[k] = name
  } else if (flag === '--redo') {
    delete state.results[val]
    delete state.reviewers[val]
  } else { console.error(`unknown flag ${flag}`); process.exit(2) }
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

const given = state.args && typeof state.args === 'object' && !Array.isArray(state.args) ? state.args : {}
const run = Object.assign({}, given.run || {}, { mode: 'inline', results: state.results, reviewers: state.reviewers })
const out = await fn(Object.assign({}, given, { run }), agent, () => {}, () => {}, pipeline, parallel, budget)

if (!out || typeof out !== 'object' || !out.status) {
  // The workflow returned before the run-modes block could wrap it (usage or arg error).
  console.log(typeof out === 'string' ? out : JSON.stringify(out, null, 2))
  process.exit(1)
}
state.results = out.results || state.results
state.reviewers = Object.assign({}, state.reviewers, out.reviewers || {})
state.status = out.status
state.next = out.status === 'next' ? out.next : []
writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n')

if (out.status === 'done') {
  console.log(`status: done (state in ${statePath})`)
  if ((out.self_reviewed || []).length) console.log(`self-reviewed, report as such: ${out.self_reviewed.join(', ')}`)
  console.log(JSON.stringify(out.result, null, 2))
} else {
  console.log(`status: next, ${out.next.length} brief(s). Do each, write its answer to a file, then run:`)
  console.log(`  node ${process.argv[1]} ${file} ${statePath} ${out.next.map((n) => `--answer '${n.key}=<file>'`).join(' ')}`)
  console.log('Add --reviewer \'<key>=<who>\' for each independent brief another reviewer answered.')
  for (const n of out.next) {
    const req = n.schema && n.schema.required ? n.schema.required.join(', ') : ''
    console.log(`\n=== ${n.key} (phase ${n.phase})${n.independent ? ' INDEPENDENT: send to a reviewer with no part in the work' : ''}`)
    if (n.note) console.log(`note: ${n.note}`)
    console.log(n.schema ? `answer: JSON matching the schema in ${statePath} next[].schema; required: ${req || 'none'}` : 'answer: short text')
    console.log(n.prompt)
  }
}
