# About workflow run modes

Explanation, for anyone deciding how to run a role workflow or how to write one.

## Why workflows need a cheap path

A role workflow fans out: one agent plans, several audit or build in
parallel, others review and document. That buys independence and speed,
but every agent costs a fresh context. Under a tight cost limit, or in a
session that may not spawn agents, a team would rather skip the workflow
and work by hand, and then loses the phases, checks and caps the
workflow encodes. Run modes keep the workflow as the single description
of how the job is done and let the caller pick how much to spend on it.

## Why the workflow still drives an inline run

Inline mode could have been a document listing the phases. Instead the
workflow script runs as usual and pauses at each step it cannot answer,
handing back the exact prompt its agent would have received. The caller
answers and runs it again; the script replays the stored answers and
moves on. So branches, fix loops, round caps, severity gates and the
final result come from the same code in both modes, and the two cannot
drift apart. Each pause costs one tool call and no agent.

The price is that a step's answer must be passed back on every call.
For the sizes role workflows handle (a plan, a few findings lists) that
is cheap; it also makes every run resumable, even in a later session.

## Why some steps must leave the session

A multi-agent run gets independence for free: the agent that reviews a
change is a fresh context that never saw it being made. Inline mode
loses that. The author answers every brief, including the one that asks
"act as an independent reviewer", and the result then reads as reviewed
when it was not. Designer blindness and author bias are exactly what the
review step exists to catch.

So a workflow marks those steps, and inline mode hands them back flagged
for a separate reviewer instead of quietly to the author. The block
records who answered each one. When nobody else could, the step still
completes, because blocking would push people back to working by hand,
but the run says `self_reviewed` and the caller reports it that way. An
honest "self-reviewed" is worth more than a review that only looks
independent.

## Why one shared block, copied

Workflow scripts cannot import code, so the block is copied into each
one. A tool inserts and refreshes it, a checker proves each copy behaves
the same in every mode, and the block carries a version so a later
change can be rolled out across plugins in one sweep.

## What it does not do

It does not merge phases into fewer, larger agents: that would change
what each step sees and need a rewrite per workflow. It does not stop a
workflow from being expensive by design; it lets the caller choose.

See the [run-modes reference](../reference/workflow-run-modes.md) and
[how to run a workflow inline](../how-to/how-to-run-a-workflow-inline.md).
