---
name: work-packages
description: Use when you start, work or finish a work package from a project's plan. Covers owned paths, stubs against contracts, and done criteria.
---

# Work packages

A work package is one unit of work with a role, owned paths,
dependencies and a "done when" line, listed in the project's plan.

## Start

1. Read your row, the contracts it touches, and the project profile.
2. Branch `wp/<id>-<slug>` from the latest default branch.
3. If a dependency hasn't landed, build against the contract with a stub
   or placeholder and say so in the PR. Don't wait.

## Work

- Write only in your owned paths. Changes elsewhere go through the owner
  (peer-coordination). Shared append-only files named in the profile
  (provenance log, credits list, changelog) are open to all.
- Add tests in a new file for your package rather than editing others'.
- Run the project's build and test commands before every push.

## Finish

- "Done when" is true, tests and CI are green.
- PR marked ready, titled as a Conventional Commit, `Refs: WP-<id>`.
- Update your row's status in the plan in the same PR.
- Ask the reviewer to review; address findings; squash-merge yourself
  when green and passed (git-workflow).
- Tell the packages that depend on yours (peer-coordination).
