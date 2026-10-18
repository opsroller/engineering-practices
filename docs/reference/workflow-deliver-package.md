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
| Plan | Onboard; checks for [overlapping work](#overlapping-work); branch, owned paths, slices, stubs, done-when, docs layout, Diataxis doc plan, `caveats`, the project's in-review status value; stops if the row is not ready or the package is already in flight |
| Build | Implements in owned paths with Conventional Commits, license headers, provenance log; opens a draft PR. With `prior`: skipped when `prior.pr` is set and Plan finds nothing missing; otherwise does only the missing steps and opens the PR |
| Document | Writes or updates the planned pages, one kind each, in the same PR. With `prior`: skipped when `prior.docs` lists pages and Plan finds none missing |
| Check | Independent review of change and docs; up to 3 review rounds with fixes between |
| Ship | Confirms CI, sets the plan row to the project's own in-review status (or leaves it), aligns PR title and body (with a "Known risks" section for caveats), marks ready, requests the code-reviewer role |

## Status and caveats

| Plan field | Meaning |
|---|---|
| `review_status` | The status value the plan or profile uses for a package whose PR is open and in review, read from the plan's legend, the profile or earlier rows. `"unchanged"` when the project sets status only at merge or has no such value; Ship then leaves the row alone. |
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

Handoff object, which any role workflow can return as `handoff`:

| Field | Required | Meaning |
|---|---|---|
| `branch` | one of `branch`, `pr` | Branch holding the built work |
| `pr` | one of `branch`, `pr` | Open PR for that branch |
| `tests_pass` | yes, must be `true` | The project's tests pass on the branch head |
| `from` | no | Workflow that built it, e.g. `<plugin>:<workflow>` |
| `docs` | no | Docs pages already written in the branch |
| `undocumented` | no | Changes left undocumented, and why |
| `non_original` | no | Non-original items added, for the provenance check |
| `notes` | no | Informational notes for the reviewer; never blocking |

An explicit `branch` or `pr` arg wins over the one in `prior`.

## Step labels

For `run.only` and `run.results`: `plan`, `build`, `docs`, `review:1` to `review:3`, `fix:1`, `fix:2`, `ship`.

## Outputs

| Result | Meaning |
|---|---|
| Usage string | `wp` missing |
| `blocked: planning ... failed` | Plan agent returned nothing |
| `blocked: prior must be ...`, `blocked: prior names no branch or pr`, `blocked: prior work ... does not report tests_pass: true` | `prior` given but not a usable handoff; nothing runs |
| `blocked: ... cannot start` | Plan row not ready; lists blockers |
| `blocked: ... already in flight elsewhere` | Another PR, branch or session has the same goal; lists them |
| `blocked: build ... failed` | Build agent returned nothing |
| `blocked: ... still has open items after review` | Blockers open after 3 rounds, or no review completed; lists them |
| `blocked: ship step ... failed` | Ship agent returned nothing |
| Object `{ wp, pr, ci, docs, undocumented, prior, status, caveats, overlaps, dependants, next }` | PR ready for the code reviewer; `prior` (the handoff's `from`) only when `prior` was given; `status` is the value set on the plan row or `"unchanged"`; `caveats` and `overlaps` (same-files work) are informational |

The workflow never merges. After the reviewer passes, the author lands
the PR with [land-pr](workflow-land-pr.md).
