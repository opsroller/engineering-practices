# How to edit a path another role owns

How-to guide, for a role whose change cannot work without a small edit in a path another role owns.

This guide shows you how to make that edit without surprising its owner.

1. Find the path's owner in the profile's role map.
2. Check whether the change can live in your own paths instead: a new
   file beside theirs, or a hook or setting they already expose. If it
   can, do that and stop here.
3. Check whether the owner can make the edit in time. If they can,
   message them with the exact change, then build against it
   (`work-packages`, stubs).
4. Otherwise, write the edit down in one line. If you cannot, it is too
   big: ask the owner to make it, and stop here.
5. Make only that edit, in its own commit. Use a Conventional Commit
   whose scope names the owner's area, for example
   `build(engine): register the asset check test target`.
6. Add a section to the PR description:

   ```
   ## Cross-role edits
   - `<path>` (owner: <role>): <what changed>. Why here: <reason it
     could not live in our paths>.
   ```

7. Message the owner with the same list and the PR link:

   ```
   <your package> -> <owner's package>
   Edited: `<path>`, one commit (<sha>): <what changed>.
   Why: <reason>.
   Next: I merge once review passes unless you object; say so and I take it out.
   Link: <PR>
   ```

8. Merge only when review has passed and the owner has not objected. If
   they object, remove the commit or ask the coordinator to decide.

See the [peer-coordination skill reference](../reference/skill-peer-coordination.md)
and [how to change a shared contract](how-to-change-a-shared-contract.md)
when the edit changes an interface others use.
