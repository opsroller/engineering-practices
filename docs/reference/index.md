# Reference

Reference, for anyone looking up what this plugin contains.

The plugin has one agent, seven skills and three workflows. Skills say how the
team works around any job; the agent applies them to one work package;
the workflows run those steps with an independent check, for a whole
package or for one small change, and land an existing branch or PR.

## Agent

- [package-lead](agent.md): runs one work package end to end.

## Skills

Starting and planning work:

- [project-onboarding](skill-project-onboarding.md): learn the project before any change.
- [work-packages](skill-work-packages.md): the package row, owned paths, stubs, done-when.

Landing work:

- [git-workflow](skill-git-workflow.md): branches, Conventional Commits, PRs, squash merge.
- [documentation](skill-documentation.md): Diataxis rule and what each kind of work owes.
- [provenance](skill-provenance.md): build provenance generated and verified by tools; license headers.

Working with others:

- [peer-coordination](skill-peer-coordination.md): direct messages, cross-role edits, contract changes, hand-offs.

Running workflows:

- [workflow-run-modes](skill-workflow-run-modes.md): inline, partial and resumed workflow runs.

## Workflows

- [deliver-package](workflow-deliver-package.md): plan, build, document, check, ship one package, or ship one a role workflow already built (`prior`).
- [small-change](workflow-small-change.md): land one chore-sized change, from branch to squash merge.
- [land-pr](workflow-land-pr.md): keep an existing branch or PR current, poll CI, squash-merge.

Every workflow, here and in each role plugin, takes the optional `run` arg described in
[workflow run modes](workflow-run-modes.md): inline with no subagents, chosen phases only, or resumed.

## Plugin manifest

| Field | Value |
|---|---|
| `name` | `engineering-practices` |
| `version` | `0.15.0` |
| `author.name` | `opsroller` |
| `repository` | `https://github.com/opsroller/engineering-practices` |
| `license` | `GPL-2.0-or-later` |
| `keywords` | `role`, `job-function`, `conventional-commits`, `trunk-based-development`, `diataxis`, `spdx`, `work-packages` |

## Sources

The research behind every rule is listed in [SOURCES.md](../../SOURCES.md).
