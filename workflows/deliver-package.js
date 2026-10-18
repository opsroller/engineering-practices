// SPDX-License-Identifier: GPL-2.0-or-later
export const meta = {
  name: 'deliver-package',
  description: 'Take one work package from its plan row to a ready, documented, independently checked pull request, in any role. args: { wp: "WP-NN" (required), plan: "<path to the work-package plan, optional>", branch: "<existing branch to work on, optional>", pr: "<existing PR number or URL, optional>", prior: "<handoff object or full result of a role workflow that already built the work, optional>" }',
  phases: [
    { title: 'Plan', detail: 'onboard, check for overlapping work, read the package and contracts, plan slices, stubs, caveats and affected Diataxis doc kinds' },
    { title: 'Build', detail: 'implement on the package branch with provenance recorded; with prior, only what the prior work left out' },
    { title: 'Document', detail: 'write or update the planned Diataxis pages in the same PR; skipped when prior already wrote them' },
    { title: 'Check', detail: 'independent review of change and docs, fix loop (max 3 rounds)' },
    { title: 'Ship', detail: 'PR ready for the code reviewer, plan row set per the project status convention, dependants listed' },
  ],
}

// --- run-modes v2 begin ---
const RUN = ((a, realAgent, realPhase, realLog) => {
  const opted = !!(a && typeof a === 'object' && a.run && typeof a.run === 'object')
  const c = opted ? a.run : {}
  const mode = c.mode === 'inline' ? 'inline' : 'agents'
  const results = c.results && typeof c.results === 'object' ? c.results : {}
  const reviewers = c.reviewers && typeof c.reviewers === 'object' ? c.reviewers : {}
  const only = Array.isArray(c.only) && c.only.length ? c.only.map(String) : null
  const from = c.from ? String(c.from) : null
  const titles = typeof meta !== 'undefined' && meta && Array.isArray(meta.phases) ? meta.phases.map((p) => p.title) : []
  const unknown = titles.length ? (from ? [from] : []).filter((t) => !titles.includes(t)) : []
  const error = c.mode && !['agents', 'inline'].includes(c.mode)
    ? `run.mode must be "agents" or "inline", got "${c.mode}"`
    : unknown.length ? `run.from names no phase: ${unknown.join(', ')}. Phases: ${titles.join(', ')}` : null
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k)
  // An answer must carry every required key of its schema, as the runtime
  // enforces for agents; returns the missing keys, or null when it fits.
  const missing = (v, schema) => {
    if (v === null || v === undefined) return 'an answer'
    if (!schema || schema.type !== 'object') return null
    if (typeof v !== 'object' || Array.isArray(v)) return 'a JSON object'
    const gap = (schema.required || []).filter((k) => !has(v, k) || v[k] === undefined)
    return gap.length ? gap.join(', ') : null
  }
  const seen = {}
  const out = {}
  // Who answered each step marked independent: "subagent" when this run
  // spawned it, else the reviewer named in run.reviewers, else "self".
  const by = {}
  const who = (k) => (typeof reviewers[k] === 'string' && reviewers[k].trim() ? reviewers[k].trim() : 'self')
  const skipped = []
  const next = []
  const logs = []
  let current = ''
  let reached = !from
  let halting = false
  let release = () => {}
  const halted = new Promise((r) => { release = r })
  const picked = (ph, label) => reached && (!only || only.some((s) => s === ph || s === label || label.startsWith(s + ':')))
  const agent = (prompt, opts) => {
    const op = opts || {}
    const independent = op.independent === true
    const ph = op.phase || current
    const base = op.label || ph || 'agent'
    seen[base] = (seen[base] || 0) + 1
    const key = seen[base] > 1 ? `${base}#${seen[base]}` : base
    let note = null
    if (has(results, key)) {
      const gap = missing(results[key], op.schema)
      if (!gap) { out[key] = results[key]; if (independent) by[key] = who(key); return Promise.resolve(results[key]) }
      note = `answer missing ${gap}; answer this brief again`
    }
    if (!picked(ph, base)) { skipped.push(key); return Promise.resolve(null) }
    if (mode === 'agents') {
      const pass = Object.assign({}, op)
      delete pass.independent
      return realAgent(prompt, opts ? pass : opts).then((r) => {
        if (r !== null && r !== undefined) { out[key] = r; if (independent) by[key] = 'subagent' }
        return r
      })
    }
    const brief = { key, phase: ph, prompt, schema: op.schema || null }
    if (independent) brief.independent = true
    if (note) brief.note = note
    next.push(brief)
    if (!halting) {
      halting = true
      // Wait 200 microtask turns before pausing, so every sibling in a
      // parallel() or pipeline() fan-out queues its brief into this pause.
      ;(async () => { for (let i = 0; i < 200; i++) await null; release('__run_halted__') })()
    }
    return new Promise(() => {})
  }
  const phase = (t) => { current = t; if (from && t === from) reached = true; return realPhase(t) }
  const log = (m) => { logs.push(String(m)); return realLog(m) }
  const finish = (value) => {
    if (!opted) return value
    const self_reviewed = Object.keys(by).filter((k) => by[k] === 'self')
    if (value === '__run_halted__') {
      return {
        run: 'inline', status: 'next', next, results: out, reviewers: by, self_reviewed, skipped, logs,
        how: 'Do each brief in next, in order: follow its prompt in this session (it may tell you to edit files, commit or push), and shape your answer to its schema when one is given, with every required field. A brief marked independent reviews work this run produced, so do not answer it yourself: send its prompt to a reviewer with no part in the work (the project\'s code-reviewer role, a fresh session or a fresh subagent), use their answer, and name them in run.reviewers under its key; if you must answer it yourself, it is listed in self_reviewed and must be reported as self-reviewed. A brief with a note was answered before without the fields it names. Add each answer to results under its key, then run this workflow again with the same args, run.results set to the merged results and run.reviewers to the merged reviewers. Repeat until status is "done".',
      }
    }
    return { run: mode, status: 'done', result: value, results: out, reviewers: by, self_reviewed, skipped, logs }
  }
  return { agent, phase, log, finish, halted, error }
})(typeof args === 'undefined' ? undefined : args, agent, phase, log)
if (RUN.error) return RUN.error
const RUN_OUT = await Promise.race([RUN.halted, (async (agent, phase, log) => {
// --- run-modes v2 end (workflow body follows; close it with the tail line) ---

const USAGE = 'usage: deliver-package { wp: "WP-NN", plan: "<path to work-package plan, optional>", branch: "<existing branch, optional>", pr: "<existing PR, optional>", prior: "<handoff from a role workflow, optional>" }'
if (!args || !args.wp) return USAGE
const wp = String(args.wp)
const plan = args.plan ? String(args.plan) : "the project's work-package plan (path in CLAUDE.md or the project profile)"

// A role workflow that already built and tested the work hands it over as
// a handoff object (its result's `handoff` field, or the object itself),
// so Build and Document reuse it instead of building again. Spec:
// docs/reference/workflow-deliver-package.md, "The prior arg".
const unwrap = (o) => {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null
  if (o.result && typeof o.result === 'object') return unwrap(o.result)
  if (o.handoff && typeof o.handoff === 'object') return o.handoff
  return o
}
const prior = args.prior === undefined || args.prior === null ? null : unwrap(args.prior)
if (args.prior !== undefined && args.prior !== null) {
  if (!prior) return `blocked: prior must be a handoff object or a role workflow result carrying one. ${USAGE}`
  if (!prior.branch && !prior.pr) return 'blocked: prior names no branch or pr, so there is no built work to ship'
  if (prior.tests_pass !== true) return `blocked: prior work from ${prior.from || 'the role workflow'} does not report tests_pass: true; finish it there first`
}
const priorFrom = prior ? String(prior.from || 'a role workflow') : ''
const priorDocs = prior && Array.isArray(prior.docs) ? prior.docs.map(String) : []

// Some agents may push only to a branch they were assigned, or pick up a
// package someone already started; then the workflow reuses that branch
// or PR instead of cutting wp/<id>-<slug>.
const prBranch = { pr: args.pr || (prior && prior.pr), branch: args.branch || (prior && prior.branch) }
const existing = prBranch.pr
  ? `Use the existing PR ${prBranch.pr} and its head branch; do not create a new branch or PR.`
  : prBranch.branch
    ? `Use the existing branch ${prBranch.branch} (reuse its open PR if one exists); do not create a new branch.`
    : ''
const built = prior
  ? `The work for ${wp} is already built and tested on that branch by ${priorFrom}${priorDocs.length ? `, with docs pages ${priorDocs.join(', ')}` : ''}${prior.notes && prior.notes.length ? `; its notes: ${[].concat(prior.notes).join('; ')}` : ''}. Do not rebuild it.`
  : ''
const list = (xs) => (xs && xs.length ? '- ' + xs.join('\n- ') : '- none')
// Two sessions doing the same work is the costliest waste there is, so
// every workflow that starts work first looks for work already in flight.
const OVERLAP = (self) => `Before planning, look for overlapping work in flight${self ? ` (other than ${self})` : ''}: the repository's open pull requests and recently pushed branches, the plan's status rows, and, where your tools can list them, other running sessions, threads or assignees and what they are on (read them; do not ask). Return overlaps: each item that shares this work's goal (kind "duplicate") or changes the same files, package or contract (kind "same-files"), with a link and its owner. Return an empty list if you find none.`
const OVERLAPS = { type: 'array', items: { type: 'object', properties: { kind: { type: 'string', enum: ['duplicate', 'same-files'] }, what: { type: 'string' }, link: { type: 'string' }, owner: { type: 'string' } }, required: ['kind', 'what'] } }
const dupes = (xs) => (Array.isArray(xs) ? xs.filter((o) => o && o.kind === 'duplicate') : [])
const shared = (xs) => (Array.isArray(xs) ? xs.filter((o) => o && o.kind === 'same-files') : [])
const said = (o) => `${o.what}${o.link ? ` (${o.link})` : ''}${o.owner ? `, owner ${o.owner}` : ''}`

const PLAN = {
  type: 'object',
  properties: {
    branch: { type: 'string' },
    owned_paths: { type: 'array', items: { type: 'string' } },
    steps: { type: 'array', items: { type: 'string' } },
    stubs: { type: 'array', items: { type: 'string' } },
    done_when: { type: 'string' },
    docs_layout: { type: 'string' },
    docs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['tutorial', 'how-to', 'reference', 'explanation'] },
          page: { type: 'string' },
          why: { type: 'string' },
        },
        required: ['kind', 'page', 'why'],
      },
    },
    blockers: { type: 'array', items: { type: 'string' } },
    caveats: { type: 'array', items: { type: 'string' } },
    review_status: { type: 'string' },
    overlaps: OVERLAPS,
  },
  required: ['branch', 'owned_paths', 'steps', 'done_when', 'docs', 'review_status', 'overlaps'],
}
const BUILD = {
  type: 'object',
  properties: {
    pr_url: { type: 'string' },
    tests_pass: { type: 'boolean' },
    non_original: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['tests_pass'],
}
const DOCS = {
  type: 'object',
  properties: {
    pages: { type: 'array', items: { type: 'string' } },
    undocumented: { type: 'array', items: { type: 'string' } },
  },
  required: ['pages'],
}
const REVIEW = {
  type: 'object',
  properties: {
    blocking: { type: 'array', items: { type: 'string' } },
    other: { type: 'array', items: { type: 'string' } },
  },
  required: ['blocking'],
}
const SHIP = {
  type: 'object',
  properties: {
    pr_url: { type: 'string' },
    ci: { type: 'string' },
    dependants: { type: 'array', items: { type: 'string' } },
    status_set: { type: 'string' },
  },
  required: ['pr_url', 'ci'],
}

phase('Plan')
const p = await agent(
  `Follow the engineering-practices skills project-onboarding, work-packages and documentation for ${wp} in ${plan}.
Read CLAUDE.md, the project profile, the package row and every contract it touches; run the baseline build and tests.
${OVERLAP(prBranch.pr || prBranch.branch || '')}
${existing ? existing + ' Return that branch name, after confirming you can push to it and reading any work already on it.' : ''}
${built ? built + ' Compare it with the package row and list under steps only what the row still needs that the branch lacks (often nothing), and under docs only pages still missing.' : ''}
Return: the branch name (${existing ? 'the existing one' : 'wp/<id>-<slug>'}), owned paths, implementation steps as small slices, dependencies to stub against their contracts, the done-when line, the project's docs layout, and the Diataxis plan: for each thing the package will produce, use the compass (action/cognition x study/work) and the documentation skill's "what each kind of work owes" table to list the doc kind, the page to add or update, and why.
Return review_status: the exact status value the plan or profile uses for a package whose PR is open and waiting for review (read the plan's status legend, the profile and how earlier rows were set), or "unchanged" when the project changes status only at merge or has no such value.
List only what prevents starting (missing row, no testable done-when, missing contract) under blockers. Risks that do not stop the work (an assumption you made, a dependency stubbed for now, a test you cannot run here, a part that may need rework) go under caveats, never under blockers. Do not write code yet.`,
  { schema: PLAN, phase: 'Plan', label: 'plan' },
)
if (!p) return `blocked: planning for ${wp} failed (agent returned nothing). ${USAGE}`
if (p.blockers && p.blockers.length) return `blocked: ${wp} cannot start:\n${list(p.blockers)}`
if (dupes(p.overlaps).length) return `blocked: ${wp} is already in flight elsewhere; coordinate with its owner (engineering-practices peer-coordination) before starting:\n${list(dupes(p.overlaps).map(said))}`
const caveats = [].concat(p.caveats || []).map(String)
const near = shared(p.overlaps).map(said)
if (near.length) log(`work touching the same files: ${near.join('; ')}`)
const nearNote = near.length ? `\nOther work in flight touches the same files: ${near.join('; ')}. Before changing those files, message each owner (engineering-practices peer-coordination) and keep your edit small so the later PR can merge the earlier one in cleanly.` : ''
const owned = (p.owned_paths || []).join(', ') || '(none listed)'
const docsPlan = (p.docs || []).map((d) => `${d.kind}: ${d.page} (${d.why})`)

phase('Build')
const gap = prior ? p.steps || [] : []
const b = prior && prBranch.pr && !gap.length
  ? { pr_url: String(prBranch.pr), tests_pass: true, non_original: [].concat(prior.non_original || []) }
  : await agent(prior ? `${built} Complete ${wp} on branch ${p.branch}, writing only in: ${owned}.
Follow the engineering-practices skills git-workflow, provenance and peer-coordination.
Do only these missing steps (none means change no files):
${list(gap)}
Done when: ${p.done_when}
${existing} Fetch it; if it is behind the default branch, merge the default branch in first. Commit with Conventional Commits, run the project's build and tests, push, and reuse its open PR or open a draft PR titled as a Conventional Commit with "Refs: ${wp}" in the body.
Return the PR URL, whether tests pass, and the non-original items added.${nearNote}` : 
  `Implement ${wp} on branch ${p.branch}, writing only in: ${owned}.
Follow the engineering-practices skills git-workflow, work-packages, provenance and peer-coordination, and the job-function plugin for this package's role.
Steps:
${list(p.steps)}
Stub against the contracts: ${(p.stubs || []).join(', ') || 'none'}.
Done when: ${p.done_when}
License every new file under the project's license with its header rule, never a template default; log every non-original item in the provenance log.
${existing ? `${existing} Fetch it and build on the work already there; if it is behind the default branch, merge the default branch in first.` : `Cut ${p.branch} from the latest remote default branch.`}
Commit with Conventional Commits, run the project's build and tests, push to ${p.branch}, and ${existing ? 'reuse its open PR (open a draft PR only if none exists), making sure the title is a Conventional Commit, with' : 'open a draft PR titled as a Conventional Commit with'} "Refs: ${wp}" in the body.
Return the PR URL, whether tests pass, and the non-original items added.${nearNote}`,
    { schema: BUILD, phase: 'Build', label: 'build' },
  )
if (prior && b && b.pr_url && !gap.length && prBranch.pr) log(`build reused from ${priorFrom}: ${b.pr_url}`)
else if (prior) log(`build ran on ${priorFrom}'s branch: ${gap.length ? gap.length + ' missing step(s)' : 'no PR open yet, opened one'}`)
if (!b) return `blocked: build for ${wp} failed (agent returned nothing); branch ${p.branch} may hold partial work`

phase('Document')
const missingDocs = (p.docs || []).length > 0
const d = prior && priorDocs.length && !missingDocs
  ? { pages: priorDocs, undocumented: [].concat(prior.undocumented || []) }
  : await agent(
  `Follow the engineering-practices documentation skill for ${wp} on branch ${p.branch} (PR ${b.pr_url || 'open for this branch'}). Docs layout: ${p.docs_layout || 'see the project profile'}.
Planned pages:
${list(docsPlan)}
Classify every user-visible change in this work with the Diataxis compass (action/cognition x study/work). For each, update or add exactly one page of that kind under the project's docs layout (default docs/<kind>/), keep each page to one kind, title it by the project pattern, and link to the related pages of the other kinds. Run every command and step you write. Commit the pages to the same PR (Conventional Commits) and push; list them by kind in the PR body.
Report pages touched and any change you left undocumented and why.`,
  { schema: DOCS, phase: 'Document', label: 'docs' },
  )
if (prior && priorDocs.length && !missingDocs) log(`docs reused from ${priorFrom}: ${priorDocs.join(', ')}`)
if (!d) log('docs agent returned nothing; the review will check docs from scratch')

phase('Check')
let open = []
let reviewed = false
for (let round = 1; round <= 3; round++) {
  const r = await agent(
    `Act as an independent reviewer (follow the code-reviewer role if installed) of the open PR for ${wp} on ${p.branch}. Do not edit anything.
Check: done-when "${p.done_when}" is met; tests cover the change; only owned paths (${owned}) changed; Conventional Commit title; provenance logged and every new file carries the project's license header; docs per the engineering-practices documentation skill's Check step and the technical-writer docs-review checklist if installed (each touched page one Diataxis kind, titles follow the patterns, links connect the kinds, docs in this same PR, nothing user-visible left undocumented).
List blocking problems only where you can point to a realistic failure or a broken rule; list other suggestions separately.`,
    { schema: REVIEW, phase: 'Check', label: `review:${round}`, independent: true },
  )
  if (!r) { open = ['review agent returned nothing; the PR is unverified']; continue }
  reviewed = true
  open = r.blocking || []
  if (!open.length) break
  log(`round ${round}: ${open.length} blocking`)
  if (round === 3) break
  await agent(
    `Fix these blocking review findings for ${wp} on ${p.branch}, staying in owned paths (${owned}). Follow the engineering-practices skills git-workflow, provenance and documentation. Run the build and tests, commit (Conventional Commits) and push:
${list(open)}`,
    { phase: 'Check', label: `fix:${round}` },
  )
}
if (!reviewed || open.length) {
  return `blocked: ${wp} on ${p.branch} still has open items after review:\n${list(open)}\nPR: ${b.pr_url || '(see branch)'}`
}

phase('Ship')
const s = await agent(
  `For ${wp} on ${p.branch}: confirm the build, tests and CI pass; ${p.review_status && p.review_status !== 'unchanged' ? `set the package's status row in ${plan} within the PR to "${p.review_status}", the project's own value for a package in review` : `leave the package's status row in ${plan} as it is: the project changes it only at merge or has no in-review value`}; re-read the PR title and description so they match the final change (docs by Diataxis kind, stubs, non-original items with licenses, "Refs: ${wp}"${caveats.length ? ', and a "Known risks" section listing these caveats' : ''}); mark the PR ready and request the project's reviewer (the code-reviewer role, not the project owner). Follow engineering-practices git-workflow and peer-coordination.
Do not merge here: the author squash-merges after the reviewer passes it and CI is green.
${caveats.length ? `Caveats:\n${list(caveats)}\n` : ''}Return the PR URL, CI state, the status value you set (or "unchanged"), and the dependant packages to notify with the PR link once merged.`,
  { schema: SHIP, phase: 'Ship', label: 'ship' },
)
if (!s) return `blocked: ship step for ${wp} failed (agent returned nothing); PR ${b.pr_url || 'on ' + p.branch} is reviewed but not marked ready`
return {
  wp,
  pr: s.pr_url,
  ci: s.ci,
  docs: d ? d.pages : ['unverified: docs agent returned nothing'],
  ...(prior ? { prior: priorFrom } : {}),
  undocumented: d ? d.undocumented || [] : [],
  status: s.status_set || p.review_status,
  caveats,
  overlaps: near,
  dependants: s.dependants || [],
  next: `after the code reviewer passes, run /engineering-practices:land-pr { pr: "${s.pr_url}" } (keeps the branch current, polls CI itself and squash-merges), then tell each dependant`,
}
})(RUN.agent, RUN.phase, RUN.log)]); return RUN.finish(RUN_OUT)
