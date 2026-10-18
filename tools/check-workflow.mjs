// SPDX-License-Identifier: GPL-2.0-or-later
// Offline check of a workflow script and its run modes, with stub agents.
// Usage: node tools/check-workflow.mjs <workflow.js> '<args as JSON>'
// Spec: docs/reference/workflow-run-modes.md
import { readFileSync } from 'node:fs'
import { isDeepStrictEqual } from 'node:util'

const [file, rawArgs] = process.argv.slice(2)
if (!file) { console.error("usage: node tools/check-workflow.mjs <workflow.js> '<args JSON>'"); process.exit(2) }
const userArgs = rawArgs ? JSON.parse(rawArgs) : undefined
const src = readFileSync(file, 'utf8').replace(/^export const meta/m, 'const meta')
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor
const fn = new AsyncFunction('args', 'agent', 'phase', 'log', 'pipeline', 'parallel', 'budget', src)

const EMPTY = /block|problem|issue|finding|error|fail|missing|gap|risk|regress|unverified|open|todo/i
const fake = (s, k = '') => {
  if (!s) return `text for ${k}`
  if (s.enum) return s.enum[0]
  switch (s.type) {
    case 'object': return Object.fromEntries(Object.entries(s.properties || {}).map(([p, v]) => [p, fake(v, p)]))
    case 'array': return EMPTY.test(k) ? [] : [fake(s.items, k)]
    case 'boolean': return !/block|fail|regress/i.test(k)
    case 'number': case 'integer': return 1
    default: return `${k || 'value'}`
  }
}
const pipeline = (items, ...stages) => Promise.all(items.map(async (it, i) => {
  let r = it
  try { for (const st of stages) r = await st(r, it, i) } catch { return null }
  return r
}))
const parallel = (thunks) => Promise.all(thunks.map((t) => Promise.resolve().then(t).catch(() => null)))
const budget = { total: null, spent: () => 0, remaining: () => Infinity }

async function run(runOpts) {
  const calls = []
  const agent = async (prompt, opts = {}) => {
    calls.push({ label: opts.label, phase: opts.phase })
    if (typeof prompt !== 'string' || /\[object Object\]/.test(prompt)) throw new Error(`bad prompt for ${opts.label}: ${String(prompt).slice(0, 200)}`)
    return fake(opts.schema, opts.label)
  }
  let a = userArgs
  if (runOpts) a = Object.assign({}, userArgs || {}, { run: runOpts })
  const out = await fn(a, agent, () => {}, () => {}, pipeline, parallel, budget)
  return { out, calls }
}

const fail = (m) => { console.error(`FAIL ${file}: ${m}`); process.exitCode = 1 }
const base = await run(undefined)
const labels = base.calls.map((c) => c.label)
if (!base.calls.length) console.log(`note ${file}: no agent calls with these args; result: ${JSON.stringify(base.out).slice(0, 200)}`)
if (labels.some((l) => !l)) fail('an agent() call has no label; give every call a unique label')
if (new Set(labels).size !== labels.length) fail(`duplicate labels: ${labels.filter((l, i) => labels.indexOf(l) !== i).join(', ')}`)

const env = await run({})
if (env.out.status !== 'done' || !isDeepStrictEqual(env.out.result, base.out)) fail('run: {} must return { status: "done", result } with the same result as a plain run')
if (env.calls.length !== base.calls.length) fail('run: {} changed which agents ran')

let results = {}
let steps = 0
let inl
for (;;) {
  inl = (await run({ mode: 'inline', results })).out
  if (inl.status !== 'next') break
  if (!inl.next.length || ++steps > 500) { fail('inline mode made no progress'); break }
  for (const n of inl.next) {
    if (typeof n.prompt !== 'string') fail(`inline brief ${n.key} has no prompt`)
    results[n.key] = fake(n.schema, n.key)
  }
  results = Object.assign({}, inl.results, results)
}
if (inl && inl.status === 'done') {
  if (!isDeepStrictEqual(inl.result, base.out)) fail('inline mode result differs from agents mode')
  if (!isDeepStrictEqual(Object.keys(inl.results).sort(), labels.filter(Boolean).sort())) fail(`inline keys ${Object.keys(inl.results)} differ from agent labels ${labels}`)
}

const resumed = await run({ results: env.out.results })
if (resumed.calls.length) fail(`resume with every result supplied still ran ${resumed.calls.length} agent(s)`)
if (!isDeepStrictEqual(resumed.out.result, base.out)) fail('resume with every result supplied changed the result')

const metaPhases = (src.match(/phases:\s*\[([\s\S]*?)\n\s*\],/) || [])[1] || ''
const titles = [...metaPhases.matchAll(/title:\s*'([^']+)'/g)].map((m) => m[1])
const first = titles[0]
if (first) {
  const only = await run({ only: [first] })
  const other = only.calls.filter((c) => c.phase && c.phase !== first)
  if (other.length) fail(`only: ["${first}"] still ran ${other.map((c) => c.label).join(', ')}`)
}
const bad = await run({ from: 'No such phase' })
if (titles.length && typeof bad.out !== 'string') fail('run.from with an unknown phase must return an error string')

if (!process.exitCode) console.log(`ok ${file}: ${base.calls.length} agent(s) in agents mode; inline finished in ${steps} step(s)`)
