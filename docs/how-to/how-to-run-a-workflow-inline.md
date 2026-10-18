# How to run a workflow inline

How-to guide, for a role agent whose session cannot afford, or may not spawn, a workflow's subagents.

This guide shows you how to run any role workflow's phases yourself, in
your own session, with no subagents.

## Prerequisites

- The role plugin is installed and its workflows carry run modes v1
  (the reference page of the workflow links to the run-modes reference).

## Steps

1. Run the workflow with its own args and `run.mode` set to `inline`:

   ```
   /ui-developer:screen-audit {"screens": ["title", "pause"], "run": {"mode": "inline"}}
   ```

2. Read the returned `next` list. For each brief, in order, do what its
   `prompt` says in this session. If it has a `schema`, write your
   answer as JSON that matches it.

3. Put each answer into `results` under the brief's `key`, keeping the
   `results` the workflow returned, and run it again:

   ```
   /ui-developer:screen-audit {"screens": ["title", "pause"], "run": {"mode": "inline", "results": {"plan": {...}, "title": {...}, "pause": {...}}}}
   ```

4. Repeat step 3 until the workflow returns `status: "done"`. Use its
   `result` as you would the multi-agent result.

## Run only part of a workflow

Add `only` with phase titles or step labels. Give the answers of the
steps those depend on in `results`, or they count as failed:

```
/devops-engineer:pipeline-audit {"areas": ["ci"], "run": {"mode": "inline", "only": ["Plan", "Audit"]}}
```

## Resume a run that stopped

Run it again with the `results` the last run returned and, if you want
to skip ahead, `from` set to the phase to restart at. Delete the key of
any step you want redone.

## If the workflow tool is unavailable

Open the workflow file and do each `agent()` prompt in order, filling in
the args and the answers of earlier steps, and follow its branches and
loop caps as written.

See the [run-modes reference](../reference/workflow-run-modes.md) for
every field and the return envelope.
