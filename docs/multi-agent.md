# Backend-independent multi-agent coordination

Nexus already has Task DAGs, independent review/validation and monotonic routing floors.
This stage separates assignments/backend selection from their Orca binding; it adds no
worker runtime, scheduler, queue or automatic retry engine. Only the existing configured
agents and Orca backend are advertised. Uninstalled agents and future backends remain
extension possibilities, not fabricated availability or production fallback providers.

## Decision sequence

Classify type/complexity/risk/context/owner → combine all matching routing rules by highest
profile and validation OR → choose compatible configured agent/fallback → verify the actual
host's capabilities → select a compatible configured execution backend → bind a logical
assignment/session to one task/work item → prepare exact placement → start only after gates.
The adapter must execute that assignment or report unsupported capability, never reroute.

Use `schemas/agent-assignment.yaml` for role, logical session, requested/effective receipts,
immutable candidate and required validation. Reviews/planning/validation are read-only;
implementation authority requires a new scoped task. Mandatory independent validation uses
a fresh separate session even if the same agent family is chosen. Another family is preferred
only when available and compatible. Model names and effort flags stay local/host-verified;
a user-authorized inherited default with uncertainty is not a certification of a high-risk floor.

## Parallel work and integration

The Coordinator selects ready waves from real dependencies. Every independently mutable
task has one owner, one repository, one isolated worktree and one diff. Never create agents
or artificial tasks just to use parallelism. Split linked Issues for independently reviewable
changes when appropriate; small work remains one Issue/worktree/PR by default. Read-only
contexts may be reused only without concurrent mutation against the exact reviewed baseline.

After parallel mutation inspect exact artifacts, conflicts and producer/consumer semantics;
record integration PASS and per-repository immutable baselines. If combination is required,
create a separate single-owner integration task and validate that exact combined candidate.
Manual-review gates hold every dependent task until exact approval, even when compatibility
passes. Completion of a backend task cannot manufacture a combined revision or approval.

## Retry and replacement

Record failure class, concrete recoverable cause, finite budget, exact prior outcome and
settlement/editor-exit evidence before retry, reassignment or backend switch. Preserve the
Work Item identity and accepted/rejected artifacts; reverify placement and requested/effective
capability on the new backend. Unknown liveness, unavailable capabilities and stale approval
HOLD. A fence alone is not process death. Separate cancellation, settlement, resource release
and checkout deletion. No fallback may weaken floors or independent validation.

## Acceptance and remaining limits

`tests/test_architecture.py` supplies synthetic normalized assignments/opaque metadata to
show that changing agent family or backend does not change workflow/reconciliation semantics.
These fixtures are not extra configured adapters or claims that those agents are installed.
Missing capability evidence and stale approvals hold under every synthetic assignment.
`tests/run.sh` runs the integrated structural, preflight, observation, provider, Project,
workflow and reconciliation checks. No live worker is launched by the suite.

Replacing Orca requires a new conforming binding/adapter and composition registration;
core workflow states, plans, Work Items and GitHub integration need no redesign. Actual
replacement/remote cancellation still needs operational conformance on the chosen host.
Recovery from local loss requires reviewed associations persisted externally for real managed
work. No Issue/PR, dispatch or automatic lifecycle publication is created by these tests.
