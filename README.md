# Engineering Practices

The shared base every role plugin loads. Whatever the job (designer,
programmer, artist, reviewer), this plugin says how the team works around
it: learn the project before touching it, cut work into small packages,
land them through short-lived branches as squash-merged Conventional
Commits, talk to other agents directly about contracts and hand-offs,
ship only original or properly licensed material, and write the Diataxis
docs each change owes in the same pull request. Its `package-lead` agent
runs one work package end to end; the `small-change` workflow lands a
chore-sized change from branch to squash merge.

## Install

```
/plugin marketplace add opsroller/claude-plugins
/plugin install engineering-practices@opsroller
```

## Documentation

**New here?** The tutorial [Deliver your first work package](docs/tutorials/first-task.md)
walks through one package in a practice repository, step by step.

**Doing a job?** The how-to guides cover the common tasks:
[start work in a new project](docs/how-to/how-to-start-work-in-a-new-project.md),
[deliver a work package](docs/how-to/how-to-deliver-a-work-package.md),
[land a small change](docs/how-to/how-to-land-a-small-change.md),
[change a shared contract](docs/how-to/how-to-change-a-shared-contract.md) and
[add third-party material](docs/how-to/how-to-add-third-party-material.md).

**Looking something up?** The [reference](docs/reference/index.md) lists the
agent, each skill and the `deliver-package` and `small-change` workflows
with their args and outputs; [SOURCES.md](SOURCES.md) lists the research behind the rules.

**Wondering why?** [About engineering practices as a shared base](docs/explanation/about-the-role.md)
explains the reasoning (trunk-based development, squash merge, who
merges, provenance, docs inside the work) and the boundaries with
neighbouring roles.

For the full documentation method, install the technical-writer role.

## License

Copyright (C) 2026 Charles (opsroller) and contributors. Licensed under the GNU General Public License v2.0 or later (`GPL-2.0-or-later`); see `LICENSE`.
