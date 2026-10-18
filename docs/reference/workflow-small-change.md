# small-change workflow

Reference, for anyone landing a chore-sized change through the workflow.

| Field | Value |
|---|---|
| File | `workflows/small-change.js` |
| Command | `/engineering-practices:small-change` |
| Open args | `{ change: "<what to change and why>" (required), type: "<Conventional Commit type>" (optional), scope: "<scope>" (optional) }` |
| Add-to-PR args | `{ change: "<what to change and why>" (required), pr: "<number or URL>" (required) }`: the change goes on that PR's head branch instead of a new branch and PR |
| Merge args | `{ pr: "<number or URL>" (required), merge: true (required) }` |
| Run modes | v2: optional `run` arg for inline, partial or resumed runs, with review steps marked independent; see [workflow run modes](workflow-run-modes.md) |
| Fits | One concern in a few lines: a config line, a dependency bump that needs no code changes, a docs index or link fix, a version string |
| Does not fit | New behaviour, a shared contract or public interface change, anything needing new tests or a new doc page; use [deliver-package](workflow-deliver-package.md) |

## Phases

| Phase | Mode | Does |
|---|---|---|
| Scope | open, add | Reads the project's rules; checks for overlapping work (as in [deliver-package](workflow-deliver-package.md#overlapping-work)) and stops on a duplicate; decides whether the change is small; picks the default branch (from the remote), branch name, PR title and local check. Add mode: confirms the PR is open and pushable, takes its head branch, and the title is the commit subject |
| Change | open, add | Open: branches off the latest remote default branch, makes the minimal edit, runs the local check, commits, pushes, opens a draft PR. Add: checks out the PR head at its remote tip, commits and pushes there, adds a line to the PR description; no new branch or PR |
| Check | open, add | Independent read of the diff (add mode: the added commits, then the whole PR for what they break); one fix round at most |
| Hand off | open, add | Polls CI itself until it settles, fixes red CI caused by the change (two attempts at most), marks the PR ready and asks the reviewer; in add mode asks again with the new head SHA, since an earlier pass no longer counts |
| Merge | merge | Confirms the PR is out of draft, comments are answered and the reviewer passed the current head (per the profile's review convention); brings the latest default branch in; re-runs the local check and polls CI; squash-merges only after a conflict-free update; deletes the branch |

## Step labels

For `run.only` and `run.results`: `scope`, `change`, `review`, `fix`, `re-review`, `handoff`; with `merge: true`, `merge`.

## CI polling

Every CI wait is a check the agent runs itself, never a wait for a
notification, and never a sleep in the shell. It reads the checks for
the PR's latest head SHA and reports one state:

| State | Meaning |
|---|---|
| `green` | Every required check passed on the latest head |
| `red: <check> <cause>` | A check failed; the cause comes from its log |
| `pending: <checks>` | Still running |
| `none` | The repository runs no CI on pull requests |

On `pending`, a session that can schedule its own check-in (a
send-later, wakeup or scheduled-task tool) schedules one 5 minutes later
and runs the step again; merge mode returns `waiting: CI ...` for that.
Only a session without such a tool uses one bounded watch (for example
`gh pr checks <pr> --watch --fail-fast`, up to 20 minutes).

## Updating the branch before merge

| Branch is pushed to by | Update with |
|---|---|
| Only the author | Rebase onto the default branch, push with `--force-with-lease` |
| Others too, or the profile says merge | Merge the default branch into the PR branch |

If the update conflicts or needs a lockfile or generated file
regenerated, the merge step pushes the resolution, polls CI, asks the
reviewer to look again and stops without merging: the resolution is new
code nobody reviewed. If the default branch moves again while CI runs,
the merge step updates once more; if it keeps moving, it stops and says
so.

## Outputs

| Result | Meaning |
|---|---|
| Usage string | Neither `change` nor `pr` with `merge: true` given |
| `not small: ...` | Too big for this workflow, or (add mode) the PR is closed or not pushable; use deliver-package |
| `blocked: this change is already in flight elsewhere ...` | Another PR, branch or session has the same goal; lists them |
| `blocked: scoping failed ...` | Scope agent returned nothing |
| `blocked: change step failed ...` | Change agent returned nothing; the branch may hold partial work |
| `blocked: local check failed ...` | The local check failed; output and PR (if opened) listed |
| `blocked: ... still has open items after one fix round` | Review blockers remain; lists them |
| `blocked: hand-off ... failed` | Hand-off agent returned nothing; PR is still draft |
| Object `{ pr, ci, ready, reviewer, notes, next }` | Open mode finished; `next` gives the merge command, or, if the PR is still draft, says to poll CI and hand off by hand |
| `not merged: ...: updated with conflict resolution; needs the reviewer's pass on <sha>` | The update needed a conflict resolution or regenerated files; the reviewer was asked again; run merge mode after their pass |
| `waiting: CI ... is still running` | Merge mode found CI still running; schedule a check-in 5 minutes later, then run merge mode again |
| `not merged: ...` | Merge mode stopped: still draft, no reviewer pass, comments unanswered, CI not green, or the branch kept moving |
| `blocked: merge step ... failed` | Merge agent returned nothing |
| Object `{ pr, merged, squash_sha, ci, next }` | Squash-merged |

Open mode never merges. Run merge mode after the reviewer passes the PR.
