# deliver-package workflow

Reference, for anyone running a work package through the workflow.

| Field | Value |
|---|---|
| File | `workflows/deliver-package.js` |
| Command | `/engineering-practices:deliver-package` |
| Args | `{ wp: "WP-NN" (required), plan: "<path>" (optional; default from CLAUDE.md or profile), branch: "<existing branch>" (optional), pr: "<existing PR>" (optional), prior: <handoff object> (optional) }` |
| Run modes | v2: optional `run` arg for inline, partial or resumed runs, with review steps marked independent; see [workflow run modes](workflow-run-modes.md) |
| Branch | `wp/<id>-<slug>` cut from the latest default branch; with `branch` or `pr`, that branch (and its open PR) instead |

## Phases

| Phase | Does |
|---|---|
| Plan | Onboard; checks for [overlapping work](#overlapping-work); branch, owned paths, slices, stubs, done-when, docs layout, Diataxis doc plan, `caveats`, `ship_status`; stops if the row is not ready or the package is already in flight |
| Build | Implements in owned paths with Conventional Commits, license headers, provenance log; opens a draft PR. With `prior`: skipped when `prior.pr` is set and Plan finds nothing missing; otherwise does only the missing steps and opens the PR |
| Document | Writes or updates the planned pages, one kind each, in the same PR. With `prior`: skipped when `prior.docs` lists pages and Plan finds none missing |
| Check | Independent review of change and docs; up to 3 review rounds with fixes between |
| Ship | Merges the latest default branch in (land-pr's conflict rules), applies cross-PR items (extends the change to new members of any set it edits member by member, adapts to renames), merges the base in again before any CI wait while the host reports the PR as conflicting or behind ([as in land-pr](workflow-land-pr.md#base-current-before-ci)), confirms CI with at most one re-run of a single failing job whose cause is outside the diff (a pass is logged as a flake), treats a check red or hung on the default branch too as [land-pr does](workflow-land-pr.md#red-on-the-default-branch) (a ported fix or one PR comment; it does not hold the PR back from review), sets the plan row to `ship_status` (or leaves it), aligns PR title and body (with a "Known risks" section for caveats), marks ready, asks the code-reviewer role ([reaching the reviewer](#reaching-the-reviewer)) |

## Reaching the reviewer

A review request on the hosting service reaches only a person or bot
with its own account. When the reviewer is an agent session, or shares
the author's account, Ship (and land-pr and small-change) messages its
session or thread directly, found with the project's session tools
(peer-coordination skill, "Find the right agent"), with the PR link, the
head SHA and one line on what changed, and says where to post the
verdict: a comment review on a shared account.

## Status and caveats

| Plan field | Meaning |
|---|---|
| `ship_status` | The status value the row carries in the package's own PR, so the default branch is right the moment it squash-merges. Read from the plan's legend, the profile and earlier rows: the project's done value when it marks rows done in the package PR, its in-review value when it closes rows elsewhere, and its done value when it does not say. `"unchanged"` only when rows change outside package PRs; Ship then leaves the row alone. |
| `blockers` | Only what stops the work from starting: missing row, no testable done-when, missing contract. Any entry ends the run. |
| `caveats` | Risks that do not stop the work: an assumption, a dependency stubbed for now, a test that cannot run here, a part that may need rework. Never blocking; listed under "Known risks" in the PR body and returned as `caveats`. |

## Overlapping work

Before planning, Plan looks for work already in flight: open pull
requests, recently pushed branches, the plan's status rows, and other
running sessions, threads or assignees where its tools can list them.
The PR or branch passed in (`pr`, `branch` or `prior`) does not count.

| `overlaps[].kind` | Effect |
|---|---|
| `duplicate` | Same goal. The run stops with `blocked: ... already in flight elsewhere` and the links; coordinate with the owner (peer-coordination skill). |
| `same-files` | Same files, package or contract. Logged and returned as `overlaps`; Build messages each owner before changing those files and keeps the edit small. |

## The prior arg

`prior` hands work that a role workflow already built and tested to this
workflow, so it is shipped without being built again. Pass the role
workflow's whole result, or its `handoff` field; a run-modes envelope
(`{ run, status, result }`) is unwrapped too. Plan, Check and Ship still
run: the package row, owned paths, provenance and docs are checked
against the package, not only the role's own checks.

Handoff object, which any role workflow can return as `handoff`. Every
problem with it is reported together in one `blocked: prior handoff is
not usable` result, with the usage string:

| Field | Required | Meaning |
|---|---|---|
| `branch` | one of `branch`, `pr`, here or as a top-level arg | Branch holding the built work |
| `pr` | one of `branch`, `pr`, here or as a top-level arg | Open PR for that branch |
| `tests_pass` | yes, must be `true` | The project's tests pass on the branch head |
| `from` | no | Workflow that built it, e.g. `<plugin>:<workflow>` |
| `docs` | no; a list when given | Docs pages already written in the branch |
| `undocumented` | no; a list when given | Changes left undocumented, and why |
| `non_original` | no; a list when given | Non-original items added, for the provenance check |
| `notes` | no | Informational notes for the reviewer; never blocking |

An explicit `branch` or `pr` arg wins over the one in `prior`, and fills
it in when the handoff has none (a role workflow that does not know its
branch).

A role workflow that builds work for a package should return a
`handoff` with at least `from`, `branch` (or `pr`), `tests_pass` and
`docs`, so its result can be passed as `prior` as it is.

## Step labels

For `run.only` and `run.results`: `plan`, `build`, `docs`, `review:1` to `review:3`, `fix:1`, `fix:2`, `ship`.

## Outputs

| Result | Meaning |
|---|---|
| Usage string | `wp` missing |
| `blocked: planning ... failed` | Plan agent returned nothing |
| `blocked: prior must be ...`, `blocked: prior handoff is not usable: ...` | `prior` given but not a usable handoff; lists every problem at once; nothing runs |
| `blocked: ... cannot start` | Plan row not ready; lists blockers |
| `blocked: ... already in flight elsewhere` | Another PR, branch or session has the same goal; lists them |
| `blocked: build ... failed` | Build agent returned nothing |
| `blocked: ... still has open items after review` | Blockers open after 3 rounds, or no review completed; lists them |
| `blocked: ship step ... failed` | Ship agent returned nothing |
| Object `{ wp, pr, ci, docs, undocumented, prior, status, caveats, overlaps, dependants, land, next }` | PR ready for the code reviewer; `prior` (the handoff's `from`) only when `prior` was given; `status` is the value set on the plan row or `"unchanged"`; `caveats` and `overlaps` (same-files work) are informational; `land` is the args for land-pr; `red_on_base` lists checks red on the default branch too, when any |

The workflow never merges. After the reviewer passes, the author runs
[land-pr](workflow-land-pr.md) with `land` as its args (`pr`, `row` and
`notify`: the dependants and whoever assigned the package). land-pr
squash-merges, then its Close phase confirms the package's row reads
merged on the default branch and tells each of them.
