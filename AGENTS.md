# Nexus v0.2 agent operating contract

Nexus is a requirements-to-execution control plane for repositories, agents, models,
workflows, reviews and validation. Read this contract before every structured workflow,
then the four governance `config/` policies and relevant workflow/backend configuration, `schemas/execution-plan.yaml`, the requested workflow,
and relevant prompts. The user's proposal is intake, not an automatically valid plan.

For confirmed work, follow [record confirmed work and wait](docs/operator-workflow.md#record-confirmed-work-and-wait):
search canonical Issues/PRs, reuse a match or register under exact posting authority,
then report the Issue URL and wait when execution is not authorized. Questions and
ideas do not implicitly create Issues; registration creates no worker worktree,
model assignment, dispatch or Ready claim. Existing explicit scoped execution
authority remains valid, subject to fresh scope, plan and capability checks.

Resolve repository acceptance from `config/acceptance.json` and
`docs/acceptance-policy.md` before dispatch and acceptance. Keep policy requirements
separate from fresh exact-head evidence; missing policy/provenance or native check
discovery means HOLD. All matching requirements combine by union/OR, preserving
routing/review floors. Managed implementation requires proportionate local validation;
separate current-head approved review is required only by resolved repository/user/native
policy, with explicit review_required true/false and provenance, never omission. An observed
authorized human merge of the exact reviewed candidate/result may supply final human
acceptance and merge decision after identity, permission and candidate/result mapping checks;
it never fabricates APPROVED evidence or waives required review, CI, known failures or
independent technical validation. Unknown required CI is null, never an inferred empty set.
Explicit legacy local runs remain limited and cannot supply a permissive default for new managed work.

## Standing publication authority

The user's standing publication grant authorizes Nexus to post and update Issues and
linked workflow records, safely push dedicated non-protected task branches, create PRs,
and transition PRs to Ready for review for already authorized work without another human
permission question. Keep every operation within the authorized owner, task and repository;
this grant does not authorize execution of new work or expansion of ownership/scope.
This central section explicitly supersedes older per-operation human publication approval
language elsewhere in Nexus docs, prompts and workflows, including references in this
contract. Preserve stricter task-specific pause, no-publication and Draft-only instructions;
Draft-only requires an exact Ready instruction before promotion.

Publication still requires a verified exact technical plan and fresh evidence for the
actual source, target and candidate, with applicable validation, native checks and readiness
gates. Changed candidates or targets require a new exact plan and affected technical
evidence, without newly requested human permission while still within the standing scope.
Keep existing interfaces and guards: `--approved-plan` is the verified technical snapshot
hash, and `--approval-reference` genuinely names the user's standing publication grant;
a reference string never creates authority or supplies fabricated approval. Preserve
sanitation of private data, credentials, transcripts and reports; App authentication and
raw Bot author/committer identity checks remain mandatory, with verified original-source
provenance exemptions preserved. Retain one writer, no force push and no protected-branch
push. Reobserve exact source/target/head and human controls before writes, readiness before
Ready, and external outcomes after writes; ambiguous results or changed/unresolved facts
mean HOLD and reobservation, never blind replay.

Final human merge and main integration approval remain bound to the exact reviewed
candidate. Destructive operations retain exact human approval and lifecycle checks; normal task
cleanup may use the scoped human notice below. Standing publication authority grants neither.
Publication is an explicitly scoped Coordinator operation under this standing user mandate,
not an automatic publisher, daemon or new framework. Worker completion, Ready and posting
do not prove acceptance, Done, process exit or deletion eligibility.

## Permanent workflow architecture

**Nexus owns the workflow. GitHub owns the state. Orca is an execution backend.**

These are peer responsibility boundaries, not an ownership hierarchy. GitHub owns durable
project records and performs CI; Nexus defines workflow, validation and acceptance policy;
Orca owns execution environments, sessions and factual attempt observations. Humans approve
final merge and exact checkout deletion under the scoped authority below. GitHub assignees
are project-accountable people, distinct from Nexus agent assignments. See docs/operating-model.md.

The selected backend's board is an execution observability/control surface, never a competing project backlog.
GitHub status may be displayed as read-only context; no blind bidirectional status mirroring.
Cards represent environments that may carry sequential attempts. Card movement, Completed,
idle or fencing cannot prove acceptance, process exit or deletion eligibility. Board actions
request exact scoped operations through normal policy/authority checks, never bypass them.
For every explicit completion (success, failure, superseded or read-only), finish
[ordered completion accounting](docs/operator-workflow.md#completion-accounting-before-subsequent-dispatch)
and report its facts before the next sequential/dependent dispatch. Missing verification,
readback or resolved resource disposition HOLDs affected subsequent work; continue
supervising already-running independent work. Native Task/Dispatch settlement remains
factual even while Nexus accounting is incomplete; no daemon enforces this checkpoint.
Reconcile the board after accepted worker settlement, at lifecycle changes and before
closure/report: observe the exact scoped environments and attempts, apply only factual
status/context/comment through adapter mechanics and read it back. Inspect all attempts sharing
an environment: active attempts display active; delivered results awaiting required review display
review; known settled/delivered/superseded non-review attempts may display Completed with factual
success, failure or supersession context. Unknown unsettled/possibly active attempts mean HOLD;
timeout or idle cannot prove completion. A known settled outcome with a retained user PTY or
uncertain process exit may display delivered/Completed, but cannot prove exit, reuse or deletion
eligibility. Preserve fresh human metadata; unexpected changes to identity, head, branch,
links, comment or status from the prewrite snapshot/intended write, or a newly active attempt
at prewrite/readback, mean HOLD, never blind mutation replay.
Follow docs/operator-workflow.md#board-reconciliation for mapping and conflict checks. Keep
GitHub Done, merge, process exit, worker release and checkout deletion separate.
Execution history needed for reconciliation must survive even when its current state is transient.
Host/client OS placement is deployment configuration, not a domain rule.

Nexus owns planning, decomposition, priorities, routing, logical transitions, validation,
completion criteria, recovery decisions and human-control policy. Agents perform assigned
work; neither agents nor execution backends own project state or workflow semantics.
GitHub Issues, PRs and Projects are the authoritative persistent project record, including
relationships, priorities, milestones, labels, reviews, checks and merge history.
Local plans, receipts and caches are operational evidence, never a competing project store.
Durable workflow associations and decisions needed after local loss must be recoverable
from external records; private reports/credentials must not be published implicitly.

Core concepts and contracts are provider-neutral: WorkItem, Task, Dependency, Execution,
AgentAssignment, ExecutionContext, ValidationResult and ReviewResult. Nexus policy depends
on ExecutionBackend and WorkItemProvider contracts; adapters depend on these contracts.
Orca CLI behavior, IDs, native states, naming and workspace metadata belong to the Orca
adapter. Backend identifiers are opaque receipts; core policy must not interpret them.
GitHub access likewise belongs to its provider adapter. Implement only currently needed
capabilities; no speculative providers, runtime, scheduler, database or event-sourcing layer.

Default to one GitHub Issue / Work Item / mutable worktree / PR. Independently reviewable
changes may be split with recorded reasons and links; avoid fragmenting small work. Multiple
attempts or read-only validations do not require new Issues. Visible states are Backlog,
Ready, In Progress, Blocked, Review and Done; backend execution states remain separate.
Worker completion cannot imply Done. For implementation work Done requires observed merge
and acceptance; non-code work requires an explicit accepted disposition.

Reconcile by observing GitHub, backend attempts and applicable Git refs, comparing intent
with evidence, and applying the smallest authorized action. A known PR must prevent blind
redispatch; unknown attempt liveness means HOLD. Retries, reassignment or backend switching
preserve Work Item identity and require proven prior settlement/fencing, a concrete cause
and finite budget. Validation/CI/review feedback returns to bounded remediation under the
same Issue unless a separately reviewable scope warrants a linked Issue.

Preserve human pause, cancel, resume, reprioritization, reassignment and review overrides.
Cancellation requests are not proof of termination. Prefer idempotent operations and
structured lifecycle evidence with stable work/attempt/artifact associations; keep routing
reasons and validation provenance inspectable. Merge, publication and deletion retain
explicit human authorization boundaries.

Apply changes incrementally. Current tools provide backend preflight, exact-reviewed
provider operations and pure workflow/reconciliation proposals; there is no background
runtime, automatic dispatcher or automatic publication. Existing Orca operational guidance applies only when using
that backend and cannot define core semantics. See docs/architecture.md and
docs/workflow-migration.md for current limitations, contracts and acceptance gates.
Architecture tests: removing Orca changes its adapter, not workflow/planning/work identity;
changing agents preserves workflow semantics; loss of Nexus local state permits recovery
primarily from GitHub and execution backends. These are required target properties,
not claims that the current implementation already passes them.

## Shared review principles

Read docs/review-principles.md for every substantive review, confirmation and self-review,
including planning/routing/gate assessments. Apply evidence-based judgment, minimal change,
Orca boundaries, capability floors and integration correctness as the five primary axes.
Use its evaluation order, evidence/severity calibration, finding extensions, finding self-check
and six-section review summary. Keep role-specific outcome blocks. Missing evidence cannot
be PASS; record uncertainty and HOLD unsafe dispatch. Specialized prompts cannot waive this
standard. Review-only authority does not grant implementation or merge permission.

## Ownership and isolation

One mutable task = one owner = one repository. One independently mutable task = one
isolated worktree = one diff. A worker modifying A must never modify B. Each
implementation result eventually maps to exactly one final human review decision.
Every new task, including DIRECT, planning, read-only review, validation and integration,
starts in a newly created isolated non-main worktree at an exact baseline. Independent
review/validation also uses a fresh session. The same active attempt may continue in its
own worktree; replacement requires a new worktree after prior settlement, proven editor
exit and preserved immutable results. Cross-repository analysis is allowed,
preferably through normalized inputs. Cross-repository mutation and commits are forbidden.

Nexus owns intake, plans, routing, policies, prompts, workflows, gate decisions, normalized
findings, validation requirements, workflow/recovery decisions and lightweight diagnostics.
The selected execution backend owns execution mechanics. For Orca these include worktrees,
terminals, dispatch, attempt supervision, completion delivery and recovery primitives. Basecamp owns host
provisioning, package management (including MacPorts where applicable), shell/PATH,
developer tools, agent CLI prerequisites and host runtime prerequisites. Foundry owns
Docker/Compose, bootstrap, project-local runtime, containers and worktree-safe contracts.
Future repository ownership is added explicitly to `config/repositories.yaml`; never
embed repositories as submodules, subtrees, copied source directories or monorepo packages.

## Coordinator roles

- **Intake:** understand objective and constraints; distinguish requested features from
  review findings. Inspect repository revisions and uncommitted work; explicitly include
  an immutable snapshot or exclude dirty changes without overwriting them.
- **Planner:** validate requirements, ownership, scope, acceptance and assumptions;
  decompose bounded tasks, classify type/complexity/risk/context/parallelizability,
  derive a cycle-free Task DAG with real dependencies and integration points. Store an
  Execution Plan under `.runtime/runs/<run-id>/plan.yaml`. Check the schema's relational
  rules before dispatch; placeholders, ownership ambiguity and cycles block execution.
- **Router:** choose configured agent class, capability profile, effort intent, compatible
  fallback and independent-validation requirement. Apply all matching rules by maximum
  profile rank and logical OR for validation. Compare default Codex
  with any explicitly task-authorized compatible alternative for each task; record
  accepted/rejected candidates and reasons. Codex defaults apply to every task role;
  a prior one-task model choice is not a global default or authorization for later tasks. Record concise operational reasons and
  requested versus verified effective capabilities; never fabricate model availability.
- **Scheduler (wave planning):** translate the DAG into backend-independent ready waves. Start independent
  work together; serialize real dependencies and conflicting mutation scopes. This is a
  Coordinator responsibility, not a Nexus scheduling process, queue or daemon.
- **Supervisor:** use the selected backend's exact attempt/lifecycle authority. Require explicit outcomes
  and structured results; idle terminals, heartbeat, timeout or contact loss are not
  completion. Process questions, preserve failure evidence, prevent duplicate mutation
  attempts, and choose release/user-requested retention after accepted settlement; new
  tasks require new worktrees and sessions.
- **Integrator:** assess prerequisites and semantic compatibility before shared downstream
  work. Require a recorded integration PASS and resolved immutable baseline map. A
  successful gate worker or a native task marked completed is insufficient by itself.

The Coordinator routes managed-repository implementation rather than editing it from
Nexus. The Codex Coordinator in Nexus's main checkout is the default intake; see
docs/operator-workflow.md. Main is the protected accepted policy baseline under Nexus
operating policy; this does not claim installed GitHub branch protection or rulesets. Main
permits intake, read-only coordination and ignored operational evidence, never worker
execution, tests, implementation or repair. All task execution uses new isolated non-main
worktrees, including maintenance and DIRECT tasks; there is no current-checkout writer
exception. Authorized final integration into main is a separate controlled operation
requiring explicit human approval of the exact reviewed candidate, not implementation on main.
Prior authorized direct commits remain the existing authorized baseline; do not rewrite
history or retrospectively certify their final acceptance under this prospective default.
Independent validation must use a separate session. A plan, review or validation task
must not silently become an implementation task; create a new task for changed authority.

## Completed worktrees

Follow docs/worktree-lifecycle.md before retiring any checkout. Worker release and
worktree deletion are separate. Default to retaining the worktree after terminal
cleanup; deletion requires settled activity, final disposition, preserved results
and local data, no consumers, exact identity and human deletion authority as defined below.
Merge approval alone does not authorize deletion; the scoped human merge-complete notice does.
Unknown liveness/data or changed approval scope means HOLD. Use Orca removal with verified host/version semantics;
account for possible branch deletion and archive hooks. No automatic age-based cleanup.
Check relevant prior retention at instruction intake. The normal deletion window is
post-disposition and pre-closure-report, with exact deletion authority.
Report delivered work, board reconciliation and workspace cleanup separately; unresolved
cleanup is retained or HOLD with a next trigger, never an indefinite wait or implicit
deletion authority, and a reconciled card status is never deletion eligibility.

## Human merge-complete cleanup authority

A human "merge complete" notice also authorizes normal removal of the exact task
worktrees tied unambiguously to that observed accepted human merge and Work Item/run.
The Coordinator verifies human identity, merge authority, exact candidate/result mapping
and acceptance, then records an enumerated cleanup plan and the actual human notice
reference without another permission question. This central rule supersedes legacy
separate deletion-approval clauses elsewhere; merge/main integration authority remains
bound to the exact reviewed candidate.

The scope includes that run's settled implementation, validation and superseded attempt
worktrees only after every factual identity, liveness/editor-exit, final-disposition,
preservation and no-consumer gate in docs/worktree-lifecycle.md passes. A historical
FAIL/NEEDS-WORK validation may retire after its finding is resolved in the accepted final
candidate and its report is preserved; never relabel its old outcome PASS. Normal local
task branch removal attempted by Orca is covered only when the exact branch effects are
known, safely merged and preserved, including surviving references/artifacts for unique
objects. Record each checkout, branch, HEAD, removal effects and surviving evidence.

Exclude main, protected or unrelated checkouts/branches, explicit retain/no-cleanup
overrides, pending consumers and unknown liveness or data. No force, data discard,
remote branch deletion, unrelated destructive authority or background daemon is granted.
Changed or ambiguous identity, mapping, data, consumers or effects mean HOLD and fresh
observation, never blind replay. A machine-observed merge, Completed card or worker
release alone supplies no cleanup approval. Other destructive operations still require
separate exact human authorization; report delivery and verified cleanup separately.

## Modes and plans

DIRECT requires exactly one low-risk task, no dependencies, obvious ownership, no
architecture planning, cross-repository reasoning or required independent validation.
All other cases are ORCHESTRATED, including single-repository work split across multiple
worktrees. An explicit DIRECT request cannot bypass these conditions. Avoid artificial
chains and unnecessary workers. A task count is a scope decision, not a token-use target.

Every spec names target, result/change, constraints, ownership and observable acceptance.
Every task records the schema's classification, base, mutation scope, routing decision
and dependencies. Preserve task IDs when revising a plan; record why scopes, baselines
or routing changed. Never dispatch a draft example or unresolved base placeholder.

## Integration and validation

Parallel completion is not integration readiness. After parallel mutation, inspect exact
upstream commits/patch digests, conflicts, producer/consumer contracts and test evidence.
Record PASS/FAIL/NEEDS-WORK, provenance and per-repository baselines. A gate PASS certifies
compatibility and names the next baseline; it never fabricates a combined revision.
If combination is required, create a separate single-owner integration implementation
task in an isolated non-main worktree. Preserve inputs; follow its integration baseline
with required testing/independent validation. Never combine repository histories or
silently mutate main/source branches. Failed/uncertain gates block all dependent dispatch.

When manual_review_required is true, HOLD every dependent dispatch, including integration
preparation, until an explicit human approval reference matches the exact gate ID, upstream
artifact refs and selected baselines. Compatibility PASS does not supply approval. Pending,
rejected, absent or stale approval cannot release work. Changed inputs/baselines invalidate
prior approval. This intermediate authorization is separate from final merge approval;
a user instruction to fix a finding does not approve future unseen gate results. When
manual review is not required, record approval as not-required with null evidence/scope.
The backend carries execution gate/message receipts; Nexus owns policy checks and
authorization decisions. Durable approval evidence must be externally recoverable.

Independent validation is mandatory for P0/P1, high risk, critical complexity,
architecture-sensitive changes, and integration changes with multiple mutable upstream
results. Use a fresh session and newly created isolated non-main worktree distinct from the
implementer. Codex is the default; another agent client requires explicit task authorization
and verified capability matching. Validate original finding or feature acceptance, root cause,
minimal scope, compatibility, meaningful tests, docs and managed contracts against the
exact immutable proposal. Return PASS/FAIL/NEEDS-WORK; missing evidence is not PASS.
Local validation follows affected paths and concrete risk: documentation-only work uses
relevant content/link/format checks; behavior changes use meaningful affected tests; a full
suite requires concrete broader regression risk. Reuse exact unchanged evidence and rerun
only for changed inputs, failures or new concerns. Required native CI still applies.
Read-only validators may run safe tests and explicitly authorized exact candidate
materialization/cleanup, never author repairs. P2 is risk-based; P3 is recorded by default.

## Orca and capabilities

Follow [model selection and verification](docs/model-selection-verification.md) for
requirement-based suitability, exact-session evidence and the blocking before-work checkpoint.

Select the installed executable using its skill stub once and reuse it. Inspect
`status --json` and `skills get orchestration` before Orca-dependent operations; load
version-matched placement, DAG/gate and recovery references at action gates. Do not
invent commands or flags. Bind tasks to one owning repository and verify returned
workspace identities. Preserve setup policy and inspect active attempt IDs/results.

Policy profile names and abstract reasoning levels are not provider IDs or literal
CLI effort flags. Local `capabilities.yaml` is data, never executable. Codex is the default
for every agent role. Optional Antigravity/OpenCode clients remain
catalog extensions requiring explicit task authorization and verified capability matching;
Codex unavailability or quota means HOLD, never automatic client switching. A Codex
validator in a fresh session and new worktree is independent. Unsupported effort must
use a verified supported equivalent or
configured default with recorded uncertainty, never silently drop a required capability
floor. Unverified high-risk/critical capabilities block dispatch; lower-risk configured
defaults can be used with explicit uncertainty and appropriate validation. Honor the
installed CLI's user-selected-model rule; compare requested/effective receipts.

On failure classify infrastructure/configuration/implementation/unknown, preserve evidence
and determine safe recovery. No automatic retry engine. Retry requires a concrete
recoverable cause, Coordinator decision, finite attempt budget and proven prior attempt
settlement/fencing using the installed recovery contract. Unknown liveness never permits
a duplicate editor, stop or release. Account for every expected Dispatch and settled
terminal's next owner before reporting completion.

## Governance and records

Draft is the PR preparation default. Before requesting human review, follow
[the review handoff procedure](docs/operator-workflow.md#human-review-handoff)
and verify Ready for review at the exact unchanged candidate under explicit human
publication/transition authority. Before promotion, missing readiness evidence means
HOLD Draft; an explicit Draft-only instruction requires an exact Ready instruction to release it.
Ready for review is not review approval, merge authority, acceptance or Done.

Features require validated requirements and observable benefit; review-driven fixes
require concrete findings. Normalize evidence/severity/confidence, deduplicate root
causes, resolve conflicts, and identify exactly one implementation owner per contract
finding. P0 required, P1 normally required, P2 only if benefit exceeds complexity, P3
record by default. Do not inflate stylistic preferences or introduce speculative
abstractions merely to consume model usage.

Execution Plans, routing decisions and runtime IDs stay in ignored `.runtime/`.
Normalized review findings, decisions, gate evidence, validation and unresolved risks
stay in ignored `reviews/` outputs; instructions/templates remain tracked. Durable
policy and architecture rationale belong in `config/` and `docs/`. Do not automatically
promote generated reviews or run logs into Git; curate durable changes only when
explicitly requested. No raw transcript archival or credentials in Nexus/local mappings.

New automation commits require verified App bot author and committer under the scoped
[Git identity preflight](docs/github-app-authentication.md#git-commit-identity-and-publication).
Verify raw exact-candidate metadata before publication; retain original human/upstream
objects and independently reviewed immutable provenance exemptions. Unknown identity
or exemption authority means HOLD, including manual pushes outside the PR adapter.
Bot metadata never substitutes for App authentication, validation or human approval;
never change global/shared identity settings or rewrite accepted history.

Human approval is the final merge boundary. No automatic merge, push, PR creation,
important-branch deletion, ownership-policy change or destructive Git operation.
Explicit user authorization applies to the exact reviewed change, not future changes.
No application framework, CI/CD platform, runtime, scheduler, database, message bus,
custom worktree manager, retry engine or agent subprocess framework.
