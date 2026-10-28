# provenance skill

Reference, for any role making a change or adding a file.

| Field | Value |
|---|---|
| Files | `skills/provenance/SKILL.md`, `skills/provenance/license-headers.md` |
| Use when | Making a change; adding a generated file, dependency, vendored file or build artifact; adding license headers |

## What is kept traceable

| What | Traceable when |
|---|---|
| Change | Reviewed, squash-merged pull request with a Conventional Commit title and `Refs: WP-<id>` |
| Generated file | Generator and command committed; output regenerated, never hand-edited |
| Dependency | Through the package manager at an exact version, lockfile in the same change |
| Vendored or copied-in file | Upstream, version or commit, and checksum logged; local changes in separate commits |
| Build artifact | Built by continuous integration from a commit; identified by commit and digest |
| Toolchain or pipeline step | Pinned to an exact version or digest |

## Header formats

| File kind | Header |
|---|---|
| Commentable | `SPDX-License-Identifier: <expression>` (and `SPDX-FileCopyrightText` under REUSE) in the file's comment syntax |
| Not commentable | `<file>.license` sidecar or `REUSE.toml` `[[annotations]]` entry |

## Provenance log columns

Path, origin, version or commit, checksum, changes, added in.
