---
name: project-onboarding
description: Use at the start of any task in a project. Finds the project's stack, commands, owned paths and contracts so a generic role can work in it.
---

# Project onboarding

Roles are job functions; projects supply the specifics. Before working:

1. Read the repo's `CLAUDE.md`. It points to the project profile (often
   `docs/project-profile.md`) with the stack, tools, build and test
   commands, targets, license and constraints.
2. Find your role in the profile's role map: the paths you own, the
   project skills or docs that apply, and the tools to use for your job.
3. Read the contracts doc for the interfaces your work touches.
4. If a work package brought you here, read its row in the work-package
   plan.

When the profile names a tool you don't know, learn it from its official
docs before writing code; the job is the same, only the tools differ.
If the profile is silent on something you need, choose the conventional
option for that stack, state it in your PR, and suggest a profile line.
