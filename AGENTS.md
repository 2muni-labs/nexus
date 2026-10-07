# Nexus agent operating contract

## Invariant and boundaries

One task = one owner = one repository = one isolated worktree = one diff = one review decision.
The owner is exactly one logical repository. A read-only task may return no diff; it
still has one workspace, outcome, and review decision. Cross-repository analysis uses
normalized reviewer results; it grants no multi-repository write authority.

Nexus owns intent, repository metadata, policy, routing, prompts, workflows, normalized
findings, decisions, history, and lightweight operational scripts. Orca owns execution,
worktree creation/isolation, terminals, multi-agent execution, lifecycle, dispatch,
supervision, completion signalling, and recovery. Basecamp owns macOS provisioning,
MacPorts, packages, shell/PATH, developer tools, agent CLI prerequisites and host-side
dependencies consumed by Foundry. Foundry owns Docker/Compose runtime, bootstrap,
containers, project-local environments, worktree-safe runtime behavior and contracts.
Future repositories receive an explicit owner entry and bounded tasks.

## Coordinator SHALL

1. Understand the requested objective.
2. Determine repository ownership using `config/repositories.yaml`.
3. Decompose it into bounded tasks.
4. Identify independent tasks.
5. Prefer parallel waves for independent work.
6. Dispatch repository-specific tasks to isolated Orca workers.
7. Specify target, change/result, constraints, ownership, and observable completion criteria.
8. Require structured results, evidence, and explicit success/failure/blockers.
9. Normalize findings with stable IDs and the review schema.
10. Detect duplicates and conflicting findings; preserve evidence and resolution rationale.
11. Identify cross-repository contract violations and exactly one implementation owner per finding.
12. Decide which findings warrant implementation, recording accepted/deferred/rejected decisions.
13. Dispatch implementation only to its owning repository.
14. Separate implementation from independent validation when risk warrants it; require it for P0/P1.
15. Preserve human approval as the final merge gate in Orca.

## Coordinator SHALL NOT

1. Directly modify Basecamp from Nexus.
2. Directly modify Foundry from Nexus.
3. Assign multiple repositories to one implementation worker.
4. Combine review and implementation by default.
5. Create cross-repository commits.
6. Classify stylistic preferences as architectural defects.
7. Introduce speculative abstractions without a concrete problem.
8. Automatically merge changes.
9. Replace Orca functionality with Nexus-specific infrastructure.

The Coordinator is not an implementation worker. Nexus-local maintenance requested
directly by the user is performed by a Nexus implementation agent in the current
checkout when explicitly requested, as in initial v0.1 bootstrap. This exception
never permits managed-repository edits or shared implementation worker checkouts.

## Review, implementation, validation

Review tasks may read, analyze, compare, classify, and report. They are read-only
unless explicitly reassigned to a new task. A reviewer must never immediately
implement its own findings in the review task.

Implementation tasks may modify, test, document, and return a result/diff within one
owning repository. Normal transition:

```text
Review → Finding → Coordinator decision → Implementation task → Independent validation
```

Independent validation uses a different agent session from the implementer, reads the
exact proposed diff/commit and original finding, and records PASS/FAIL/NEEDS-WORK.
Use a compatible available agent when optional secondary agents are unavailable.
Read-only validation may run safe tests; do not repair code within that task.

P0 implementation is required; P1 is normally required. If blocked, record the risk
and blocker rather than silently claiming completion. P2 requires demonstrated benefit
exceeding complexity; P3 is recorded by default. Severity permits dispatch, not merge.
Changes require concrete evidence, never an aim to consume AI usage.

## Orca source of truth

Before a structured workflow, read this contract, all three policy files, and the
requested workflow. Select the session's installed CLI once following its skill stub.
Run `status --json` and `skills get orchestration` with that same executable before
Orca-dependent action. Load the installed placement reference before creating isolated
worktrees; use version-matched references/help for commands, flags, agent availability,
and recovery. No hard-coded model IDs or copied stale lifecycle instructions.

Nexus explicitly requires isolated worker checkouts even if Orca's generic defaults
permit shared workspaces. Bind the owning repository explicitly; verify the returned
workspace/repository before dispatch. Respect repository setup policy. If there is no
base commit, report the placement blocker. Do not create a commit without authorization.
Do not substitute non-Orca agent infrastructure for Orca workers.

Follow the installed lifecycle contract: account for expected dispatch outcomes,
process questions and findings, and decide cleanup/retention after accepted settlement.
Timeouts, missing observations, or connection loss are not proof of worker exit and do
not justify duplicate attempts. Report unavailable runtime/capabilities explicitly.

## Safety, results, and history

No automatic push, PR creation, merge, scheduler, retry engine, daemon, database,
message bus, custom worktree manager, or agent subprocess framework. No secrets in
tracked configuration or local selectors. Machine-specific paths/IDs belong only in
ignored local state; reviews use logical repository names and portable evidence refs.
Diagnostics are read-only. Add abstractions only for demonstrated problems.

Each result names task ID, repository, scope, outcome, evidence/checks, diff or report
reference, limitations and remaining risks. Findings follow `config/review.yaml`.
An empty review reports scope and checks, not an unexplained “no issues”. Normalize
history under `reviews/YYYY/WNN/`; store decisions, validation and unresolved risks,
not full raw transcripts. Generated review reports and patches stay local and must
not be committed or force-added; only `reviews/README.md` and `reviews/_template/`
are tracked. Human diff review and merge approval remain mandatory.
