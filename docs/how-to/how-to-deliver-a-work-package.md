# How to deliver a work package

How-to guide, for a role agent or coordinator with a work package ready to start.

This guide shows you how to take one package from its plan row to a merged
squash commit.

## Prerequisites

- The project has `CLAUDE.md`, a profile and a plan with the package row.
- The row has a testable done-when.

## Steps

1. Run the workflow:

   ```
   /engineering-practices:deliver-package {"wp": "WP-07", "plan": "docs/plan.md"}
   ```

   If you can only push to an assigned branch, or the package is already
   started, add `"branch": "<name>"` or `"pr": "<number>"` to work there
   instead of a new `wp/` branch.

   If a role workflow already built and tested the package (it returns
   a `handoff`), pass its result as `"prior"` so the workflow ships it
   without building it again:

   ```
   /engineering-practices:deliver-package {"wp": "WP-07", "prior": <the role workflow's result>}
   ```

   If your session cannot afford its subagents, add
   `"run": {"mode": "inline"}` and do each step it hands back yourself
   (see [how to run a workflow inline](how-to-run-a-workflow-inline.md)).

   If you would rather drive it yourself, hand the package to the
   `package-lead` agent and follow the same steps.

2. If it returns `blocked: ... cannot start`, fix the plan row (or ask
   the project-manager role to) and run it again.

3. If it returns `blocked: ... still has open items after review`, fix
   the listed items on the branch, or hand them back to the package's
   role, then run the review again. Do not mark the PR ready with
   blockers open.

4. When it returns a PR URL, wait for the code-reviewer role's verdict.
   Answer each comment by changing the code, or with a reasoned reply.

5. When the reviewer has passed it, land it yourself with
   [land-pr](how-to-land-an-existing-pull-request.md), which brings the
   default branch in, re-checks CI and squash-merges. Do not wait for the
   project owner.

6. Tell each dependant listed in the result, with the PR link.

## If trunk breaks after the merge

Fix it within minutes, or revert with `revert: <original subject>` and
`Refs: <sha>`.

See the [deliver-package reference](../reference/workflow-deliver-package.md)
for args, outputs and phases.
