# peer-coordination skill

Reference, for roles whose work touches another agent's.

| Field | Value |
|---|---|
| File | `skills/peer-coordination/SKILL.md` |
| Use when | Depending on, blocking or changing another agent's work; touching a path another role owns; changing a contract; handing off |

## Message routing

| Situation | Recipient |
|---|---|
| Change needed in another's path or contract | Its owner |
| Changing a contract you own | Every consumer |
| Finished work others wait on | Each dependant |
| Blocked | The blocker's owner once, then the coordinator |
| Request conflicts with the owner's ask | The coordinator |

## Message shape

From and to packages, Need, Why, Meanwhile, Link.

## Cross-role edit rules

| Rule | Meaning |
|---|---|
| Minimal | only the lines the change needs; describable in one line |
| Separate commit | one commit per cross-role edit; after a squash merge the owner reverts by hand, or land it as its own PR first |
| Flagged | "Cross-role edits" section in the PR: path, owner, what, why |
| Owner notified | direct message with the list and PR link before merge |
| Objection stops merge | remove the edit or ask the coordinator; no answer by review pass: merge, notice stands |

Not for contracts, the owner's own work, or fixing their bugs.

## Contract change pattern

Expand (add beside), migrate (consumers move), contract (remove old,
marked breaking). Consumers read tolerantly.

## Interaction modes

Collaboration (time-boxed), as a service (through the contract),
facilitating (ends when the other can do it alone).

## Tools (Claude Projects)

`list_thread_sessions`, `send_message`, `get_channel_session_id`.
