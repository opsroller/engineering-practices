# land-pr workflow

Reference, for anyone taking an existing branch or pull request to a
squash merge.

| Field | Value |
|---|---|
| File | `workflows/land-pr.js` |
| Command | `/engineering-practices:land-pr` |
| Args | `{ pr: "<number or URL>" }`, or `{ branch: "<existing branch>", title: "<Conventional Commit title>" (optional) }` |
| Use when | The work is already on a branch or PR (yours, an assigned branch, or one handed over) and needs to be kept current and landed |
| Run again | Safe to re-run at any point; each run starts from the PR's current state |

## Phases

| Phase | Does |
|---|---|
| Adopt | Reads the default branch from the remote; finds the PR for the branch, or opens a draft one; confirms you can push to the head branch; names the local check |
| Sync | Merges the latest default branch in, resolves conflicts, re-runs the local check, pushes, polls CI; repeats if the default branch moved meanwhile (3 rounds at most) |
| Review | Reads the reviewer verdict on the current head; asks for review (and marks the PR ready) if nobody has been asked |
| Merge | Refreshes the PR title and body, confirms head and base are still the verified ones, squash-merges with the verified head SHA, deletes the branch |

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

## CI polling

The agent polls the checks on the PR's latest head SHA itself every 30
to 60 seconds for up to 20 minutes, never waiting for a notification,
and reports `green`, `red: <check> <cause>`, `pending: <checks>` or
`none`. It fixes red CI caused by the PR or the merge, two attempts at
most.

## Reviewer pass

A pass counts for the current head, or for an earlier head when the only
later commits are conflict-free merges of the default branch.

## Outputs

| Result | Meaning |
|---|---|
| Usage string | Neither `pr` nor `branch` given |
| `blocked: <target>: <problem>` | PR closed or merged, or you cannot push to its head branch |
| `blocked: ... conflicts that lose behaviour either way` | Lists the files to resolve with the other change's author |
| `blocked: local check fails ...` | The check fails after syncing |
| `waiting: CI ... is still running` | CI did not finish within the poll; run again later |
| `blocked: CI ... is red: ...` | CI is red after two fix attempts |
| `blocked: ... kept moving through 3 sync rounds` | The default branch moved every round |
| `changes requested on ...` | Lists the open findings to fix before running again |
| Object `{ pr, ci, review, next }` | Waiting on the reviewer; run again once the verdict is in |
| `not merged: ... moved after verification` | Head or base changed between verification and merge; run again, or use the project's merge queue |
| Object `{ pr, merged, squash_sha, ci, next }` | Squash-merged |
