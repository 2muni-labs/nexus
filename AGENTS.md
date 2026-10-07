# Nexus v0.2 agent operating contract

Nexus is a requirements-to-execution control plane for repositories, agents, models,
workflows, reviews and validation. Read this contract before every structured workflow,
then all four `config/` policies, `schemas/execution-plan.yaml`, the requested workflow,
and relevant prompts. The user's proposal is intake, not an automatically valid plan.

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
Read-only planning/review may reuse a suitable context when no concurrent mutation can
change its baseline; record the exact revisions. Cross-repository analysis is allowed,
preferably through normalized inputs. Cross-repository mutation and commits are forbidden.

Nexus owns intake, plans, routing, policies, prompts, workflows, gate decisions, normalized
findings, validation requirements and lightweight diagnostics. Orca owns worktrees,
terminals, dispatch, lifecycle, supervision, completion and recovery. Basecamp owns host
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
  profile rank and logical OR for validation. Record concise operational reasons and
  requested versus verified effective capabilities; never fabricate model availability.
- **Scheduler (wave planning):** translate the DAG into Orca ready waves. Start independent
  work together; serialize real dependencies and conflicting mutation scopes. This is a
  Coordinator responsibility, not a Nexus scheduling process, queue or daemon.
- **Supervisor:** use Orca's exact attempt/lifecycle authority. Require explicit outcomes
  and structured results; idle terminals, heartbeat, timeout or contact loss are not
  completion. Process questions, preserve failure evidence, prevent duplicate mutation
  attempts, and choose release/reuse/user-requested retention after accepted settlement.
- **Integrator:** assess prerequisites and semantic compatibility before shared downstream
  work. Require a recorded integration PASS and resolved immutable baseline map. A
  successful gate worker or a native task marked completed is insufficient by itself.

The Coordinator routes managed-repository implementation rather than editing it from
Nexus. A directly assigned Nexus maintenance task may use the user's current checkout
as its sole mutable workspace; never share that checkout with another mutation worker.
Independent validation must use a separate session. A plan, review or validation task
must not silently become an implementation task; create a new task for changed authority.

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
Orca carries gate/message decisions; Nexus adds policy checks, not an approval engine.

Independent validation is mandatory for P0/P1, high risk, critical complexity,
architecture-sensitive changes, and integration changes with multiple mutable upstream
results. Use a fresh session distinct from the implementer; another agent family is
preferred but optional. Validate original finding or feature acceptance, root cause,
minimal scope, compatibility, meaningful tests, docs and managed contracts against the
exact immutable proposal. Return PASS/FAIL/NEEDS-WORK; missing evidence is not PASS.
Read-only validators may run safe tests and explicitly authorized exact candidate
materialization/cleanup, never author repairs. P2 is risk-based; P3 is recorded by default.

## Orca and capabilities

Select the installed executable using its skill stub once and reuse it. Inspect
`status --json` and `skills get orchestration` before Orca-dependent operations; load
version-matched placement, DAG/gate and recovery references at action gates. Do not
invent commands or flags. Bind tasks to one owning repository and verify returned
workspace identities. Preserve setup policy and inspect active attempt IDs/results.

Policy profile names and abstract reasoning levels are not provider IDs or literal
CLI effort flags. Local `capabilities.yaml` is data, never executable. Missing optional
agents use an available compatible fallback; a Codex validator in a fresh session is
still independent. Unsupported effort must use a verified supported equivalent or
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

Human approval is the final merge boundary. No automatic merge, push, PR creation,
important-branch deletion, ownership-policy change or destructive Git operation.
Explicit user authorization applies to the exact reviewed change, not future changes.
No application framework, CI/CD platform, runtime, scheduler, database, message bus,
custom worktree manager, retry engine or agent subprocess framework.
