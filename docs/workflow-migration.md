# Workflow architecture assessment and incremental migration

## Current-state assessment

Inspected base: `8b3bb121697be016b5355dd420f774923a56c52d`, including existing dirty
AGENTS/validation/workflow changes and the supplied worktree-lifecycle document. Intake
file digests and the patch are preserved in ignored runtime records. No other repository
was inspected or modified; Basecamp and Foundry ownership is taken from the registry.

| Area | Actual implementation | Relevant files |
| --- | --- | --- |
| Orchestration | Coordinator follows written plans, DAG waves, explicit outcomes and gates; no executable controller | `prompts/coordinator.md`, `workflows/feature-execution.md`, `schemas/execution-plan.yaml` |
| Routing | Declarative task classes, maximum profile floor, validation OR, local capability data | `config/routing.yaml`, `docs/routing.md`, `local/capabilities.yaml.example` |
| Orca integration | CLI readiness/guidance/selector checks and native diagnostic views; scripts do not dispatch | `scripts/common.sh`, `scripts/run.sh`, `scripts/doctor.sh`, `scripts/status.sh` |
| GitHub | No Issue/PR/Project API client, synchronization or reconciliation | Repository file inventory; no application modules or dependency manifest |
| Domain | Plan fields and logical repository/task IDs; no domain classes | `schemas/execution-plan.yaml`, `config/repositories.yaml` |
| Persistence | Ignored run plans/receipts and private generated reviews; no project database | `.gitignore`, `reviews/README.md`, `AGENTS.md` |
| Checks | Shell syntax, layout, headers and ignore boundaries; no full semantic/YAML validation suite | `scripts/validate.sh` |

Consequently, a large interface/controller implementation would introduce an application
runtime absent from the repository. Establish policy and adapter boundaries first. A future
executable controller needs a separately scoped, explicitly authorized design task; the
existing prohibition on a daemon/scheduler/database remains in force.

## Coupling analysis and decisions

- **BOUNDARY-001 (P2, high confidence):** `scripts/common.sh` originally combined generic
  registry/Git/literal configuration handling with `nexus_orca`, `nexus_runtime`,
  `nexus_guide` and `nexus_selectors`. Moving these unchanged into
  `scripts/adapters/orca.sh` localizes CLI-specific behavior with minimal regression risk.
  Trade-off: compatibility loading remains and CLI entrypoints are still Orca-specific.
- **BOUNDARY-002 (P2, high confidence):** feature workflow and run context used
  `<Orca-run-id>` as Nexus's record namespace. Use `<run-id>` and keep backend run/attempt
  receipts separate. Existing local directories remain readable; no data migration occurs.
- **BOUNDARY-003 (P2, high confidence):** ownership prose assigned recovery/completion
  broadly to Orca, obscuring the distinction between Nexus policy and backend mechanics.
  Clarify permanent principles and backend-scoped guidance; preserve settlement/fencing,
  gate approvals and human final decisions. No demonstrated production defect or P0/P1.
- **Deferred coupling:** diagnostic entrypoints, local selector syntax and installed Orca
  lifecycle references remain backend-specific. They are compatibility tooling, not the
  future domain model. A backend-independent entrypoint is a later capability, not claimed
  by this extraction. Do not mechanically rename operational Orca commands.

The proposal's project-state authority is accepted. Host provisioning still belongs to
Basecamp and project-local runtime to Foundry; Orca may invoke their setup contracts but
must not take over their package/runtime policy. Existing multi-agent policy already exists;
phase 6 extends and decouples it rather than introducing multi-agent work from scratch.

## Target workflow and identity

```text
Requirement → plan → GitHub Issue / Work Item → bounded tasks → routing
            → ExecutionBackend → branch/worktree → implementation → validation
            → PR → review/checks → human-authorized merge → Done
```

Default: one Issue ≈ one Work Item ≈ one mutable worktree ≈ one PR. Split independently
reviewable changes with parent/child links and explicit reasons. Tasks and attempts need
stable separate identities: remediation under the same Issue can create a new bounded
implementation task without replacing the Work Item. Read-only validation does not create
another Issue or PR merely for bookkeeping.

GitHub stores project intent, visible state, Issue relationships, priority, milestones,
labels, PR associations, review/check results and merge history. The selected backend
stores actual attempt/resource state. Persist enough sanitized external associations,
approval scope and recovery decisions to recover after local loss; never publish private
reports, credentials or raw transcripts implicitly. Local logs are diagnostics/caches.
Before the GitHub phase is available, v0.2 local-only runs remain explicitly legacy; they
cannot claim recovery from GitHub after local-state loss.

| Visible state | Required evidence / policy |
| --- | --- |
| Backlog | Recorded work not yet selected or ready |
| Ready | Validated requirements, owner, dependencies, baseline, capability and authorization |
| In Progress | An accepted execution start bound to the same Work Item |
| Blocked | Missing prerequisites, uncertain liveness or unresolved external failure, with reason |
| Review | Associated PR exists and required validation is accepted; review/check outcomes remain visible |
| Done | Observed merge plus acceptance for implementation; explicit accepted disposition for non-code work |

GitHub Issue open/closed state alone cannot encode these six states. Phase 2 records
explicit lifecycle metadata and associations; phase 4 uses Project fields. Do not infer
Done from Issue closure, worker exit or an Orca completed card. Human external changes are
observed and reconciled, not overwritten by a stale cache.

## Phased migration plan

Each phase is a bounded follow-up task with an immutable proposal and independent
validation when architecture-sensitive. Completion of this document does not authorize
all phases, external writes or future merge operations.

| Phase | Changes / affected files | Risk and compatibility | Required verification |
| --- | --- | --- | --- |
| 1a — implemented first step | `AGENTS.md`, architecture/migration docs, README, adapter extraction from `scripts/common.sh`, structural checks, `tests/orca-preflight.sh`, neutral run-ID/receipt wording | Preserve CLI/helper API, existing local mappings and dirty changes; partial boundary only | Helper-body equality; Bash syntax and structure; mock readiness, guide and selector success/failure; independent exact-candidate review |
| 1b — implemented Coordinator execution boundary | Coordinator/workflow contracts, plan schema/examples, backend operation/result contract, adapter-specific status/placement/lifecycle guidance | No invented CLI, unsafe cancellation or loss of attempt provenance; existing tools stay compatible until callers migrate | Asynchronous start/observe/result/cancel/settle fixtures; unknown liveness HOLD; logical policy independent of native task states; backend contract conformance |
| 2 — GitHub Work Items | WorkItemProvider contract and GitHub implementation in a separately approved implementation location; schema/examples and workflow association guidance | Remote writes and association duplication; legacy local runs cannot masquerade as canonical Issues | Read/create/update Issues, read/create PRs, labels and Issue/PR links; duplicate response recovery; stable repository/Issue/task/attempt identities; explicit write authority |
| 3 — workflow controller policy | Transition table and Coordinator/routing workflows; implementation location only if an executable controller is authorized | No scheduler daemon, routing inside adapters or competing state store; preserve approval gates | State/attempt separation; validation/CI/review remediation under same Issue; pause/cancel/resume/reassign; bounded retries after fencing; exact human gate approval |
| 4 — GitHub Projects | Provider field configuration and workflow synchronization | Field option IDs, access failures, manual edits and stale observations; not present in phase 1 | Map all six states, priority and relationships; permissions/missing fields; idempotent updates and concurrent-edit conflict handling |
| 5 — reconciliation | Observation/recovery contract and Coordinator workflow; backend/provider recovery capabilities | Lost local receipts, duplicate writers, changed refs, unavailable GitHub/backend | Restart from external associations; existing PR prevents redispatch; missing cache; stale/unknown attempts; paused/cancelled work; safe backend switch after prior settlement |
| 6 — extend multi-agent behavior | Routing/planning policies and backend-independent assignments | Preserve current floors, real dependencies, isolation, independent validation and integrated baselines | Agent replacement leaves semantics unchanged; compatible fallback; parallel conflict checks; retry budgets; exact effective capability receipts |

Do not add LocalGit, RemoteCodex, GitLab or Linear implementations now. Use a minimal
contract and an explicitly unsupported-capability response until a real second consumer
justifies extension. No new dependencies are needed for phase 1a.

## Recovery, failure and human control contract

Observe GitHub, backend observations and applicable refs; compare desired/actual state;
choose the smallest authorized action; reobserve the result. Use stable operation/attempt
associations and practical idempotency keys for writes. A timeout after create/start must
trigger lookup, not a blind duplicate operation. GitHub and backend observations have
different authority; GitHub does not prove a worker has stopped.

A PR with no running execution indicates review/remediation investigation, not a new
implementation by default. Missing approval provenance, ambiguous Work Item association,
conflicting human changes or unknown liveness means HOLD/Blocked with evidence. Do not
reconstruct a missing approval by inference. Validation failure, CI failure or rejection
routes feedback to a bounded remediation task under the same Issue. Retry/reassign/escalate
or backend replacement requires a concrete cause, a finite budget, capability verification
and proven prior settlement/fencing; preserve failure artifacts and Work Item identity.

Humans can pause future dispatch, request cancellation, resume, change priority, reassign,
request review and override routing within safety floors. Cancellation is a request until
confirmed by the execution host. No merge automation. Checkout deletion remains a separate
exact human approval under `docs/worktree-lifecycle.md`.

Record structured events such as WORK_ITEM_CREATED, TASK_DECOMPOSED, AGENT_ASSIGNED,
EXECUTION_STARTED, VALIDATION_FAILED, EXECUTION_RETRIED, PR_CREATED, REVIEW_REQUESTED and
MERGED, with work/task/attempt IDs, observed time, source and artifact/decision references.
These are audit evidence, not an event-sourcing database or a new source of project truth.
Recovery-critical sanitized associations must survive externally; local detailed logs may
be disposable. Agents and backend adapters report facts; Nexus explains policy choices.

## Architectural acceptance tests

1. Remove Orca: replace its execution adapter without redesigning plans, Work Items,
   routing, workflow states or GitHub integration. The Coordinator lifecycle contract and shell preflight port are now independent of
   Orca-native operations; a replacement adapter still needs conformance evidence.
2. Replace Codex: workflow transitions and acceptance remain unchanged; assignment and
   verified effective capability receipts change. Do not embed routing in either adapter.
3. Delete Nexus local state: recover primarily from GitHub and backend observations;
   ambiguous approval/liveness holds dispatch. Not implemented until phases 2–5.

## Assessment outcome

Overall assessment: target architecture fits the policy control plane if introduced
incrementally, preserving the distinction between workflow policy and execution mechanics.
Blocking issues: no demonstrated P0/P1 in this bounded change; absent GitHub/recovery
implementation blocks claiming complete target readiness.
Recommended changes: BOUNDARY-001–003 addressed by phase 1a; complete phase 1b before
claiming an interchangeable asynchronous backend.
Accepted as-is: repository ownership, independent mutable isolation, monotonic capability
floors, evidence-based integration, separate validation and explicit human authorization.
Deferred / optional: other providers/backends, executable controller, Projects automation,
reconciliation and expanded orchestration await separately scoped follow-up phases.
Remaining uncertainty: live dispatch/cancellation and GitHub remote behavior are untested;
existing native diagnostic/capability guidance still needs adapter-scoped migration.
