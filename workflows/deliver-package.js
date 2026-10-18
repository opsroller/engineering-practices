export const meta = {
  name: 'deliver-package',
  description: 'Take one work package from plan to a reviewed, ready pull request',
  whenToUse: 'Run a work package end to end. args: { wp: "WP-NN", plan: "<path to work-package plan, optional>" }',
  phases: [
    { title: 'Plan', detail: 'read the package, contracts and profile' },
    { title: 'Build', detail: 'implement on the package branch' },
    { title: 'Check', detail: 'independent review and fix loop' },
    { title: 'Ship', detail: 'PR ready, dependants told' },
  ],
}

const wp = (args && args.wp) || 'the work package named by the requester'
const plan = (args && args.plan) || 'the project\'s work-package plan (see CLAUDE.md)'

const PLAN = { type: 'object', properties: {
  branch: { type: 'string' }, owned_paths: { type: 'array', items: { type: 'string' } },
  steps: { type: 'array', items: { type: 'string' } }, stubs: { type: 'array', items: { type: 'string' } },
  done_when: { type: 'string' } }, required: ['branch', 'owned_paths', 'steps', 'done_when'] }
const REVIEW = { type: 'object', properties: { blocking: { type: 'array', items: { type: 'string' } },
  other: { type: 'array', items: { type: 'string' } } }, required: ['blocking'] }

phase('Plan')
const p = await agent(`Follow the engineering-practices project-onboarding and work-packages skills for ${wp} in ${plan}. Return the branch name, owned paths, implementation steps, dependencies to stub against the contracts, and the done-when line. Do not write code yet.`, { schema: PLAN, label: 'plan' })

phase('Build')
await agent(`Implement ${wp} on branch ${p.branch}, writing only in ${p.owned_paths.join(', ')}.\nSteps:\n- ${p.steps.join('\n- ')}\nStub against the contracts: ${(p.stubs || []).join(', ') || 'none'}.\nDone when: ${p.done_when}\nCommit with Conventional Commits, run the project's build and tests, push, and open a draft PR titled as a Conventional Commit with "Refs: ${wp}".`, { label: 'build' })

phase('Check')
for (let round = 1; round <= 3; round++) {
  const r = await agent(`Act as an independent reviewer (code-reviewer role if installed) of the open PR for ${wp} on ${p.branch}. List blocking problems only where you can point to a realistic failure, and other suggestions separately.`, { schema: REVIEW, label: `review:${round}` })
  if (!r || !r.blocking.length) break
  log(`round ${round}: ${r.blocking.length} blocking`)
  await agent(`Fix these blocking review findings on ${p.branch}, run tests, commit (Conventional Commits) and push:\n- ${r.blocking.join('\n- ')}`, { label: `fix:${round}` })
}

phase('Ship')
return await agent(`For ${wp} on ${p.branch}: confirm tests and CI pass, update the package's status row in ${plan} within the PR, mark the PR ready and request the project's reviewer, and list the dependant packages to notify with the PR link (peer-coordination). Do not merge here; the author squash-merges after the reviewer passes it. Return the PR URL, CI state and the dependants.`, { label: 'ship' })
