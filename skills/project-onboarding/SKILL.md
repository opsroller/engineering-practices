---
name: project-onboarding
description: Use at the start of any task in any project, before reading code or writing anything. Finds the project's stack, commands, owned paths, contracts, license rule and docs layout so a generic role can work in it.
---

# Project onboarding

A role is a job function; the project supplies the specifics. Every role
plugin says *how to do the job well*. The project says *with what*. You
learn the project before you touch it, every time, even if you worked in
it yesterday: profiles and contracts change.

## Steps (in order, before any change)

1. **Read `CLAUDE.md`** at the repo root (and any nested `CLAUDE.md` in
   directories you will work in). It states standing rules and points to
   the project profile.
2. **Read the project profile** (often `docs/project-profile.md`; the
   path is in `CLAUDE.md`). Extract into your working notes:
   - stack and tools for your role (engine, language, editor, DAW, ...);
   - build, test, lint and run commands, and how CI runs them;
   - targets (platforms, browsers, devices) and budgets;
   - **license rule**: the project license, the header rule (e.g. an
     SPDX line per file, REUSE), which third-party licenses are allowed,
     where the provenance log and credits live;
   - **docs layout**: where the four Diataxis kinds live
     (`docs/tutorials`, `docs/how-to`, `docs/reference`,
     `docs/explanation`, or the project's equivalent);
   - Conventional Commit scopes, branch naming, release process.
3. **Find your role in the role map**: the paths you own, project skills
   or docs that apply to your job, who owns the neighbouring areas.
4. **Read the contracts** for every interface your work touches
   (APIs, data formats, file layouts, signals, asset specs). The contract
   doc wins over what the code happens to do today.
5. **If a work package brought you here**, read its row in the plan
   (`work-packages`): dependencies, done-when, its owner.
6. **Look at recent history** for your area: `git log --oneline -20 --
   <owned paths>` and open PRs touching them. Someone may be mid-change.
7. **Run the build and tests once** before changing anything, so you
   know the baseline. A failure you did not cause is reported, not
   silently fixed inside your package.

Write down (in the PR body later) any assumption you had to make.

## Decision rules

- **The profile names a tool you do not know**: learn it from its
  official documentation before writing anything. The job is the same,
  only the tool differs.
- **The profile is silent on something you need**: choose the
  conventional option for that stack, state the choice in your PR, and
  propose a profile line in the same PR (one line, in the profile's
  style).
- **Profile and `CLAUDE.md` disagree**: `CLAUDE.md` (the owner's
  standing rules) wins; flag the conflict to the coordinator.
- **Code and contract disagree**: the contract wins; raise it with the
  contract's owner (`peer-coordination`) before relying on either.
- **No profile at all**: stop and ask the coordinator (the
  project-manager role) for one; do not invent the project's stack.

## Done when

You can answer, without guessing:

- [ ] Which paths may I write? Which may I only read?
- [ ] Which commands build, test and lint my change?
- [ ] Which contracts constrain me, and who owns each?
- [ ] What license and header rule apply to new files?
- [ ] Where do the docs for my change go, by Diataxis kind?
- [ ] What branch, commit scope and done-when apply?

## Failure modes

- Starting from memory of "how projects usually work" and missing the
  project's own rule (license header, docs path, merge policy).
- Treating a role plugin's examples (a tool named "e.g.") as the
  project's choice.
- Editing a file outside owned paths "because it was quicker".
- Skipping the baseline test run, then being unable to tell your
  breakage from a pre-existing one.
