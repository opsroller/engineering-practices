// SPDX-License-Identifier: GPL-2.0-or-later
export const meta = {
  name: 'land-pr',
  description: 'Take an existing branch or pull request to a squash merge, in any role: keep it current with the default branch, resolve conflicts, poll CI yourself, check the reviewer verdict, refresh the PR body and squash-merge. args: { pr: "<number or URL>" } or { branch: "<existing branch>", title: "<Conventional Commit title if a PR must be opened, optional>" }, plus followup: "<a change to add to the PR before landing, optional>"',
  phases: [
    { title: 'Adopt', detail: 'find or open the PR for the branch; read the default branch; confirm you can push to the head branch' },
    { title: 'Follow-up', detail: 'only with followup: make that change on the head branch, run the local check, commit, push, note it in the PR body' },
    { title: 'Sync', detail: 'merge the latest default branch in, resolve conflicts, re-run local checks, push, poll CI; repeat while the default branch moves (max 3 rounds)' },
    { title: 'Review', detail: 'read the reviewer verdict on the current head; ask for review if nobody has been asked; on a pass with should-fix items, fix, push and ask for a pass on the new head' },
    { title: 'Merge', detail: 'refresh the PR body, confirm head and base are still the verified ones, squash-merge' },
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

const USAGE = 'usage: land-pr { pr: "<number or URL>" } or land-pr { branch: "<existing branch>", title: "<Conventional Commit title, optional>" }; add followup: "<change to make on the PR first, optional>"'
if (!args || (!args.pr && !args.branch)) return USAGE

const list = (xs) => (xs && xs.length ? '- ' + xs.join('\n- ') : '- none')
const MAX_SYNC = 3
const WAIT = 'schedule a check-in for 5 minutes from now (a send-later, wakeup or scheduled-task tool) and never end your turn waiting without one'

// PR events (CI results, reviews) do not reliably reach an agent, and shell
// sleeps may be blocked, so a wait is a scheduled check-in, then a re-run.
const CI_POLL = `Check CI yourself; never wait for a notification or webhook to say it finished. Read the check runs and commit statuses for the PR's current head SHA (the hosting service's checks API or tool, or \`gh pr checks <pr>\`) and make sure the result belongs to that SHA, not an earlier push. Never wait in the shell with sleep loops. If checks are still running and your session can schedule a check-in for itself (a send-later, wakeup or scheduled-task tool), report pending now: the caller schedules a check-in in 5 minutes and runs the workflow again. Only without such a tool, and only where the shell allows a long command, use one bounded blocking watch (for example \`gh pr checks <pr> --watch --fail-fast\`, up to 20 minutes). Report exactly one of: "green" (every required check passed), "red: <check> <one-line cause>" (read the failing log first), "pending: <checks still running>", or "none" (the repository runs no CI on PRs).`

const ADOPT = {
  type: 'object',
  properties: {
    pr_url: { type: 'string' },
    pr_number: { type: 'string' },
    head_branch: { type: 'string' },
    default_branch: { type: 'string' },
    can_push: { type: 'boolean' },
    shared_branch: { type: 'boolean' },
    local_check: { type: 'string' },
    problem: { type: 'string' },
  },
  required: ['head_branch', 'default_branch', 'can_push', 'local_check'],
}
const FOLLOWUP = {
  type: 'object',
  properties: {
    done: { type: 'boolean' },
    head_sha: { type: 'string' },
    subject: { type: 'string' },
    reason: { type: 'string' },
  },
  required: ['done'],
}
const SYNC = {
  type: 'object',
  properties: {
    head_sha: { type: 'string' },
    base_sha: { type: 'string' },
    conflicts_resolved: { type: 'array', items: { type: 'string' } },
    unresolved: { type: 'array', items: { type: 'string' } },
    check_passed: { type: 'boolean' },
    ci: { type: 'string' },
    base_moved: { type: 'boolean' },
  },
  required: ['check_passed', 'ci', 'base_moved'],
}
const VERDICT = {
  type: 'object',
  properties: {
    state: { type: 'string', enum: ['passed', 'should-fix', 'changes', 'waiting'] },
    reviewer: { type: 'string' },
    open_items: { type: 'array', items: { type: 'string' } },
    asked: { type: 'boolean' },
  },
  required: ['state'],
}
const SHOULDFIX = {
  type: 'object',
  properties: {
    head_sha: { type: 'string' },
    check_passed: { type: 'boolean' },
    fixed: { type: 'array', items: { type: 'string' } },
    skipped: { type: 'array', items: { type: 'string' } },
  },
  required: ['check_passed'],
}
const MERGE = {
  type: 'object',
  properties: {
    merged: { type: 'boolean' },
    squash_sha: { type: 'string' },
    reason: { type: 'string' },
  },
  required: ['merged'],
}

phase('Adopt')
const target = args.pr ? `pull request ${args.pr}` : `branch ${args.branch}`
const a = await agent(
  `Adopt ${target} so it can be landed, following the engineering-practices skills project-onboarding (just enough: CLAUDE.md, the project profile, contributing rules) and git-workflow. Do not change code.
1. Read the default branch from the remote; do not assume "main".
2. ${args.pr
    ? `Read the PR: its head branch, state and whether it is a draft. If it is closed or merged, return that as the problem.`
    : `Find the open PR whose head is ${args.branch}. If none exists, push the branch if needed and open a draft PR titled ${args.title ? `"${args.title}"` : 'as a valid Conventional Commit line that sums up the branch'} with a description of what changed and why, how it was tested and any Refs: footer the work has, plus any attribution or template the project requires. A merged or closed PR for the branch does not count.`}
3. Confirm you can push to the head branch (it is your assigned branch, or you have write access and the profile allows it). If you cannot, return can_push: false and the reason as the problem; do not push to a different branch.
4. Say whether others also push to the branch (shared_branch), from its commit authors and the profile.
5. Name the project's fastest local check for the files the PR touches (lint, format, build, tests or validators from the profile).
Return the PR URL and number, head branch, default branch, can_push, shared_branch, the local check, and any problem.`,
  { schema: ADOPT, phase: 'Adopt', label: 'adopt' },
)
if (!a) return `blocked: could not adopt ${target} (agent returned nothing). ${USAGE}`
if (a.problem || !a.can_push) return `blocked: ${target}: ${a.problem || 'cannot push to the head branch'}`
const pr = a.pr_url || a.pr_number || target

// A follow-up (a reviewer's ask, a fix found while landing) goes on the
// PR's own head before syncing, so one review and one CI run cover it.
const followup = args.followup ? String(args.followup).trim() : ''
if (followup) {
  phase('Follow-up')
  const f = await agent(
    `Add this follow-up change to ${pr} before it lands: "${followup}". Follow the engineering-practices skills git-workflow and provenance.
1. Fetch, then check out ${a.head_branch} at its remote tip${a.shared_branch ? ' (others push to it: pull their commits first)' : ''}. Do not cut a new branch or open a new PR.
2. Make the smallest edit that does it; touch nothing else. Keep the license header rule on any new file. If it turns out to need new behaviour another role would notice, a contract change or a new doc page, do not make it: return done: false with the reason.
3. Run the local check: ${a.local_check}. Fix what your edit broke.
4. Commit as a Conventional Commit, push to ${a.head_branch}, and add one line on the follow-up to the PR description.
Return whether it is done, the new head SHA, the commit subject, and the reason if not done.`,
    { schema: FOLLOWUP, phase: 'Follow-up', label: 'followup' },
  )
  if (!f) return `blocked: follow-up on ${pr} failed (agent returned nothing); check ${a.head_branch} for a half-made change`
  if (!f.done) return `blocked: follow-up "${followup}" not added to ${pr}: ${f.reason || 'no reason given'}. Use small-change { change, pr } or deliver-package for it.`
  log(`follow-up on ${pr}: ${f.subject || followup} at ${f.head_sha || 'new head'}; the reviewer must pass the new head`)
}

let s = null
for (let round = 1; round <= MAX_SYNC; round++) {
  phase('Sync')
  s = await agent(
    `Bring ${pr} (head ${a.head_branch}) up to date with ${a.default_branch} and verify it. Follow engineering-practices git-workflow.
1. Fetch, then merge the latest remote ${a.default_branch} into ${a.head_branch}. Use a merge, not a rebase: it never rewrites published commits, works on a branch others push to, and needs no force-push. ${a.shared_branch ? 'Others push to this branch: pull their commits first.' : 'Rebase only if the profile requires it and you alone push to the branch, then push with --force-with-lease.'} If the branch already contains ${a.default_branch}'s tip, skip to step 4.
2. Resolve conflicts:
   - Shared lists (changelogs, docs indexes, catalogs and registries, manifests, lists of files, routes or tests): keep every entry from both sides, in the file's own order (sorted, numbered or appended), with no duplicates; renumber positions only where nothing references the number.
   - Enum values or id tables: keep both sides' entries if their ids differ. If both sides took the same id or value, stop: renumbering one would silently change an id that code, data or saves already use. List the file under unresolved.
   - Lockfiles and generated files: take ${a.default_branch}'s version, then regenerate with the project's tooling. Never hand-merge them.
   - Code or prose where both sides changed the same logic: keep both intents if you can show they combine; if picking either side loses behaviour, stop, abort the merge and list the files under unresolved.
3. Commit the merge with the default message, or "chore: merge ${a.default_branch} into ${a.head_branch}" if the project requires Conventional Commit subjects on every commit.
4. Re-run the local check: ${a.local_check}. If it fails because of the merge, fix it with the smallest edit and commit; if it fails on ${a.default_branch} too, note that and do not widen the PR.
5. Push, then: ${CI_POLL} If CI is red because of this PR or the merge, fix it (smallest edit, local check, Conventional Commit, push) and poll again; at most two fix attempts.
6. Fetch once more and say whether ${a.default_branch} moved past the commit you merged (base_moved).
Return the head SHA, the ${a.default_branch} SHA you merged, conflicts resolved, unresolved files, whether the local check passed, the CI state, and base_moved.`,
    { schema: SYNC, phase: 'Sync', label: `sync:${round}` },
  )
  if (!s) return `blocked: sync of ${pr} failed (agent returned nothing); check the branch for a half-finished merge`
  if ((s.unresolved || []).length) return `blocked: ${pr} has conflicts that lose behaviour either way; resolve by hand or with the other change's author:\n${list(s.unresolved)}`
  if (!s.check_passed) return `blocked: local check fails on ${pr} after syncing with ${a.default_branch}`
  if (/^pending/.test(s.ci || '')) return `waiting: CI on ${pr} is still running (${s.ci}); ${WAIT}, then run land-pr again`
  if (!/^(green|none)/.test(s.ci || '')) return `blocked: CI on ${pr} is ${s.ci}; fix it, then run land-pr again`
  if (!s.base_moved) break
  log(`round ${round}: ${a.default_branch} moved while CI ran`)
  if (round === MAX_SYNC) return `blocked: ${a.default_branch} kept moving through ${MAX_SYNC} sync rounds; run land-pr again when it is quieter, or use the project's merge queue`
}

phase('Review')
const v = await agent(
  `Read the review state of ${pr} at head ${s.head_sha || '(current head)'}. Do not edit code.
The reviewer is the project's code-reviewer role, or the peer the profile names; never the project owner unless the profile says so. A pass counts only if it covers the current head or the only commits after it are merges of ${a.default_branch} with no conflict edits in reviewed files. Read reviews, review comments and PR comments (a reviewer on a shared account may post its verdict as a comment review).
${followup ? `A follow-up commit ("${followup}") was just added, so a pass on an earlier head does not count; the reviewer must pass a head that includes it. ` : ''}Return state "passed" (a pass with nothing left to do), "should-fix" (the reviewer passed it but asked for non-blocking fixes before merge, such as should-fix or nit items they want done now: list each under open_items), "changes" (list every unanswered or unfixed blocking finding), or "waiting". If waiting and nobody has been asked for this head, mark the PR ready if it is a draft and CI is green or none, ask the reviewer with the PR link and one line on what changed (engineering-practices peer-coordination), and return asked: true.`,
  { schema: VERDICT, phase: 'Review', label: 'review' },
)
if (!v) return `blocked: could not read the review state of ${pr} (agent returned nothing)`
if (v.state === 'changes') return `changes requested on ${pr}:\n${list(v.open_items)}\nFix them on ${a.head_branch}, answer each comment, then run land-pr again.`
if (v.state === 'should-fix') {
  const sf = await agent(
    `The reviewer passed ${pr} but asked for these fixes before merge:
${list(v.open_items)}
On ${a.head_branch} (fetch, check out its remote tip${a.shared_branch ? ', pull others\' commits first' : ''}), make each with the smallest edit, run the local check (${a.local_check}), commit (Conventional Commits) and push. Answer each review comment with what changed. A pass covers one head only, so ask the reviewer to pass the new head, with its SHA and one line per fix (engineering-practices peer-coordination). If an item would widen the PR, do not make it: reply why and list it under skipped. Follow engineering-practices git-workflow.
Return the new head SHA, whether the local check passed, the items fixed, and the items skipped with why.`,
    { schema: SHOULDFIX, phase: 'Review', label: 'should-fix' },
  )
  if (!sf) return `blocked: should-fix round on ${pr} failed (agent returned nothing); check ${a.head_branch} for a half-made change`
  if (!sf.check_passed) return `blocked: local check fails on ${pr} after the should-fix edits`
  return {
    pr,
    ci: s.ci,
    review: `should-fix items pushed at ${sf.head_sha || 'a new head'}; waiting on ${v.reviewer || 'the reviewer'} to pass it`,
    fixed: sf.fixed || [],
    skipped: sf.skipped || [],
    next: `${WAIT}; then run /engineering-practices:land-pr { pr: "${pr}" } again, which re-syncs, re-checks CI and merges once the new head is passed`,
  }
}
if (v.state !== 'passed') {
  return {
    pr,
    ci: s.ci,
    review: `waiting on ${v.reviewer || 'the reviewer'}${v.asked ? ' (asked now)' : ''}`,
    next: `check the verdict yourself, do not wait to be notified: ${WAIT}; when it passes, run /engineering-practices:land-pr { pr: "${pr}" } again`,
  }
}

phase('Merge')
const m = await agent(
  `Squash-merge ${pr}. Follow engineering-practices git-workflow, section 5.
1. Fetch. If the PR head is no longer ${s.head_sha || 'the SHA verified in the sync step'}, or ${a.default_branch} moved past ${s.base_sha || 'the commit merged in the sync step'}, do not merge: return merged: false with reason "moved".
2. Refresh the PR title and description against the final diff, keeping any attribution block or template the project requires at the top: the title is a valid Conventional Commit line; the body says what changed and why, how it was tested, docs by Diataxis kind, anything stubbed or not original, and footers (Refs:, BREAKING CHANGE:, co-author trailers).
3. Squash-merge with the title as the subject and the body trimmed to the why plus footers, passing the verified head SHA so the merge fails if the head changed. Squash only, never a merge commit or rebase-merge.
4. Delete the head branch unless it is a branch you are assigned to keep.
Return whether it merged, the squash commit SHA, and the reason if not.`,
  { schema: MERGE, phase: 'Merge', label: 'merge' },
)
if (!m) return `blocked: merge step for ${pr} failed (agent returned nothing); check the PR state before retrying`
if (!m.merged) {
  return m.reason === 'moved'
    ? `not merged: ${pr} or ${a.default_branch} moved after verification; run land-pr again, or use the project's merge queue if it has one`
    : `not merged: ${pr}: ${m.reason || 'no reason given'}`
}
return {
  pr,
  merged: true,
  squash_sha: m.squash_sha,
  ci: s.ci,
  next: 'tell whoever asked for the change, and any dependant, with the PR link',
}
})(RUN.agent, RUN.phase, RUN.log)]); return RUN.finish(RUN_OUT)
