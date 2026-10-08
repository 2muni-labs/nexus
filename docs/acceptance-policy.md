# Repository acceptance policy

[config/acceptance.json](../config/acceptance.json) version 1 is declarative policy
input for the Coordinator. It defines requirements, not observed evidence, executable
commands, a policy engine or automatic dispatch. Existing routing/review rules and
[review principles](review-principles.md) remain authoritative. Nexus governs scheduling
and decisions; each repository's technical owner supplies change-specific acceptance.
GitHub owns native review, check and merge facts; the backend owns factual attempt
observations. An adapter choice or board/card state never chooses acceptance policy.

## Resolve before dispatch

Read the policy and the owning repository's instructions at its exact assigned revision.
Record policy revision, owner revision, task classification, resolved requirements and
their sources in the Execution Plan/ignored run evidence. The inspected revisions below
are source provenance, not permission to assume future checkouts have the same contract.
Reinspect policy and native commands before each dispatch; reverify stale baselines.
Missing policy, ownership, classification or provenance means HOLD.

Take the union of all matching common, repository, classification, routing, review and
owner-supplied change-specific requirements. Combine required flags by logical OR and
routing profile floors by maximum matching rank. Record scope-based applicability and
the technical owner's meaningful test plan; no suite means a plan is required, never
permission to invent a test target or skip local acceptance. Human pause, cancel, resume,
reprioritization, reassignment and review overrides remain valid controls but cannot erase
mandatory validation, capability, review or evidence floors. Record contradictions and
HOLD rather than interpreting an override as a waiver.

## Common acceptance and authority

Managed implementation always requires local validation and an approved review bound
to the current candidate head with authoritative review evidence. Independent validation
is additional: a fresh session distinct from the implementer is mandatory for P0/P1,
high risk, critical complexity, architecture tasks or architecture-sensitive changes,
mutable integration with multiple distinct mutable upstream inputs (including inputs
carried through gates), and any matching routing/task-class requirement. Apply
[routing](../config/routing.yaml) and [review](../config/review.yaml) monotonically.
P2 remains risk-based and P3 record-only by default; neither cancels another trigger.
A compatible validator from the same agent family is permitted.

Local checks record commands, outcomes, scope, environment and evidence references at
the exact candidate head. Before a commit, a frozen full patch digest is acceptable
proposal provenance only with a verified mapping to the eventual head; it cannot stand
in for unrelated head evidence. Any candidate change invalidates affected validation,
review and approval evidence; revalidate the final head, recording any justified reuse
of unchanged checks with exact provenance. Missing validation evidence is NEEDS-WORK,
not PASS, and holds acceptance.

Before accepting implementation, observe complete current-head review/check facts,
the exact approved candidate and actual merge facts. Main integration, merge and
publication require explicit human authorization for the exact reviewed candidate and
stated operation; implementation instructions or validation PASS supply none of these.
Merge alone is insufficient: Done requires observed authorized merge and acceptance,
plus authoritative attempt settlement and editor exit. Non-code work requires an exact
accepted disposition. Idle, success cards, fencing or cancellation requests do not prove
settlement or exit. Worktree deletion retains its separate human approval boundary under
[worktree lifecycle](worktree-lifecycle.md).

## Native CI discovery: unknown versus empty

Each repository's `native_required_checks` is initially `null`: unresolved names, not
an empty list and not a claim that native protection exists. Obtain fresh native evidence
for the exact repository, target branch and applicable protection/ruleset context.
Record discovery source, time, scope, completeness and resolved names separately from
policy; missing access, absent workflow files or incomplete discovery means HOLD.
Never fabricate a CI name or turn unknown requirements into `[]`.

An empty resolved list is permitted only when fresh complete native evidence verifies
no required CI and the owning repository gives an explicit bounded disposition naming
the change/head, target branch, evidence, scope and validity/reverification trigger.
This acknowledges absence of native required CI; it waives neither local validation,
managed implementation review, mandatory independent validation nor human merge approval.
When checks are required, every resolved name needs a complete authoritative passing
observation bound to the current PR head. Changed head, branch or native rules require
rediscovery/reverification; missing, stale, pending or failing evidence blocks acceptance.

## Repository local acceptance

These are inspected native contracts, not a Nexus cross-repository execution script.
Run applicable checks only in the owning repository's authorized context.

| Owner / inspected revision | Native acceptance and scope | Limits / owner plan |
| --- | --- | --- |
| Nexus / `9954ba02efb729b6d9bfceeaa0307708ef10cde1` | `bash tests/run.sh` runs structural/shell checks and the offline suite; inspect affected documentation and links for acceptance. | Technical owner supplies change-specific acceptance; structural validation alone does not establish policy semantics. |
| Basecamp / `9eae3c7721443a4e55a3cd61b395db917e26540d` | Makefile/README define `/usr/bin/make doctor` as read-only installed-host readiness. Check affected shell/Makefile/dotfile syntax with actual interpreters/formats and meaningful controlled mocks/reproduction. | No standard test target. Doctor verifies binaries/versions, not authentication or account eligibility. Never automatically use `bootstrap`, `install`, `update`, `link` or `macos` as tests. Owner feature test plan is required. |
| Foundry / `a9697df5cead83f4272aa6ec4aeed1bc368244ed` | AGENTS/README/Makefile/wrapper provide no standard test/verify Make target. Use `sh -n scripts/compose`; validate affected configuration through the inspected wrapper (at this revision, `./scripts/compose config --quiet`). | Owner feature test plan is required. Runtime/isolation smoke tests need a meaningful change and explicit scope/authorization for contained resources. Never bypass the wrapper, use global down/prune, or mount host credentials/whole home. |

For Basecamp, inspect Make recipes and controlled expansions rather than assuming shell
syntax checks validate Make syntax. A readiness failure must be classified and reported;
do not install or repair the host as an implicit validation step. For Foundry, record
the exact wrapper, worktree/project identity and resources before runtime testing;
cleanup is restricted to those authorized resources. Configuration validation is not
proof of runtime isolation. No owner source is copied into Nexus or mutated from here.

## Evidence and current implementation limit

Keep policy input separate from observations: resolved requirements/policy provenance,
local validation and independent-session results, native discovery/current-head review
and checks, exact human approval, observed merge, and backend settlement each need their
own factual references. Store private reports in ignored `reviews/`, run evidence in
ignored `.runtime/`; external recovery records still require exact publication authority.

This policy does not add a collector, association mechanism or evaluator integration.
The Coordinator must enforce the requirements before accepting existing script proposals.
The current workflow evaluator rejects empty required-check arrays; a verified-empty
disposition must remain a visible HOLD in that evaluator rather than inventing a check
or claiming automatic support. Policy approval alone cannot override missing facts.

Explicit pre-existing local/manual runs may continue only when labeled legacy and limited,
with their exact scope and missing evidence recorded. Existing omission-compatible snapshot
behavior does not certify that review or CI is unnecessary, does not establish managed
acceptance or external recovery, and is never the default for a new managed run. No policy
omission grants dispatch, merge, publication or Done authority.
