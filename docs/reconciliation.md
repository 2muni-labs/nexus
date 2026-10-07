# Restart recovery and reconciliation

Reconciliation is an explicit Coordinator workflow, not a daemon or a hidden local-state
store. `scripts/reconcile.sh external-snapshot.json` combines fresh normalized observations
and the same workflow decision policy. It proposes minimal actions; it cannot execute a
worker, publish a state transition, merge, cancel or clean up. `.runtime` and local caches
are never read by this evaluator and may be lost without changing its semantics.

## Observe before recovering

1. Inspect tracked policy, owning Git identity/remotes and installed provider/backend
   capabilities. Reconstruct a missing Project mapping from GitHub's repository-linked
   Projects; require a unique owner-specific canonical field/options. Missing or conflicting
   mappings hold work. Credentials stay in the provider's credential store.
2. Read the canonical Issue using `scripts/work-items.sh issue-read OWNER/REPO NUMBER`.
   Read all normalized PRs and association comments with `pr-list` and `association-read`;
   read current review/checks for the selected PR. Follow every page and record fresh sources.
3. Read the repository's canonical Project status/priority with `scripts/projects.sh read`.
   Treat human pause/cancel/assignment changes and reviewed durable association records as
   external intent; do not replace them with stale local plans.
4. Through the selected backend binding, inspect every associated attempt on its authoritative
   host/caller/server scope, plus applicable Git branches/worktrees/refs. Normalize observations
   using the execution port; require explicit outcomes and independently prove liveness.
   A missing native receipt is not proof that an editor has stopped. No automatic backend switch.
5. Build `schemas/reconciliation.yaml` input: complete source references, stable Work Item
   identity, normalized attempt/PR inventories, durable selected-attempt/PR pointers, exact
   current heads, reviewed approval scope, validation/check evidence and human controls.
   The Coordinator verifies freshness, provenance and authority before evaluating it.
6. Compare the proposed status/action with GitHub. If a change is needed, prepare the smallest
   exact-authorized provider/backend operation and reobserve its outcome. A proposal is not
   a completed transition. On write timeout inspect operation identity; never replay blindly.

Sources refer to actual external observations or verified Git artifacts, not placeholders,
local file names alone, fabricated approval booleans or unchecked agent reports. An externally
published sanitized association must survive local loss before a run claims GitHub recovery.
Association comments record Work Item/task/attempt/PR identities, artifact/head revisions,
backend receipt references, accepted validation and human decision scope; private reports,
raw transcripts, credentials and machine paths stay private. Verify authorized authors and
conflicting records; ambiguous comments/selection provenance HOLD. This evaluator consumes
already-verified normalized inputs; it does not parse arbitrary comments as authority.

## Conservative recovery decisions

Existing PR plus accepted exact-head validation and no active execution proposes Review,
never another implementation. Missing validation requests validation of that PR. A known
attempt or PR pointer missing from inventory holds work. Duplicate/conflicting identities,
unknown liveness/outcomes, multiple live editors, live residual old attempts and unsettled
prior attempts also hold. Every prior settlement needs its own authoritative evidence
reference; a bare settled flag cannot permit retry. Other associated PRs need observed
final disposition and evidence before the selected PR can complete the Work Item. A PR closed without merge needs explicit disposition/remediation;
Issue closure alone does not prove Done. Stale validation or check results cannot certify
a changed head. Lost approvals cannot be reconstructed by inference.

Pause/cancellation remain external controls. Fencing without process exit cannot authorize
conflicting mutation. A backend replacement preserves the Work Item ID and requires proven
prior settlement/exit, new placement/capability evidence, finite recovery decision and normal
gates. No automatic retries, new Issues or duplicate PRs are created by reconciliation.

A missing local capability mapping is reverified on the host; unknown required floors HOLD.
Missing GitHub permissions or host contact is a recorded blocker, never local fallback.
Legacy local-only runs explicitly lack durable external associations and cannot claim this
recovery property. The test suite demonstrates cache-free decisions, not live disaster
recovery for unpublished/legacy runs or automated startup synchronization.

## Scenario evidence

`tests/test_reconciliation.py` exercises fresh external snapshot recovery from an unrelated
working directory; conflicting fake local-cache data has no effect. Existing PRs, head-bound
validation, missing sources, absent pointers, unknown attempts, multiple live editors,
residual editors, human pause and closed/unmerged PRs are checked. Tests invoke no provider
or backend. Live association publication and remote outage/restore remain operational tests
requiring separately authorized real managed work, not fabricated production tasks.
