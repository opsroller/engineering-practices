# Sources

Reference: the research behind this plugin, for maintainers checking where a rule came from.

| Source | URL | Informed |
|---|---|---|
| Conventional Commits 1.0.0 | https://www.conventionalcommits.org/en/v1.0.0/ | Commit shape, footers, breaking changes, squash FAQ (`git-workflow`, commit-reference) |
| Trunk Based Development: Short-Lived Feature Branches (Paul Hammant) | https://trunkbaseddevelopment.com/short-lived-feature-branches/ | One author per branch, lifetime of days, delete after merge, anti-patterns |
| DORA capability: Trunk-based development | https://dora.dev/capabilities/trunk-based-development/ | Branches of hours, merge at least daily, keep the build green or revert |
| DORA capability: Working in small batches | https://dora.dev/capabilities/working-in-small-batches/ | Package size, INVEST, flags and branch by abstraction (`work-packages`) |
| Google Engineering Practices: Small CLs | https://google.github.io/eng-practices/review/developer/small-cls.html | PR size, splitting strategies, separate refactors, tests in the same change |
| Google Engineering Practices: Writing good CL descriptions | https://google.github.io/eng-practices/review/developer/cl-descriptions.html | PR title and description rules |
| Google Engineering Practices: How to handle reviewer comments | https://google.github.io/eng-practices/review/developer/handling-comments.html | Answering review: fix the code, disagree with reasons |
| GitHub Docs: Configuring commit squashing for pull requests | https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/configuring-commit-squashing-for-pull-requests | Squash-only settings and squash message from the PR title |
| Martin Fowler: Parallel Change | https://martinfowler.com/bliki/ParallelChange.html | Expand, migrate, contract for shared contracts (`peer-coordination`) |
| Ian Robinson: Consumer-Driven Contracts (martinfowler.com) | https://martinfowler.com/articles/consumerDrivenContracts.html | Consumers telling providers what they use; tolerant reading |
| Team Topologies: interaction modes misconceptions | https://teamtopologies.com/news-blogs-newsletters/2025/2/21/team-topologies-interaction-modes-breaking-through-common-misconceptions | Collaboration, as-a-service, facilitating; bounded interactions |
| REUSE Specification 3.3 (FSFE) | https://reuse.software/spec-3.3/ | Copyright and license headers, `.license` sidecars, `REUSE.toml` (`provenance`) |
| SPDX: Handling license info | https://spdx.dev/learn/handling-license-info/ | `SPDX-License-Identifier` lines, expressions, `-only`/`-or-later` |
| SPDX License List | https://spdx.org/licenses/ | Canonical license identifiers |
| Developer Certificate of Origin 1.1 | https://developercertificate.org/ | What a contributor certifies about a contribution |
| Diataxis (Daniele Procida): start, compass, tutorials, how-to guides, reference, explanation, reference vs explanation | https://diataxis.fr/ | The four kinds, the compass, writing rules (`documentation`) |
| Team Diataxis guide (project-files `documentation/diataxis-guide.md`) | https://diataxis.fr/ (its source) | Repo layout, what each kind of work owes, docs phase prompt, review checklist |
