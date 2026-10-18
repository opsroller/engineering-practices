---
name: workflow-run-modes
description: Use when you run a role workflow and fanning out several agents is too costly or not allowed, when you want only some of its phases or dimensions, when you resume a workflow that stopped part way, or when you write or change a workflow script.
---

# Workflow run modes

Every role workflow (`workflows/*.js`, run as `/<plugin>:<workflow>`)
accepts one optional extra arg, `run`, on top of its own args. Without
`run` the workflow behaves as it always has: it spawns its agents and
returns its usual result. With `run` you choose how cheaply it runs.

| You want | Pass | Agents spawned |
|---|---|---|
| The usual multi-agent run | nothing | all |
| The same run, with results you can resume from | `run: {}` | all |
| The same phases, done by you in this session | `run: { mode: "inline" }` | none |
| Only some phases, steps or dimensions | `run: { only: ["<phase>", "<label>"] }` | only those |
| To start at a phase, reusing earlier results | `run: { from: "<phase>", results: {...} }` | from there on |

The fields combine: `{ mode: "inline", only: [...], results: {...} }` is
valid. The phase names are the workflow's `meta.phases` titles; the step
and dimension names are the `label` of each agent call (for example
`audit:ci`, `review:2`, or a screen name). `only` matches a phase title,
an exact label, or a label prefix before `:` (`audit` matches `audit:ci`).

## Choose a mode

- Your session may spawn agents and the run is affordable: no `run`.
- A cost limit, a single-session rule or a missing agent tool: inline.
- You need one dimension re-checked (one screen, one area): `only` with
  that label, plus `results` for the phases it depends on.
- A run died or a step failed: resume with `from` and the `results` the
  last run returned (always pass `run` so it returns them).

## Drive an inline run

1. Run the workflow with its args plus `run: { mode: "inline" }`.
2. It returns `{ status: "next", next: [...], results }`. Each item of
   `next` is a brief: `key`, `phase`, `prompt`, `schema`.
3. Do each brief yourself, in order, in this session. Follow its prompt
   as written, including any edits, commits or pushes it asks for, and
   any skills it names. When it has a `schema`, your answer is a JSON
   value matching it; when not, a short text answer.
4. Merge your answers into `results` under each brief's `key`, keeping
   every result already there.
5. Run the workflow again with the same args and
   `run: { mode: "inline", results }`.
6. Repeat until it returns `{ status: "done", result }`. `result` is what
   the multi-agent run would have returned; report it the same way.

Several briefs in one `next` are independent (a fan-out); do them one
after another. The workflow's own branches, loops and caps still apply,
because it decides each next step from your answers. Answer honestly:
an empty or failing answer takes the same path a failed agent would.

If the workflow tool itself is unavailable, read the workflow file and
do each `agent()` prompt in order the same way, with its args filled in.

## Results and resume

`results` maps each step's key to its answer. A step whose key is in
`results` is not run again; its stored answer is reused. A step left out
of `only`, or before `from`, with no stored answer returns nothing, and
the workflow treats it as a failed step, so supply the results of the
steps the chosen ones depend on. To redo a step, delete its key.

## Writing or changing a workflow

- Give every `agent()` call a `label` unique within the run (add the
  item or round to labels inside loops and fan-outs: `audit:${area}`,
  `review:${round}`).
- Keep the run-modes block verbatim. Insert or refresh it with
  `node tools/apply-run-modes.mjs <workflow.js>` from the
  engineering-practices repo; never edit a copy by hand.
- Check the workflow offline with
  `node tools/check-workflow.mjs <workflow.js> '<args JSON>'`: it runs
  every mode with stub agents and fails on missing or duplicate labels,
  or when inline, resume or `only` diverge from the multi-agent run.
- Document `run` in the workflow's reference page by linking to the
  engineering-practices run-modes reference rather than repeating it.
