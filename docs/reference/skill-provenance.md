# provenance skill

Reference, for roles adding any file or material.

| Field | Value |
|---|---|
| Files | `skills/provenance/SKILL.md`, `skills/provenance/license-headers.md` |
| Use when | Adding code, assets, text, fonts, sounds, data or names; adding headers |

## Decision table

| Material | Allowed when |
|---|---|
| Own original work | Always, under the project's license (never a template default) |
| Script-generated | Always; commit the generator |
| Third-party | License on the profile's allowed list and compatible |
| Dependency | Same as third-party |
| Unknown or personal-use license | Never |
| AI-assisted | As own work, checked for close copies |

## Header formats

| File kind | Header |
|---|---|
| Commentable | `SPDX-License-Identifier: <expression>` (and `SPDX-FileCopyrightText` under REUSE) in the file's comment syntax |
| Not commentable | `<file>.license` sidecar or `REUSE.toml` `[[annotations]]` entry |

## Provenance log columns

Path, origin, author, license, changes, added in.
