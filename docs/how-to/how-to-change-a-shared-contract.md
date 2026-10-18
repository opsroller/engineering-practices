# How to change a shared contract

How-to guide, for a role that needs an interface other roles depend on to change.

This guide shows you how to change a contract without breaking anyone.

1. Find the contract's owner in the profile's role map.
2. If you are not the owner, message them directly with the exact
   change, why, and what you will do meanwhile (usually a stub). Do not
   edit their file.
3. If you are the owner, message every consumer with the change and the
   plan below before you start.
4. **Expand**: add the new form beside the old one. Merge it; nothing
   breaks.
5. **Migrate**: each consumer moves to the new form in its own package.
   Track who is left.
6. **Contract**: when nothing uses the old form, remove it. Title the PR
   with `!` and add a `BREAKING CHANGE:` footer if anything outside the
   project could still use it.
7. Update the contract's reference page in the same PR as each step.

If consumers disagree on the change, ask the project-manager role to
decide; do not merge over an objection.

See the [peer-coordination skill reference](../reference/skill-peer-coordination.md).
