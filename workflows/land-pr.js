// SPDX-License-Identifier: GPL-2.0-or-later
export const meta = {
  name: 'land-pr',
  description: 'Take an existing branch or pull request to a squash merge, in any role: keep it current with the default branch, resolve conflicts, poll CI yourself, check the reviewer verdict, refresh the PR body and squash-merge. args: { pr: "<number or URL>" } or { branch: "<existing branch>", title: "<Conventional Commit title if a PR must be opened, optional>" }',
  phases: [
    { title: 'Adopt', detail: 'find or open the PR for the branch; read the default branch; confirm you can push to the head branch' },
    { title: 'Sync', detail: 'merge the latest default branch in, resolve conflicts, re-run local checks, push, poll CI; repeat while the default branch moves (max 3 rounds)' },
    { title: 'Review', detail: 'read the reviewer verdict on the current head; ask for review if nobody has been asked' },
    { title: 'Merge', detail: 'refresh the PR body, confirm head and base are still the verified ones, squash-merge' },
  ],
}

const USAGE = 'usage: land-pr { pr: "<number or URL>" } or land-pr { branch: "<existing branch>", title: "<Conventional Commit title, optional>" }'
if (!args || (!args.pr && !args.branch)) return USAGE

const list = (xs) => (xs && xs.length ? '- ' + xs.join('\n- ') : '- none')
const MAX_SYNC = 3

// PR events (CI results, reviews) do not reliably reach an agent, so every
// wait here is a bounded poll the agent runs itself.
const CI_POLL = `Check CI yourself; never wait for a notification or webhook to say it finished. Read the check runs and commit statuses for the PR's current head SHA (for example \`gh pr checks <pr> --watch --fail-fast\`, or the hosting service's checks API or tool), polling every 30 to 60 seconds for up to 20 minutes, and make sure the result belongs to that SHA, not an earlier push. Report exactly one of: "green" (every required check passed), "red: <check> <one-line cause>" (read the failing log first), "pending: <checks still running>" (timed out), or "none" (the repository runs no CI on PRs).`

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
    state: { type: 'string', enum: ['passed', 'changes', 'waiting'] },
    reviewer: { type: 'string' },
    open_items: { type: 'array', items: { type: 'string' } },
    asked: { type: 'boolean' },
  },
  required: ['state'],
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
  if (/^pending/.test(s.ci || '')) return `waiting: CI on ${pr} is still running (${s.ci}); check it yourself later, then run land-pr again`
  if (!/^(green|none)/.test(s.ci || '')) return `blocked: CI on ${pr} is ${s.ci}; fix it, then run land-pr again`
  if (!s.base_moved) break
  log(`round ${round}: ${a.default_branch} moved while CI ran`)
  if (round === MAX_SYNC) return `blocked: ${a.default_branch} kept moving through ${MAX_SYNC} sync rounds; run land-pr again when it is quieter, or use the project's merge queue`
}

phase('Review')
const v = await agent(
  `Read the review state of ${pr} at head ${s.head_sha || '(current head)'}. Do not edit code.
The reviewer is the project's code-reviewer role, or the peer the profile names; never the project owner unless the profile says so. A pass counts only if it covers the current head or the only commits after it are merges of ${a.default_branch} with no conflict edits in reviewed files. Read reviews, review comments and PR comments (a reviewer on a shared account may post its verdict as a comment review).
Return state "passed", "changes" (list every unanswered or unfixed finding), or "waiting". If waiting and nobody has been asked for this head, mark the PR ready if it is a draft and CI is green or none, ask the reviewer with the PR link and one line on what changed (engineering-practices peer-coordination), and return asked: true.`,
  { schema: VERDICT, phase: 'Review', label: 'review' },
)
if (!v) return `blocked: could not read the review state of ${pr} (agent returned nothing)`
if (v.state === 'changes') return `changes requested on ${pr}:\n${list(v.open_items)}\nFix them on ${a.head_branch}, answer each comment, then run land-pr again.`
if (v.state !== 'passed') {
  return {
    pr,
    ci: s.ci,
    review: `waiting on ${v.reviewer || 'the reviewer'}${v.asked ? ' (asked now)' : ''}`,
    next: `check the verdict yourself later, do not wait to be notified; when it passes, run /engineering-practices:land-pr { pr: "${pr}" } again`,
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
