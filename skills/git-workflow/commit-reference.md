# Commit message reference

Conventional Commits 1.0.0 (https://www.conventionalcommits.org/en/v1.0.0/).

## Shape

```
<type>[optional scope][!]: <description>

[optional body]

[optional footer(s)]
```

| Rule | Detail |
|---|---|
| Type | Required noun, then optional `(scope)`, optional `!`, then `: ` |
| `feat` | Adds a feature (SemVer MINOR) |
| `fix` | Fixes a bug (SemVer PATCH) |
| Breaking change | `!` before the colon, or a `BREAKING CHANGE: <text>` footer, or both. Any type can break. SemVer MAJOR |
| Scope | Noun naming a part of the codebase, e.g. `feat(parser):`. Use the profile's list |
| Body | Starts one blank line after the description; free-form, any number of paragraphs |
| Footers | One blank line after the body; `Token: value` or `Token #value`; tokens use `-` for spaces (`Reviewed-by`), except `BREAKING CHANGE` |
| `BREAKING-CHANGE` | Same meaning as `BREAKING CHANGE` |
| Case | Tools treat it case-insensitively except `BREAKING CHANGE`, which must be upper case. This team: lower-case type and summary |

## Types used on this team

| Type | Use for |
|---|---|
| `feat` | New user- or developer-visible capability |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code change with no behaviour change |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests only |
| `build` | Build system, dependencies, packaging |
| `ci` | CI configuration and scripts |
| `style` | Formatting only, no code meaning change |
| `chore` | Maintenance that fits nothing above (not a catch-all for features) |
| `revert` | Reverts a commit; footer `Refs: <sha>` |

If a change fits two types, make two commits (or two PRs).

## Examples

```
feat(auth): let users reset a forgotten password by email

Users locked out had to contact support. Reset links expire after
30 minutes to limit the window if an inbox is compromised.

Refs: WP-12
```

```
fix(config)!: read timeouts in seconds, not milliseconds

BREAKING CHANGE: `request_timeout` values written in milliseconds
are now read as seconds. The loader warns when a value exceeds 600.
```

```
revert: feat(auth): let users reset a forgotten password by email

Refs: 3f2a91c
```

## Good and bad subjects

| Bad | Why | Better |
|---|---|---|
| `fix bug` | No type format, no what | `fix(input): ignore key repeat on menu open` |
| `feat: Added new menu.` | Past tense, capital, period | `feat(menu): add settings screen` |
| `chore: implement export` | Feature hidden as chore | `feat(export): add CSV export` |
| `update files` | Says nothing | name the change and its area |
