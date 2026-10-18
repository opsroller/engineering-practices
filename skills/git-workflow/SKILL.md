---
name: git-workflow
description: Use whenever you branch, commit, open or update a pull request, respond to review, or merge. Covers short-lived branches, Conventional Commits 1.0.0, small PRs, PR descriptions, squash merge only, and who merges.
---

# Git workflow

The team works trunk-based: the default branch (trunk) is always
releasable, work lands through short-lived branches and small pull
requests, and every PR is squash-merged as one Conventional Commit.
Never commit straight to the default branch.

Message and type details: [commit-reference.md](commit-reference.md).

## 1. Branch

- One branch per work package or per fix, cut from the latest default
  branch: `wp/<id>-<slug>` (`wp/07-password-reset`), otherwise
  `<type>/<slug>` (`fix/login-timeout`, `docs/install-guide`). Follow the
  profile if it names another scheme.
- **One author per branch** (a pairing partner is fine). Others review
  through the PR; they do not push to it unless asked.
- **Short-lived**: hours to a couple of days. A branch older than about
  two days is a warning sign: split the work or land a slice behind a
  flag, stub or new unused path.
- Stay current: rebase on (or merge) the default branch before asking
  for review and again before merging.
- Never merge a branch into another feature branch, and never merge
  part-finished work into trunk unless it is safe to release as is
  (hidden, unused, or behind a toggle).

## 2. Commit

- Conventional Commits 1.0.0: `<type>[(scope)][!]: <description>`.
  Lower-case imperative summary, no trailing period, about 72 characters
  or fewer.
- Body (after one blank line) says **why** and what trade-offs you
  made, not a diff narration.
- Footers (after one blank line): `Refs: WP-07`, `BREAKING CHANGE: ...`,
  sign-offs or trailers the project requires.
- Commit in small logical steps; a commit that fits two types is two
  commits. Branch commits are squashed on merge, but clear ones make
  review and bisecting the branch easier.
- Run the project's build, tests and linters before every push.

## 3. Pull request

- **Small.** One self-contained change: one package, one concern, with
  its tests and docs, leaving the system working. Around 100 changed
  lines is comfortable, 1000 is too big (deleted files and generated
  code count less). Separate refactors from behaviour changes.
- **Title** = a valid Conventional Commit line. It becomes the squash
  commit, so it is the permanent record.
- **Description**: what changed and why; how it was tested; what was
  stubbed or left out; docs updated (by Diataxis kind); sources and
  licenses of anything not original (`provenance`); `Refs: WP-<id>`.
  Enough context that a reader without links can follow it.
- Open as **draft** early. Mark ready when CI is green and you have
  reviewed your own diff top to bottom.
- Re-read the title and description before merging; PRs change during
  review.

## 4. Review

- The reviewer is the project's code-reviewer role (or the peer the
  profile names). **The project owner does not review PRs** unless they
  ask to see something.
- Answer every comment: fix the code, or explain the trade-off. If a
  reviewer did not understand the code, make the code clearer (or add a
  comment) rather than only replying in the thread.
- Disagree with reasons and facts, never with heat. If you cannot
  converge, ask the coordinator to decide.
- Push fixes as new commits during review (easier to re-review); they
  are squashed anyway.

## 5. Merge

- **Squash merge only.** No merge commits, no rebase-merge, no
  fast-forward pushes to trunk.
- **The PR's author merges**, when all three hold: CI is green, the
  reviewer has passed it, and the branch is up to date with no conflict.
  Do not wait on the owner.
- Check the squash message: the PR title as subject; body trimmed to the
  why plus footers (`Refs:`, `BREAKING CHANGE:`, co-author trailers).
- Delete the branch after merging. Tell dependants (`peer-coordination`).

## Trunk is red

If trunk breaks after your merge: fix forward within minutes, or
**revert** (`revert: <original subject>` with `Refs: <sha>`). Reverting
is not a failure; leaving trunk red is.

## Checklist before pressing merge

- [ ] Title is a valid Conventional Commit; `!`/`BREAKING CHANGE` if it breaks a contract
- [ ] Diff is one concern, tests included, refactors separate
- [ ] Docs for the change are in this PR (`documentation`)
- [ ] Provenance recorded for anything not original (`provenance`)
- [ ] CI green, reviewer passed, branch current
- [ ] Squash merge selected, branch deleted after

## Failure modes

- Long-lived branches that drift, then a huge painful merge.
- "WIP", "fix stuff", "address comments" as the squash subject.
- Mixing a reformat or rename with a behaviour change.
- Merging on green CI without the reviewer's pass, or waiting days for
  the owner when the reviewer already passed it.
