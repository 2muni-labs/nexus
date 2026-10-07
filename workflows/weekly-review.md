# Weekly review

Objective: assess host/runtime architecture and contracts with evidence, minimizing
unnecessary churn. Read the operating contract and all policies before execution.
Run `scripts/weekly-review.sh` for preflight and installed guidance. It only prepares
context; the Coordinator and Orca perform the workflow. Record exact reviewed revisions.

## Wave 1 — Independent repository reviews

Prefer parallel Basecamp and Foundry architecture reviews, both read-only, using their
reviewer prompts. Each task has one owner and isolated Orca worktree. Read the installed
placement reference; explicitly bind the repository and request isolated placement.
Use the configured primary agent or an available compatible fallback. Optional
secondaries are additional capabilities, never required prerequisites.

Require scope, checks, complete findings and producer/consumer inventories. Missing
reports or blocked placements remain outstanding; do not claim an empty successful review.

## Wave 2 — Coordinator synthesis

Normalize findings, remove duplicates while preserving evidence, compare assumptions,
detect cross-repository contract issues and classify P0–P3. Use
`prompts/integration-reviewer.md` with normalized outputs for additional read-only
integration review in Nexus; no worker needs to mount/edit both managed repositories.
Resolve conflicting claims or record uncertainty. Every contract finding has one
implementation owner. Separate multiple-owner fixes into independently scoped tasks.

## Decision gate

| Severity | Decision |
| --- | --- |
| P0 | Implementation required |
| P1 | Implementation normally required |
| P2 | Implement only when expected benefit clearly exceeds complexity |
| P3 | Record only by default |

Record accepted, deferred and rejected decisions with rationale and evidence. Avoid
architecture churn, preference-only fixes and speculative abstractions. Automatic
eligibility permits Coordinator dispatch, never automatic merge. A blocked required
fix remains an unresolved risk with a concrete blocker.

## Wave 3 — Implementation

One accepted finding → one owning repository → one isolated worktree → one implementation task.
Provide target/change/constraints/ownership/observable acceptance. Start independent
tasks in parallel when practical. Contract ordering is a real dependency; each change
must remain reviewable on its own with compatibility or staging requirements documented.
Require actual check outcomes and exact diff/revision references. Reviewers do not
implement their findings within their existing review tasks.

## Wave 4 — Validation

P0 and P1 changes require independent validation; P2 is risk-based, with the decision
recorded. Use `prompts/validator.md` in a separate session against the precise proposal.
Missing optional agents do not waive independence. Record PASS/FAIL/NEEDS-WORK; failed
validation returns to the Coordinator for a new bounded implementation task.

## Human gate and history

The user reviews each diff and approves merge in Orca. Nexus never automatically merges,
pushes or creates PRs. Account for dispatch settlement and cleanup using the installed
Orca contract before reporting completion; uncertainty never authorizes duplicate workers.

Store normalized history under the ISO week-year `reviews/YYYY/WNN/`: `summary.md`,
`basecamp.md`, `foundry.md`, `integration.md`. Use `reviews/_template/summary.md`.
Generated reports and patches remain local and ignored by Git; only review instructions
and templates are tracked. Do not force-add generated artifacts.
Keep evidence refs, decisions, validation and unresolved risks; exclude raw transcripts,
secrets and machine state. No review is performed merely by running the preparation script.
