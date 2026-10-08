# Feature execution

Use docs/review-principles.md for all review/confirmation gates, including self-review
of findings and the six-section final review summary. Preserve role-specific outcomes.
Use [operator workflow](../docs/operator-workflow.md) for default intake, protected-main
mutation rules, active supervision and explicit checkpoint/handoff/pause/restart steps.

For architecture boundaries and phased GitHub adoption, apply docs/architecture.md and
docs/workflow-migration.md. Use schemas/execution-backend.yaml and the selected adapter binding for execution;
GitHub synchronization is not implemented by these preflight scripts.

## Restart and reconciliation

Apply docs/reconciliation.md at startup/resumption. Reconstruct intent from canonical
Work Items/Projects/PRs and authoritative backend/Git observations; use scripts/reconcile.sh
only on verified complete snapshots. Local cache loss cannot authorize duplicate execution.

## Intake and plan

Read AGENTS, all four config policies, the execution-plan contract, Coordinator and Planner
prompts. Inspect repository context and validate the user's proposal against requirements.
Identify non-goals, ownership, acceptance criteria and dirty-state inclusion. Use DIRECT
only when every eligibility condition holds; otherwise use ORCHESTRATED, including
single-repository work that benefits from multiple worktrees.

Create a plan and routing record in `.runtime/runs/<run-id>/` using a Nexus-owned run namespace; record backend run/attempt IDs separately as opaque adapter receipts.
Draft planning can stay in an explicitly supplied ignored local context. Classify each
task, declare read-only/write scope and forbidden paths, assign one owner, immutable base,
dependencies, acceptance and validation. Check unique IDs, acyclic DAG, complete waves
and conflicts; serialize overlapping mutations unless decomposition proves independence.
Plan templates/examples require real baselines and verified routing before dispatch.

Resolve [repository acceptance](../docs/acceptance-policy.md) from
`config/acceptance.json` plus routing/review policy and the technical owner's change-specific
test plan. Reinspect exact owner revision and instructions before dispatch; reverify stale
baselines. Record strongest matching requirements by union/OR and keep policy provenance
separate from observed evidence. Missing policy/provenance or native check discovery holds
affected work; explicit legacy local runs are limited, never the managed default.

## Canonical work association

For GitHub-managed work, read the Issue through schemas/work-item-provider.yaml and
scripts/work-items.sh. Bind canonical Issue identity to the logical tasks, execution
attempts and eventual PR. Explicit local-only runs remain legacy and cannot claim
external recovery. Issue/PR/comment write plans require exact publication authority;
implementation or local commit authority does not grant it. Record reviewed sanitized
associations externally before relying on recovery; never publish private reports.
Apply [the association contract](../docs/work-associations.md) and its manual trust
checks; illustrative examples and local approval receipts are not durable authority.

## Route and dispatch

Apply all routing overrides monotonically. Resolve compatible agent/model/effort on the
execution host and record fallback or missing capability. Hold high-risk/critical tasks
with unknown floors. Prepare execution via schemas/execution-backend.yaml and the selected adapter binding.
Translate logical tasks/dependencies behind that boundary; start ready independent tasks
in parallel only after capabilities, placement and authorization are verified. Each independently mutable task gets its own worktree in its owning repository.
Workers receive explicit objective, scope, base, acceptance, result format and boundaries.

## Workflow decisions

Use docs/workflow-controller.md, config/workflow.json and schemas/workflow-observation.yaml
for logical transitions. Build fresh verified external observations and evaluate them with
scripts/workflow.sh. Treat outputs as proposals only; prepare execution or provider writes
under their respective authority. Keep visible status separate from attempt state and
never mark Done from worker success. Feedback creates a bounded correction task under the
same Issue; required validation remains independent and exact-head evidence is mandatory.

For repository-specific Projects apply docs/github-projects.md. Read the configured
canonical lifecycle field. If the Issue lacks membership, prepare `scripts/projects.sh
item-add` and apply only under exact publication approval; reobserve membership before
preparing separate status/priority plans. Existing membership never starts another execution.
Compare fresh human edits and prepare only exact authorized
single-field changes with scripts/projects.sh. An evaluator proposal does not write state.
Missing Project mapping/permission is a visible blocker, never an invented local status.

## Supervise and integrate

Observe and collect explicit active-attempt completion through the selected backend. Terminal idle is insufficient. Inspect every
message in a delivery batch, handle questions/escalations and accept or reject evidence.
Supervise actively: start the complete ready wave, use bounded waits as checkpoints,
and continue eligible independent work while dependencies or human decisions hold others.
Before leaving supervision, record the checkpoint and an explicit handoff or pause;
no background Nexus process continues the Coordinator's work.
Release terminal workers when the installed lifecycle contract requires it, preserving
their diffs; acknowledge delivery only after all messages and lifecycle decisions are handled.
Unknown live state never justifies another mutation worker. Diagnose failure and use a
bounded recoverable retry only after prior worker settlement/fencing and a recorded decision.

After parallel mutation, perform compatibility analysis before releasing consumers.
Record gate PASS/FAIL/NEEDS-WORK, upstream evidence and per-repository immutable baselines.
Passing a task/native gate alone is insufficient. When manual_review_required is true,
HOLD all dependent dispatch until explicit human approval is recorded against the exact gate,
upstream artifacts and baseline scope. Missing/pending/rejected/stale approval cannot release
work; changed inputs invalidate it. Intermediate approval is separate from final merge approval.
If a combined candidate is needed,
create a separate single-owner integration task in a controlled non-main worktree, then
test and independently validate it. Do not dispatch consumers against a placeholder or
unmaterialized combined baseline. Cross-repository contracts also need a gate whenever
producer/consumer work depends on the changed contract.

## Validate and decide

Testing tasks declare mutation scope separately; read-only validators do not repair.
Independent validation is mandatory for P0/P1, high risk, critical complexity,
architecture-sensitive changes and integration from multiple upstream mutations.
P2 validation is risk-based. FAIL/NEEDS-WORK returns to a new bounded correction task;
validator cannot silently implement. Use the original requirements or accepted finding
and exact final candidate as evidence.

Managed implementation additionally requires local validation and authoritative approved
review of the current head. Discover native required checks freshly for the repository and
target branch; unknown is null/HOLD. Verified-empty CI requires native evidence and bounded
owner disposition, without waiving local validation/review or mandatory independent floors.
Check current-head review/check/merge facts and backend settlement under the acceptance
policy before accepting any existing evaluator proposal; the scripts do not enforce this
new declarative input. Human main/merge/publication authority remains exact and separate.

Synthesize result/diff, checks, remaining risks and gate/baseline provenance. Each
implementation result receives exactly one final human review decision. Keep transient
plans/results and generated reviews ignored; preserve only explicitly curated durable
policy decisions in Git. No automatic merge, push, PR or branch deletion.

## Completed worktrees

Apply docs/worktree-lifecycle.md after final disposition. Release settled workers
without deleting their checkout. Preserve upstream worktrees through integration
and required validation. Deletion is a separate human-authorized operation after
all eligibility checks; record per-worktree cleanup evidence outside deletion targets.

At instruction intake, reconcile relevant previously retained workspaces. At closure,
perform already authorized eligible removals after final disposition and before the
final report; otherwise report retention/HOLD and the next trigger. Result delivery
while awaiting human review does not close the workspace lifecycle. Follow-up messages
continue the objective unless they explicitly replace it; new instructions do not
implicitly authorize deletion of prior work.
