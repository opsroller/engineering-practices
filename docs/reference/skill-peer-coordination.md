# peer-coordination skill

Reference, for roles whose work touches another agent's.

| Field | Value |
|---|---|
| File | `skills/peer-coordination/SKILL.md` |
| Use when | Depending on, blocking or changing another agent's work; changing a contract; handing off |

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

## Contract change pattern

Expand (add beside), migrate (consumers move), contract (remove old,
marked breaking). Consumers read tolerantly.

## Interaction modes

Collaboration (time-boxed), as a service (through the contract),
facilitating (ends when the other can do it alone).

## Tools (Claude Projects)

`list_thread_sessions`, `send_message`, `get_channel_session_id`.
