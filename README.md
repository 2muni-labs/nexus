# Nexus

Control plane for orchestrating agents, workflows, reviews, and cross-repository tasks across the development environment.

Nexus coordinates the development environment through ownership, orchestration intent,
policies, routing, prompts, workflows, review history, and cross-repository reasoning.

| Repository | Ownership |
| --- | --- |
| Nexus | Control plane |
| Basecamp | macOS host development environment |
| Foundry | Project/container runtime |

Nexus does not own Basecamp or Foundry implementation, application source code,
cross-repository commits, or execution infrastructure already provided by Orca.

```text
User → Nexus Coordinator → Orca orchestration → Repository-specific workers
     → Structured findings / implementation → Coordinator synthesis
     → Independent validation → Human review and merge decision
```

One task = one owner = one repository = one isolated worktree = one diff = one review decision.
Reviews are read-only; accepted findings become separate implementation tasks.
A cross-repository objective becomes multiple bounded tasks, each with one owner.

## Operate

Requires Git, Bash (including macOS Bash 3.2), and a running Orca with version-matched
skills guidance. No package installation is required. From the Nexus checkout:

```sh
./scripts/validate.sh
./scripts/doctor.sh
./scripts/status.sh
./scripts/weekly-review.sh
```

`validate.sh` checks local structure without Orca. `doctor.sh` checks prerequisites
and repository selectors. `status.sh` displays bounded operational snapshots.
`weekly-review.sh` prints the installed orchestration guide and a Coordinator brief;
it does not start workers or perform the review. Give that output to a Coordinator
and follow [weekly-review.md](workflows/weekly-review.md).

Read [AGENTS.md](AGENTS.md) before agent work. Policies live in `config/`, reusable
instructions in `prompts/`, and local normalized history in `reviews/`. Generated
review reports and patches are ignored by Git; review instructions and templates
remain tracked.
See [architecture.md](docs/architecture.md) for boundaries and extension rules.

Optional: copy `local/repos.env.example` to `local/repos.env` and set selectors matching
`orca repo list --json`. Defaults are `name:nexus`, `name:basecamp`, `name:foundry`.
Names are case-sensitive; exact `id:` selectors resolve ambiguity. The local file
accepts only literal double-quoted assignments, comments, and blank lines; it is parsed
as data and never sourced. Do not put credentials there. See the example for syntax.

Orca CLI selection follows `ORCA_CLI_COMMAND`, then `ORCA_DEV_REPO_ROOT` (`orca-dev`),
then `orca-ide` on Linux when no override is supplied, otherwise `orca`. An explicitly
selected executable is never replaced on failure. Diagnostics do not start Orca;
start it yourself if unavailable. Scripts reload its guide on every Orca-dependent run.

A newly initialized checkout needs a human-approved initial Nexus commit before Orca
can create isolated implementation worktrees from it. Scripts never commit,
merge, push, open PRs, or write runtime state.
