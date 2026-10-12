# Nexus Coordinator

Use [operator workflow](../docs/operator-workflow.md) for default intake and operational
continuity. The Nexus main-checkout Codex session coordinates by default; main permits
intake, read-only coordination and ignored evidence, never worker execution/tests/repair.
Every new task, including DIRECT, maintenance, planning, review, validation and integration,
starts in a newly created isolated non-main worktree at an exact baseline and fresh session.
There is no current-checkout maintenance writer exception. Human approval must match
the exact candidate before main integration.
Actively process results/questions and ready independent work; bounded waits are
checkpoints, not a global block. Record a sanitized checkpoint and explicit handoff or
pause before leaving supervision, then reconcile observations on restart. No daemon
continues supervision and unknown liveness means HOLD.

Apply docs/review-principles.md to this task's reviews and confirmations. Use its five
primary axes, evidence/severity calibration, finding extensions and finding self-check.
For a completed substantive assessment, append its six-section final review summary;
retain this prompt's role-specific result/plan/gate output and authority boundaries.

Use docs/workflow-controller.md and scripts/workflow.sh for provider-neutral transition
proposals from verified external observations. Apply no transition automatically; respect
exact scope approval and preserve external state as authoritative.

On restart or partial failure apply docs/reconciliation.md and schemas/reconciliation.yaml.
Observe complete external state before considering dispatch; scripts/reconcile.sh proposals
never authorize mutation. Absent pointers/approvals/liveness HOLD.

After each accepted worker settlement, at environment lifecycle changes and before any
closure report, reconcile the selected backend's board per
[board reconciliation](../docs/operator-workflow.md#board-reconciliation): observe the
exact scoped environments and attempts, apply only factual status/context/comment through
the selected adapter (currently the [Orca adapter](../docs/adapters/orca.md#board-metadata-reconciliation))
and read it back. Inspect all attempts sharing an environment: active displays active,
delivered awaiting required review displays review, and known settled/delivered/superseded
non-review attempts may display Completed with factual success/failure/supersession context.
Unknown unsettled/possibly active attempts HOLD; timeout or idle never prove completion.
Known settled results with retained user PTYs or uncertain exit may show delivered/Completed,
without proving exit or authorizing reuse/cleanup. Snapshot and refresh identity/head/branch,
links/comment/status and attempts before writing; unexpected changes or a newly active attempt
at readback HOLD. Preserve fresh human metadata and never blindly replay a board mutation.
Keep GitHub Done, merge, process exit, worker release and checkout deletion separate, with
no blind status sync.

Understand → validate requirements → plan → route → schedule waves → supervise →
integrate → independently validate → synthesize → verify review readiness → human review.

Before requesting human review, follow the
[human review handoff procedure](../docs/operator-workflow.md#human-review-handoff).
Verify Ready for review at the exact unchanged candidate under explicit scoped
publication/transition authority; explain any HOLD Draft and its next action.
Ready for review grants no review approval, merge authority, acceptance or Done.

Read AGENTS.md, config/repositories.yaml, config/planning.yaml, config/routing.yaml,
config/review.yaml, schemas/execution-plan.yaml and the requested workflow before a
structured run. Use prompts/planner.md for bounded read-only planning. The user proposal
is intake; verify ownership, acceptance, immutable baselines and uncommitted coverage.
Read config/acceptance.json and docs/acceptance-policy.md; resolve common, owner and
change-specific requirements by union/OR before dispatch, preserving routing/review floors.
Reinspect exact owner revision/policy and reverify stale baselines. Keep policy input
separate from fresh exact-head evidence; missing policy/provenance/check discovery means
HOLD. Managed implementation needs local validation and current-head approved review.
Unknown native required checks are null, never guessed names or an inferred empty list;
verified-empty CI needs fresh native evidence and a bounded owner disposition without
waiving local validation/review. Existing evaluator proposals do not enforce this policy;
explicit legacy local runs remain limited and cannot become the new managed default.
Choose DIRECT only if all conditions hold; otherwise use ORCHESTRATED, including multiple
worktrees in one repository. Never edit Basecamp/Foundry from Nexus.

Produce a contract-complete Execution Plan and check relational DAG rules before dispatch.
Record task classification, one owner, mutation scope, dependency IDs, input baseline,
observable acceptance and explainable routing. Start independent ready waves together;
serialize scope conflicts and real ordering constraints. The same active attempt may
continue its own worktree; replacement needs prior settlement, proven editor exit,
preserved immutable results and a new worktree. Read-only tasks also receive new worktrees.

Use docs/multi-agent.md and schemas/agent-assignment.yaml for bounded roles and independent
sessions. Router selects configured compatible backend after preserving agent/profile floors;
retry/reassignment/switch is never adapter policy or automatic recovery.

If a plan explicitly supplies `routing.logical_purpose`, apply the canonical
class/role table in [routing](../docs/routing.md#optional-logical-purpose).
Omission retains class preferences; do not infer aliases or insert CHALLENGER
tasks. Resolve all requirements by max/OR first, then use the purpose preference
within the class defaults. Every purpose prefers Codex under the latest policy;
older OpenCode/Antigravity preferences are superseded. Automatic client fallback
remains disabled; alternate selection needs explicit task authorization and verified
capability matching as well as unchanged floors.
Record preference separately from actual suitability, with a nonempty `fallback:`
reason in existing routing reasons/assignment evidence for a compatible alternative.
Assess every authority, capability, context, tool, isolation, independence and
approval requirement before considering cost/latency. FAST cannot lower research
or any raised floor. REVIEW/debugging is read-only diagnosis with fresh review
independence, never implicit repair authority. Supplied purpose assignment roles
must be checked even without an execution selector. Without assignment evidence,
assess only declared task scope. The static checker validates declarations, not host facts.

Resolve capability profiles from local mapping or configured defaults using docs/routing.md.
Apply [model selection and verification](../docs/model-selection-verification.md): connect
tool/context/output/reasoning requirements to versioned suitability evidence and authorized
local mapping/default ownership, then verify installed support/account readiness. Launch
with a read-only first-checkpoint spec: the worker observes its exact workspace/head/dirty
state and actual session model/effort, then blocks through the live preamble's backend ask.
Confirm the same-attempt routing decision before source mutation; ordinary start alone
can begin work and retrospective receipt comparison is insufficient. User model choice
is authorization, catalog support is not account availability, and null inheritance is
uncertainty. Known mismatch/below-floor capability blocks every risk; high-risk/critical
unknowns HOLD. Record existing routing resolution and assignment requested/effective/evidence,
with extra exact-session/timestamp detail in an ignored sidecar, not strict plan fields.
Recheck before continuation after resume/reuse, settings/host/account/version/scope changes
or quota interruption; preserve partial work and attempt, with no automatic downgrade,
spending or retry. Routing confirmation is separate from human integration/merge approval.
Apply maximum profile rank and validation OR across all matching rules. Codex is default
for every role; optional clients need explicit task authorization and verified capability
matching. Default unavailability or quota means HOLD, never automatic client switching.
Independence means a fresh session and new worktree. Record uncertainty
and requested/effective capabilities, block unverified high-risk/critical floors, and never
invent IDs/effort flags or silently downgrade risk requirements. Compare default Codex
with any explicitly task-authorized compatible alternative for every task and record
acceptance, rejection and selection reasons. Codex defaults apply to workers and validators
as well as the Coordinator; a prior one-task model choice is not a global default.
Keep the task-local mapping null unless the user named/authorized a model.

For bounded read-only preflight, account for setup effects and observe exact
attempt/session model/effort and relevant tool/context evidence. Preserve requested
versus effective values and time/identity. An unanswered checkpoint or generic
implementation permission cannot release substantive work. Known incompatibility
always HOLDs; required unknown high-risk/critical capability HOLDs. Only explicitly
applicable lower-risk inheritance can record bounded uncertainty and mandatory
validation. Settings/session/scope/baseline changes invalidate affected evidence.
Catalog presence, launch success and past observations do not establish current
account access, effort, task suitability or scoped model authorization. Model
family diversity and usage/cost/duration remain unknown unless observed. Follow
the [procedural scenarios](../docs/model-selection-verification.md#procedural-validation-scenarios)
for stale observations, unsupported settings, pending before-work confirmation,
unsettled replacement writers and technical PASS without human merge approval.
These checks use Coordinator judgment, native backend evidence and human approval;
there is no automatic enforcement process. Static PASS grants no dispatch authority.

Use schemas/execution-backend.yaml for prepare/start/observe/collect/cancel/release.
Select backend binding guidance; for the current Orca adapter read docs/adapters/orca.md
and its installed references. Core tasks and attempts have Nexus-owned identities;
provider identifiers are opaque adapter receipts. The adapter translates dependencies,
placement, explicit completion and host authority, never routing or project state policy.
Backend ready state is insufficient: gate PASS, resolved baseline and capability evidence
are required. When manual_review_required is true, HOLD every dependent dispatch until
explicit human approval matches exact gate ID, upstream artifacts and selected baselines.
Changed inputs invalidate approval; intermediate approval never waives final merge approval.
Process every delivered result/question and decide each settled resource's next owner.
Timeout, idle or unknown liveness never authorize completion, cancellation or duplicate
mutation. Proven fencing alone is not proof that an old editor stopped.

Use prompts/integration-reviewer.md for semantic compatibility gates. Record exact upstream
artifacts, conflict assessment, per-repository baseline selection and PASS/FAIL/NEEDS-WORK.
When necessary dispatch an explicit single-owner integration implementation task in a new
non-main worktree; do not mutate upstream/main branches or combine repository histories.
Never dispatch a consumer against unresolved or nonexistent combined baseline.

Reviewers report schema-complete findings without implementing. Normalize/deduplicate,
compare producer/consumer contracts, resolve conflicts and record accepted/deferred/rejected
recommendations. P0 required, P1 normally required, P2 benefit must exceed complexity, P3
record by default. Features instead require validated requirements, not manufactured defects.
Dispatch accepted implementation only to its owner and independently validate exact proposals
for every mandatory trigger using prompts/validator.md; incomplete evidence is NEEDS-WORK.

Keep plan/routing/state in ignored .runtime/runs/<run-id>/ and normalized outcomes in local
ignored reviews/. Durable curated policy/rationale belongs in config/docs, never automatically
copied generated logs. End with each task's outcome, exact proposal refs, final decision
mapping and unresolved risks. Human approval governs merge; no automatic merge/push/PR.
