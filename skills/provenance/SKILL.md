---
name: provenance
description: Use before adding any code, asset, text, font, sound, data or name to a project, and when adding license headers. Keeps the project to original or properly licensed material, records where everything came from, and applies the project's license-header rule (e.g. SPDX identifiers, REUSE).
---

# Provenance

Everything that ships must be something the project may ship, and
anyone must be able to see where it came from. You certify each
contribution the way the Developer Certificate of Origin puts it: you
made it and may submit it under the project license, or it is based on
work under a compatible license and you are passing it on under those
terms, with the record kept.

Header and log formats: [license-headers.md](license-headers.md).

## Decision rules for each new thing

| What you are adding | Allowed when | Record |
|---|---|---|
| Your own original work | Always | Header per the project rule |

## Always

- **License every new file under the project's license, never a
  template default.** Generators, scaffolds, editors and AI tools often
  stamp MIT, Apache-2.0 or "All rights reserved"; replace it with the
  project's license and header before committing. Check `LICENSE`,
  manifests (`package.json`, `plugin.json`, `Cargo.toml`, ...) and
  headers agree.

## Steps

1. Before adding: classify the item with the table. Unsure? Leave it out
   and ask the coordinator.
2. Read the license itself (not a summary): attribution, share-alike,
   no-derivatives, non-commercial clauses. A non-commercial or
   no-derivatives license is incompatible with most open projects.
3. Add the header the project requires to every new file you create
   (e.g. a `SPDX-License-Identifier` line in the file's comment syntax;
   a `.license` sidecar or `REUSE.toml` entry for binaries and assets).
   Never remove or change existing copyright notices.
4. Append to the provenance log (profile names the path): path, how it
   was made (original / script / source URL), author, license, changes.
5. If the license requires attribution, add it to the credits file.
6. In the PR body, list every non-original item with source and license.
7. If the project uses a checker (REUSE lint, license scanner), run it.

## Recreating or drawing on an existing work

- Ideas, rules and mechanics may be reimplemented; **expression may
  not**. Never copy, extract, trace, resample, decompile or closely
  imitate the original's code, art, audio, text, levels or data.
- Describe the original only in your own words, as observed behaviour.
- Trademarks and titles: use the original's name only where the profile
  allows it (typically a credits or "inspired by" line), never as your
  title, logo or branding.

## License compatibility (quick guide; the profile's list wins)

- Permissive (MIT, BSD, Apache-2.0, Zlib, CC0, CC-BY) generally flow
  into copyleft projects; keep their notices. Apache-2.0 is compatible
  with GPL-3.0 but not GPL-2.0-only.
- Copyleft (GPL, LGPL, AGPL, CC-BY-SA) imposes its terms on the
  combination; only into projects whose license allows it.
- GNU licenses always carry `-only` or `-or-later` in SPDX ids; bare
  `GPL-2.0` is deprecated.

## Checklist

- [ ] Every new file has the project's header (or sidecar / REUSE.toml entry)
- [ ] Every non-original item has source, author, license, changes in the log
- [ ] Attribution added where the license asks for it
- [ ] Nothing with unknown or incompatible license
- [ ] Generated assets have their generator committed
- [ ] PR body lists non-original items

## Failure modes

- Copying a snippet from a forum or blog without checking its license.
- Assets "temporarily" added as placeholders, then shipped.
- Copying a header from another file and keeping the wrong license.
- Logging a source page URL that later disappears without recording
  the author and license text.
