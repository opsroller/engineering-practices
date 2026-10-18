# work-packages skill

Reference, for roles carrying out or planning work packages.

| Field | Value |
|---|---|
| File | `skills/work-packages/SKILL.md` |
| Use when | Starting, working or finishing a package; splitting work into packages |

## Package row fields

| Field | Meaning |
|---|---|
| `WP-<id>` + name | Stable id for branches, commits, threads |
| Role | One job-function plugin |
| Owned paths | Where the package may write |
| Depends on | Packages or contracts needed |
| Done when | One testable sentence |
| Status | The plan's own values, from its status legend (for example `planned`, `in progress`, `in review`, `merged`, `blocked`); workflows read them, never assume them |

## Finish checklist

Done-when demonstrable; tests and CI green; docs written; provenance
recorded; PR ready with stubs, follow-ups and `Refs:`; row set in the PR to its merged-state value;
reviewer passed and squash-merged; dependants told.

## Splitting

Vertical slices or contract-first horizontal splits; one role and disjoint
paths per package; at most a couple of days; refactors first, separately.
