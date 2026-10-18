# project-onboarding skill

Reference, for roles starting work in a project.

| Field | Value |
|---|---|
| File | `skills/project-onboarding/SKILL.md` |
| Use when | Start of any task in any project, before reading code or writing |

## Reads, in order

| # | Source | Extracts |
|---|---|---|
| 1 | `CLAUDE.md` (root and nested) | Standing rules, profile path |
| 2 | Project profile | Stack, commands, targets, license rule, docs layout, scopes, release |
| 3 | Role map | Owned paths, applicable project docs, neighbours |
| 4 | Contracts | Interfaces the work touches and their owners |
| 5 | Plan row | Dependencies, done-when |
| 6 | `git log` and open PRs on owned paths | In-flight changes |
| 7 | Build and tests | Baseline |

## Precedence

`CLAUDE.md` over profile. Contract over current code. No profile: ask the
project-manager role.
