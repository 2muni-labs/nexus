# Weekly review

Use docs/review-principles.md for all review/confirmation gates, including self-review
of findings and the six-section final review summary. Preserve role-specific outcomes.

Read AGENTS, all four config policies, plan contract and Coordinator prompt. This is
ORCHESTRATED cross-repository reasoning; review is read-only. Use `weekly-review.sh` for
preflight/context only. Prepare the review DAG through the selected ExecutionBackend after validating the scope.
Use schemas/agent-assignment.yaml and docs/multi-agent.md; backend-native dependency and
lifecycle details belong to its binding.

## Wave 1 — Independent reviews

Review Basecamp and Foundry in parallel with their prompts. Record immutable revisions,
checks, included/excluded dirty state, limitations and producer/consumer contracts. Safe
read-only contexts can be reused; never share a context undergoing concurrent mutation.

## Wave 2 — Synthesis and contract review

Normalize findings to review schema; remove duplicates and identify conflicts. Compare
host/runtime assumptions using integration-reviewer. Every cross-repository finding has
one owner, affected repository, contract and evidence. Classify P0–P3 without promoting
stylistic preference into defects. No review task implements its findings.

## Decision gate

P0: implementation required. P1: normally required. P2: benefit must clearly exceed added
complexity. P3: record only by default. Record accepted/deferred/rejected rationale and
unresolved assumptions. Only concrete accepted findings produce implementation tasks.

## Wave 3 — Accepted implementation

Replan accepted findings as bounded single-owner tasks, each with an isolated worktree,
immutable base, scope and acceptance criteria. Parallelize independent work, serialize
conflicts. Resolve agent/profile/effort with compatible fallback; preserve capability floors.
Parallel mutation requires an integration gate before dependent work; combined baselines
need a separately scoped integration task and independent validation. Manual-review gates
HOLD all dependents until explicit human approval matches exact gate/input/baseline scope;
changed inputs invalidate approval. This does not replace final merge approval. Cross-repository
producer/consumer dependencies need explicit compatibility and baseline decisions.

## Wave 4 — Validation and human decision

P0/P1, high-risk, critical-complexity, architecture-sensitive and multi-upstream integration
changes require independent validation. P2 is risk-based. Validator returns PASS, FAIL or
NEEDS-WORK against the exact candidate; corrections are new tasks. Humans inspect final
diffs and authorize exact merge through the selected execution environment. Nexus never merges automatically.

Use ignored `reviews/<ISO-week-year>/W<week>/` for normalized summaries and repository /
integration findings, using the tracked template. Runtime plan/routing/gates stay in
`.runtime/runs/<run-id>/`. Record evidence, counts, decisions, validation and unresolved
risks; no full transcripts or automatic promotion to Git history.

## Completed worktrees

Apply docs/worktree-lifecycle.md after final disposition. Release settled workers
without deleting their checkout. Preserve upstream worktrees through integration
and required validation. Deletion is a separate human-authorized operation after
all eligibility checks; record per-worktree cleanup evidence outside deletion targets.

At instruction intake, reconcile relevant previously retained workspaces. At closure,
perform already authorized eligible removals after final disposition and before the
final report; otherwise report retention/HOLD and the next trigger. Result delivery
while awaiting human review does not close the workspace lifecycle. Follow-up messages
continue the objective unless they explicitly replace it; new instructions do not
implicitly authorize deletion of prior work.
