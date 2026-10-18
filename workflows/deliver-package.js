// SPDX-License-Identifier: GPL-2.0-or-later
export const meta = {
  name: 'deliver-package',
  description: 'Take one work package from its plan row to a ready, documented, independently checked pull request, in any role. args: { wp: "WP-NN" (required), plan: "<path to the work-package plan, optional>", branch: "<existing branch to work on, optional>", pr: "<existing PR number or URL, optional>" }',
  phases: [
    { title: 'Plan', detail: 'onboard, read the package and contracts, plan slices, stubs and affected Diataxis doc kinds' },
    { title: 'Build', detail: 'implement on the package branch with provenance recorded' },
    { title: 'Document', detail: 'write or update the planned Diataxis pages in the same PR' },
    { title: 'Check', detail: 'independent review of change and docs, fix loop (max 3 rounds)' },
    { title: 'Ship', detail: 'PR ready for the code reviewer, plan row updated, dependants listed' },
  ],
}

const USAGE = 'usage: deliver-package { wp: "WP-NN", plan: "<path to work-package plan, optional>", branch: "<existing branch, optional>", pr: "<existing PR, optional>" }'
if (!args || !args.wp) return USAGE
const wp = String(args.wp)
const plan = args.plan ? String(args.plan) : "the project's work-package plan (path in CLAUDE.md or the project profile)"

// Some agents may push only to a branch they were assigned, or pick up a
// package someone already started; then the workflow reuses that branch
// or PR instead of cutting wp/<id>-<slug>.
const existing = args.pr
  ? `Use the existing PR ${args.pr} and its head branch; do not create a new branch or PR.`
  : args.branch
    ? `Use the existing branch ${args.branch} (reuse its open PR if one exists); do not create a new branch.`
    : ''
const list = (xs) => (xs && xs.length ? '- ' + xs.join('\n- ') : '- none')

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
  },
  required: ['branch', 'owned_paths', 'steps', 'done_when', 'docs'],
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
  },
  required: ['pr_url', 'ci'],
}

phase('Plan')
const p = await agent(
  `Follow the engineering-practices skills project-onboarding, work-packages and documentation for ${wp} in ${plan}.
Read CLAUDE.md, the project profile, the package row and every contract it touches; run the baseline build and tests.
${existing ? existing + ' Return that branch name, after confirming you can push to it and reading any work already on it.' : ''}
Return: the branch name (${existing ? 'the existing one' : 'wp/<id>-<slug>'}), owned paths, implementation steps as small slices, dependencies to stub against their contracts, the done-when line, the project's docs layout, and the Diataxis plan: for each thing the package will produce, use the compass (action/cognition x study/work) and the documentation skill's "what each kind of work owes" table to list the doc kind, the page to add or update, and why.
List anything that prevents starting (missing row, no testable done-when, missing contract) under blockers. Do not write code yet.`,
  { schema: PLAN, phase: 'Plan', label: 'plan' },
)
if (!p) return `blocked: planning for ${wp} failed (agent returned nothing). ${USAGE}`
if (p.blockers && p.blockers.length) return `blocked: ${wp} cannot start:\n${list(p.blockers)}`
const owned = (p.owned_paths || []).join(', ') || '(none listed)'
const docsPlan = (p.docs || []).map((d) => `${d.kind}: ${d.page} (${d.why})`)

phase('Build')
const b = await agent(
  `Implement ${wp} on branch ${p.branch}, writing only in: ${owned}.
Follow the engineering-practices skills git-workflow, work-packages, provenance and peer-coordination, and the job-function plugin for this package's role.
Steps:
${list(p.steps)}
Stub against the contracts: ${(p.stubs || []).join(', ') || 'none'}.
Done when: ${p.done_when}
License every new file under the project's license with its header rule, never a template default; log every non-original item in the provenance log.
${existing ? `${existing} Fetch it and build on the work already there; if it is behind the default branch, merge the default branch in first.` : `Cut ${p.branch} from the latest remote default branch.`}
Commit with Conventional Commits, run the project's build and tests, push to ${p.branch}, and ${existing ? 'reuse its open PR (open a draft PR only if none exists), making sure the title is a Conventional Commit, with' : 'open a draft PR titled as a Conventional Commit with'} "Refs: ${wp}" in the body.
Return the PR URL, whether tests pass, and the non-original items added.`,
  { schema: BUILD, phase: 'Build', label: 'build' },
)
if (!b) return `blocked: build for ${wp} failed (agent returned nothing); branch ${p.branch} may hold partial work`

phase('Document')
const d = await agent(
  `Follow the engineering-practices documentation skill for ${wp} on branch ${p.branch} (PR ${b.pr_url || 'open for this branch'}). Docs layout: ${p.docs_layout || 'see the project profile'}.
Planned pages:
${list(docsPlan)}
Classify every user-visible change in this work with the Diataxis compass (action/cognition x study/work). For each, update or add exactly one page of that kind under the project's docs layout (default docs/<kind>/), keep each page to one kind, title it by the project pattern, and link to the related pages of the other kinds. Run every command and step you write. Commit the pages to the same PR (Conventional Commits) and push; list them by kind in the PR body.
Report pages touched and any change you left undocumented and why.`,
  { schema: DOCS, phase: 'Document', label: 'docs' },
)
if (!d) log('docs agent returned nothing; the review will check docs from scratch')

phase('Check')
let open = []
let reviewed = false
for (let round = 1; round <= 3; round++) {
  const r = await agent(
    `Act as an independent reviewer (follow the code-reviewer role if installed) of the open PR for ${wp} on ${p.branch}. Do not edit anything.
Check: done-when "${p.done_when}" is met; tests cover the change; only owned paths (${owned}) changed; Conventional Commit title; provenance logged and every new file carries the project's license header; docs per the engineering-practices documentation skill's Check step and the technical-writer docs-review checklist if installed (each touched page one Diataxis kind, titles follow the patterns, links connect the kinds, docs in this same PR, nothing user-visible left undocumented).
List blocking problems only where you can point to a realistic failure or a broken rule; list other suggestions separately.`,
    { schema: REVIEW, phase: 'Check', label: `review:${round}` },
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
  `For ${wp} on ${p.branch}: confirm the build, tests and CI pass; update the package's status row in ${plan} within the PR (status "in review"); re-read the PR title and description so they match the final change (docs by Diataxis kind, stubs, non-original items with licenses, "Refs: ${wp}"); mark the PR ready and request the project's reviewer (the code-reviewer role, not the project owner). Follow engineering-practices git-workflow and peer-coordination.
Do not merge here: the author squash-merges after the reviewer passes it and CI is green.
Return the PR URL, CI state, and the dependant packages to notify with the PR link once merged.`,
  { schema: SHIP, phase: 'Ship', label: 'ship' },
)
if (!s) return `blocked: ship step for ${wp} failed (agent returned nothing); PR ${b.pr_url || 'on ' + p.branch} is reviewed but not marked ready`
return {
  wp,
  pr: s.pr_url,
  ci: s.ci,
  docs: d ? d.pages : ['unverified: docs agent returned nothing'],
  undocumented: d ? d.undocumented || [] : [],
  dependants: s.dependants || [],
  next: `after the code reviewer passes, run /engineering-practices:land-pr { pr: "${s.pr_url}" } (keeps the branch current, polls CI itself and squash-merges), then tell each dependant`,
}
