# Nexus v0.2

Requirements-to-execution control plane for repositories, agents, models, workflows,
reviews, and validation across the development environment.

Nexus turns requirements into bounded Execution Plans, chooses ownership and routing,
supervises Orca workers, checks integration readiness, and prepares results for human
review. Both single-repository work across multiple worktrees and cross-repository
coordination are first-class workflows.

The permanent target is **Nexus owns the workflow; GitHub owns the state; Orca is an
execution backend**. Current scripts still provide Orca-only read-only preflight; GitHub
read/write operations are available through an explicit one-shot provider port; automatic
synchronization and restart reconciliation are not implemented. See the
[migration plan](docs/workflow-migration.md) for staged delivery and compatibility gates.

## Boundaries

| Layer | Responsibility |
| --- | --- |
| Nexus | Requirements, planning, Task DAGs, policy, routing, gates, normalized decisions |
| GitHub (target) | Authoritative Issues, PRs, Projects, reviews, checks and project history |
| Execution backend (currently Orca) | Worktrees, terminals, dispatch, attempt lifecycle, isolation, runtime supervision |
| Basecamp | macOS host provisioning, packages, shell/PATH, developer tools, host prerequisites |
| Foundry | Docker/Compose runtime, bootstrap, containers, project-local environment |

Future repositories are added to `config/repositories.yaml`. No embedded source,
submodules, cross-repository commits, application framework or custom scheduler.

```text
Requirements → Nexus intake / plan / route → Orca repository workers
            → structured completion → integration gate → validation → human decision
```

Each mutable task has one owner, one repository, one isolated worktree and one diff.
Read-only work can reuse a safe context. Each implementation result receives one final
review decision. Reviewers report; a separate task implements accepted findings.

## Shared review standard

[Review principles](docs/review-principles.md) govern all substantive reviews and
confirmations: evidence, minimal change, Orca boundaries, capability floors and integration
correctness come first. Findings require operational impact, the smallest justified
correction and proportional severity; absent evidence is never PASS. AGENTS, prompts and
workflows reference this common standard rather than maintaining separate checklists.

## Start

Run from a Nexus Git checkout with Bash, Git and the locally installed Orca CLI:

```bash
./scripts/validate.sh
./tests/orca-preflight.sh             # mock adapter checks; no live backend needed
./scripts/doctor.sh                  # all registered repository selectors
./scripts/doctor.sh nexus            # only Nexus
./scripts/status.sh
./scripts/run.sh --objective 'Improve Foundry bootstrap' --repository foundry
./scripts/weekly-review.sh
```

`run.sh` prints preflight results, installed orchestration guidance and a Coordinator
context. It **does not execute the objective**, approve a plan, create a run or start
workers. Give that context to the Coordinator, which reads `AGENTS.md`, the four policies,
the execution-plan contract and selected workflow before acting. `--help` lists options.
`--plan PATH` is an input reference, not semantic validation or permission to execute it.

DIRECT is for one obvious-owner, low-risk task without dependencies or mandatory
independent validation. All other work uses ORCHESTRATED planning. Independent tasks
form parallel waves; dependency edges and explicit integration PASS constrain dispatch.
No automatic merge, push or PR creation. Humans review and approve final changes in Orca.

## Configuration and records

Tracked policy lives in `config/`; capability profiles have no permanent provider model
IDs. Optional `local/repos.env` maps logical repositories to Orca selectors; optional
`local/capabilities.yaml` records host-verified, user-chosen agent/model mappings. Copy
and edit the corresponding examples when needed. These are local data, without secrets;
they are ignored and never executed as shell configuration.

Logical registry keys use lowercase letters/digits/hyphens and exactly two-space
indentation in a block mapping. Inline comments and trailing whitespace on these keys
are allowed; quoted keys, inline repository values and unsupported direct-key indentation
fail explicitly rather than disappearing from diagnostics. A key `my-tools` maps to `MY_TOOLS_REPO_SELECTOR`, default `name:my-tools`.
Only selected repositories are required for feature preflight; Nexus identity is always
checked. Agent availability includes launcher/account readiness, not just PATH presence.

Plans, routing receipts and gate evidence stay under ignored `.runtime/runs/<run-id>/`.
Generated reviews also stay ignored, preserving the user's review-storage preference.
Only curated, explicitly requested durable policy/architecture decisions enter Git.
See [architecture](docs/architecture.md), [routing](docs/routing.md),
[feature execution](workflows/feature-execution.md), [weekly review](workflows/weekly-review.md)
and [plan examples](schemas/examples/). Validation is structural; the Coordinator checks
DAG, routing and integration semantics. No external YAML library is required.

GitHub Work Items: `scripts/work-items.sh --help` uses authenticated `gh` and `jq`,
independent of Orca. Writes default to an exact reviewable plan; applying requires a
matching digest and real human publication approval. See [provider binding](docs/adapters/github.md).

Workflow decisions: `scripts/workflow.sh observation.json` proposes status/actions from
verified external facts. It writes no state and invokes no backend/provider. See
[controller policy](docs/workflow-controller.md).

Projects: copy `local/github.json.example` to ignored `local/github.json` and configure
a separate linked Project per repository. `scripts/projects.sh --help` supports canonical
status/priority reads and reviewed updates. See [Project setup](docs/github-projects.md).
