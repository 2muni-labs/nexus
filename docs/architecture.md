# Architecture

**Nexus owns the workflow. GitHub owns the state. Orca is an execution backend.**

This is the permanent target. Nexus is a document-driven Coordinator with one-shot shell ports and pure decision tools; it has no background controller or project-state cache. The one-shot workflow policy
evaluator proposes transitions without executing effects. GitHub operations now
use a one-shot WorkItemProvider adapter; no automatic lifecycle synchronization exists. Reconciliation combines verified external
snapshots without reading a local workflow store.
The backend contract now separates asynchronous Coordinator operations and read-only
shell preflight from Orca-native mechanics; no new automatic dispatcher is introduced.
See [assessment and migration](workflow-migration.md) for evidence, stages and tests.

```text
Requirements → Nexus Coordinator: planning / workflow policy / routing / gates
                          │                         │
                   WorkItemProvider           ExecutionBackend
                          │                         │
                   GitHub adapter              Orca adapter
                          │                         │
                Issues / PRs / Projects       worktrees / agents
                persistent project truth      attempt observations
                          └──────────┬──────────────┘
                               Reconciliation
                                     │
                      validation / review / human merge
```

The diagram describes contracts, not new services. Workflow state and policy belong to
Nexus; GitHub persists externally visible decisions. Execution backends own attempt
mechanics and observations. GitHub is the only planned work provider and Orca the only
current backend; other adapters are extension possibilities, not deliverables.

## Dependency boundary

Domain concepts and policy depend on no provider. Application coordination consumes
provider-neutral contracts. Adapters implement those contracts and call external APIs/CLI.
The entrypoint/composition boundary selects adapters. Neither core policy nor an execution
adapter decides model routing based on provider-native project states.

Allowed: entrypoint → application → domain/contracts; adapters → contracts;
Orca adapter → Orca CLI; GitHub adapter → GitHub API. Forbidden: domain/policy → Orca CLI,
workspace IDs or native states; domain/policy → GitHub API payloads; adapters → routing
policy decisions. An opaque external ID is an association, never a Work Item identity.

Initially these are declarative contracts: no class hierarchy or framework is necessary.
A future ExecutionContext contains stable workItem/task/execution IDs, logical repository,
base revision, working branch, selected backend, assignment and normalized observations.
Keep external execution IDs and provider metadata opaque to core consumers; the adapter
interprets them and verifies authoritative host/repository/attempt identity.

Derive the execution port from real callers: prepare, start, observe, collect an explicit
result, request cancellation, and settle/release resources. Cancellation is asynchronous;
unknown observation cannot prove exit. Separate worker release from checkout deletion,
which requires its own human-authorized operation. Unsupported operations fail explicitly;
never silently emulate unavailable fencing or cancel by deleting a checkout.
The lifecycle port is `schemas/execution-backend.yaml`, implemented by the Coordinator
using the selected backend binding (`docs/adapters/orca.md`). Read-only shell entrypoints
use `scripts/execution-backend.sh`; all direct Orca CLI calls and native diagnostic views
live in `scripts/adapters/orca.sh`. Existing helpers remain compatible lazy shims.
The shell port is preflight/status only; lifecycle operations remain explicit supervised
Coordinator actions, preserving this repository's no-runtime/no-dispatch-script boundary.

WorkItemProvider initially needs Issue read/create/update, Issue/PR association, PR
read/create, review/check reads, labels and Project field updates. Implement each capability
only at its migration phase with authorization, observable errors and duplicate prevention.
Provider writes require the existing explicit publication authority; this architecture
request does not authorize creating Issues/PRs, pushing or merging unseen changes.

The same graph applies to multiple tasks within Foundry or to tasks in separate
repositories. A worker never mutates another repository. Cross-repository reasoning
uses normalized outputs and contract inventories; it does not require a worker to mount
all repositories. Each cross-repository finding has exactly one implementation owner.

## Planning and scheduling

The user's proposal is validated against repository context before becoming an Execution
Plan. `config/planning.yaml` defines DIRECT eligibility and ORCHESTRATED triggers.
`schemas/execution-plan.yaml` is a declarative field/semantic contract, not executable
JSON Schema. Examples are draft plans with placeholder baselines, not launchable jobs.

The Coordinator checks IDs, acyclicity, ownership, conflict-free waves, acceptance criteria,
validation requirements and baseline provenance. Scheduler means the Coordinator choosing
ready waves and using the selected execution adapter (currently Orca native task dependencies). Nexus contains no scheduler process,
queue, daemon, retry engine or agent subprocess framework.

## Integration is a decision

Orca task completion or idle terminals cannot prove compatibility. After parallel mutation,
a gate reviews all accepted upstream results, overlapping changes, semantics, tests and
contract compatibility. Record PASS/FAIL/NEEDS-WORK, immutable inputs and baseline per
repository. FAIL and NEEDS-WORK hold dependent work. Native gate resolution carries the
decision; resolving it without evidence cannot waive Nexus policy.

manual_review_required means human review before any dependent dispatch, including candidate
integration preparation. Record approval status, explicit human message/gate decision
reference and its exact gate/input/baseline scope. PASS with pending, missing, rejected or
stale approval remains HOLD. Changing those inputs invalidates approval. A generic request
to implement fixes is not approval of future gate outputs. If manual review is unnecessary,
record not-required and null evidence/scope. This uses Orca's existing decisions and is
separate from the mandatory human final merge gate; Nexus implements no approval engine.

If parallel branches need combining, gate PASS selects compatible inputs. It does not
create a combined baseline. Dispatch a distinct, explicitly scoped integration task in
one owning repository's isolated non-main worktree. It may prepare a candidate from the
selected inputs, preserving source branches and recording provenance. Test and independently
validate the combined result before consumers use it. Never silently merge into main.
Cross-repository baselines remain separate revisions; there is no combined Git tree.

## Safety, failures and state

Record committed revisions and explicitly included/excluded dirty state. Preserve user
changes. Mutable tasks each receive an isolated worktree; read-only tasks may reuse an
immutable context without concurrent mutation. Review, implementation and validation
have separate responsibilities; independent validation uses a separate session.

Explicit `worker_done` is evidence to inspect, not automatic acceptance. Infrastructure,
configuration, implementation and unknown failures receive different diagnoses. Retry
requires a settled/fenced prior worker, a concrete recoverable cause, bounded budget and
recorded Coordinator decision. Unknown live workers are preserved; no duplicate mutation.
The execution backend owns completion delivery, recovery primitives and terminal release;
Nexus decides acceptance and recovery policy.

No credentials, machine paths, Orca IDs or permanent provider model IDs in tracked policy.
Runtime plans/results are ignored; generated reviews remain ignored. Curated durable
rationale belongs in docs/config only when explicitly requested. Scripts are read-only
preflight/status tools and do not dispatch or write runtime state. Human approval governs
merge, publishing, destructive operations and ownership policy changes.
