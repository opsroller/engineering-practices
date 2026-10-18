# documentation skill

Reference, for roles writing the docs their change owes.

| Field | Value |
|---|---|
| File | `skills/documentation/SKILL.md` |
| Use when | A change affects what people learn, do, look up or understand; Plan, Do and Check of every package |
| Full method | The technical-writer role (`diataxis`, `docs-review` skills) |

## Rules

- One Diataxis kind per page.
- Docs in the same PR as the change.
- First line of each page names kind and audience.
- Project layout, or `docs/tutorials`, `docs/how-to/how-to-<goal>.md`, `docs/reference/`, `docs/explanation/about-<topic>.md`.

## What each kind of work owes

| Work | Docs |
|---|---|
| New feature or system | Reference; explanation if a design choice; how-to if users do something new |
| Changed interface or behaviour | Reference updated; affected how-tos |
| Bug fix | Reference if behaviour changed; troubleshooting how-to if users hit it |
| Decision between alternatives | Explanation |
| New repeatable task | How-to |
| New onboarding path | Tutorial, tested from clean |
| Pure refactor | Usually none, stated in the PR |
