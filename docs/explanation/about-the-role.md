# About engineering practices as a shared base

Explanation, for maintainers of role plugins and anyone wondering why every role works the same way around its job.

## What this plugin is

Every job on a software team has two halves. One is the discipline: a
sound designer mixes, a gameplay programmer writes systems, a graphic
designer builds an identity. The other half is the same for all of them:
how work arrives, how it is tracked, how it lands in the repository, how
it is documented, how it is shown to be the team's to ship. Experienced
engineers rarely write that second half down, because they learned it by
working in a good team. Agents do not have that luxury, so this plugin
writes it down once and every role loads it.

That is why it has no role agent of its own. Its one agent, the
package-lead, is not a job title; it is the habit of owning one unit of
work from start to finish.

## Why trunk-based, small, squash-merged changes

The DORA research programme has found, year after year, that teams who
integrate small changes into trunk at least daily deliver faster *and*
more stably than teams with long-lived branches. The mechanism is
feedback: a small change is reviewed properly, tested quickly, and
reverted cheaply. Google's guidance on small changes reaches the same
conclusion from the reviewer's side: a hundred lines get a careful read,
a thousand get a skim.

Squash merging follows from this. A pull request is the unit the team
reasons about, so it becomes one commit on trunk, titled as a
Conventional Commit. The branch's intermediate commits served the author
and the reviewer; trunk keeps the decision. Conventional Commits makes
that history machine-readable, so changelogs and version bumps can be
generated rather than remembered. The trade-off is lost granularity in
trunk history, which is why large changes are split into several PRs
rather than squashed into one.

## Why the author merges and the owner does not review

Review exists to catch problems and spread knowledge, not to ask
permission. Routing every PR to the project owner would make one person
the bottleneck of the whole team, the "heavyweight approval" DORA names
as a cause of batching. So the code-reviewer role reviews, and the author,
who knows the change best, merges as soon as review and CI agree. The
owner sets direction through the project-manager role and the plan.

## Why work packages and contracts

Many agents working at once collide unless their work is cut along
clean lines. A work package gives each agent disjoint owned paths and a
testable done-when; contracts give the seams between packages a written
shape. With both, a package can start before its dependencies land, by
stubbing against the contract. When a contract must change, the parallel
change pattern (expand, migrate, contract) keeps every consumer working
throughout. The cost is up-front planning; the alternative is merge
conflicts and surprise breakage.

## Why agents talk directly

Routing every question through a coordinator adds a hop and loses
detail. Team Topologies' point applies: interactions should be explicit
and bounded, and most of them should be "as a service" through a
contract, not ongoing chatter. Direct messages are for the moments a
contract is not enough: a change request, a hand-off, a block. The
coordinator remains the place for conflicts with what the owner asked.

## Why provenance is everyone's job

A project can only be rebuilt, audited and trusted if everything in it
can be traced: which commit and review a change came from, which
generator and command made a file, which exact version of a dependency
or upstream file went in, and which pipeline run built what ships. That
record has to be made by whoever adds the thing, at the moment they add
it. Recording an origin, version and checksum costs a minute;
reconstructing it later, after a URL has moved or a laptop build has
shipped, can be impossible. The devops-engineer role then proves the
same chain for releases with signed build attestations.

## Why documentation lives inside the work

Docs written "later" are written never, or written from memory. Diataxis
gives every role a quick way to decide what a change owes: an interface
needs reference, a decision needs explanation, a new task needs a how-to,
a new starting path needs a tutorial. Keeping kinds separate keeps each
page useful to the reader who opens it. This plugin carries only the
rule; the technical-writer role carries the craft and takes on
documentation as a job in its own right.

## Boundaries with neighbouring roles

- **project-manager** decides what packages exist, who staffs them and
  holds the owner's standing rules. This plugin says how a package is
  carried out.
- **code-reviewer** is the review gate. This plugin prepares PRs for it.
- **technical-writer** owns the Diataxis method, docs sets and audits.
  This plugin requires each role to write the docs its own change owes.
- **devops-engineer** automates CI, releases and license compliance
  checks. This plugin is the human-level practice those checks enforce.
- Every discipline role (designers, programmers, artists, sound) loads
  this base for how to work, and its own plugin for what good work is.

## From junior to senior

A junior contributor follows these practices as rules: branch, commit
format, checklist. A mid-level one applies them with judgement: splits
work well, writes descriptions a stranger can follow, spots a contract
change before it bites. A senior one shapes them for others: cuts a plan
into packages that can run in parallel, designs contracts that can
evolve, keeps trunk green for the whole team, and improves the docs and
the practices themselves one small change at a time.
