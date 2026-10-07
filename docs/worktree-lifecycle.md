# Completed worktree lifecycle

Nexus decides whether a checkout may be retired; Orca owns worker settlement,
terminal cleanup and worktree removal. Completion, validation PASS, human merge
approval, worker release and worktree deletion are separate events. This policy
clarifies existing safety boundaries; it adds no cleanup daemon, scheduler or TTL.

## Default disposition

After accepted settlement, handle the worker using the installed Orca lifecycle
contract: immediate reuse, user-requested retention, or release. Release a settled
worker when it is no longer needed; do not keep its terminal alive merely to keep
its worktree. A released worker does not imply a deleted worktree.

Keep the worktree until deletion eligibility and explicit deletion authorization
are both established. Time elapsed, an idle terminal, a completed workspace card,
a merged branch or disk pressure alone never authorizes removal. Periodic reviews
may identify candidates; they must not automatically delete them. Record any
retention reason and the event that will permit reconsideration, rather than an
expiry that triggers deletion.

## Timing within an instruction lifecycle

Treat an instruction as the user's objective and its related follow-up decisions,
not as one chat turn. Record which objective/task/run owns each workspace. A new
message that clarifies scope, requests status or orders a repair continues that
objective; it does not implicitly cancel it or authorize cleanup. A genuinely new
objective has its own scope even when it uses a previously retained workspace.

The default deletion window is **after final task disposition and before the final
closure report**, provided exact deletion approval and all eligibility conditions
already hold. Never delay worker release until that window. The Coordinator performs
these checks at natural instruction boundaries; Nexus runs no background cleanup.

| Instruction phase | Required action | Worktree deletion timing |
| --- | --- | --- |
| Submission / intake | Inspect workspaces relevant to this objective and known retained work from previous objectives; identify ownership, activity, retention reasons and consumers. Record the expected closure disposition. | Identify candidates only. A new instruction does not authorize deleting previous work. Execute prior specifically approved cleanup only after fresh eligibility/scope checks and without disrupting the new objective. |
| Planning / dispatch | Bind task, repository, baseline and workspace; preserve prior user state. | No cleanup merely to obtain a convenient name, path or baseline. |
| Execution / task completion | Accept explicit outcomes and promptly reuse, retain or release settled worker terminals through Orca. | Keep checkouts through their consumers, integration and validation. A completed subtask is not instruction closure. |
| Result delivery / awaiting human decision | Present candidate, validation and outstanding merge/rejection decisions. Identify retained workspaces. | No default deletion while human review or required validation is pending. A delivered implementation report is not final disposition. |
| Final human disposition | Verify actual approved merge, or explicit rejection/cancellation and data disposition; read-only results require acceptance and preserved evidence. Prepare exact deletion candidates and effects. | Enter the cleanup window only for eligible, separately deletion-approved workspaces. Merge/rejection instructions alone confer no deletion authority. |
| Closure / reconciliation | Recheck, remove approved eligible workspaces through Orca, verify results, and record every workspace's disposition outside deletion targets. | Perform authorized deletion before the final closure report. Otherwise record retention or HOLD and its next trigger; do not wait indefinitely or claim complete cleanup. |
| Later instruction / resumption | Revisit a retained workspace when the user supplies the missing decision, requests cleanup, resolves a blocker or resumes the objective. Recheck identity, evidence and approval scope. | A later explicit cleanup instruction can finish the original objective's workspace lifecycle. Resumption requires a valid new attempt before editing; old settled lifecycle IDs are not reused. |

Default to keeping even disposable review/validation checkouts until instruction
closure accounting. Earlier retirement is allowed only as a separately authorized
cleanup step once that task has final disposition, its evidence is preserved and
all consumers are finished; it must be included in the closure report.

Business delivery and workspace cleanup are reported separately. A turn may end
with work delivered and cleanup retained/pending; this creates no indefinite wait
and no deletion authority. At closure report each workspace as **deleted**, **retained**
or **HOLD**, with reason, surviving evidence and the next triggering event (for
example exact deletion approval, completed validation, resolved consumer or verified
host contact). Deletion eligibility is an internal assessment, not a reported deletion.
A failure/contact-loss cancellation can settle the requested reporting step while
workspace cleanup remains HOLD; unknown workers are never treated as stopped.

For an authorized batch, complete accounting for every item, including partial
failure. Do not mark cleanup complete until each requested removal is verified or
explicitly excluded/retained by the user. A later message changing scope or baseline
requires reevaluation; earlier cleanup approval cannot silently expand to new work.

## Deletion eligibility: all conditions must hold

1. **Exact identity:** resolve the Orca worktree ID, owning repository, execution
   host, checkout path, branch and current HEAD. Exclude the user's main checkout,
   the coordinator's active checkout, protected branches and any workspace retained
   by explicit user instruction. A later instruction explicitly changing retention
   must name its scope; this policy does not authorize protected-checkout removal.
2. **Settled activity:** every attempt using this workspace has an accepted explicit
   outcome and its lifecycle cleanup is confirmed. Verify other terminals, setup
   hooks, tests, background processes and remote workers also have no active use.
   Idle, missing inventory, contact loss and unknown liveness mean HOLD. Do not
   delete a workspace to cancel a worker or substitute removal for worker-release.
3. **Final task disposition:** mutable results are human-approved and merged into
   the recorded target, or explicitly rejected/cancelled with a recorded decision
   about preserving or discarding the candidate. Required validation is complete;
   FAIL/NEEDS-WORK remains retained until corrected or explicitly rejected. A
   read-only task needs an accepted report and preserved evidence, not a code merge.
4. **Preserved result:** record exact revisions/digests and confirm accepted changes
   are present in the target. For squash/rebase/cherry-pick, ancestor checks alone
   are insufficient: verify the transformed result and applicable validation.
   Unique commits still needed for recovery or audit must have a verified surviving
   Git reference outside any branch Orca may remove, or an independently stored,
   verified artifact. Rejected work may be discarded only under explicit approval.
   A hash written in a report does not keep a Git object reachable. Push is not a
   prerequisite and is never implied by cleanup authority.
5. **No unpreserved local data:** inspect staged/unstaged changes, untracked files
   and ignored files. Clean `git status` alone is insufficient. Preserve required
   patches, normalized reports, gate/validation evidence and local outputs outside
   the checkout, then verify they are readable and identify their exact candidate.
   `.runtime/` and generated `reviews/` must remain untracked when relocated; do not
   copy credentials or raw private transcripts into public history. Unknown files
   or pre-existing user changes mean HOLD until ownership and disposition are known.
6. **No remaining consumers:** no pending task, validation, integration gate, child
   workspace, recovery action or human review depends on this checkout or its local
   outputs. Resolve lineage and baseline consumers explicitly. Preserve upstream
   worktrees through integration and required validation; afterwards a verified
   surviving baseline/artifact may replace the checkout dependency. A passed
   compatibility gate does not itself create a combined baseline.
7. **Deletion approval:** obtain explicit human authorization for this exact
   worktree or an enumerated batch and its known removal effects. Merge approval
   alone is not deletion approval. Approval must cover possible local branch
   removal and any deliberately discarded local data; changes to identity, HEAD,
   data, consumers or removal effects invalidate prior approval. This document
   defines eligibility, and does not grant standing automatic deletion authority.
8. **Execution recheck:** immediately before removal, recheck the above on the
   authoritative execution host. Ensure no new dispatch or editor can start in
   the checkout during cleanup using Orca's available controls and coordination.
   If this cannot be established, HOLD. Missing evidence is never eligibility.

## Removal and failure handling

Inspect installed `orca status --json`, orchestration guidance and `worktree rm
--help` before acting. Use the exact returned repository/path identity and the
execution host; never substitute raw `rm -rf` or `git worktree remove` for Orca.
Default removal is non-force. Do not bypass dirty-state or archive-hook failures;
resolve the cause, preserve evidence and reevaluate approval. Exceptional force
or hook-failure overrides require a separately reviewed, explicitly authorized
operation and are outside routine cleanup.

Compatibility note verified with Orca 1.4.222: `worktree rm` removes the checkout
from Orca and Git and also attempts local branch deletion. `--force` does not force
branch deletion. Orca retains pre-existing branches and branches whose changes it
cannot prove are merged. Archive hooks are skipped unless `--run-hooks` is passed;
when enabled, hook failure blocks removal. Before removal inspect repository hook
policy, determine whether approved hooks are required, and include their effects
in approval. Never assume optional hooks saved evidence. Reinspect these semantics
when the installed version changes; no volatile invocation is baked into scripts.

After execution, verify removal through Orca and Git on the execution host, and
verify preserved references/artifacts still exist. Report branch disposition
separately; a retained branch is not a failed worktree cleanup. On failure or
uncertain response, HOLD and inspect the actual residual state before any retry.
Never report deletion from a sent request or retry blindly after contact loss.

Keep a normalized cleanup receipt in ignored `reviews/` or `.runtime/` outside
all deletion targets. Include task/run and worktree identity, before-HEAD, outcome,
validation and merge/rejection evidence, surviving refs/artifacts, local-data
inventory/disposition, dependent-consumer check, human approval reference,
installed Orca version, cleanup result, branch disposition and remaining risks.
For a batch, each worktree independently satisfies every condition.
