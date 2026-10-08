# Flat Nexus / GitHub / Orca operating model

GitHub owns durable project records. Nexus owns workflow and orchestration policy.
Orca owns execution environments and factual execution observations. Humans own final
acceptance, merge and separate exact checkout-deletion decisions. These are peer boundaries;
Nexus coordination is not an ownership hierarchy or a replacement authority for either system.

## Responsibilities and interfaces

```text
GitHub  <---- work observation / exact-authorized record updates ----> Nexus
  ^                                                                  ^
  | Git / PR links and execution results                              |
  +-------------------------- Orca ----------------------------------+
                              execution requests / observations
```

| Concern | GitHub | Nexus | Orca |
| --- | --- | --- | --- |
| Work | Issues, requirements, relationships | Interpret, decompose and plan | Execute the assigned scope |
| Priority / dependencies | Durable project intent | Determine eligibility and ready waves | Carry authorized execution dependencies |
| Assignment | Accountable project assignee | Select agent/model/backend and floors | Execute exact assignment; report effective receipt |
| State | Canonical visible lifecycle | Decide transitions and acceptance | Report actual attempts and resource state |
| Validation | Run CI; record PR checks, reviews and integration | Define checks, independent validation and acceptance | Provide local tests and separate agent sessions |
| Completion | Preserve merge/accepted disposition history | Verify exact acceptance and prepare state update | Deliver explicit outcome and artifacts |

Policy depends on provider-neutral contracts. GitHub and Orca APIs/native identifiers stay
in adapters. The Coordinator performs explicit operations; this model adds no runtime,
scheduler, retry engine, database, worktree manager or agent subprocess framework.
Orca can invoke Git/PR assistance for an exactly authorized task; doing so does not grant
workflow ownership or implicit publication authority. One Coordinator writer per Work Item.

Orca prepares/uses the selected execution environment; Basecamp still owns host provisioning,
PATH/tools/agent prerequisites and Foundry owns project-local runtime, containers and setup
contracts. Current Mac execution-host / Windows operator-client placement is deployment
configuration, not an OS constraint on core policy. Avoid duplicate runtime/credentials.

## State, identity and retention

GitHub's canonical Workflow field uses Backlog, Ready, In Progress, Blocked, Review, Done.
Blocked remains a visible state; it does not rewrite or discard the backend's actual state.
Review means an existing PR and accepted exact candidate await review/integration; backend
success alone supplies neither Review readiness nor Done. Non-code work uses explicit
accepted exact-artifact disposition instead of fabricating a PR/merge.

Work Item identity remains the canonical GitHub Issue URL. Task, Execution and Assignment
have stable Nexus identities; native workspace/task/dispatch IDs are opaque adapter refs.
PRs bind by canonical URL and exact head. Record requested versus verified effective models.
Default: one Issue / Work Item / mutable worktree / PR. Internal Tasks and sequential attempts
may share Work Item identity. Independently mutable/reviewable scopes use linked child Issues
and separate owner/repository/worktree/diffs. Independent reviewers use fresh read-only sessions.
GitHub assignee is project accountability, not an agent-routing instruction.

| Location | Information |
| --- | --- |
| GitHub | Requirements, priority, project relationships/status, PR/CI/review/acceptance history and reviewed minimal recovery associations/decision references |
| Nexus local | Plans, detailed routing evidence, snapshots, diagnostics, caches and private reviews; not authoritative project state |
| Orca/backend | Environments, attempts, sessions, outcomes, resources and recovery observations |

Recovery-critical Issue/task/attempt/PR/head/validation/approval associations must survive
local loss externally before claiming operational recovery. Verify author, freshness and
exact decision scope; comments are not automatically authority. Publish only sanitized
reviewed references; credentials, host paths, raw transcripts and private reports stay private.
Execution state is transient relative to project history; needed backend recovery records
are not disposable merely because the current card is completed.

## Execution board and controls

Orca board is an execution observation/control surface, not another backlog or roadmap.
A workspace can carry sequential implementation/remediation/review attempts and remain
retained after their completion. Card state alone proves neither process exit nor acceptance.
Never blindly synchronize board columns with GitHub status in either direction.

Recommended card context: Issue/PR links, repository/branch, current Task/Execution/agent,
execution or input-wait/failure/unknown observations, result/validation references and retained
environment reason/next action. GitHub lifecycle is read-only contextual display, not another
editable authority. These are information requirements, not claims of installed UI support;
native column names/events must be checked against the installed Orca version.

Terminal/diff/result inspection and Issue/PR navigation are observational controls. Retry,
reassignment, review/validation and cancellation are scoped requests through normal Nexus
policy and verified backend authority. A card drag does not itself supply exact operation
authorization. Merge and checkout/branch deletion keep separate human decisions. In Review
on a board may mean execution-result inspection; distinguish it from GitHub PR review.

## Lifecycle and recovery

Observe Issue/Project intent → verify requirements/owner/dependencies/baseline → route
agent/backend/validation → exact-authorized prepare/start → collect explicit result →
validate exact candidate → separately authorized PR publication → CI/independent review →
human-approved merge → verify exact acceptance and settlement → GitHub Done.

For code work, Done requires observed authorized merge, exact candidate validation,
configured required checks and reviews, plus settlement of related activity. GitHub records
these facts; Nexus decides whether they meet policy. Missing evidence is HOLD, never PASS.
Local tests and independent acceptance cannot be replaced merely by a passing CI badge.

Current-head failure/review feedback returns to bounded remediation under the same Issue.
Retry/reassignment/backend switch needs a concrete cause, finite budget, prior settlement,
proven editor exit and renewed placement/capability/gate evidence. Fencing is not process
death. Timeout, idle, absent card or lost contact cannot prove completion or authorize a
replacement editor. Preserve resources/evidence under unknown liveness.

Recover by Observe → Verify → Compare → Propose minimal action → Authorized operation →
Reobserve. Read GitHub, durable associations, actual backend attempts and applicable Git refs.
GitHub alone reconstructs high-level project intent, not unreachable processes' liveness.
Known PRs prevent blind redispatch. Missing/conflicting associations and stale approval HOLD.
Local cache-loss scenarios use separate temporary contexts, never deletion of retained evidence.

Release settled worker resources independently from checkout disposition. Retain checkouts
until exact separately approved deletion satisfies docs/worktree-lifecycle.md: settled activity,
final disposition, preserved data/evidence, no consumers and exact identity. Merge is not deletion
approval; no age-based cleanup or deletion-as-cancellation.

## First application and acceptance

Project membership is the first executable addition: `scripts/projects.sh item-add` prepares
an exact target plan, applies only with exact approval, no-ops existing membership and
reobserves after one write. It does not set status/priority, create Issues or start execution.
Existing field-update operations remain separate. See [membership procedure](github-projects.md).

Offline acceptance covers new/repeated membership, wrong Issue/repository, identity changes,
missing approval, paginated/partial/conflicting inventories, unknown transport/GraphQL responses
and contradictory or unobserved results. Existing workflow/reconciliation tests cover opaque
metadata/state independence, success-not-Done, exact-head acceptance, duplicate prevention,
unknown liveness and cache-free decisions. Real worker/board/cancel/PR/merge/recovery behavior
still needs approved operational conformance; fixtures do not certify installed UI or agents.

Overall assessment: preserve peer ownership and reuse current ports/pure policy.
Blocking issues: unknown authority/capability/liveness holds an operation.
Recommended changes: membership first, then approved real-work lifecycle observations.
Accepted as-is: isolation, independent validation, external authority and final human merge.
Deferred / optional: second backend, automated runtime and competing state stores.
Remaining uncertainty: live board controls and complete operational recovery are unverified.
