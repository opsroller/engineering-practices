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

## Keep the resume light with a state file

Steps 2 to 5 re-send every earlier answer each time. To send only the
new ones, drive the run with the engineering-practices state file
runner, which keeps args and answers in a JSON file:

1. Start it with the workflow file and its args:

   ```
   node <engineering-practices>/tools/run-inline.mjs <plugin>/workflows/screen-audit.js /tmp/audit-state.json --args '{"screens": ["title", "pause"]}'
   ```

2. Do each printed brief. Write each answer to its own file (JSON when
   the brief has a schema; the full schema is in the state file's
   `next`).

3. For each independent brief, the runner prints a line naming a ready
   reviewer prompt file, `<state>.review/<key>.md`. Send that file's
   content to a fresh reviewer agent that had no part in the work (for
   example the Agent tool with the content as its prompt), or pipe it
   straight in with `--review-prompt`:

   ```
   node <engineering-practices>/tools/run-inline.mjs <plugin>/workflows/screen-audit.js /tmp/audit-state.json --review-prompt review
   ```

   The prompt tells the reviewer to write its answer to the path the
   line names, so you copy nothing out of its reply. Do not answer an
   independent brief yourself, and never write that answer file.

4. Pass your own answers, and name the reviewer of each independent
   brief (the printed line has the exact command); the runner collects
   the reviewer's answer file by itself:

   ```
   node <engineering-practices>/tools/run-inline.mjs <plugin>/workflows/screen-audit.js /tmp/audit-state.json --answer plan=plan.json --reviewer 'review=code-reviewer thread'
   ```

   If the reviewer could not write files, pass its reply as it came back
   on stdin instead; the runner takes the JSON out of the text around it:

   ```
   node <engineering-practices>/tools/run-inline.mjs <plugin>/workflows/screen-audit.js /tmp/audit-state.json --answer review=- --reviewer 'review=code-reviewer thread' < reply.txt
   ```

   An answer that lacks a required field stops the call with exit 2 and
   records nothing; have the reviewer fix it and run again.

5. Repeat steps 2 to 4 until it prints `status: done` and the result.
   To redo a step, add `--redo <key>`. When the result asks for a later
   run (`waiting:` on CI, or a land-pr waiting on its reviewer), schedule
   your check-in, then run it again with `--fresh`: it keeps the args and
   drops the stored answers, so nothing from before the wait is replayed.

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
