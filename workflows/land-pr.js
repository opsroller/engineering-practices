// SPDX-License-Identifier: GPL-2.0-or-later
export const meta = {
  name: 'land-pr',
  description: 'Take an existing branch or pull request to a squash merge, in any role: keep it current with the default branch, resolve conflicts and cross-PR items, poll CI yourself and re-run one flaky job once, port a fix or comment once and carry on when a check is red or hung on the default branch too, check the reviewer verdict, refresh the PR body and squash-merge. args: { pr: "<number or URL>" } or { branch: "<existing branch>", title: "<Conventional Commit title if a PR must be opened, optional>" }, plus followup: "<a change to add to the PR before landing, optional>", row: "<plan file and item whose status row must read merged on the default branch, optional>", notify: ["<who to tell once merged: dependants, the coordinator or whoever assigned the work>"]',
  phases: [
    { title: 'Adopt', detail: 'find or open the PR for the branch; read the default branch; confirm you can push to the head branch' },
    { title: 'Follow-up', detail: 'only with followup: make that change on the head branch, run the local check, commit, push, note it in the PR body' },
    { title: 'Sync', detail: 'merge the latest default branch in, resolve conflicts, extend the PR to items the default branch added that it must also touch, re-run local checks, push, poll CI, re-run one failing job once and log a pass as a flake, port a fix or comment once for a check red on the default branch too; repeat while the default branch moves (max 3 rounds)' },
    { title: 'Review', detail: 'read the reviewer verdict; carry a pass across merges resolved keep-both (noting the merge diff to the reviewer); ask for a delta review after other commits; on a pass with should-fix items, fix, push and ask for a pass on the new head' },
    { title: 'Merge', detail: 'refresh the PR body, confirm head and base are still the verified ones, squash-merge' },
    { title: 'Close', detail: 'only with row or notify: confirm the status row reads merged on the default branch, fix it if not, tell each notify target with the PR link' },
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

const USAGE = 'usage: land-pr { pr: "<number or URL>" } or land-pr { branch: "<existing branch>", title: "<Conventional Commit title, optional>" }; add followup: "<change to make on the PR first, optional>", row: "<plan file and item whose status row must read merged, optional>", notify: ["<dependant, coordinator or assigner to tell once merged>"]'
if (!args || (!args.pr && !args.branch)) return USAGE

const list = (xs) => (xs && xs.length ? '- ' + xs.join('\n- ') : '- none')
// A review request on the hosting service reaches only an account; an agent
// reviewer, or one sharing the author's account, is reached by message.
const REVIEWER = 'ask the project\'s reviewer (the code-reviewer role, or the peer the profile names; never the project owner). A review request on the hosting service reaches only a person or bot with its own account: when the reviewer is an agent session or shares the author\'s account, message its session or thread directly instead (engineering-practices peer-coordination, "Find the right agent": the project\'s session tools list it) with the PR link, the head SHA and one line on what changed, and say where to post the verdict (a comment review on a shared account)'
const MAX_SYNC = 3
const CLOSE = {
  type: 'object',
  properties: {
    row: { type: 'string', enum: ['already', 'fixed', 'not-fixed', 'none'] },
    row_pr: { type: 'string' },
    notified: { type: 'array', items: { type: 'string' } },
    not_notified: { type: 'array', items: { type: 'string' } },
  },
  required: ['row', 'notified'],
}
const WAIT = 'schedule a check-in for 5 minutes from now (a send-later, wakeup or scheduled-task tool) and never end your turn waiting without one'

// PR events (CI results, reviews) do not reliably reach an agent, and shell
// sleeps may be blocked, so a wait is a scheduled check-in, then a re-run.
const CI_POLL = `Check CI yourself; never wait for a notification or webhook to say it finished. Read the check runs and commit statuses for the PR's current head SHA (the hosting service's checks API or tool, or \`gh pr checks <pr>\`) and make sure the result belongs to that SHA, not an earlier push. Never wait in the shell with sleep loops. If checks are still running and your session can schedule a check-in for itself (a send-later, wakeup or scheduled-task tool), report pending now: the caller schedules a check-in in 5 minutes and runs the workflow again. Only without such a tool, and only where the shell allows a long command, use one bounded blocking watch (for example \`gh pr checks <pr> --watch --fail-fast\`, up to 20 minutes). Report exactly one of: "green" (every required check passed), "red: <check> <one-line cause>" (read the failing log first), "red-on-base: <check>" (red or hung on the default branch too, per the rule below), "pending: <checks still running>", or "none" (the repository runs no CI on PRs).`

// One failing leg of a matrix (one browser, one OS) with a cause outside
// the diff is worth one re-run, never a silent retry: each pass on re-run
// is a flake and goes in the project's flake log.
// Same text in deliver-package.js and small-change.js: change all three.
const FLAKE = `A single failing job: when exactly one job or matrix leg failed (one browser, one OS, one shard), the same tests pass on the other legs, and its log points outside this PR's diff (a timeout, runner, network, download or infrastructure error, or a test that does not touch the changed code), re-run only that job, once per head SHA (\`gh run rerun <run-id> --job <job-id>\`, or the hosting service's "re-run failed jobs"). Never re-run the whole workflow, never re-run twice, and never re-run a failure in code this PR touches. If the re-run passes, it is a flake: count CI as green, and record it in the project's flake log (the file or issue the profile names; if it names none, one open issue titled "CI flake log", created if missing) as one entry: date, check and job, head SHA, link to the failed run, one-line failure. Add the same line under a "Flaky checks" heading in the PR description. If the log already has two entries for that check in the last 30 days, say so, so its owner quarantines or fixes it. If the re-run fails again, the failure is real: treat it as red. Report each flake as "<check/job> | <head SHA> | <failed run link> | <one-line failure>".`

// A check that is red or hung on the default branch too is not this PR's:
// port a fix if one exists, comment once, and never loop waiting on it.
// Same text in deliver-package.js and small-change.js: change all three.
const RED_BASE = `A check red on the base too: before fixing a red check, and when a check is hung (queued or running past its job timeout, or an hour if it sets none), read the same check on the default branch's latest commit, from the default branch's own run (never a re-run started for this PR). If it fails there with the same failure, or is hung there too, it is not this PR's: do not fix it in code this PR does not touch, do not widen the PR, and do not count it against the PR. If a fix for it exists (an open PR whose change you have read and that clears this check, or the revert of the commit that broke it), port the same change into this PR in its own commit ("<type>: port <fix> from <PR>"), run the local check, push and poll again: it no-ops once the default branch carries it. Otherwise, or if the ported fix does not clear it, post one PR comment for that check (skip it if this PR already has one from you for the same check): name the check, link its failing or hung run on the default branch, say why it is not this PR's, and name the fix you ported or say none exists yet. Find out whether the repository requires that check to merge (branch protection or rulesets) and set base_red_required. Never skip, disable or quarantine the check to get green. Report CI as "red-on-base: <check>" only when every other required check is green; a check red for this PR's own reasons still makes CI "red". Report each such check as "<check> | <default-branch run link> | <ported fix, or no fix yet> | <required or not required>".`

// A PR the host reports as conflicting gets no CI on new pushes, and one
// behind its base is tested against a stale base: merge the base in first.
// Same text in deliver-package.js and small-change.js: change all three.
const BASE_CURRENT = `Base current before CI: before waiting on CI, and again at each poll, read the PR's merge state from the hosting service (\`gh pr view <pr> --json mergeable,mergeStateStatus,baseRefName\`, or mergeable_state in the API) and fetch the branch the PR targets. If the host reports the PR as conflicting ("dirty", CONFLICTING), a push gets no CI run at all, so never wait on one. If the base has commits the head lacks ("behind", or \`git merge-base --is-ancestor origin/<base> HEAD\` fails), CI would run against a stale base and may never settle. In either case merge the base into the head first: on a branch someone else owns or also pushes to, always with a merge commit, never a rebase or force-push; on your own branch, the repository's convention (a merge commit unless the profile requires a rebase, then push with --force-with-lease). Resolve conflicts keep-both: shared lists keep both sides' entries in the file's order with no duplicates, lockfiles and generated files take the base's version and are regenerated with the project's tooling, and code changed on both sides is combined only if both intents provably hold; otherwise abort the merge and report the files as "red: conflicts: <files>". Run the local check, push, and only then poll CI, for the new head SHA.`

// When the default branch gains a new member of a set this PR edits member
// by member (a preset, a workflow, a target), the merge is clean but the PR
// is incomplete; the sync step looks for that, not only for conflicts.
const CROSS_PR = (head, base) => `Cross-PR items: list what the merge brought in from ${base} (\`git diff <previous merge base>..<merged ${base} tip> --stat\`, and the PRs those commits came from). Where this PR applies one change to every member of a set (every preset, profile, variant, workflow, CI job, build target, locale or config entry of a kind) and ${base} added a new member of that set, or changed a file this PR must also touch for the same reason, extend this PR's change to it with the same edit, in its own commit ("<type>: apply <this change> to <new item> from <PR>"), and list it under cross_pr. Where ${base} renamed, moved or changed an interface this PR uses, adapt this PR to it the same way. If an extension needs new behaviour, a path ${head}'s author does not own, or a decision the other PR's author should make, do not make it: list it under unresolved as "cross-PR: <item>: <why>".`

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
    merge_sha: { type: 'string' },
    conflicts_resolved: { type: 'array', items: { type: 'string' } },
    keep_both_only: { type: 'boolean' },
    cross_pr: { type: 'array', items: { type: 'string' } },
    unresolved: { type: 'array', items: { type: 'string' } },
    check_passed: { type: 'boolean' },
    ci: { type: 'string' },
    flakes: { type: 'array', items: { type: 'string' } },
    red_on_base: { type: 'array', items: { type: 'string' } },
    base_red_required: { type: 'boolean' },
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
    carried_from: { type: 'string' },
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
2. Make the smallest edit that does it; touch nothing else. If it turns out to need new behaviour another role would notice, a contract change or a new doc page, do not make it: return done: false with the reason.
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
// What each sync round merged and how, so the review step can tell a
// keep-both merge (the pass carries) from one that needs a delta review.
const merges = []
const flakes = []
// Checks red or hung on the default branch too: reported, never fixed here.
let redOnBase = []
let baseRedRequired = false
for (let round = 1; round <= MAX_SYNC; round++) {
  phase('Sync')
  s = await agent(
    `Bring ${pr} (head ${a.head_branch}) up to date with ${a.default_branch} and verify it. Follow engineering-practices git-workflow.
1. Fetch, then read the PR's merge state from the hosting service. A PR it reports as conflicting (mergeable_state "dirty", CONFLICTING) gets no CI on any new push until the base is merged in, so this merge is required even if the local branch looks current. Merge the latest remote ${a.default_branch} into ${a.head_branch}. Use a merge, not a rebase: it never rewrites published commits, works on a branch others push to, and needs no force-push. ${a.shared_branch ? 'Others push to this branch: pull their commits first, and always merge.' : 'On a branch someone else owns, always merge. Rebase only if the profile requires it and you alone push to the branch, then push with --force-with-lease.'} If the branch already contains ${a.default_branch}'s tip and the host does not report it as conflicting, skip to step 4.
2. Resolve conflicts:
   - Shared lists (changelogs, docs indexes, catalogs and registries, manifests, lists of files, routes or tests): keep every entry from both sides, in the file's own order (sorted, numbered or appended), with no duplicates; renumber positions only where nothing references the number.
   - Enum values or id tables: keep both sides' entries if their ids differ. If both sides took the same id or value, stop: renumbering one would silently change an id that code, data or saves already use. List the file under unresolved.
   - Lockfiles and generated files: take ${a.default_branch}'s version, then regenerate with the project's tooling. Never hand-merge them.
   - Code or prose where both sides changed the same logic: keep both intents if you can show they combine; if picking either side loses behaviour, stop, abort the merge and list the files under unresolved.
   Say whether every conflict was a keep-both resolution (keep_both_only): each conflicted hunk kept both sides' lines unchanged, in order, with nothing else edited in the merge commit. Any rewritten line, dropped line, regenerated file or combined logic makes it false.
3. Commit the merge with the default message, or "chore: merge ${a.default_branch} into ${a.head_branch}" if the project requires Conventional Commit subjects on every commit.
4. ${CROSS_PR(a.head_branch, a.default_branch)}
5. Re-run the local check: ${a.local_check}. If it fails because of the merge, fix it with the smallest edit and commit; if it fails on ${a.default_branch} too, note that and do not widen the PR.
6. Push, then: ${BASE_CURRENT} Files such a merge cannot resolve go under unresolved. ${CI_POLL} If CI is red because of this PR or the merge, fix it (smallest edit, local check, Conventional Commit, push) and poll again; at most two fix attempts. ${FLAKE} ${RED_BASE}
7. Fetch once more and say whether ${a.default_branch} moved past the commit you merged (base_moved).
Return the head SHA, the ${a.default_branch} SHA you merged, the merge commit SHA (merge_sha, empty if nothing was merged), conflicts resolved, keep_both_only, cross-PR items applied (cross_pr), unresolved files and items, whether the local check passed, the CI state, flakes, red_on_base and base_red_required, and base_moved.`,
    { schema: SYNC, phase: 'Sync', label: `sync:${round}` },
  )
  if (!s) return `blocked: sync of ${pr} failed (agent returned nothing); check the branch for a half-finished merge`
  flakes.push(...(s.flakes || []))
  const onBase = /^red-on-base/.test(s.ci || '')
  redOnBase = onBase ? (s.red_on_base || [s.ci]) : []
  baseRedRequired = onBase && s.base_red_required === true
  if (s.merge_sha) merges.push({ sha: s.merge_sha, keep_both_only: s.keep_both_only === true || !(s.conflicts_resolved || []).length, conflicts: s.conflicts_resolved || [], cross_pr: s.cross_pr || [] })
  if ((s.unresolved || []).length) return `blocked: ${pr} has conflicts or cross-PR items that lose behaviour either way, or need another author's call; resolve by hand or with the other change's author:\n${list(s.unresolved)}`
  if (!s.check_passed) return `blocked: local check fails on ${pr} after syncing with ${a.default_branch}`
  if (/^pending/.test(s.ci || '')) return `waiting: CI on ${pr} is still running (${s.ci}); ${WAIT}, then run land-pr again`
  if (!onBase && !/^(green|none)/.test(s.ci || '')) return `blocked: CI on ${pr} is ${s.ci}; fix it, then run land-pr again`
  if (!s.base_moved) break
  log(`round ${round}: ${a.default_branch} moved while CI ran`)
  if (round === MAX_SYNC) return `blocked: ${a.default_branch} kept moving through ${MAX_SYNC} sync rounds; run land-pr again when it is quieter, or use the project's merge queue`
}

phase('Review')
const v = await agent(
  `Read the review state of ${pr} at head ${s.head_sha || '(current head)'}. Do not edit code.
The reviewer is the project's code-reviewer role, or the peer the profile names; never the project owner unless the profile says so. Read reviews, review comments and PR comments (a reviewer on a shared account may post its verdict as a comment review), and find the reviewer's latest pass and the head SHA it covered.
Which pass counts:
- A pass on the current head counts.
- A pass on an earlier head carries to the current head when every commit after it is a merge of ${a.default_branch} whose conflict resolutions kept both sides unchanged (keep-both). Check each merge with \`git show --remerge-diff <merge>\`: it shows only what the resolution changed against a plain merge, so it must be empty or show only hunks that keep both sides' lines as they were. A conflict-free merge carries silently. A keep-both merge carries with a note: post one PR comment addressed to the reviewer (and, if the reviewer is an agent session, message it too) saying "Pass carried from <passed SHA> to <current head>: the only commits since are merges of ${a.default_branch} resolved keep-both", followed by each merge's remerge-diff, so the reviewer can object; then return "passed" with carried_from set to the passed SHA. Do not ask for a full re-review for these.
- Any other commit after the pass (a fix, a cross-PR extension, a merge that rewrote, dropped or combined lines, a regenerated file) needs a new pass, but of the delta only: when asking, name those commits and paste their diffs and remerge-diffs, and say the rest was passed at <passed SHA>.
${merges.length ? `This run merged: ${merges.map((m) => `${m.sha} (${m.keep_both_only ? 'keep-both or conflict-free' : `conflicts edited: ${m.conflicts.join(', ') || 'see the merge'}`}${m.cross_pr.length ? `; cross-PR commits: ${m.cross_pr.join('; ')}` : ''})`).join('; ')}. Cross-PR commits are new code and need a delta pass.\n` : ''}${followup ? `A follow-up commit ("${followup}") was just added, so a pass on an earlier head does not carry; the reviewer must pass it (as a delta). ` : ''}Return state "passed" (a pass that counts, with nothing left to do), "should-fix" (the reviewer passed it but asked for non-blocking fixes before merge, such as should-fix or nit items they want done now: list each under open_items), "changes" (list every unanswered or unfixed blocking finding), or "waiting". If waiting and nobody has been asked for this head, mark the PR ready if it is a draft and CI is green, none or red-on-base, ${REVIEWER}, and return asked: true.`,
  { schema: VERDICT, phase: 'Review', label: 'review' },
)
if (!v) return `blocked: could not read the review state of ${pr} (agent returned nothing)`
if (v.state === 'changes') return `changes requested on ${pr}:\n${list(v.open_items)}\nFix them on ${a.head_branch}, answer each comment, then run land-pr again.`
if (v.state === 'should-fix') {
  const sf = await agent(
    `The reviewer passed ${pr} but asked for these fixes before merge:
${list(v.open_items)}
On ${a.head_branch} (fetch, check out its remote tip${a.shared_branch ? ', pull others\' commits first' : ''}), make each with the smallest edit, run the local check (${a.local_check}), commit (Conventional Commits) and push. Answer each review comment with what changed. A pass covers one head only, so ${REVIEWER}, asking for a pass on the new head with one line per fix. If an item would widen the PR, do not make it: reply why and list it under skipped. Follow engineering-practices git-workflow.
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
    ...(flakes.length ? { flakes } : {}),
    ...(redOnBase.length ? { red_on_base: redOnBase } : {}),
    next: `${WAIT}; then run /engineering-practices:land-pr { pr: "${pr}" } again, which re-syncs, re-checks CI and merges once the new head is passed`,
  }
}
if (v.state !== 'passed') {
  return {
    pr,
    ci: s.ci,
    review: `waiting on ${v.reviewer || 'the reviewer'}${v.asked ? ' (asked now)' : ''}`,
    ...(flakes.length ? { flakes } : {}),
    ...(redOnBase.length ? { red_on_base: redOnBase } : {}),
    next: `check the verdict yourself, do not wait to be notified: ${WAIT}; when it passes, run /engineering-practices:land-pr { pr: "${pr}" } again`,
  }
}

// A required check red on the default branch blocks every PR alike: the
// run stops with the PR passed instead of polling until the check clears.
if (baseRedRequired) {
  return {
    pr,
    merged: false,
    ci: s.ci,
    review: v.carried_from ? `passed (carried from ${v.carried_from})` : 'passed',
    red_on_base: redOnBase,
    ...(flakes.length ? { flakes } : {}),
    next: `not merged: a check the repository requires is red or hung on ${a.default_branch} too (commented on the PR once); do not poll for it. Run /engineering-practices:land-pr { pr: "${pr}" } again when ${a.default_branch} is green again or the fix named above merges; that run re-syncs and merges`,
  }
}

phase('Merge')
const m = await agent(
  `Squash-merge ${pr}. Follow engineering-practices git-workflow, section 5.
1. Fetch. If the PR head is no longer ${s.head_sha || 'the SHA verified in the sync step'}, or ${a.default_branch} moved past ${s.base_sha || 'the commit merged in the sync step'}, do not merge: return merged: false with reason "moved".
2. Refresh the PR title and description against the final diff, keeping any attribution block or template the project requires at the top: the title is a valid Conventional Commit line; the body says what changed and why, how it was tested, docs by Diataxis kind, anything stubbed or not original, and footers (Refs:, BREAKING CHANGE:, co-author trailers).${redOnBase.length ? ` Add a "Red on ${a.default_branch}" section listing these checks, which fail on ${a.default_branch} too and which the repository does not require to merge:\n${list(redOnBase)}` : ''}
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
const row = args.row ? String(args.row).trim() : ''
const notify = Array.isArray(args.notify) ? args.notify.map(String).filter((x) => x.trim()) : (args.notify ? [String(args.notify)] : [])
const done = { pr, merged: true, squash_sha: m.squash_sha, ci: s.ci, ...(v.carried_from ? { review_carried_from: v.carried_from } : {}), ...(flakes.length ? { flakes } : {}), ...(redOnBase.length ? { red_on_base: redOnBase } : {}) }
if (!row && !notify.length) return { ...done, next: 'tell whoever asked for the change, and any dependant, with the PR link' }

// The merge is the end of the change but not of the work: the plan row and
// the people waiting on it are what threads otherwise do by hand.
phase('Close')
const c = await agent(
  `${pr} is squash-merged as ${m.squash_sha || 'the squash commit'} on ${a.default_branch}.
${row ? `1. Fetch ${a.default_branch} and read the status row for ${row}. If it already reads the project's merged-state value (from the plan's legend or status convention), report "already". If not, set it with the smallest change the project allows for plan rows: a direct commit only where the project lets plan rows change outside a PR, otherwise /engineering-practices:small-change { change: "mark ${row} with its merged-state value, Refs: ${pr}", merge: true }; report "fixed" with the PR link, or "not-fixed" and why.` : '1. No row was given: report "none".'}
${notify.length ? `2. Tell each of these, once, with the PR link, the squash SHA and one line on what landed: 
${list(notify)}
An agent session or thread gets a cross-session message (engineering-practices peer-coordination, "Find the right agent"); a person or bot with its own account gets a mention on the PR or the issue it tracks. Never message or mention the project owner unless the profile names them for this. Report who you told and who you could not reach.` : '2. Nobody to notify.'}
Do not change anything else.`,
  { schema: CLOSE, phase: 'Close', label: 'close' },
)
if (!c) return { ...done, row: 'unverified', notified: [], next: `the close step returned nothing: check ${row || 'the status row'} on ${a.default_branch} and tell ${notify.join(', ') || 'whoever asked'} by hand` }
const missed = c.not_notified || []
return {
  ...done,
  row: c.row,
  ...(c.row_pr ? { row_pr: c.row_pr } : {}),
  notified: c.notified,
  ...(missed.length ? { not_notified: missed } : {}),
  next: c.row === 'not-fixed' || missed.length ? `still owed: ${[c.row === 'not-fixed' ? `the ${row} status row` : '', ...missed].filter(Boolean).join('; ')}` : 'done',
}
})(RUN.agent, RUN.phase, RUN.log)]); return RUN.finish(RUN_OUT)
