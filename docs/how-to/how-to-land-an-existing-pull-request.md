# How to land an existing pull request

How-to guide, for a role agent with work already on a branch or PR that
has to be kept current with the default branch and merged.

This guide shows you how to get an existing branch or PR to a squash
merge without letting it drift behind the default branch.

## Prerequisites

- You can push to the PR's head branch. If you can only push to an
  assigned branch, work on that branch.
- The work on the branch is complete. To build the work itself, run
  [deliver-package](how-to-deliver-a-work-package.md) or
  [small-change](how-to-land-a-small-change.md) first.

## Steps

1. Run the workflow on the PR, or on the branch if it has no PR yet:

   ```
   /engineering-practices:land-pr {"pr": "42"}
   /engineering-practices:land-pr {"branch": "claude/assigned-branch", "title": "fix(parser): accept empty input"}
   ```

   To add one small change first (a reviewer's ask, a fix you spotted),
   pass it as `followup`; it is committed on the PR's head branch before
   syncing, and the reviewer is asked to pass the new head:

   ```
   /engineering-practices:land-pr {"pr": "42", "followup": "rename parseOpts to parseOptions as the reviewer asked"}
   ```

2. If it returns `blocked: follow-up ... not added`, the change is too
   big to ride on this PR: use small-change with `pr`, or a work package.
   If it returns `blocked: ... conflicts that lose behaviour either way`,
   settle each listed file with the author of the other change
   (`peer-coordination`), commit, and run it again.

3. If it returns `waiting: CI ... is still running`, schedule a check-in
   for 5 minutes later (a send-later, wakeup or scheduled-task tool) and
   run it again then. Do not sleep in the shell or wait for a
   notification.

4. If it returns `changes requested`, fix each finding on the branch,
   answer each comment, and run it again.

5. If it returns an object with `fixed` and `skipped`, the reviewer
   passed with should-fix items: they are pushed and the reviewer was
   asked to pass the new head. Wait for that pass as in step 6.

6. If it returns an object with `review: waiting on ...`, check the
   verdict yourself later and run it again once the reviewer has passed
   the PR.

7. When it returns `merged: true`, tell whoever asked for the change and
   any dependants, with the PR link.

## If the default branch keeps moving

Run the workflow again when it is quieter, or use the project's merge
queue if it has one.

See the [land-pr reference](../reference/workflow-land-pr.md) for args,
conflict rules and outputs.
