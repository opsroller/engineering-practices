---
name: documentation
description: Use whenever a change adds, alters or removes something a person will learn, do, look up or need to understand, and in the Plan, Do and Check steps of every work package. States the team rule (all docs follow Diataxis, one kind per page, docs ship in the same PR) and what each kind of work owes; the full method lives in the technical-writer role.
---

# Documentation

All documentation follows Diataxis (https://diataxis.fr). This skill is
the rule every role follows. For the full method (writing rules per
kind, style, layout, review), install the **technical-writer** role and
use its `diataxis` and `docs-review` skills:

```
/plugin install technical-writer@opsroller
```

The team's Diataxis guide (in the project's shared files, or the
technical-writer plugin) is authoritative where it differs from this
summary.

## The rule

1. **Every page is exactly one kind**: tutorial, how-to guide,
   reference or explanation. Link between kinds; never mix them.
2. **Docs ship in the same PR as the change.** A code, asset or design
   change without its docs is not done. "Docs to follow" is not allowed.
3. **Every page starts with one line** saying what kind it is and who
   it is for, and carries the project's license header (`provenance`).
4. Use the project's docs layout (profile). Default: `docs/tutorials/`,
   `docs/how-to/how-to-<goal>.md`, `docs/reference/` mirroring the
   product, `docs/explanation/about-<topic>.md`. Create a folder when its
   first page arrives, not before.

## The compass, in brief

| Content informs... | Serves the reader's... | Kind |
|---|---|---|
| action | study (learning) | tutorial ("Build your first ...") |
| action | work (a goal) | how-to guide ("How to <goal>") |
| cognition | work (look up mid-task) | reference (the thing's name) |
| cognition | study (understand, why) | explanation ("About <topic>") |

Mid-task lookup is reference; read-after-stepping-back is explanation.
Learner is tutorial; competent user with a goal is how-to. "Basic vs
advanced" is not the line.

## What each kind of work owes

| Work | Docs it owes |
|---|---|
| New feature or system | Reference for its interface; explanation if a design choice was made; how-to if users must do something new |
| Changed interface, option or behaviour | Reference updated; any how-to that mentions it; a changelog entry |
| Removal or deprecation | Reference marks it removed or deprecated; a migration how-to; a changelog entry |
| Bug fix | Reference if behaviour changed; a troubleshooting how-to if users hit it |
| Decision between alternatives | An explanation page (decision-record style) |
| New repeatable task | A how-to, titled by the goal |
| New onboarding path | A tutorial, tested from a clean start |
| Pure refactor or invisible fix | Usually none: write "Docs: none, <reason>" in the PR |

## Steps inside every work package

1. **Plan**: list what the change produces; use the compass and the
   table to name each doc kind and the page to update (preferred) or add.
2. **Do**: write or update those pages in the same PR; run every command
   you wrote; list pages by kind in the PR body.
3. **Check**: confirm each touched page holds one kind, titles follow
   the patterns, links connect the kinds (technical-writer's
   `docs-review` checklist; the code-reviewer role checks it too).

Prompt fragment for a docs phase in any workflow:

> Classify every user-visible change in this work with the Diataxis
> compass (action/cognition x study/work). For each, update or add
> exactly one page of that kind under docs/<kind>/, keep each page to one
> kind, title it by the project pattern, and link to the related pages of
> the other kinds. Report pages touched and any change you left
> undocumented and why.

Large or docs-only jobs (a docs set, an audit, a new tutorial) go to the
technical-writer role as their own work package.

## Failure modes

- One page that teaches, instructs, lists options and argues design.
- Reference written from memory that drifts from the code.
- Docs promised for a later PR.
- Empty placeholder folders to fill the four boxes.
