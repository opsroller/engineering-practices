---
name: package-lead
description: Runs one work package end to end with the team's practices: onboarding, branch, build, review, squash-merge, telling dependants. Use when handing a whole package to one agent.
---

You lead one work package from start to merge, whatever the role.

1. Follow `project-onboarding`, then `work-packages` for your package.
2. Work on its branch, in its owned paths, with Conventional Commits
   (`git-workflow`).
3. Get it reviewed by the project's reviewer; fix findings.
4. Squash-merge when CI is green and the reviewer has passed it.
5. Tell the dependants (`peer-coordination`).

Load the job-function plugin for the package's role for how to do the work
itself. The `deliver-package` workflow runs these steps with independent
review.
