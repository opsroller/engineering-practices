// SPDX-License-Identifier: GPL-2.0-or-later
export const meta = {
  name: 'deliver-package',
  description: 'Take one work package from its plan row to a ready, documented, independently checked pull request, in any role. args: { wp: "WP-NN" (required), plan: "<path to the work-package plan, optional>", branch: "<existing branch to work on, optional>", pr: "<existing PR number or URL, optional>", prior: "<handoff object or full result of a role workflow that already built the work, optional>" }',
  phases: [
    { title: 'Plan', detail: 'onboard, check for overlapping work, read the package and contracts, plan slices, stubs, caveats and affected Diataxis doc kinds' },
    { title: 'Build', detail: 'implement on the package branch with provenance recorded; with prior, only what the prior work left out' },
    { title: 'Document', detail: 'write or update the planned Diataxis pages in the same PR; skipped when prior already wrote them' },
    { title: 'Check', detail: 'independent review of change and docs, fix loop (max 3 rounds)' },
    { title: 'Ship', detail: 'merge the default branch in, extend the PR to items it added that the PR must also touch, confirm CI (one re-run of a single flaky job, logged), PR ready for the code reviewer, plan row set per the project status convention, dependants listed' },
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
        how: 'Do each brief in next, in order: follow its prompt in this session (it may tell you to edit files, commit or push), and shape your answer to its schema when one is given, with every required field. A brief marked independent reviews work this run produced, so do not answer it yourself: send its prompt to a reviewer with no part in the work (the project\'s code-reviewer role, a fresh session or a fresh subagent), use their answer, and name them in run.reviewers under its key; if you must answer it yourself, it is listed in self_reviewed and must be reported as self-reviewed. A brief with a note was answered before without the fields it names. Add each answer to results under its key, then run this workflow again with the same args, run.results set to the merged results and run.reviewers to the merged reviewers. Repeat until status is "done". To avoid pasting results back on every call, drive the run with engineering-practices tools/run-inline.mjs and a state file instead: it stores each answer and prints only the next briefs.',
      }
    }
    return { run: mode, status: 'done', result: value, results: out, reviewers: by, self_reviewed, skipped, logs }
  }
  return { agent, phase, log, finish, halted, error }
})(typeof args === 'undefined' ? undefined : args, agent, phase, log)
if (RUN.error) return RUN.error
const RUN_OUT = await Promise.race([RUN.halted, (async (agent, phase, log) => {
// --- run-modes v2 end (workflow body follows; close it with the tail line) ---

const USAGE = 'usage: deliver-package { wp: "WP-NN", plan: "<path to work-package plan, optional>", branch: "<existing branch, optional>", pr: "<existing PR, optional>", prior: <handoff from a role workflow, optional: the whole result or its handoff field, { branch and/or pr (at least one), tests_pass: true (required), from, docs: [pages], undocumented: [..], non_original: [..], notes } > }'
// A review request on the hosting service reaches only an account; an agent
// reviewer, or one sharing the author's account, is reached by message.
const REVIEWER = 'ask the project\'s reviewer (the code-reviewer role, or the peer the profile names; never the project owner). A review request on the hosting service reaches only a person or bot with its own account: when the reviewer is an agent session or shares the author\'s account, message its session or thread directly instead (engineering-practices peer-coordination, "Find the right agent": the project\'s session tools list it) with the PR link, the head SHA and one line on what changed, and say where to post the verdict (a comment review on a shared account)'

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
const unwrapped = args.prior === undefined || args.prior === null ? null : unwrap(args.prior)
// The top-level branch and pr fill in a handoff that lacks them, so a role
// result with no branch of its own can still be shipped.
const prior = unwrapped && { ...unwrapped, branch: unwrapped.branch || args.branch, pr: unwrapped.pr || args.pr }
if (args.prior !== undefined && args.prior !== null) {
  if (!unwrapped) return `blocked: prior must be a handoff object or a role workflow result carrying one. ${USAGE}`
  // Report every problem with the handoff at once, not one per run.
  const bad = []
  if (!prior.branch && !prior.pr) bad.push('names no branch or pr, and none was given as a top-level branch or pr arg, so there is no built work to ship')
  if (prior.tests_pass !== true) bad.push(`does not report tests_pass: true (got ${JSON.stringify(prior.tests_pass)}); finish the work in ${prior.from || 'the role workflow'} first`)
  for (const k of ['docs', 'undocumented', 'non_original']) {
    if (prior[k] !== undefined && !Array.isArray(prior[k])) bad.push(`${k} must be a list, got ${typeof prior[k]}`)
  }
  if (bad.length) return `blocked: prior handoff is not usable:\n- ${bad.join('\n- ')}\n${USAGE}`
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
// One failing leg of a matrix (one browser, one OS) with a cause outside
// the diff is worth one re-run, never a silent retry: each pass on re-run
// is a flake and goes in the project's flake log.
// Same text in land-pr.js and small-change.js: change all three.
const FLAKE = `A single failing job: when exactly one job or matrix leg failed (one browser, one OS, one shard), the same tests pass on the other legs, and its log points outside this PR's diff (a timeout, runner, network, download or infrastructure error, or a test that does not touch the changed code), re-run only that job, once per head SHA (\`gh run rerun <run-id> --job <job-id>\`, or the hosting service's "re-run failed jobs"). Never re-run the whole workflow, never re-run twice, and never re-run a failure in code this PR touches. If the re-run passes, it is a flake: count CI as green, and record it in the project's flake log (the file or issue the profile names; if it names none, one open issue titled "CI flake log", created if missing) as one entry: date, check and job, head SHA, link to the failed run, one-line failure. Add the same line under a "Flaky checks" heading in the PR description. If the log already has two entries for that check in the last 30 days, say so, so its owner quarantines or fixes it. If the re-run fails again, the failure is real: treat it as red. Report each flake as "<check/job> | <head SHA> | <failed run link> | <one-line failure>".`

// A check that is red or hung on the default branch too is not this PR's:
// port a fix if one exists, comment once, and never loop waiting on it.
// Same text in land-pr.js and small-change.js: change all three.
const RED_BASE = `A check red on the base too: before fixing a red check, and when a check is hung (queued or running past its job timeout, or an hour if it sets none), read the same check on the default branch's latest commit, from the default branch's own run (never a re-run started for this PR). If it fails there with the same failure, or is hung there too, it is not this PR's: do not fix it in code this PR does not touch, do not widen the PR, and do not count it against the PR. If a fix for it exists (an open PR whose change you have read and that clears this check, or the revert of the commit that broke it), port the same change into this PR in its own commit ("<type>: port <fix> from <PR>"), run the local check, push and poll again: it no-ops once the default branch carries it. Otherwise, or if the ported fix does not clear it, post one PR comment for that check (skip it if this PR already has one from you for the same check): name the check, link its failing or hung run on the default branch, say why it is not this PR's, and name the fix you ported or say none exists yet. Find out whether the repository requires that check to merge (branch protection or rulesets) and set base_red_required. Never skip, disable or quarantine the check to get green. Report CI as "red-on-base: <check>" only when every other required check is green; a check red for this PR's own reasons still makes CI "red". Report each such check as "<check> | <default-branch run link> | <ported fix, or no fix yet> | <required or not required>".`

// A PR the host reports as conflicting gets no CI on new pushes, and one
// behind its base is tested against a stale base: merge the base in first.
// Same text in land-pr.js and small-change.js: change all three.
const BASE_CURRENT = `Base current before CI: before waiting on CI, and again at each poll, read the PR's merge state from the hosting service (\`gh pr view <pr> --json mergeable,mergeStateStatus,baseRefName\`, or mergeable_state in the API) and fetch the branch the PR targets. If the host reports the PR as conflicting ("dirty", CONFLICTING), a push gets no CI run at all, so never wait on one. If the base has commits the head lacks ("behind", or \`git merge-base --is-ancestor origin/<base> HEAD\` fails), CI would run against a stale base and may never settle. In either case merge the base into the head first: on a branch someone else owns or also pushes to, always with a merge commit, never a rebase or force-push; on your own branch, the repository's convention (a merge commit unless the profile requires a rebase, then push with --force-with-lease). Resolve conflicts keep-both: shared lists keep both sides' entries in the file's order with no duplicates, lockfiles and generated files take the base's version and are regenerated with the project's tooling, and code changed on both sides is combined only if both intents provably hold; otherwise abort the merge and report the files as "red: conflicts: <files>". Run the local check, push, and only then poll CI, for the new head SHA.`

// When the default branch gains a new member of a set this PR edits member
// by member (a preset, a workflow, a target), the merge is clean but the PR
// is incomplete; the sync step looks for that, not only for conflicts.
const CROSS_PR = (head, base) => `Cross-PR items: list what the merge brought in from ${base} (\`git diff <previous merge base>..<merged ${base} tip> --stat\`, and the PRs those commits came from). Where this PR applies one change to every member of a set (every preset, profile, variant, workflow, CI job, build target, locale or config entry of a kind) and ${base} added a new member of that set, or changed a file this PR must also touch for the same reason, extend this PR's change to it with the same edit, in its own commit ("<type>: apply <this change> to <new item> from <PR>"), and list it under cross_pr. Where ${base} renamed, moved or changed an interface this PR uses, adapt this PR to it the same way. If an extension needs new behaviour, a path ${head}'s author does not own, or a decision the other PR's author should make, do not make it: list it under unresolved as "cross-PR: <item>: <why>".`
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
    ship_status: { type: 'string' },
    overlaps: OVERLAPS,
  },
  required: ['branch', 'owned_paths', 'steps', 'done_when', 'docs', 'ship_status', 'overlaps'],
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
    cross_pr: { type: 'array', items: { type: 'string' } },
    flakes: { type: 'array', items: { type: 'string' } },
    red_on_base: { type: 'array', items: { type: 'string' } },
    base_red_required: { type: 'boolean' },
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
Return ship_status: the status value the package row should carry in this PR, so the default branch is right the moment the PR squash-merges. Read the plan's status legend, the profile and how earlier rows were set: if the project marks a row done (or merged) in the package's own PR, return that value; if it keeps an in-review value while the PR is open and closes rows elsewhere, return that; if it does not say, return its done value. Return "unchanged" only when the project changes rows outside package PRs.
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
  `For ${wp} on ${p.branch}:
1. Bring it up to date: fetch and merge the latest remote default branch into ${p.branch} (a merge, not a rebase, unless the profile requires a rebase and you alone push to the branch). Resolve conflicts the engineering-practices land-pr way: shared lists (docs indexes, changelogs, registries, manifests) keep both sides' entries in the file's order with no duplicates; lockfiles and generated files take the default branch's version and are regenerated; same logic changed on both sides is combined only if both intents provably hold, otherwise abort the merge and return the files as ci "red: conflicts: <files>". ${CROSS_PR(p.branch, 'the default branch')} Unresolved items go in ci as "red: cross-PR: <items>". Re-run the build and tests and push.
2. Confirm the build, tests and CI pass on the pushed head. ${BASE_CURRENT} ${FLAKE} ${RED_BASE} A "red-on-base" CI state does not hold the PR back from review.
3. ${p.ship_status && p.ship_status !== 'unchanged' ? `set the package's status row in ${plan} within the PR to "${p.ship_status}", the project's own value for this package once the PR lands` : `leave the package's status row in ${plan} as it is: the project changes rows outside package PRs`}; re-read the PR title and description so they match the final change (docs by Diataxis kind, stubs, non-original items with licenses, "Refs: ${wp}"${caveats.length ? ', and a "Known risks" section listing these caveats' : ''}); mark the PR ready and ${REVIEWER}. Follow engineering-practices git-workflow and peer-coordination.
Do not merge here: the author squash-merges after the reviewer passes it and CI is green.
${caveats.length ? `Caveats:\n${list(caveats)}\n` : ''}Return the PR URL, CI state, the status value you set (or "unchanged"), the cross-PR items you applied, any flakes, any red_on_base checks, and the dependant packages to notify with the PR link once merged.`,
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
  status: s.status_set || p.ship_status,
  caveats,
  overlaps: near,
  dependants: s.dependants || [],
  ...((s.cross_pr || []).length ? { cross_pr: s.cross_pr } : {}),
  ...((s.flakes || []).length ? { flakes: s.flakes } : {}),
  ...((s.red_on_base || []).length ? { red_on_base: s.red_on_base } : {}),
  land: { pr: s.pr_url, row: `${plan}: ${wp}`, notify: [...(s.dependants || []).map((x) => `${x} (dependant)`), 'the coordinator or whoever assigned this package'] },
  next: `after the code reviewer passes, run /engineering-practices:land-pr with the land object as args: it keeps the branch current, polls CI, squash-merges, confirms the ${wp} row reads merged on the default branch and tells each dependant and the assigner`,
}
})(RUN.agent, RUN.phase, RUN.log)]); return RUN.finish(RUN_OUT)
