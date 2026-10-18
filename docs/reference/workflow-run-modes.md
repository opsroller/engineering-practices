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

An independent step only reads and reports: it never edits, commits or pushes. A step that checks and also applies fixes (for example a docs check that ends "Fix what you can") had a part in the work it judges, so it is not independent; split it into an independent check and a separate fix step after it, then an independent recheck if the fix needs judging. Say it in the prompt: an independent prompt that uses any of fix, apply, edit, commit or push counts as writing unless it also says it is read-only ("Do not edit anything", "Read-only", "Fix nothing; list problems").

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
| `tools/run-inline.mjs` | `node tools/run-inline.mjs <workflow.js> <state.json> [--args '<JSON>'] [--answer <key>=<file>]... [--reviewer <key>=<name>]... [--redo <key>]... [--fresh]` drives an inline run from a state file; see [State file runner](#state-file-runner) |
| `tools/check-workflow.mjs` | `node tools/check-workflow.mjs <workflow.js> '<args JSON>' ['<stub fields JSON>']` runs the workflow with stub agents in every mode, twice: once with clean answers and once where each first review round reports a problem, so fix loops run. Fails on a block that is not the current canonical copy, on unlabelled or duplicate steps, on a review-like prompt ("independent review", "act as a reviewer", "you did not write", "fresh read") without `independent: true`, on an independent step whose prompt uses fix, apply, edit, commit or push without saying it is read-only (so "Fix what you can" fails and "Fix nothing; list problems" passes), on independent steps recorded wrongly in either mode, on inline or resume results that differ from the multi-agent run, on an answer missing required fields being accepted, and on `only` running other phases. The optional third argument fixes stub values by field name (for example `{"ci":"green"}`) to reach later phases |

## State file runner

An inline run re-sends every earlier answer on each call, so the
`results` blob grows with each phase. `tools/run-inline.mjs` keeps args,
`results` and `reviewers` in a JSON state file instead: each call sends
only the new answers, as files, and prints only the next briefs. It runs
the same workflow script and run-modes block, so the results are the
same as driving the Workflow tool by hand.

| Flag | Effect |
|---|---|
| `--args '<JSON>'`, `--args-file <file>` | The workflow's own args (with any `run.only` or `run.from`); needed on the first call, stored for later ones |
| `--answer <key>=<file>` | Stores the file's content under `key`: parsed as JSON when it is JSON, else as trimmed text |
| `--reviewer <key>=<name>` | Records who answered an independent step |
| `--redo <key>` | Drops a stored answer, so that step is asked again |
| `--fresh` | Drops every stored answer and keeps the args: use it to run again after a check-in, when the result said to (`waiting:`, `not merged:` or a `next` that says run again) |

Loops that ask a new brief each round, such as land-pr's sync rounds
while the default branch moves, need no special handling: each round
is one more `--answer`. A result that asks for a later run (CI still
pending, waiting on a reviewer) is a finished run; the runner prints the
`--fresh` command for the next one, since a stored answer from before the
check-in would otherwise be replayed.

An `--answer` for a step the run does not reach on this call is not kept:
the state file stores the run's own `results`, and the step is asked
for again in `next` once the run reaches it.

Each call rewrites the state file with the merged `results`,
`reviewers`, `status` and the full `next` briefs (schemas included), and
prints a summary: for `next`, each brief's key, phase, independence,
note, required fields and prompt; for `done`, any `self_reviewed` keys
and the result. A workflow that returns before the run-modes block wraps
its result (a usage or argument error) prints that and exits 1.

It runs the workflow file with Node, with full file access, so use it
only on workflows from a plugin or repository you trust, as you would
when installing the plugin. The workflow file is wherever the plugin is
installed or checked out.

## Requirements on a workflow

- `export const meta` closes with `}` at column 0, so the block can be
  placed after it.
- Every `agent()` call has a `label`, unique within the run.
- Every step that reviews or checks work the run produced passes
  `independent: true`, and no step marked so edits, commits or pushes.
- The workflow declares no names `RUN` or `RUN_OUT` and does not shadow
  `agent`, `phase` or `log`.

See [how to run a workflow inline](../how-to/how-to-run-a-workflow-inline.md)
for the steps, the [workflow-run-modes skill](skill-workflow-run-modes.md)
for when to use each mode, and
[about workflow run modes](../explanation/about-workflow-run-modes.md) for
why it works this way.
