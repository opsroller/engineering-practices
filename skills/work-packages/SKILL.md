---
name: work-packages
description: Use when you start, carry out or finish a work package from a project's plan, or when you need to split work into packages. Covers the package row, owned paths, building against contracts with stubs, small slices, done criteria and hand-off.
---

# Work packages

A work package (WP) is one unit of deliverable work in the project's
plan, staffed with one role. It is the team's small batch: small enough
to finish, review and merge in hours to a couple of days, large enough
to deliver something a dependant can use.

## The package row

Each row in the plan carries:

| Field | Meaning |
|---|---|
| `WP-<id>` + name | Stable id used in branches, commits (`Refs:`) and threads |
| Role | The job function that does it (one role plugin) |
| Owned paths | Where this package may write |
| Depends on | Packages or contracts it needs |
| Done when | One testable sentence: what is true when it is finished |
| Status | `planned`, `in progress`, `in review`, `merged`, `blocked` |

A row without a testable done-when is not ready; ask the coordinator
(the project-manager role) to fix the row before starting.

## Start

1. Onboard (`project-onboarding`), then read your row, the contracts it
   touches and its dependencies' status.
2. Branch `wp/<id>-<slug>` from the latest default branch
   (`git-workflow`). Set the row's status to `in progress` in your first
   PR commit or tell the coordinator.
3. **Dependencies not landed? Do not wait.** Build against the contract
   with a stub, fake or placeholder that honours it, and list each stub
   in the PR. If the contract itself is missing or unclear, agree it
   with its owner first (`peer-coordination`).
4. Plan the slices: the smallest sequence of PRs that each leaves the
   system working. If the package needs more than one PR, say so in the
   first.

## Work

- **Write only in your owned paths.** A change anywhere else is a
  request to that path's owner. The one exception is a minimal edit
  your change cannot work without, made under the cross-role edit rules
  in `peer-coordination`. Shared append-only files named in the
  profile (provenance log, credits, changelog, plan status) are open to
  all; append, never rewrite others' lines.
- Put your tests in files for your package rather than editing others'.
- Add new things beside old ones rather than changing a shared contract
  in place (expand, migrate, then contract; see `peer-coordination`).
- Run the project's build and tests before every push.
- Hit something outside scope? Note it as a follow-up in the PR (or ask
  the coordinator for a new package). Do not grow the package.

## Finish

- [ ] Done-when is true and demonstrable (test, screenshot, command output)
- [ ] Tests and CI green
- [ ] Docs for the work written in the project's docs, right Diataxis kind (`documentation`)
- [ ] Provenance recorded for anything not original (`provenance`)
- [ ] PR ready, title a Conventional Commit, body lists stubs, follow-ups, `Refs: WP-<id>`
- [ ] Row status updated in the same PR
- [ ] Reviewer passed it; you squash-merged it (`git-workflow`)
- [ ] Each dependant told, with the PR link (`peer-coordination`)

## Splitting work into packages (for whoever plans)

- **Vertical slices** deliver one thin end-to-end behaviour; prefer them
  when one role can own the whole slice.
- **Horizontal (contract-first)** splits by layer: agree the contract,
  then producer and consumer work in parallel against stubs.
- Each package: one role, disjoint owned paths, a done-when, at most a
  couple of days. Anything bigger is split again (INVEST: independent,
  negotiable, valuable, estimable, small, testable).
- Refactors and enabling work get their own packages, landed first.

## Failure modes

- Waiting for a dependency instead of stubbing against the contract.
- Scope creep: "while I was there" changes in someone else's area.
- A done-when nobody can test ("works well", "looks good").
- Batching several finished slices into one late PR, which delays the
  feedback the small batch was for.
