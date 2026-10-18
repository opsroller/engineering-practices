# land-pr workflow

Reference, for anyone taking an existing branch or pull request to a
squash merge.

| Field | Value |
|---|---|
| File | `workflows/land-pr.js` |
| Command | `/engineering-practices:land-pr` |
| Args | `{ pr: "<number or URL>" }`, or `{ branch: "<existing branch>", title: "<Conventional Commit title>" (optional) }`; either takes `followup: "<change to add to the PR before landing>"`, `row: "<plan file and item whose status row must read merged>"` and `notify: ["<who to tell once merged>"]` (all optional) |
| Run modes | v2: optional `run` arg for inline, partial or resumed runs (no independent steps); see [workflow run modes](workflow-run-modes.md) |
| Use when | The work is already on a branch or PR (yours, an assigned branch, or one handed over) and needs to be kept current and landed |
| Run again | Safe to re-run at any point; each run starts from the PR's current state |

## Phases

| Phase | Does |
|---|---|
| Adopt | Reads the default branch from the remote; finds the PR for the branch, or opens a draft one; confirms you can push to the head branch; names the local check |
| Follow-up | Only with `followup`: checks out the head branch at its remote tip, makes the smallest edit, runs the local check, commits (Conventional Commit), pushes, adds a line to the PR description. Stops if the change needs new behaviour, a contract change or a new doc page |
| Sync | Merges the latest default branch in, resolves conflicts, applies [cross-PR items](#cross-pr-items), re-runs the local check, pushes, polls CI and [re-runs one failing job once](#one-failing-job); repeats if the default branch moved meanwhile (3 rounds at most) |
| Review | Reads the reviewer verdict; [carries a pass](#reviewer-pass) across keep-both merges with the merge diff posted to the reviewer; asks for review of the delta (and marks the PR ready) if a new pass is needed and nobody has been asked. On a pass with should-fix items, makes them on the head branch, answers each comment and asks for a pass on the new head |
| Merge | Refreshes the PR title and body, confirms head and base are still the verified ones, squash-merges with the verified head SHA, deletes the branch |
| Close | Only with `row` or `notify`: reads the status row on the default branch and, if it does not read the project's merged-state value, sets it (a direct commit only where the project allows it, otherwise small-change); messages each `notify` target once with the PR link and squash SHA (agent sessions by cross-session message, people by mention; never the project owner) |

## Step labels

For `run.only` and `run.results`: `adopt`, `followup` (with `followup` only), `sync:1` to `sync:3`, `review`, `should-fix` (after a pass with should-fix items), `merge`, `close` (with `row` or `notify` only).
Pass `results` only to resume the same run; a new land-pr run starts without them, because it re-reads the PR's current state.

## Conflict rules

| Conflict in | Resolution |
|---|---|
| Shared lists: changelogs, docs indexes, catalogs, registries, manifests, file or test lists | Keep both sides' entries in the file's own order, no duplicates; renumber positions only where nothing references the number |
| Enum values or id tables | Keep both sides' entries if their ids differ; if both took the same id or value, stop and list the file (renumbering would change an id already in use) |
| Lockfiles and generated files | Take the default branch's version, regenerate with the project's tooling |
| The same logic changed on both sides | Combine both intents if provably compatible; otherwise stop and list the files |

The workflow merges the default branch in rather than rebasing: a merge
never rewrites pushed commits, works on a branch others push to, and
needs no force-push. It rebases only when the profile requires it and
one author pushes to the branch, then pushes with `--force-with-lease`.
A rebase gives every commit a new SHA, so no earlier reviewer pass
counts and each run asks the reviewer again.

The Sync step reports `keep_both_only` for each merge: true when every
conflicted hunk kept both sides' lines unchanged, in order, and the
merge commit edits nothing else.

## Cross-PR items

A merge can be clean and still leave the PR incomplete. After merging,
Sync lists what the default branch brought in. Where the PR applies one
change to every member of a set (each preset, profile, variant,
workflow, CI job, build target, locale or config entry of a kind) and
the default branch added a member, Sync extends the change to it in its
own commit (`<type>: apply <change> to <item> from <PR>`). Where the
default branch renamed, moved or changed an interface the PR uses, Sync
adapts the PR. An extension that needs new behaviour, a path the
author does not own, or the other author's decision is not made: it is
listed under `unresolved` as `cross-PR: <item>: <why>` and the run
stops.

## CI polling

The agent reads the checks on the PR's latest head SHA itself, never
waiting for a notification, and reports `green`, `red: <check> <cause>`,
`pending: <checks>` or `none`. It never sleeps in the shell. While checks
run, a session that can schedule its own check-in (a send-later, wakeup
or scheduled-task tool) reports `pending` at once; the run returns
`waiting: ...`, and the caller schedules a check-in 5 minutes later and
runs the workflow again. Only a session without such a tool uses one
bounded watch command (up to 20 minutes). It fixes red CI caused by the
PR or the merge, two attempts at most.

## One failing job

When exactly one job or matrix leg fails (one browser, one OS, one
shard), the same tests pass on the other legs, and the log points
outside the PR's diff (timeout, runner, network, download), Sync
re-runs only that job, once per head SHA (`gh run rerun <run-id> --job
<job-id>` or the service's "re-run failed jobs"). It never re-runs the
whole workflow, never twice, and never for a failure in code the PR
touches.

| Re-run result | Then |
|---|---|
| Passes | A flake: CI counts as green; one entry (date, check and job, head SHA, failed run link, one-line failure) goes in the project's flake log and under "Flaky checks" in the PR description; the run returns it in `flakes` |
| Fails | Real: handled as red CI |

The flake log is the file or issue the profile names; if it names none,
one open issue titled "CI flake log" (created if missing). When the log
already holds two entries for that check in the last 30 days, the entry
says so, so the check's owner quarantines or fixes it.

## Reviewer pass

| Commits after the passed head | Then |
|---|---|
| None | The pass counts |
| Only merges of the default branch, each conflict-free | The pass carries silently |
| Only merges of the default branch, each conflict-free or resolved keep-both | The pass carries: one PR comment to the reviewer (and a message if the reviewer is an agent session) says "Pass carried from <SHA> to <head>" with each merge's `git show --remerge-diff`, so the reviewer can object; the result has `review_carried_from` |
| Anything else: a fix, a follow-up, a cross-PR extension, a merge that rewrote, dropped or combined lines, a regenerated file | A new pass is needed, of the delta only: the request names those commits and pastes their diffs and remerge-diffs |

## Outputs

| Result | Meaning |
|---|---|
| Usage string | Neither `pr` nor `branch` given |
| `blocked: <target>: <problem>` | PR closed or merged, or you cannot push to its head branch |
| `blocked: follow-up ... not added ...` | The follow-up is not small enough to ride on this PR; use small-change `{ change, pr }` or deliver-package |
| `blocked: ... conflicts or cross-PR items ...` | Lists the files or cross-PR items to resolve with the other change's author |
| `blocked: local check fails ...` | The check fails after syncing |
| `waiting: CI ... is still running` | CI is still running; schedule a check-in 5 minutes later, then run again |
| `blocked: CI ... is red: ...` | CI is red after two fix attempts |
| `blocked: ... kept moving through 3 sync rounds` | The default branch moved every round |
| `changes requested on ...` | Lists the open findings to fix before running again |
| Object `{ pr, ci, review, next }` | Waiting on the reviewer; schedule a check-in, run again once the verdict is in |
| Object `{ pr, ci, review, fixed, skipped, next }` | The reviewer passed with should-fix items; `fixed` were pushed, `skipped` (would widen the PR) were answered; waiting on a pass of the new head |
| `blocked: should-fix round ... failed`, `blocked: local check fails ... after the should-fix edits` | The should-fix step returned nothing, or broke the local check |
| `not merged: ... moved after verification` | Head or base changed between verification and merge; run again, or use the project's merge queue |
| Object `{ pr, merged, squash_sha, ci, next }` | Squash-merged (no `row` or `notify`) |
| `review_carried_from`, `flakes` (on any object result) | The passed SHA a pass was carried from; flake entries recorded this run |
| Object `{ pr, merged, squash_sha, ci, row, row_pr, notified, not_notified, next }` | Squash-merged and closed out: `row` is `already`, `fixed` (with `row_pr`), `not-fixed` or `none`; `next` is `done` or lists what is still owed |
