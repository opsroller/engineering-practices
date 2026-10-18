# Workflow run modes

Reference, for anyone running or writing a role workflow.

Every role workflow takes an optional `run` arg beside its own args.
The behaviour comes from one shared block, `tools/run-modes.js` (v2),
copied verbatim into each workflow. v2 adds independent steps; a v1
workflow runs as before but marks none.

## The `run` arg

| Field | Type | Default | Meaning |
|---|---|---|---|
| `mode` | `"agents"` or `"inline"` | `"agents"` | `agents` spawns subagents as before; `inline` spawns none and hands each step back as a brief |
| `only` | array of strings | all steps | Run only steps whose phase title or label matches an entry; an entry also matches labels that start with `<entry>:` |
| `from` | phase title | first phase | Skip every step before this phase starts |
| `results` | object, key to answer | `{}` | Answers of earlier steps; a step whose key is here is reused, not run |
| `reviewers` | object, key to name | `{}` | Who answered each independent step, for answers you supply: a reviewer with no part in the work (a code-reviewer session, a fresh session or subagent, a person), or `"self"` |

Without `run` the workflow returns exactly what it always returned. Any
`run` value, even `{}`, switches the return value to the envelope below.

An unknown `mode`, or a `from` that names no phase in `meta.phases`,
returns an error string and runs nothing.

## Step keys

A step is one `agent()` call. Its key is its `label`; a second call with
the same label in one run gets `<label>#2`, and so on. A call without a
label uses its phase title. Workflows give every call a unique label,
so keys stay the same from one run to the next.

## Independent steps

A workflow marks a step that reviews work the same run produced with
`independent: true` in its `agent()` options (v2). The flag never reaches
the runtime.

| Mode | How the step is answered | Recorded as |
|---|---|---|
| `agents` | A spawned subagent, which did not do the work | `"subagent"` |
| `inline` | The brief carries `independent: true`; the caller sends it to a separate reviewer and names them in `run.reviewers` | That name |
| either | A stored answer in `results` with no name in `run.reviewers`, or the name `"self"` | `"self"` |

A step recorded as `"self"` is listed in `self_reviewed`. Report its
result as self-reviewed, not as an independent review.

## Return envelope

| Field | Present when | Meaning |
|---|---|---|
| `run` | always | `"agents"` or `"inline"` |
| `status` | always | `"next"`: briefs wait for you (inline only); `"done"`: the workflow finished |
| `next` | `status: "next"` | Briefs, in order: `{ key, phase, prompt, schema }`, plus `independent: true` on a step that must go to a separate reviewer and `note` when an earlier answer to that brief was rejected; `schema` is `null` for a free-text answer |
| `result` | `status: "done"` | The workflow's own return value |
| `results` | always | Every answer used in this run, by key: pass it back to resume |
| `reviewers` | always | For each independent step answered so far, who answered it (see above): pass it back with `results` |
| `self_reviewed` | always | Keys of independent steps answered by the author or with no reviewer recorded |
| `skipped` | always | Keys of steps left out by `only` or `from` that had no stored answer |
| `logs` | always | The workflow's progress messages |
| `how` | `status: "next"` | One-paragraph reminder of how to drive the next step |

## Answer checks

A stored or inline answer is used only if it fits the step's schema the
way the runtime checks an agent's answer: for an object schema it must be
a JSON object carrying every `required` field. Otherwise, in inline mode
the step comes back in `next` with `note: "answer missing <fields>; answer
this brief again"`; in agents mode the step runs again.

## Step outside the selection

| Stored answer in `results` | What the step returns |
|---|---|
| Yes | The stored answer |
| No | Nothing; the workflow takes its usual path for a failed step |

## Tools

| File | Use |
|---|---|
| `tools/run-modes.js` | Canonical block and the tail line that closes it |
| `tools/apply-run-modes.mjs` | `node tools/apply-run-modes.mjs <workflow.js>...` inserts the block after `meta` and the tail line at the end, or refreshes an existing copy |
| `tools/check-workflow.mjs` | `node tools/check-workflow.mjs <workflow.js> '<args JSON>' ['<stub fields JSON>']` runs the workflow with stub agents in every mode, twice: once with clean answers and once where each first review round reports a problem, so fix loops run. Fails on a block that is not the current canonical copy, on unlabelled or duplicate steps, on a review-like prompt ("independent review", "act as a reviewer", "you did not write", "fresh read") without `independent: true`, on independent steps recorded wrongly in either mode, on inline or resume results that differ from the multi-agent run, on an answer missing required fields being accepted, and on `only` running other phases. The optional third argument fixes stub values by field name (for example `{"ci":"green"}`) to reach later phases |

## Requirements on a workflow

- `export const meta` closes with `}` at column 0, so the block can be
  placed after it.
- Every `agent()` call has a `label`, unique within the run.
- Every step that reviews or checks work the run produced passes
  `independent: true`.
- The workflow declares no names `RUN` or `RUN_OUT` and does not shadow
  `agent`, `phase` or `log`.

See [how to run a workflow inline](../how-to/how-to-run-a-workflow-inline.md)
for the steps, the [workflow-run-modes skill](skill-workflow-run-modes.md)
for when to use each mode, and
[about workflow run modes](../explanation/about-workflow-run-modes.md) for
why it works this way.
