// SPDX-License-Identifier: GPL-2.0-or-later
export const meta = {
  name: 'small-change',
  description: 'Land one small chore-sized change (a config line, a dependency bump, a docs index fix) as a squash-merged Conventional Commit, in any role. Open: args { change: "<what to change and why>" (required), type: "<conventional type, optional>", scope: "<optional>" }. Merge after the reviewer passes: args { pr: "<number or URL>", merge: true }',
  phases: [
    { title: 'Scope', detail: 'confirm the change is small; otherwise stop and point to deliver-package' },
    { title: 'Change', detail: 'branch off the latest default branch, make the minimal change, run the local check, commit, push, open a draft PR' },
    { title: 'Check', detail: 'independent read of the diff, one fix round at most' },
    { title: 'Hand off', detail: 'poll CI yourself until it settles, mark ready, ask the reviewer' },
    { title: 'Merge', detail: 'bring the default branch in right before merging, re-check CI, squash-merge, delete the branch' },
  ],
}

// --- run-modes v1 begin ---
const RUN = ((a, realAgent, realPhase, realLog) => {
  const opted = !!(a && typeof a === 'object' && a.run && typeof a.run === 'object')
  const c = opted ? a.run : {}
  const mode = c.mode === 'inline' ? 'inline' : 'agents'
  const results = c.results && typeof c.results === 'object' ? c.results : {}
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
    const ph = op.phase || current
    const base = op.label || ph || 'agent'
    seen[base] = (seen[base] || 0) + 1
    const key = seen[base] > 1 ? `${base}#${seen[base]}` : base
    let note = null
    if (has(results, key)) {
      const gap = missing(results[key], op.schema)
      if (!gap) { out[key] = results[key]; return Promise.resolve(results[key]) }
      note = `answer missing ${gap}; answer this brief again`
    }
    if (!picked(ph, base)) { skipped.push(key); return Promise.resolve(null) }
    if (mode === 'agents') {
      return realAgent(prompt, opts).then((r) => { if (r !== null && r !== undefined) out[key] = r; return r })
    }
    next.push(note ? { key, phase: ph, prompt, schema: op.schema || null, note } : { key, phase: ph, prompt, schema: op.schema || null })
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
    if (value === '__run_halted__') {
      return {
        run: 'inline', status: 'next', next, results: out, skipped, logs,
        how: 'Do each brief in next yourself, in order: follow its prompt in this session (it may tell you to edit files, commit or push), and shape your answer to its schema when one is given, with every required field. A brief with a note was answered before without the fields it names. Add each answer to results under its key, then run this workflow again with the same args and run.results set to the merged results. Repeat until status is "done".',
      }
    }
    return { run: mode, status: 'done', result: value, results: out, skipped, logs }
  }
  return { agent, phase, log, finish, halted, error }
})(typeof args === 'undefined' ? undefined : args, agent, phase, log)
if (RUN.error) return RUN.error
const RUN_OUT = await Promise.race([RUN.halted, (async (agent, phase, log) => {
// --- run-modes v1 end (workflow body follows; close it with the tail line) ---

const USAGE = 'usage: small-change { change: "<what to change and why>", type: "<optional>", scope: "<optional>" } to open; small-change { pr: "<number or URL>", merge: true } to merge once the reviewer has passed it'
if (!args || (!args.change && !(args.pr && args.merge))) return USAGE

const list = (xs) => (xs && xs.length ? '- ' + xs.join('\n- ') : '- none')

// Notifications about CI and reviews are not reliable; every CI wait in this
// workflow is a bounded poll the agent runs itself.
const CI_POLL = `Check CI yourself; never wait for a notification or webhook to tell you it finished. Read the check runs and commit statuses for the PR's current head commit (for example \`gh pr checks <pr> --watch --fail-fast\`, or the hosting service's checks API or tool), polling every 30 to 60 seconds for up to 20 minutes. Make sure the result belongs to the latest head SHA, not an earlier push. Report exactly one of: "green" (every required check passed), "red: <check> <one-line cause>", "pending: <checks still running>" (timed out), or "none" (the repository runs no CI on PRs). On red, read the failing log before you report.`

const SCOPE = {
  type: 'object',
  properties: {
    small: { type: 'boolean' },
    why_not: { type: 'string' },
    default_branch: { type: 'string' },
    branch: { type: 'string' },
    title: { type: 'string' },
    files: { type: 'array', items: { type: 'string' } },
    local_check: { type: 'string' },
  },
  required: ['small', 'default_branch', 'branch', 'title', 'local_check'],
}
const CHANGE = {
  type: 'object',
  properties: {
    pr_url: { type: 'string' },
    head_sha: { type: 'string' },
    check_passed: { type: 'boolean' },
    check_output: { type: 'string' },
    diff_lines: { type: 'number' },
  },
  required: ['check_passed'],
}
const REVIEW = {
  type: 'object',
  properties: {
    blocking: { type: 'array', items: { type: 'string' } },
    other: { type: 'array', items: { type: 'string' } },
  },
  required: ['blocking'],
}
const HANDOFF = {
  type: 'object',
  properties: {
    pr_url: { type: 'string' },
    ci: { type: 'string' },
    ready: { type: 'boolean' },
    reviewer_asked: { type: 'string' },
  },
  required: ['ci', 'ready'],
}
const MERGE = {
  type: 'object',
  properties: {
    merged: { type: 'boolean' },
    squash_sha: { type: 'string' },
    ci: { type: 'string' },
    reason: { type: 'string' },
  },
  required: ['merged'],
}

if (args.pr && args.merge) {
  const pr = String(args.pr)
  phase('Merge')
  const m = await agent(
    `Squash-merge pull request ${pr}, following the engineering-practices git-workflow skill (section 5, Merge).
1. Read the PR. Do not merge, and return merged: false with the reason, if it is still a draft, if any review comment is unanswered, or if the project's reviewer (the code-reviewer role, or the peer the profile names; never the project owner) has not passed its current head. What counts as a pass follows the project's review convention in the profile: an approval, or a pass comment or comment review where reviewer and author share an account.
2. Right before merging, bring the latest default branch into the PR branch so it is tested against what it will land on: fetch, then rebase onto the default branch (push with --force-with-lease, which refuses to overwrite commits you have not seen) on a branch only you push to, or merge the default branch in if the profile says so or others push to it. Skip the push if the branch already contains the default branch's tip.
   If the update conflicts, or needs a lockfile or generated file regenerated, the result is new code the reviewer never saw: resolve it with the smallest edit that keeps both sides (regenerate with the project's tooling, never by hand), run the local check, push, poll CI as in step 3, ask the reviewer to look again with the new head SHA and the files you resolved, and return merged: false with the reason "updated with conflict resolution; needs the reviewer's pass on <new head SHA>". Do not merge in this run.
3. Re-run the project's local check for the touched files. If you pushed, CI runs again: ${CI_POLL}
4. Merge only if CI is "green" or "none", the branch is current, and the update in step 2 was conflict-free. If the default branch moved again while you waited, repeat steps 2 and 3 once more (the conflict rule still applies); if it keeps moving, stop and return the reason.
5. Squash-merge with the PR title as the subject (a valid Conventional Commit) and a body trimmed to the why plus footers (Refs:, BREAKING CHANGE:, co-author trailers). Use squash, never a merge commit or rebase-merge. Delete the branch.
Return whether it merged, the squash commit SHA, the final CI state, and the reason if it did not merge.`,
    { schema: MERGE, phase: 'Merge', label: 'merge' },
  )
  if (!m) return `blocked: merge step for ${pr} failed (agent returned nothing); check the PR state before retrying`
  if (!m.merged) return `not merged: ${pr}: ${m.reason || 'no reason given'} (CI: ${m.ci || 'unknown'})`
  return { pr, merged: true, squash_sha: m.squash_sha, ci: m.ci, next: 'tell whoever asked for the change, and any dependant, with the PR link' }
}

const change = String(args.change)
const typeHint = args.type ? `Use the Conventional Commit type "${args.type}"${args.scope ? ` with scope "${args.scope}"` : ''}.` : 'Pick the Conventional Commit type from the engineering-practices commit reference (often chore, build, ci, docs or fix for changes this size).'

phase('Scope')
const s = await agent(
  `A small change is wanted: "${change}".
Follow the engineering-practices skills project-onboarding (just enough: CLAUDE.md, the project profile, contributing rules) and git-workflow. Do not edit anything yet.
Decide whether this is a small change: one concern, a handful of lines in a few files, no new behaviour a user or another role would notice, no change to a shared contract or public interface, nothing that needs new tests or a new doc page beyond a one-line fix. A dependency bump counts only if it needs no code changes to adapt. If it is not small, return small: false with why_not.
Otherwise return: the default branch name (read it from the remote, do not assume "main"); a branch name per the profile, else <type>/<slug>; the PR title as a valid Conventional Commit line; the files you expect to touch; and the fastest local check that proves the change sound (the project's lint, format, build, test or validator command for those files; for a docs index, a link check or the docs build). ${typeHint}`,
  { schema: SCOPE, phase: 'Scope', label: 'scope' },
)
if (!s) return `blocked: scoping failed (agent returned nothing). ${USAGE}`
if (!s.small) return `not small: ${s.why_not || 'no reason given'}. Use /engineering-practices:deliver-package (or a work package) instead.`

phase('Change')
const c = await agent(
  `Make this small change: "${change}".
1. Fetch, then cut branch ${s.branch} from the latest ${s.default_branch} on the remote (not a stale local copy). Never commit to ${s.default_branch} directly.
2. Make the minimal edit, expected in: ${(s.files || []).join(', ') || 'the files the change needs'}. Touch nothing else: no drive-by reformatting, renames or unrelated fixes. Keep every license header the project requires on new files (engineering-practices provenance skill). If a dependency bump changes a lockfile, regenerate it with the project's tool.
3. Run the local check: ${s.local_check}. If it fails because of your change, fix it; if it fails on ${s.default_branch} too, note that and do not widen the change to fix it.
4. Commit as "${s.title}" (Conventional Commits 1.0.0), with a body saying why if the subject does not, and any footers the project requires.
5. Push and open a draft PR with that title. Description: what changed and why in two or three sentences, the local check you ran and its result, anything left out. Include any attribution or template the project requires.
Return the PR URL, head SHA, whether the local check passed, the check's last lines of output, and the number of changed lines.`,
  { schema: CHANGE, phase: 'Change', label: 'change' },
)
if (!c) return `blocked: change step failed (agent returned nothing); branch ${s.branch} may hold partial work`
if (!c.check_passed) return `blocked: local check failed on ${s.branch}:\n${c.check_output || '(no output)'}\nPR: ${c.pr_url || '(not opened)'}`

phase('Check')
const reviewPrompt = `Act as an independent reviewer of the draft PR ${c.pr_url || 'on ' + s.branch} for "${change}". Do not edit anything.
Read the whole diff. Check: it does only what was asked and nothing else; it is still small (one concern, no behaviour or contract change); the title is a valid Conventional Commit of the right type; license headers are present where the project requires them; lockfiles or generated files were regenerated by tooling, not hand-edited; docs that reference what changed (an index, a version, a path) still match.
List blocking problems only where you can point to a realistic failure or a broken rule; list other suggestions separately.`
let r = await agent(reviewPrompt, { schema: REVIEW, phase: 'Check', label: 'review' })
if (!r) return `blocked: review of ${c.pr_url || s.branch} returned nothing; the PR is unverified and stays draft`
if ((r.blocking || []).length) {
  const fixed = await agent(
    `Fix these review findings on ${s.branch} (PR ${c.pr_url || 'open for this branch'}) with the smallest edit, re-run the local check (${s.local_check}), commit (Conventional Commits) and push:
${list(r.blocking)}`,
    { phase: 'Check', label: 'fix' },
  )
  if (!fixed) log('fix agent returned nothing; re-reviewing the branch as it stands')
  r = await agent(reviewPrompt, { schema: REVIEW, phase: 'Check', label: 're-review' })
  if (!r || (r.blocking || []).length) {
    return `blocked: ${c.pr_url || s.branch} still has open items after one fix round:\n${list(r ? r.blocking : ['re-review returned nothing'])}\nA change that needs more than one round is probably not small; consider deliver-package.`
  }
}

phase('Hand off')
const h = await agent(
  `Hand off the draft PR ${c.pr_url || 'on ' + s.branch} for review.
1. ${CI_POLL}
2. If CI is "red" because of this change, fix it on the branch (smallest edit, local check, Conventional Commit, push) and poll again; at most two fix attempts. If it is red on ${s.default_branch} too, say so and do not widen the PR.
3. When CI is "green" or "none", re-read the title and description against the final diff, mark the PR ready for review, and ask the project's reviewer (the code-reviewer role, or the peer the profile names) to review it, with the PR link and one line on what changed. Never ask the project owner to review unless the profile says so. If CI is still "pending" or "red", leave the PR as draft and say what is outstanding.
Follow engineering-practices git-workflow and peer-coordination. Do not merge here.
Return the PR URL, the CI state, whether the PR is ready, and who was asked to review.`,
  { schema: HANDOFF, phase: 'Hand off', label: 'handoff' },
)
if (!h) return `blocked: hand-off for ${c.pr_url || s.branch} failed (agent returned nothing); the PR is still draft`
return {
  pr: h.pr_url || c.pr_url,
  ci: h.ci,
  ready: h.ready,
  reviewer: h.reviewer_asked || 'not asked',
  notes: (r.other || []).length ? r.other : [],
  next: h.ready
    ? `when the reviewer passes it, run /engineering-practices:small-change { pr: "${h.pr_url || c.pr_url}", merge: true } (it brings ${s.default_branch} in, re-checks CI itself and squash-merges)`
    : `the PR is still draft: poll CI on ${h.pr_url || c.pr_url} yourself until it is green (fix it if red), then mark it ready and ask the reviewer by hand (engineering-practices git-workflow); do not re-run open mode, which would cut a second branch`,
}
})(RUN.agent, RUN.phase, RUN.log)]); return RUN.finish(RUN_OUT)
