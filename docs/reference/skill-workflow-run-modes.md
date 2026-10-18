# workflow-run-modes skill

Reference, for roles that run or write workflows.

| Field | Value |
|---|---|
| File | `skills/workflow-run-modes/SKILL.md` |
| Use when | A workflow's fan-out is too costly or not allowed; running only some phases or dimensions; resuming a stopped run; writing or changing a workflow |

## Modes

| Need | `run` |
|---|---|
| Usual run | omitted |
| Usual run, resumable | `{}` |
| No subagents | `{ mode: "inline" }` |
| Some phases or steps | `{ only: [...] }` |
| Restart at a phase | `{ from: "<phase>", results: {...} }` |

## Inline loop

Run with `mode: "inline"`; do each brief in `next` yourself; add answers
to `results` by key; run again; stop at `status: "done"`.

## Author rules

Unique `label` on every `agent()` call; block inserted with
`tools/apply-run-modes.mjs`; checked with `tools/check-workflow.mjs`; long inline runs driven from a state file with `tools/run-inline.mjs`.

Full field list: [workflow run modes](workflow-run-modes.md).
