# Feature execution

Use docs/review-principles.md for all review/confirmation gates, including self-review
of findings and the six-section final review summary. Preserve role-specific outcomes.

## Intake and plan

Read AGENTS, all four config policies, the execution-plan contract, Coordinator and Planner
prompts. Inspect repository context and validate the user's proposal against requirements.
Identify non-goals, ownership, acceptance criteria and dirty-state inclusion. Use DIRECT
only when every eligibility condition holds; otherwise use ORCHESTRATED, including
single-repository work that benefits from multiple worktrees.

Create a plan and routing record in `.runtime/runs/<Orca-run-id>/` after a real run exists.
Draft planning can stay in an explicitly supplied ignored local context. Classify each
task, declare read-only/write scope and forbidden paths, assign one owner, immutable base,
dependencies, acceptance and validation. Check unique IDs, acyclic DAG, complete waves
and conflicts; serialize overlapping mutations unless decomposition proves independence.
Plan templates/examples require real baselines and verified routing before dispatch.

## Route and dispatch

Apply all routing overrides monotonically. Resolve compatible agent/model/effort on the
execution host and record fallback or missing capability. Hold high-risk/critical tasks
with unknown floors. Inspect installed Orca status, guide and named references. Represent
the plan through native Orca tasks/dependencies; dispatch ready independent tasks in
parallel. Each independently mutable task gets its own worktree in its owning repository.
Workers receive explicit objective, scope, base, acceptance, result format and boundaries.

## Supervise and integrate

Wait for explicit completion through Orca. Terminal idle is insufficient. Inspect every
message in a delivery batch, handle questions/escalations and accept or reject evidence.
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

Synthesize result/diff, checks, remaining risks and gate/baseline provenance. Each
implementation result receives exactly one final human review decision. Keep transient
plans/results and generated reviews ignored; preserve only explicitly curated durable
policy decisions in Git. No automatic merge, push, PR or branch deletion.
