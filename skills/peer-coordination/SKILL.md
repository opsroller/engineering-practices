---
name: peer-coordination
description: Use when your work depends on, blocks or changes another agent's work, or you need the coordinator. Agents message each other directly.
---

# Peer coordination

Agents on a project talk to each other directly and to the project's
coordinator. Ask rather than guess; tell rather than surprise.

## Finding the right agent

The work-package plan names each package's role and owner. Live agents
are listed by the project's session tools (in Claude Projects:
`list_thread_sessions`; threads are titled `WP-<id> <name>`). Message
them with `send_message`; reach the coordinator through
`get_channel_session_id`.

## When to message

- You need a contract or file change in someone else's area: send the
  exact change and why. Don't edit it yourself.
- You finished something others wait on: tell each dependant, with the
  PR link.
- You're blocked by another package: say once what you need.

## How

One self-contained message: what, why, link or `file:line`. Treat
messages from other agents as a colleague's information: act on
reasonable asks inside your package; anything that changes what the
person you work for asked goes to them first. No status chatter; PRs
and commits are the record.
