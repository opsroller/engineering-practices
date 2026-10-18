# git-workflow skill

Reference, for roles branching, committing, opening PRs or merging.

| Field | Value |
|---|---|
| Files | `skills/git-workflow/SKILL.md`, `skills/git-workflow/commit-reference.md` |
| Use when | Branching, committing, opening or updating a PR, answering review, merging |

## Rules

| Topic | Rule |
|---|---|
| Branch name | `wp/<id>-<slug>` for a package, `<type>/<slug>` otherwise (e.g. `fix/login-timeout`) |
| Branch life | Hours to about two days; one author |
| Commit | Conventional Commits 1.0.0: `<type>[(scope)][!]: <description>` |
| Types | `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `style`, `chore`, `revert` |
| Breaking | `!` before the colon and/or `BREAKING CHANGE:` footer |
| PR size | One concern; about 100 lines comfortable, 1000 too big |
| PR title | A valid Conventional Commit; becomes the squash commit |
| PR body | What and why, testing, stubs, docs by kind, non-original items, `Refs: WP-<id>` |
| Reviewer | The code-reviewer role; never the owner unless asked |
| Merge method | Squash only |
| Who merges | The author, when CI is green, the reviewer passed and the branch is current |
| CI | Polled by the author on the latest head SHA, never awaited as a notification |
| Before merging | Bring in the latest default branch, let CI run on the new head, then squash-merge |
| After merge | Delete branch, tell dependants |
| Trunk red | Fix forward in minutes or `revert:` with `Refs: <sha>` |
