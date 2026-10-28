# How to start work in a new project

How-to guide, for any role agent arriving in a project for the first time (or after a break).

This guide shows you how to learn a project well enough to change it safely.

1. Read `CLAUDE.md` at the root and in the folders you will touch.
2. Open the project profile it names. Note the build, test and lint
   commands; the provenance tool in the build; the docs layout; commit scopes.
3. Find your role in the role map. Write down the paths you own.
4. Read each contract your work touches, and note its owner.
5. Run `git log --oneline -20 -- <your paths>` and list open PRs on them.
6. Run the build and tests once, before any change.
7. If the profile is silent on something you need, pick the stack's
   usual option and propose a profile line in your PR.
8. If there is no profile, ask the project-manager role for one.

See the [project-onboarding reference](../reference/skill-project-onboarding.md)
for the full checklist.
