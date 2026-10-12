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
change. Codex is the configured default for every agent assignment, including workers,
reviewers and validators. Alternate clients require explicit task authorization and
verified capability matching; default unavailability or quota means HOLD. Only configured,
verified capabilities may be used; this procedure
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
Main permits intake, read-only coordination and ignored operational evidence only;
worker execution, tests, implementation and repair there are forbidden. Every new task,
including DIRECT, maintenance, planning, review, validation and integration, starts in a
newly created isolated non-main worktree at an exact baseline. Integration into main requires
explicit human approval of the exact reviewed candidate; changed inputs require a
new decision. Approval to implement, a worker outcome or validation PASS supplies
no main integration authority.

There is no current-checkout maintenance writer exception. Authorized final main
integration is a separate controlled operation, not implementation on main. Prior
authorized direct commits
remain the existing authorized baseline; this does not retrospectively certify their
final acceptance. Do not rewrite history to retrofit this default.

One mutable task has one owner, one repository, one worktree and one diff. Route
managed-repository implementation to its owning repository; never edit another
repository from Nexus. Serialize overlapping mutation scopes, or split only when
independence can be demonstrated. Start independent ready work together in separate
worktrees; avoid artificial dependencies or unnecessary workers. The same active attempt
may continue its own worktree. Replacement requires a new worktree after prior settlement,
proven editor exit and preserved immutable results; new read-only tasks also get new worktrees.

## Capability routing and dependency gates

Classify each task's type, complexity, risk, context, scope and acceptance first.
Apply all matching [routing rules](../config/routing.yaml) by maximum profile rank
and validation logical OR. Use Codex by default; alternate clients require explicit
task authorization and compatible verified capabilities. Unavailability or quota holds
work, with no automatic client fallback. Verify effective model/effort and placement.
Compare Codex and any explicitly task-authorized compatible alternative for each task,
recording accepted/rejected candidates and selection reasons. A prior one-task model
choice is not a global default. Leave the task-local mapping null unless the user
named or authorized a model; never invent a provider ID or availability.
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
| Worker release | After accepted settlement, release or record user-requested retention through the backend; a new task requires a new worktree/session. Release does not delete the worktree. |
| Checkout cleanup | Default retained; deletion needs separate exact human approval and every [lifecycle eligibility check](worktree-lifecycle.md). Report delivery and cleanup separately. |

Required independent validation uses a fresh session and new isolated non-main worktree, even when Codex validates a
Codex implementation. Validators report defects without repairs; assign corrections
as bounded implementation work and revalidate the changed exact candidate. Missing
evidence is NEEDS-WORK, never PASS. No milestone implies automatic publication,
push, PR creation, merge, branch deletion or checkout deletion.

## Automated Git identity

Before a new automation commit, use the scoped [Git identity operations](github-app-authentication.md#git-commit-identity-and-publication)
in the owned isolated worktree; confirm both effective author/committer and actual
new commit metadata. Inherited personal defaults and conflicting overrides are not
acceptable automation identity. Preserve exact original human/upstream objects and
independently verify any digest-bound reviewed exemption; unknown provenance HOLDs.
Before separately authorized publication, bind the exact source head, actual target
base and private checkout/provenance context in the PR request and run `verify`.
The PR adapter enforces this check; manual pushes need the same explicit preflight
because no Nexus push adapter exists. Continue App installation authentication,
independent validation and exact human publication/merge approval separately.
Never rewrite accepted history or change global/shared Git identity settings.

## Human review handoff

Draft is the PR preparation default, including when `pr-create` omits `draft` or
sets it to null. Publishing a Draft does not itself authorize promotion. Before
requesting human review, the Coordinator must verify the PR is Ready for review
at the exact unchanged candidate using this procedure:

1. Reobserve the canonical repository/PR, source and target branches, current head,
   intended diff and human instructions. Freeze the candidate and record resolved
   [acceptance requirements](acceptance-policy.md), policy provenance and evidence
   references. Map any frozen precommit patch validation to the final head; a changed
   candidate invalidates affected evidence and approval scope.
2. Check explicit human publication/transition authority for this exact candidate
   and operation. Approval may cover initial Draft publication followed by Ready
   for review on the unchanged approved candidate once readiness gates pass; record
   that scope rather than asking again. An explicit Draft-only instruction retains
   Draft until an exact Ready instruction. Implementation authority, worker success,
   validation PASS and passing CI grant no publication or transition authority.
3. Require local validation PASS and independent validation PASS in a fresh session
   when any matching policy requires it. Obtain fresh, complete native required-check
   discovery for the exact repository, target branch and applicable protection/rulesets;
   record source, time, scope, completeness and resolved names. Require complete passing
   authoritative CI observations for every required check at the exact candidate head
   (the current PR head when a PR exists).
   Unknown requirements remain null. Verified-empty CI requires complete fresh native
   evidence plus an explicit bounded owning-repository disposition naming the change/head,
   branch, evidence, scope and validity/reverification trigger. Missing, pending, failed
   or stale readiness evidence before promotion means HOLD Draft; explain the reason
   and next action. The evaluator's empty-check limitation remains a visible HOLD there, as
   described in [acceptance policy](acceptance-policy.md#evidence-and-current-implementation-limit);
   do not invent a check or claim automatic support.
4. Immediately before the authorized operation, reobserve scope, head, Draft state,
   approval and evidence freshness. If already Ready at the authorized unchanged head,
   verify that fact instead of repeating a transition. Otherwise the Coordinator
   performs the exact authorized GitHub Ready operation manually through the
   [provider boundary](adapters/github.md): current Nexus tools have no dedicated
   Ready command or automatic publisher. Initial `draft: false` publication is also
   allowed when this same candidate already satisfies readiness gates and human
   authorization explicitly covers ready publication; the adapter default stays Draft.
   On an ambiguous result, preserve evidence and reobserve GitHub rather than blindly
   repeat. Changed scope/head or unresolved facts mean HOLD and reconcile authority.
5. Reobserve GitHub and record Ready for review at the exact unchanged head before
   requesting human review or reporting the handoff complete. Reverify required-check
   discovery and current-head CI after publication/promotion: Ready can trigger new CI.
   Pending, failed, missing or stale evidence now means HOLD the human review handoff
   while the PR remains Ready, without an unapproved conversion back to Draft. Resume
   only after fresh readiness evidence and unchanged approval scope are verified.
   Preserve sanitized, authorized recovery evidence externally; private reports are
   not implicitly published.

Ready for review initiates human review; it is not review approval, merge authorization,
acceptance or Done, nor the Work Item's Ready state. Human review approval is not a
prerequisite for asking that human review. Current-head approved review, exact human
merge approval and all final acceptance requirements still apply before acceptance/Done.
Do not hand a held Draft to a human as completed review preparation.

## Board reconciliation

The selected backend's execution board is an observation/control surface, never a competing backlog. After
each accepted worker settlement, at environment lifecycle changes and before any closure
report, reconcile it as a provider-neutral checkpoint: observe the exact scoped
environments and all their attempts, including sequential attempts and attempts from other
runs sharing an environment. Preserve a prewrite snapshot of identity, head, branch,
links, comment, status and attempt evidence. Compare intent with fresh observations before
applying only factual environment status, context and comment through the adapter's
exact-scoped native operation, then read the result and attempt inventory back to verify.

Use the following provider-neutral display mapping; the adapter maps it to native columns.
An active attempt takes precedence over an older review or settled result. Pending required
review takes precedence over completed display when no attempt is active.

| Observed scoped attempt state | Environment display and factual context |
| --- | --- |
| Unknown unsettled or possibly active attempt | HOLD reconciliation; investigate, never infer Completed from timeout, idle or heartbeat. |
| Active attempt | Active; identify the current work and preserve older attempt outcomes as context. |
| Delivered result awaiting required review | Review; record delivery and the outstanding review, without claiming acceptance. |
| Known settled/delivered non-review attempt with explicit success or failure | Completed display is permitted; distinguish succeeded from failed in context/comment and name any remaining remediation or retention. Completed does not mean success. |
| Known superseded non-review attempt | Completed display is permitted if no current attempt requires active/review display; retain the supersession reason and successor association. Fencing alone does not establish settlement or exit. |

A known settled outcome remains factual even when its user-retained PTY is live or process
exit is uncertain. It may show delivered/Completed with that uncertainty in context; this
does not prove editor exit or authorize reuse, worker release or checkout deletion. Unknown
unsettled execution still means HOLD. Keep outcome delivery, required review, process
evidence and retention as separate observations.

If identity, head, branch, links, comment or status changes unexpectedly from the prewrite
snapshot or intended write, or a newly active attempt appears before the write or at
readback, HOLD and preserve fresh human metadata. Do not overwrite human comments/links
or blindly replay a mutation to force the old snapshot. Reobserve the exact scope and
resolve the conflict under normal authority before preparing another write. Readback is
verification, not an atomic compare-and-set guarantee.

A native execution column maps observed execution state only. GitHub Done, merge, process
exit, worker release and checkout deletion remain separate decisions: do not blind-sync
GitHub Workflow status to the board or use a card to force cleanup. The provider-neutral
checkpoint is defined here; native CLI mechanics belong to the selected adapter (currently
the [Orca adapter](adapters/orca.md#board-metadata-reconciliation)).

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
- Same-attempt continuation and worker release/retention decisions and retained checkout reasons/next cleanup trigger.

Keep recovery-critical sanitized associations and decisions in durable external
records before claiming recovery after local loss, following
[reconciliation](reconciliation.md) and the
[association identity, author, decision and scope checks](work-associations.md).
External publication still requires exact
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
