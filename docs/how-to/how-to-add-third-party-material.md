# How to add third-party material

How-to guide, for any role about to add code, art, audio, fonts, text or data it did not make.

This guide shows you how to add outside material so the project may ship it.

1. Find the license. Read the license text, not a summary. If there is
   none, or it says "personal use", stop: do not add it.
2. Check the license against the profile's allowed list. If it is not
   listed, ask the project-manager role before going further.
3. Add the file. If it can hold a comment, keep its existing notices and
   add the SPDX line in the file's comment syntax. If it cannot (images,
   audio, fonts), add a `<file>.license` sidecar or a `REUSE.toml` entry,
   as the project does.
4. Append a row to the provenance log: path, origin (source URL),
   exact version or commit, checksum, changes you made, package id.
   Add the upstream copy unchanged first; make your changes in later
   commits.
5. If the license requires attribution, add the credit to the credits
   file.
6. List the item with source and license in the PR body.
7. If the project has a license checker, run it.

For your own new files, use the project's license and header, never the
default a generator or template stamped on them.

See the [provenance skill reference](../reference/skill-provenance.md)
for header formats and SPDX expressions.
