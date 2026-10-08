# Operator workflow

The Codex Coordinator in Nexus's main checkout is the default entry point for human
requirements, questions and operational instructions. It owns intake, requirements,
planning, routing, ready waves, gates and supervision under [AGENTS](../AGENTS.md),
the four governance policies and [feature execution](../workflows/feature-execution.md).
This is a session role, not a background service. Read [review principles](review-principles.md)
for substantive assessments and [operating model](operating-model.md) for peer boundaries.

## Intake and human controls

GitHub owns persistent project intent and history; Nexus owns workflow policy; the
selected execution backend owns environments and factual attempt observations.
These responsibilities remain unchanged when agents, models or compatible providers
change. Codex is the configured Coordinator default, not a requirement on all workers
or validators. Only configured, verified capabilities may be used; this procedure
does not advertise additional providers or agents.

Direct human edits to Issues and Projects remain valid intake and control signals.
Reobserve requirements, priority, assignment, status, pause/cancel and decision scope
before acting; do not overwrite fresh human intent with a stale local plan or board
column. An Issue edit or closure alone proves neither execution eligibility nor Done.
GitHub assignees remain accountable people, distinct from agent assignments. Record
conflicts and seek an explicit resolution while preserving safety floors.

Validate the proposed outcome, benefit, owner, constraints, non-goals and observable
acceptance. Inspect exact revisions, dirty-state inclusion/exclusion, known PRs and
relevant retained workspaces. Preserve existing work. Use DIRECT only when every
eligibility condition holds; otherwise create an ORCHESTRATED plan under ignored
`.runtime/runs/<run-id>/plan.yaml` and check the relational rules in the
[execution-plan contract](../schemas/execution-plan.yaml) before dispatch.

## Protected main and bounded ownership

Nexus main is the protected accepted policy baseline under Nexus operating policy.
This does not claim that GitHub branch protection or rulesets are installed.
By default, all mutable Nexus
work uses a task branch in an isolated non-main worktree. Intake, planning and review
in the main checkout do not authorize editing it. Integration into main requires
explicit human approval of the exact reviewed candidate; changed inputs require a
new decision. Approval to implement, a worker outcome or validation PASS supplies
no main integration authority.

The sole current-checkout exception is a directly assigned Nexus maintenance task
whose explicit user scope authorizes that checkout and its bounded changes. If the
checkout is on main, the scope must explicitly include main modification. It remains
one sole mutable workspace with no concurrent mutation worker, and all applicable
validation and publication boundaries still apply. Prior authorized direct commits
remain the existing authorized baseline; this does not retrospectively certify their
final acceptance. Do not rewrite history to retrofit this default.

One mutable task has one owner, one repository, one worktree and one diff. Route
managed-repository implementation to its owning repository; never edit another
repository from Nexus. Serialize overlapping mutation scopes, or split only when
independence can be demonstrated. Start independent ready work together in separate
worktrees; avoid artificial dependencies or unnecessary workers. Safe read-only
contexts may be reused against a recorded exact baseline without concurrent mutation.

## Capability routing and dependency gates

Classify each task's type, complexity, risk, context, scope and acceptance first.
Apply all matching [routing rules](../config/routing.yaml) by maximum profile rank
and validation logical OR. Choose compatible available agents/fallbacks by actual
capabilities, then verify effective model/effort and backend placement on the host.
Profiles are floors, not model brands or literal CLI flags. Record requested versus
effective capabilities and uncertainty; missing optional agents cannot lower floors
or waive independence. Unverified high-risk/critical capability blocks dispatch.

Release dependent work only after its actual prerequisites, capability and authority
checks pass. After parallel mutation, inspect exact artifacts and compatibility and
record gate PASS with resolved immutable per-repository baselines. Worker success
alone cannot release a consumer or fabricate a combined revision. When
`manual_review_required` is true, HOLD every dependent dispatch, including integration
preparation, until approval matches the exact gate, upstream artifacts and baselines.
This intermediate decision is separate from approval to integrate the final candidate
into main. If combination is needed, assign a separate single-owner integration task
in a non-main worktree and independently validate its resulting candidate.

## Active supervision and distinct milestones

Start the complete eligible wave before waiting. Through the selected backend's
installed contract, process questions, escalations, explicit outcomes and follow-ups
at natural checkpoints. Use bounded waits, inspect authoritative observations when
progress is unclear, and continue eligible independent work while another scope is
blocked. A pending dependency or human decision blocks its consumers rather than
globally suspending unrelated work. Record the next action and owner of each hold.

Unknown liveness means HOLD: preserve the attempt and evidence, investigate or
escalate, and do not launch a duplicate editor, stop, release or delete on inference.
Idle, heartbeat, timeout, fencing and contact loss do not prove editor exit. Retries
need a concrete cause, finite budget, Coordinator decision and backend-proven prior
settlement and editor exit. Cancellation is a request, not proof of termination.

| Milestone | Evidence and consequence |
| --- | --- |
| Worker outcome | Explicit active-attempt success/failure with artifacts and actual checks; settles assigned execution, not acceptance. |
| Validation | Fresh session distinct from implementer verifies the exact candidate and original acceptance; PASS/FAIL/NEEDS-WORK with evidence. Same agent family is permitted. Mandatory triggers remain in review/routing policy. |
| Human acceptance | Explicit decision bound to the exact reviewed result; accounts for each implementation result and grants only its stated operation scope. |
| Merge / main integration | Separately authorized operation is observed and checked against the approved candidate; implementation Done needs observed merge and acceptance, while non-code work may use explicit accepted disposition. |
| Worker release | After accepted settlement, decide reuse, user-requested retention or release through the backend; release does not delete the worktree. |
| Checkout cleanup | Default retained; deletion needs separate exact human approval and every [lifecycle eligibility check](worktree-lifecycle.md). Report delivery and cleanup separately. |

Required independent validation uses a fresh session, even when Codex validates a
Codex implementation. Validators report defects without repairs; assign corrections
as bounded implementation work and revalidate the changed exact candidate. Missing
evidence is NEEDS-WORK, never PASS. No milestone implies automatic publication,
push, PR creation, merge, branch deletion or checkout deletion.

## Checkpoint, handoff, pause and restart

At a phase boundary, before pausing or handing off, and before ending active
supervision, record a sanitized checkpoint. Local plans/receipts belong in ignored
`.runtime/`; normalized decisions, gates, validation and uncertainties belong in
ignored `reviews/`. Include:

- Canonical Work Item and task identities, objective/acceptance and current plan reference.
- Exact baseline and candidate revision or patch digest, changed scope and artifact references.
- Active/settled attempts, authoritative host/backend receipts, observed liveness and its source.
- Outcomes, checks, validation, gate inputs/results and exact human decision scope.
- Outstanding questions, dependency holds, consumers, next action/owner and finite retry budget.
- Worker reuse/release/retention decisions and retained checkout reasons/next cleanup trigger.

Keep recovery-critical sanitized associations and decisions in durable external
records before claiming recovery after local loss, following
[reconciliation](reconciliation.md). External publication still requires exact
authorization: prepare a reviewed minimal record, do not implicitly upload private
reports. Credentials, machine paths and raw transcripts stay private. If external
records are incomplete, name that recovery limit; a local checkpoint is operational
evidence, not a competing project store or proof of liveness.

1. **Handoff:** identify the receiving Coordinator and exact Work Items/scope, send
   the checkpoint through the selected backend's supported communication, and obtain
   explicit receipt and ownership acceptance. Maintain one Coordinator writer per
   Work Item. Record the transfer before the outgoing Coordinator stops; absent
   acceptance means supervision has not transferred. Do not create a second editor.
2. **Pause:** preserve the human pause instruction and checkpoint, hold new dispatch
   in scope and record who will resume supervision. Account explicitly for active
   workers: pause does not stop them. If they continue, keep a named active supervisor;
   otherwise use authorized backend controls and verify settlement/exit. Unknown
   liveness remains HOLD and must be reported, not described as safely stopped.
3. **Restart/resume:** reread policy and fresh GitHub intent, backend attempts and Git
   refs before acting. Compare checkpoint claims with authoritative observations;
   reverify capability, exact candidate, approvals and dependencies. Known PRs prevent
   blind redispatch. Missing/conflicting evidence holds affected work. Resume only
   under current authority, using a fresh Dispatch after a settled attempt rather
   than reusing old lifecycle IDs.

Ending a Coordinator session creates no daemon, automatic dispatcher or monitoring
promise. Explicitly report what remains active, paused, retained or HOLD, its next
trigger and responsible operator. A checkpoint supports deliberate continuation;
it does not perform it.
