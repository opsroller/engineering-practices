# How to land a small change

How-to guide, for a role agent with a chore-sized change to make: a
config line, a dependency bump, a docs index fix.

This guide shows you how to take one small change from request to a
squash-merged commit on the default branch.

## Prerequisites

- The change is one concern in a few lines, with no new behaviour and no
  contract change. If it is bigger, follow
  [How to deliver a work package](how-to-deliver-a-work-package.md).
- You can push branches and open pull requests in the repository.

## Steps

1. Run the workflow in open mode, saying what to change and why:

   ```
   /engineering-practices:small-change {"change": "bump the formatter to 3.4.2 to pick up the CRLF fix", "type": "build"}
   ```

2. If it returns `not small: ...`, use the work-package route instead.

3. If it returns `blocked: local check failed ...`, fix the check on the
   branch, or drop the change if the check also fails on the default
   branch and report that separately.

4. If it returns `ready: false`, the PR is still draft: poll CI yourself
   until it is green, then mark the PR ready and ask the reviewer by
   hand. Do not run open mode again; it would cut a second branch.

5. When it returns a PR with `ready: true`, wait for the reviewer's
   verdict. Check for it yourself; do not wait to be notified. Answer
   each comment by changing the code or with a reasoned reply.

6. When the reviewer has passed the current head, run merge mode:

   ```
   /engineering-practices:small-change {"pr": "42", "merge": true}
   ```

   It brings the latest default branch in right before merging,
   re-checks CI and squash-merges.

7. If it returns `not merged: ... updated with conflict resolution`,
   the default branch conflicted and the resolution is now on the PR.
   Wait for the reviewer's pass on the new head, then run merge mode
   again.

8. If it returns any other `not merged: ...`, deal with the reason (a
   missing pass, red CI, a branch that keeps moving) and run merge mode
   again.

9. Tell whoever asked for the change, with the PR link.

## Without the workflow

Follow the same order by hand with the
[git-workflow skill](../reference/skill-git-workflow.md): branch from the
latest remote default branch, edit, run the local check, commit, draft
PR, poll CI with `gh pr checks <pr> --watch --fail-fast`, ask the
reviewer, update the branch, squash-merge.

See the [small-change reference](../reference/workflow-small-change.md)
for args, phases and outputs.
