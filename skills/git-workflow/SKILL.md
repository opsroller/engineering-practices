---
name: git-workflow
description: Use whenever you branch, commit or open a pull request. Covers branch names, Conventional Commits and PR titles.
---

# Git workflow

All work happens in git: branch from the default branch, commit, push,
open a draft pull request, get it reviewed, squash-merge. Never commit
straight to the default branch.

## Branches

`wp/<id>-<slug>` for a work package (`wp/07-piece-models`), otherwise
`<type>/<slug>` (`fix/cascade-score`).

## Commits: Conventional Commits 1.0

```
<type>(<scope>): <imperative summary, lower case, no period>

<optional body: why, not what>

Refs: WP-07
```

Types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `style`,
`build`, `ci`, `chore`, `revert`. Breaking changes add `!` and a
`BREAKING CHANGE:` footer. Scopes come from the project profile; if it
lists none, use the top-level area you changed.

## Pull requests

- Title is a Conventional Commit line; it becomes the squash commit.
- Draft early; ready when tests and CI pass.
- One work package per PR. Body lists what was stubbed and what can now
  start.
- Review comes from the project's reviewer (the `code-reviewer` role),
  not the project owner, unless the owner asks to see something.

## Merging

- **Squash merge only.** Never fast-forward, rebase-merge or create merge
  commits on the default branch. The PR title is the squash commit
  message, so it must be a valid Conventional Commit.
- The PR's author merges it once CI is green, the reviewer has passed
  it, and there is no conflict. Don't wait on the owner.
- Delete the branch after merging.
