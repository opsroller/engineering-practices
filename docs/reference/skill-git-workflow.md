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
| Testing while developing | Build and run the product briefly after each small change, plus unit tests for what changed; full CI and integration suites run on the PR (CI on each pushed head, and the reviewer) |
| Opening a PR | Only when the change is built, run, tested and documented; never for work in progress |
| PR size | One concern; about 100 lines comfortable, 1000 too big |
| PR title | A valid Conventional Commit; becomes the squash commit |
| PR body | What and why, testing, stubs, docs by kind, non-original items, `Refs: WP-<id>` |
| Reviewer | The code-reviewer role; never the owner unless asked |
| Merge method | Squash only |
| Who merges | The author, when CI is green, the reviewer passed and the branch is current |
| CI | Polled by the author on the latest head SHA, never awaited as a notification |
| Before merging | Bring in the latest default branch, let CI run on the new head, then squash-merge |
| Cross-PR items | After the merge, extend the PR's change to new members of any set it edits member by member (presets, workflows, jobs, targets) that the default branch added, in its own commit; adapt to renames |
| Review pass | Covers one head; carries across merges that were conflict-free or resolved keep-both (remerge-diff posted to the reviewer); other later commits need a pass of the delta only |
| One failing job | Re-run that job alone, once per head, only when its cause is outside the diff; a pass on re-run is a flake, recorded in the flake log (profile's file or issue, else an open "CI flake log" issue) and the PR body |
| After merge | Delete branch, tell dependants |
| Trunk red | Fix forward in minutes or `revert:` with `Refs: <sha>` |
