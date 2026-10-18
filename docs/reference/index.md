# Reference

Reference, for anyone looking up what this plugin contains.

The plugin has one agent, six skills and one workflow. Skills say how the
team works around any job; the agent applies them to one work package;
the workflow runs that agent's steps with an independent check.

## Agent

- [package-lead](agent.md): runs one work package end to end.

## Skills

Starting and planning work:

- [project-onboarding](skill-project-onboarding.md): learn the project before any change.
- [work-packages](skill-work-packages.md): the package row, owned paths, stubs, done-when.

Landing work:

- [git-workflow](skill-git-workflow.md): branches, Conventional Commits, PRs, squash merge.
- [documentation](skill-documentation.md): Diataxis rule and what each kind of work owes.
- [provenance](skill-provenance.md): original or licensed material, headers, provenance log.

Working with others:

- [peer-coordination](skill-peer-coordination.md): direct messages, contract changes, hand-offs.

## Workflows

- [deliver-package](workflow-deliver-package.md): plan, build, document, check, ship one package.

## Plugin manifest

| Field | Value |
|---|---|
| `name` | `engineering-practices` |
| `version` | `0.1.0` |
| `author.name` | `opsroller` |
| `repository` | `https://github.com/opsroller/engineering-practices` |
| `license` | `GPL-2.0-or-later` |
| `keywords` | `role`, `job-function`, `conventional-commits`, `trunk-based-development`, `diataxis`, `spdx`, `work-packages` |

## Sources

The research behind every rule is listed in [SOURCES.md](../../SOURCES.md).
