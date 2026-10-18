# deliver-package workflow

Reference, for anyone running a work package through the workflow.

| Field | Value |
|---|---|
| File | `workflows/deliver-package.js` |
| Command | `/engineering-practices:deliver-package` |
| Args | `{ wp: "WP-NN" (required), plan: "<path>" (optional; default from CLAUDE.md or profile), branch: "<existing branch>" (optional), pr: "<existing PR>" (optional), prior: <handoff object> (optional) }` |
| Run modes | v1: optional `run` arg for inline, partial or resumed runs; see [workflow run modes](workflow-run-modes.md) |
| Branch | `wp/<id>-<slug>` cut from the latest default branch; with `branch` or `pr`, that branch (and its open PR) instead |

## Phases

| Phase | Does |
|---|---|
| Plan | Onboard; branch, owned paths, slices, stubs, done-when, docs layout, Diataxis doc plan; stops if the row is not ready |
| Build | Implements in owned paths with Conventional Commits, license headers, provenance log; opens a draft PR. With `prior`: skipped when `prior.pr` is set and Plan finds nothing missing; otherwise does only the missing steps and opens the PR |
| Document | Writes or updates the planned pages, one kind each, in the same PR. With `prior`: skipped when `prior.docs` lists pages and Plan finds none missing |
| Check | Independent review of change and docs; up to 3 review rounds with fixes between |
| Ship | Confirms CI, updates the plan row, aligns PR title and body, marks ready, requests the code-reviewer role |

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
| `blocked: build ... failed` | Build agent returned nothing |
| `blocked: ... still has open items after review` | Blockers open after 3 rounds, or no review completed; lists them |
| `blocked: ship step ... failed` | Ship agent returned nothing |
| Object `{ wp, pr, ci, docs, undocumented, prior, dependants, next }` | PR ready for the code reviewer; `prior` (the handoff's `from`) only when `prior` was given |

The workflow never merges. After the reviewer passes, the author lands
the PR with [land-pr](workflow-land-pr.md).
