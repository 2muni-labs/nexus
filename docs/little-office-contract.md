# Little-office v1 boundary

Little-office is a separate personal web product registered in
[repositories](../config/repositories.yaml). It owns the TypeScript/Vite office UI,
loopback Node server, single-admin authentication, private-network HTTPS integration,
bounded observation presentation, request bridge and minimal durable operation receipts.
This change defines an interface, not an installed service or working control bridge.
The existing [prototype](../prototype/README.md), including its 3D work, stays intact;
future product migration needs its own exact source baseline and isolated owner task.

GitHub owns Issues, PRs, Projects, checks and merge history. Nexus owns requirements,
plans, routing, gates and acceptance decisions. Orca owns workspaces, sessions,
attempts and execution mechanics. Basecamp owns host prerequisites; Foundry owns
project-local runtime/container contracts. Nexus gains no web server, database,
scheduler, automatic dispatcher, polling daemon or agent runtime. Product receipts
are transport/accounting evidence, never a second project backlog or workflow store.
See the [operating model](operating-model.md) and
[declarative wire contract](../schemas/little-office.yaml).

## Observation and binding

The product explicitly selects repositories, canonical Work Item URLs and backend
resources through inspected adapters. No whole-host/inbox/transcript search fallback.
V1 reads are bounded by the schema, with per-source timestamps, provenance,
completeness and errors; partial, stale, conflicting and unavailable stay visible.
An empty successful read is distinct from an unknown inventory. GitHub workflow,
execution outcome, agent liveness, PTY state, retention and acceptance remain separate.
No UI animation, idle indicator, delivery receipt or Completed card proves execution,
Done, exit, release or deletion eligibility. Browser aliases are presentation-only;
native identity is opaque and privately resolved/verified by adapters.

A human manually starts the Nexus Coordinator and explicitly binds the product to
that live terminal session, host/runtime instance and Run. Binding records one inbox
consumer, allowed repository/Work Item scope and a generation that changes on replacement
or rebind. Verify these and terminal process incarnation before delivery and every effect.
Product code must never consume/acknowledge the Coordinator's Run inbox, impersonate a
worker/Coordinator sender or start/restart a Coordinator. Missing, expired, changed or
unverifiable binding disables controls and records HOLD. Rebind requires explicit human
action, fresh observation and reconciliation of pending operations. An old Run or a
terminal in a workspace proves no active owner. Recorded consumer generation alone
provides no exclusive lock; the human/Coordinator must establish one consumer.

V1's candidate transport is documented `terminal send` to the exact configured,
already-running terminal Coordinator, with a fixed validated envelope as literal data.
It needs no invented `--from` identity. Resolve the executable once; use fixed argv,
never shell interpolation or arbitrary input/recipient/flags from HTTP. Verify the
terminal still hosts the intended Coordinator, rather than a shell or permission prompt;
uncertainty disables sending. Do not use `orchestration send` from a Node service by
borrowing a terminal handle: no unambiguous service mailbox identity was established.
Structured-chat-only Coordinators are unsupported in this path. Terminal submission is
not processing acknowledgment. A product-owned private local receipt interface must
allow the active Coordinator to explicitly publish sanitized plan/question/outcome
records bound to the operation; no transcript scraping. That interface and the service's
actual delivery/receipt integration require separate product implementation and validation
before controls are enabled. There is no automatic Nexus relay or inbox consumer.
The private interface verifies the active Coordinator writer separately from browser
admin authentication; a client cannot mint Coordinator acknowledgments or PASS/APPROVED.
Browser receipt projections omit private native references and host/session identity.

## Four operations

All commands are authenticated single-admin requests, with server-side authorization,
origin/CSRF protection, bounded literal data and no shell/CLI text supplied by the browser.
The server resolves opaque browser references against its verified scope; arbitrary paths,
native handles, recipients, executable names and flags are forbidden. Reject unknown
versions/fields/types, duplicate keys, oversize data and scope or binding mismatches.

| Operation | Required meaning and precondition |
| --- | --- |
| `request` | Submit a bounded objective/constraints for intake against one logical owner and optional canonical Issue. It creates no worker, execution authority, Ready or Done claim. The Coordinator checks/reuses canonical work and proposes an exact plan under existing policy. |
| `approve-plan` | The authenticated human explicitly approves the displayed immutable plan digest and revision, Work Item/task, owner, exact base/candidate or input artifact map, operation scope and binding generation. The Coordinator rechecks identities, policy/capabilities and current revisions before action. Missing candidate is explicit null for initial work, never a wildcard. Changed inputs invalidate approval. This is scoped plan execution approval, never final merge/main integration, publication expansion or deletion approval. |
| `answer` | Answer one still-open question by its opaque question reference, question revision/digest, original request, allowed answer, Work Item/task and originating assignment/attempt plus binding generation. A Coordinator intake question explicitly has no worker assignment/attempt yet and binds to that Coordinator session. Revalidate it is unanswered and belongs to the same origin; stale, already answered or superseded questions cannot steer a successor. |
| `cancel-request` | Request withdrawal of a pending request or scoped cancellation of the exact task/attempt. The Coordinator verifies authority, races and backend capabilities; record requested/confirmed/unknown separately. Cancellation, fencing or sending an interrupt never proves process exit or authorizes another editor, release or checkout deletion. |

Approval and answer records bind the actual human identity and independently verifiable
decision reference, not a browser boolean or label. Preserve required intermediate human
gates and exact final merge boundaries. An answer cannot approve a plan implicitly.
Existing [acceptance policy](acceptance-policy.md) and capability floors still apply.
An unbound intake request, its answer and its withdrawal retain explicit null Issue/task
until canonical work is recorded; null cannot match an existing or successor task.
Never approve a truncated or unavailable plan; the displayed content must match its digest.

## Receipts and recovery

Before delivery, durably record a minimal operation ID, authenticated principal, exact
binding/target, canonical payload SHA256 and timestamp. Same principal + operation ID +
identical payload returns the existing receipt; reuse with different content is a conflict.
Serialize writes and deduplicate at both product and Coordinator effect boundary. The
active Coordinator records processing intent and the native operation reference before
an effect, then appends its factual outcome/evidence. A native send replay key is separate
from the product operation ID and must be preserved exactly, never synthesized.

Receipts append factual transitions: `recorded`, `delivered`, `accepted`, then `applied`
or `rejected`; uncertainty after a possible delivery/effect is `unknown`. A positive
Coordinator acknowledgment is required for `accepted`; enqueue/input acceptance is only
`delivered`. `applied` means the named operation's observed effect (for cancellation,
possibly only recording a cancellation request), never task success or acceptance.
Each transition has source/time/evidence and an explicit effect description. Rejection
must be proven before claiming no effect. Preserve history and private minimal receipt
data across server restart; keep recoverable workflow associations/decisions in authorized
GitHub records, without publishing credentials, transcripts, host paths or private reports.

On lost response, crash, binding change or unknown outcome, HOLD effects and reconcile
the original operation, native receipt, Git refs and GitHub/backend facts. Do not resubmit,
auto-retry or replace a possibly active attempt. A duplicate delivered message gets the
same Coordinator receipt, not another effect. If outcome cannot be proven, keep unknown
with an explicit human recovery action. Restart recovery never silently resumes execution.

## Installed Orca feasibility

Read-only discovery on local Orca **1.4.241** used `status --json`, `agent-context`,
version-matched `orca-cli`/`orchestration` guides, messaging reference and command help;
scoped live observations covered this contract task's own Run, Dispatch and terminal.
Reinspect on host/version/runtime changes. These facts do not certify another host or a
live product bridge, remote deployment, cancellation or browser controls.

| Native path | Observed/documented support and limit |
| --- | --- |
| `worktree show`, `reference find`, scoped `task-list` / `worker-list`, `worker-show` | Workspace/reference/attempt observations exist. Paginate and retain coverage/truncation; `linked:false` is no ownership evidence. Backend metadata must be normalized privately. |
| `run-show` | Exposes Coordinator handle and consumer generation. This identifies a recorded owner, not current agent liveness, sole active consumption or human-authorized web binding. |
| `orchestration send --to run:…` / `dispatch:…` | Durable enqueue and exact-attempt addressing exist; wake/nudge is best effort. Service-owned caller authority is unresolved; do not impersonate an existing sender. |
| `ask` / `reply --id` | Durable worker questions and replies exist; timed-out ask resumes the original message ID. Web human authentication, question revision checks and effect deduplication remain product/Coordinator obligations. |
| `check` | FIFO batch replay/ack exists; concurrent waits share a batch and reserve nothing. The product must not become another consumer; no exclusive-consumer lock is established by these primitives. |
| `terminal send`, `request-show` | Terminal prompt acceptance/submission/turn-start are separate; prompt retry binds exact payload/incarnation. Request inspection can report absent/pending/completed; absent is not proof of no effect. No control mutation was tested here. |

The installed command registry has no little-office plan-approval endpoint, authenticated
web handler, product-operation dedupe ledger, active-Coordinator binding handshake or web
question-answer contract. Advertised internal agent-session capabilities are not a documented
generic agent messaging CLI. Do not invent RPCs or parse transcripts to fill these gaps.
Before enabling controls, separately owned product work and an explicit active-Coordinator
procedure must demonstrate supported delivery, identity/binding, one consumer, receipts,
duplicate handling, exact approval/question checks and unknown recovery. Unsupported paths
stay disabled; no automatic dispatcher or generic framework compensates for a missing path.

## Acceptance

[Repository policy](../config/acceptance.json) is prospective for little-office: inspect
actual product instructions/test commands at its immutable baseline before product
dispatch. T1 checks formats, links, registry compatibility and contract scenarios; it
requires fresh independent exact-artifact validation. Product acceptance later exercises
auth rejection, unauthorized targets, stale binding/plan/question, duplicate/conflicting
IDs, partial reads, lost delivery/effect response, restart and cancellation races. Add
affected type/build/browser/mobile and private HTTPS checks when those components exist.
Little-office native required CI stays null until complete exact-target discovery and owner disposition;
neither this contract nor local checks claim readiness, merge acceptance or deployed controls.
