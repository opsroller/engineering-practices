# Deliver your first work package

Tutorial, for anyone new to running an agent with the engineering-practices plugin.

In this tutorial we will take one small work package from its plan row to
a ready pull request with its docs, using the `package-lead` agent. We
will use a practice repository so nothing real is at risk.

## Before we start

You need Claude Code with this plugin installed:

```
/plugin marketplace add opsroller/claude-plugins
/plugin install engineering-practices@opsroller
```

## 1. Make a practice project

First, create an empty repository and give it the three files every
project in this team has:

```
mkdir practice && cd practice && git init -b main
mkdir -p docs
```

Now create `CLAUDE.md` with one line:

```
Project profile: docs/project-profile.md. Squash merge only.
```

Create `docs/project-profile.md`:

```
License: GPL-2.0-or-later; every file starts with an SPDX-License-Identifier line.
Docs: docs/how-to, docs/reference, docs/explanation (Diataxis).
Build: none. Test: `test -f greet.sh`.
Role map: package-lead owns greet.sh and docs/.
```

And `docs/plan.md`:

```
| WP | Name | Role | Owned paths | Done when | Status |
|---|---|---|---|---|---|
| WP-01 | greeting script | package-lead | greet.sh, docs/ | `sh greet.sh Ada` prints `Hello, Ada` | planned |
```

Commit them: `git add -A && git commit -m "chore: set up practice project"`.

## 2. Hand the package to the agent

In Claude Code, inside `practice`, ask:

```
Use the package-lead agent to deliver WP-01 from docs/plan.md.
```

Notice that the agent reads `CLAUDE.md`, the profile and the plan row
before it writes anything. That is the `project-onboarding` skill.

## 3. Watch the branch and commit

The agent creates a branch. Check it:

```
git branch --show-current
```

The output should look like `wp/01-greeting-script`. Now look at the
commit:

```
git log --oneline -1
```

You should see a Conventional Commit such as
`feat(greet): add greeting script`. Open `greet.sh`: its first comment
line is `# SPDX-License-Identifier: GPL-2.0-or-later`, because the
profile asked for it.

## 4. Check the docs it wrote

```
ls docs/how-to docs/reference
```

You should see a reference page for the script (what it takes, what it
prints) and possibly a how-to. Open one: its first line says which
Diataxis kind it is and who it is for.

## 5. Read the result

The agent reports the branch, the docs pages by kind, and that the PR is
ready for the reviewer. In a real project it would now ask the
code-reviewer role to review, then squash-merge once CI is green and the
review passes. Here, there is no remote, so stop at the report.

You have run a work package the way every role on the team does: onboard,
branch, small commit, license header, docs of the right kind, ready for
review.

Next: [How to deliver a work package](../how-to/how-to-deliver-a-work-package.md)
for real projects, and [About the role](../explanation/about-the-role.md)
for why it works this way.
