// SPDX-License-Identifier: GPL-2.0-or-later
// Offline check of a workflow script and its run modes, with stub agents.
// Usage: node tools/check-workflow.mjs <workflow.js> '<args as JSON>' ['<stub answers by field name, JSON>']
// The optional third argument fixes the stub value of named fields, e.g.
// '{"ci":"green","state":"passed"}', to steer a workflow down its full path.
// Spec: docs/reference/workflow-run-modes.md
import { readFileSync } from 'node:fs'
import { isDeepStrictEqual } from 'node:util'

const [file, rawArgs, rawFields] = process.argv.slice(2)
if (!file) { console.error("usage: node tools/check-workflow.mjs <workflow.js> '<args JSON>'"); process.exit(2) }
const userArgs = rawArgs ? JSON.parse(rawArgs) : undefined
const fields = rawFields ? JSON.parse(rawFields) : {}
const src = readFileSync(file, 'utf8').replace(/^export const meta/m, 'const meta')
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor
const fn = new AsyncFunction('args', 'agent', 'phase', 'log', 'pipeline', 'parallel', 'budget', src)

// Stub answers. Problem-like lists come back empty, so loops end at once;
// in the "block" pass, a first round (label ending in 1, or a bare review
// or check) reports one problem, so fix loops and their labels run too.
const EMPTY = /block|problem|issue|finding|error|fail|missing|gap|risk|regress|unverified|open|todo/i
let variant = 'clean'
const firstRound = (label) => /(^|[^0-9])1$/.test(label) || /^(review|check)$/.test(label)
const fake = (s, k = '', label = k) => {
  if (Object.prototype.hasOwnProperty.call(fields, k)) return fields[k]
  if (!s) return `text for ${k}`
  if (s.enum) return s.enum[0]
  switch (s.type) {
    case 'object': return Object.fromEntries(Object.entries(s.properties || {}).map(([p, v]) => [p, fake(v, p, label)]))
    case 'array': return EMPTY.test(k) && !(variant === 'block' && firstRound(label)) ? [] : [fake(s.items, k, label)]
    case 'boolean': return variant === 'block' && firstRound(label) ? /block|fail|regress/i.test(k) : !/block|fail|regress/i.test(k)
    case 'number': case 'integer': return 1
    default: return EMPTY.test(k) ? '' : `${k || 'value'}`
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

const fail = (m) => { console.error(`FAIL ${file} [${variant} answers]: ${m}`); process.exitCode = 1 }

async function checkAll() {
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
  let probed = false
  for (;;) {
    inl = (await run({ mode: 'inline', results })).out
    if (inl.status !== 'next') break
    if (!inl.next.length || ++steps > 500) { fail('inline mode made no progress'); break }
    const answers = {}
    for (const n of inl.next) {
      if (typeof n.prompt !== 'string') fail(`inline brief ${n.key} has no prompt`)
      answers[n.key] = fake(n.schema, n.key)
    }
    const probe = !probed && inl.next.find((n) => n.schema && n.schema.type === 'object' && (n.schema.required || []).length)
    if (probe) {
      // An answer without its required fields must come back as the same brief, with a note.
      probed = true
      const again = (await run({ mode: 'inline', results: Object.assign({}, inl.results, answers, { [probe.key]: {} }) })).out
      const back = again.status === 'next' && again.next.find((n) => n.key === probe.key)
      if (!back || !/missing/.test(back.note || '')) fail(`an answer to ${probe.key} without its required fields was accepted`)
    }
    results = Object.assign({}, inl.results, answers)
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
  if (titles[0]) {
    const only = await run({ only: [titles[0]] })
    const other = only.calls.filter((c) => c.phase && c.phase !== titles[0])
    if (other.length) fail(`only: ["${titles[0]}"] still ran ${other.map((c) => c.label).join(', ')}`)
  }
  const bad = await run({ from: 'No such phase' })
  if (titles.length && typeof bad.out !== 'string') fail('run.from with an unknown phase must return an error string')
  return `${base.calls.length} agent(s), inline in ${steps} step(s); labels: ${labels.join(', ')}`
}

const report = []
for (variant of ['clean', 'block']) report.push(`${variant} answers: ${await checkAll()}`)
if (!process.exitCode) console.log(`ok ${file}\n  ${report.join('\n  ')}`)
