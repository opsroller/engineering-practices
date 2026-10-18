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
| To start at a phase, reusing earlier results | `run: { from: "<phase>", results: {...}, reviewers: {...} }` | from there on |

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
3. Do each brief in order, in this session, except independent ones
   (step 4). Follow its prompt
   as written, including any edits, commits or pushes it asks for, and
   any skills it names. When it has a `schema`, your answer is a JSON
   value matching it, with every required field; when not, a short text
   answer. A brief that comes back with a `note` was answered without the
   fields the note names: answer it again in full.
4. A brief marked `independent: true` reviews work you just did, so you
   are the wrong one to answer it. Send its prompt, unchanged, to a
   reviewer with no part in the work: the project's code-reviewer role
   (its thread or session), a fresh session, or a fresh subagent if you
   may spawn one. Use their answer, and record who gave it in
   `reviewers` under the brief's key. Only if no reviewer can be reached,
   answer it yourself and record `"self"`.
5. Merge your answers into `results` and the names into `reviewers`
   under each brief's `key`, keeping every entry already there.
6. Run the workflow again with the same args and
   `run: { mode: "inline", results, reviewers }`.
7. Repeat until it returns `{ status: "done", result }`. `result` is what
   the multi-agent run would have returned; report it the same way, and
   for every key in `self_reviewed` say that step was self-reviewed (in
   the PR body and the reply), never that it was independently reviewed.

Several briefs in one `next` do not depend on each other (a fan-out); do them one
after another. The workflow's own branches, loops and caps still apply,
because it decides each next step from your answers. Answer honestly:
an empty or failing answer takes the same path a failed agent would.

## Keep the resume light

Each inline call re-sends every earlier answer. For a workflow with more
than two or three phases, drive it with the state file runner instead:
it keeps `results` in a file and each call sends only the new answers.

```
node <engineering-practices>/tools/run-inline.mjs <plugin>/workflows/<name>.js state.json --args '<the args JSON>'
# do each printed brief, write its answer to a file, then:
node <engineering-practices>/tools/run-inline.mjs <plugin>/workflows/<name>.js state.json --answer plan=plan.json
```

Add `--reviewer <key>=<who>` for each independent brief someone else
answered. Keep the state file in your scratch space, not in the
repository.

If the workflow tool itself is unavailable, read the workflow file and
do each `agent()` prompt in order the same way, with its args filled in.
A call with `independent: true` in its options goes to a separate
reviewer, as in step 4.

## Results and resume

`results` maps each step's key to its answer. A step whose key is in
`results` is not run again; its stored answer is reused. Pass back
`reviewers` too: an independent step reused without a name there counts
as self-reviewed. A step left out
of `only`, or before `from`, with no stored answer returns nothing, and
the workflow treats it as a failed step, so supply the results of the
steps the chosen ones depend on. To redo a step, delete its key.

## Writing or changing a workflow

- Give every `agent()` call a `label` unique within the run (add the
  item or round to labels inside loops and fan-outs: `audit:${area}`,
  `review:${round}`).
- Pass `independent: true` in the options of every step that reviews or
  checks work the same run produced (a review, a fresh read against a
  brief, a verification of claims). Do not mark steps that only gather,
  build or fix. An independent step only reads and reports: it never edits, commits or pushes. A step that checks and also applies fixes (for example a docs check that fixes what it finds) had a part in the work it judges, so it is not independent; split it into an independent check and a separate fix step after it.
- Keep the run-modes block verbatim. Insert or refresh it with
  `node tools/apply-run-modes.mjs <workflow.js>` from the
  engineering-practices repo; never edit a copy by hand.
- Check the workflow offline with
  `node tools/check-workflow.mjs <workflow.js> '<args JSON>'`: it runs
  every mode with stub agents, with clean answers and with a first review
  round that reports a problem, and fails on missing or duplicate labels,
  on a stale or edited block, on a review-like prompt not marked
  independent, on an incomplete answer being accepted, or when inline,
  resume or `only` diverge from the multi-agent run. Pass stub field values as a
  third argument to reach phases behind a gate.
- Document `run` in the workflow's reference page by linking to the
  engineering-practices run-modes reference rather than repeating it.
