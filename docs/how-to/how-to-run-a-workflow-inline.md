# How to run a workflow inline

How-to guide, for a role agent whose session cannot afford, or may not spawn, a workflow's subagents.

This guide shows you how to run any role workflow's phases yourself, in
your own session, with no subagents.

## Prerequisites

- The role plugin is installed and its workflows carry run modes v1 or later (v2 adds independent review steps)
  (the reference page of the workflow links to the run-modes reference).

## Steps

1. Run the workflow with its own args and `run.mode` set to `inline`:

   ```
   /ui-developer:screen-audit {"screens": ["title", "pause"], "run": {"mode": "inline"}}
   ```

2. Read the returned `next` list. For each brief, in order, do what its
   `prompt` says in this session. If it has a `schema`, write your
   answer as JSON that matches it.

3. If a brief has `independent: true`, do not answer it yourself: it
   reviews the work you just did. Send its prompt to a reviewer who had
   no part in the work (the project's code-reviewer role, a fresh
   session, or a fresh subagent), take their answer, and note who it was.

4. Put each answer into `results` under the brief's `key`, and each
   reviewer's name into `reviewers` under the same key, keeping what the
   workflow returned, and run it again:

   ```
   /ui-developer:screen-audit {"screens": ["title", "pause"], "run": {"mode": "inline", "results": {"plan": {...}, "title": {...}, "pause": {...}}, "reviewers": {"review": "code-reviewer thread"}}}}
   ```

5. Repeat steps 3 and 4 until the workflow returns `status: "done"`. Use
   its `result` as you would the multi-agent result. If `self_reviewed`
   lists any step, say in the PR and your report that it was
   self-reviewed.

## Run only part of a workflow

Add `only` with phase titles or step labels. Give the answers of the
steps those depend on in `results`, or they count as failed:

```
/devops-engineer:pipeline-audit {"areas": ["ci"], "run": {"mode": "inline", "only": ["Plan", "Audit"]}}
```

## Resume a run that stopped

Run it again with the `results` and `reviewers` the last run returned and, if you want
to skip ahead, `from` set to the phase to restart at. Delete the key of
any step you want redone.

## If the workflow tool is unavailable

Open the workflow file and do each `agent()` prompt in order, filling in
the args and the answers of earlier steps, and follow its branches and
loop caps as written. Give any call with `independent: true` to a separate
reviewer, as in step 3.

See the [run-modes reference](../reference/workflow-run-modes.md) for
every field and the return envelope.
