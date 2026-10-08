# Durable work and execution associations

[The version 1 declarative contract](../schemas/work-association.yaml) describes
sanitized association claims linking canonical Work Item and stable Nexus task/attempt identities
to the canonical GitHub Issue, backend receipts, exact source artifacts and PRs.
It extends the association descriptions in the
[Work Item provider contract](../schemas/work-item-provider.yaml); it adds no parser,
database, event sourcing, automatic publisher, dispatcher or project progress store.
GitHub owns project state; Nexus owns workflow decisions; the backend owns execution
observations. A record's `phase` describes evidence completeness, not workflow status.

## Record identity and evidence

`work.id` is the canonical GitHub Issue URL, equal to `work.issue_url`, under the existing
Work Item provider contract; there is no second primary Nexus work identity. `task_id`
and each attempt `id` are stable Nexus identities, distinct from native backend IDs.
Preserve Work Item/task identity through
retries or backend changes. Bind the Issue's canonical repository, positive number and
URL to exactly one logical owner. Keep the source repository separately, including a
verified fork when applicable. Record branch, exact commit head and immutable artifact
revision or full patch digest. A precommit digest needs a verified mapping to the eventual
head before acceptance; a branch name alone never identifies the reviewed artifact.

Each known attempt and PR appears once in its inventory. Selected pointers identify
one attempt and one canonical PR, with its exact head, when known; null means none
known, never omission of a known pointer. Record prior associations and explicit
supersession references so selection and corrections remain inspectable. Split work
only with recorded reasons and links under the existing default cardinality policy.

Policy repository/revision and resolved requirements provenance remain separate from
validation and current-head review evidence. Validation records bind attempt, head,
artifact, actual commands/results and sanitized evidence references. Record implementer
and validator session references and verify distinct sessions when independence is
required; `independent: true` alone proves nothing. Apply all
[acceptance requirements](acceptance-policy.md), including native check discovery and
current-head results, before accepting an implementation. Unknown required CI is null
and HOLD, never an inferred empty set.

Human decisions reference the exact real decision, verified author and repository-specific
permission evidence. Scope includes operation, canonical target and exact artifact
revision/digest; a gate decision also names its gate and upstream inputs/baselines.
Publication, intermediate gate release, final merge/main integration and checkout deletion
are separate operations. None can be inferred from another decision or validation PASS.
A local-only approval receipt cannot become durable approval after local loss without an
independently verifiable real external human-decision source. If that source cannot be
verified, HOLD; a nonempty reference string cannot manufacture it.

## Completeness by phase

| Phase | Required facts and limits |
| --- | --- |
| planned | Identity and policy provenance; attempt/PR inventories may be empty and unknown facts null. Incomplete records cannot satisfy acceptance or recovery. |
| running | Known attempt identities, verified path-free backend receipt references and source repository/branch. Unknown head/artifact or outcomes remain explicit; observe current backend/Git facts before any recovery action. |
| result | Selected exact artifact/head, explicit authoritative outcome, settlement and editor exit, applicable local/independent validation and source/PR crosschecks. Worker completion still supplies neither acceptance nor Done. |
| accepted | Result facts plus complete applicable acceptance evidence, fresh current-head review/CI, exact human decisions and observed authorized merge for implementation, or explicit accepted disposition for non-code work. Other attempts/PRs require evidenced settlement/disposition. |

No phase label proves facts. Even a complete accepted record requires fresh cross-system
identity, revision and backend observations before recovery or an operation. Claims about
liveness cannot substitute for authoritative backend inspection. Fencing, idle, cancellation
and contact loss never prove editor exit. Branch/worktree relationships resolve through
Git and backend facts, never assumed directory layouts. Core policy treats adapter metadata
as opaque; only a verified adapter may resolve path-free Dispatch/instance references.

## Current storage and manual trust procedure

Human-reviewed Issue comments are the current storage option, using the existing
`association-comment` operation described in the [GitHub binding](adapters/github.md).
The Coordinator prepares the exact target/body/operation plan with the canonical Issue
number and expected update timestamp. Application requires its matching plan digest and
real human publication approval. The adapter appends `<!-- nexus-operation:OPERATION_ID -->`;
the marker is operation identity, not author permission or semantic acceptance.

Before trusting a comment, the Coordinator must manually:

1. Read the canonical Issue and every page of association comments, attempts and PRs.
   Verify the comment URL/ID/target, supported version, operation marker and exact payload.
   Empty lists, transferred Issues or aliases cannot establish the old target's identity.
2. Verify the actual comment author's canonical identity and repository-specific authority
   with permission evidence under the applicable policy. GitHub `author_association`
   (even OWNER or MEMBER) and a boolean `approved` alone are insufficient. The current
   association read exposes author metadata, but does not certify authorized authors.
3. Independently verify every relied-on real human decision and its exact operation/artifact
   scope, including publication of this record. Approval of implementation does not approve
   publication. A local plan digest binds content but cannot establish external authority.
4. Resolve prior/superseding records and selected pointers against complete inventories.
   Crosscheck work/task/attempt IDs, source and PR repository/branch/head, artifact mapping,
   policy, current reviews/validation and authoritative backend observations.
5. HOLD on contradictory IDs, multiple selections, missing known pointers, stale head/review/
   validation, unverifiable author/decision or unresolved supersession. Preserve records;
   never guess from the newest comment. Feed only verified normalized observations to
   [reconciliation](reconciliation.md); association JSON is not reconciliation input itself.

On ambiguous publication, preserve the exact plan and inspect the operation marker across
all pages. Reuse only a uniquely matching content/target result under the existing identity
and approval checks; conflicting markers require reconciliation, never blind replay.
Timestamp checks are not atomic CAS: retain one Coordinator writer per Work Item.
Correct a bad record with a separately exact-reviewed, authorized superseding comment
referencing the precise prior comment/record and corrected selection/evidence. Preserve
history. Cyclic, branching or contradictory supersession remains HOLD until an explicit
verified resolution covers all conflicts; comment order/time is not a resolution rule.

## Privacy, example and current limits

Publish only reviewed sanitized metadata. Exclude secrets, credentials, transcripts,
private reports, absolute host paths and raw Orca worktree IDs embedding paths. Keep host
paths and private evidence local. Publish opaque path-free receipt references only where
the verified adapter can resolve them; if resolution depends solely on lost local mappings,
state the recovery limit rather than asserting external recoverability. A private report
path alone cannot establish a durable decision or accepted validation after local loss.

[The example JSON](../schemas/examples/work-association.json) is explicitly illustrative,
non-dispatchable and non-recoverable: all references are placeholders, no external records
or approvals are asserted. Its running phase intentionally lacks completion evidence.
It is neither a provider write request nor a live managed run.

Current tools verify provider target/marker mechanics and evaluate already-normalized
snapshots. They do not parse this contract or automatically verify semantic identity,
author permissions, decisions, supersession, acceptance or live disaster recovery.
Those checks remain manual Coordinator obligations. Pre-existing local maintenance
preparation without published verified associations cannot claim external recovery or
Done; it cannot supply a permissive default for new managed work.
