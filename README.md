# Engineering Practices

Shared working practices for every role: project onboarding, git with Conventional Commits, work packages, talking to other agents, and asset and code provenance.

## Skills

| Skill | Use when |
|---|---|
| `project-onboarding` | Use at the start of any task in a project. Finds the project's stack, commands, owned paths and contracts so a generic role can work in it. |
| `git-workflow` | Use whenever you branch, commit or open a pull request. Covers branch names, Conventional Commits and PR titles. |
| `work-packages` | Use when you start, work or finish a work package from a project's plan. Covers owned paths, stubs against contracts, and done criteria. |
| `peer-coordination` | Use when your work depends on, blocks or changes another agent's work, or you need the coordinator. Agents message each other directly. |
| `provenance` | Use before adding any code, asset, text or name, especially when recreating or drawing on an existing work. Keeps a project free of material it has no right to and records where everything came from. |

## Workflows

Multi-agent workflows (Claude Code Workflow scripts in `workflows/`).

| Workflow | Does |
|---|---|
| `/engineering-practices:deliver-package` | Take one work package from plan to a reviewed, ready pull request |

## Agent

`agents/package-lead.md` defines the role as a subagent.

## Install

```
/plugin marketplace add opsroller/claude-plugins
/plugin install engineering-practices@opsroller
```

Versioned on its own with semver tags (`v0.1.0`). Changes follow Conventional Commits.
