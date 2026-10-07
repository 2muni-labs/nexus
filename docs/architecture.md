# Architecture

Nexus is the control plane; Orca is the execution plane. Basecamp, Foundry and future
managed repositories remain independent implementation domains.

```text
                         User requirements
                                │
                                ▼
                              Nexus
                   Intake / Planner / Router
                    wave planning / Supervisor
                                │
                                ▼
                              Orca
                   ┌────────────┼────────────┐
                   ▼            ▼            ▼
                 WT A         WT B         WT C
                 Agent        Agent        Agent
                   └────────────┼────────────┘
                                ▼
                       Structured completion
                                ▼
                         Integration gate
                                ▼
                       Independent validation
                                ▼
                       Human review / decision
```

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
ready waves and using Orca's task dependencies. Nexus contains no scheduler process,
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
Orca owns completion delivery, recovery and terminal release.

No credentials, machine paths, Orca IDs or permanent provider model IDs in tracked policy.
Runtime plans/results are ignored; generated reviews remain ignored. Curated durable
rationale belongs in docs/config only when explicitly requested. Scripts are read-only
preflight/status tools and do not dispatch or write runtime state. Human approval governs
merge, publishing, destructive operations and ownership policy changes.
