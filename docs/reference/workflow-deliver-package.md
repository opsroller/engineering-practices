# deliver-package workflow

Reference, for anyone running a work package through the workflow.

| Field | Value |
|---|---|
| File | `workflows/deliver-package.js` |
| Command | `/engineering-practices:deliver-package` |
| Args | `{ wp: "WP-NN" (required), plan: "<path>" (optional; default from CLAUDE.md or profile) }` |

## Phases

| Phase | Does |
|---|---|
| Plan | Onboard; branch, owned paths, slices, stubs, done-when, docs layout, Diataxis doc plan; stops if the row is not ready |
| Build | Implements in owned paths with Conventional Commits, license headers, provenance log; opens a draft PR |
| Document | Writes or updates the planned pages, one kind each, in the same PR |
| Check | Independent review of change and docs; up to 3 review rounds with fixes between |
| Ship | Confirms CI, updates the plan row, aligns PR title and body, marks ready, requests the code-reviewer role |

## Outputs

| Result | Meaning |
|---|---|
| Usage string | `wp` missing |
| `blocked: planning ... failed` | Plan agent returned nothing |
| `blocked: ... cannot start` | Plan row not ready; lists blockers |
| `blocked: build ... failed` | Build agent returned nothing |
| `blocked: ... still has open items after review` | Blockers open after 3 rounds, or no review completed; lists them |
| `blocked: ship step ... failed` | Ship agent returned nothing |
| Object `{ wp, pr, ci, docs, undocumented, dependants, next }` | PR ready for the code reviewer |

The workflow never merges. The author squash-merges after the reviewer
passes and CI is green.
