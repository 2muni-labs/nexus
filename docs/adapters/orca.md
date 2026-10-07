# Orca execution adapter

This document is the current backend binding for `schemas/execution-backend.yaml`.
Only this adapter guidance interprets native Run/Task/Dispatch IDs, states, workspace
selectors and commands. Core work/task/execution identities remain Nexus-owned; record
native identifiers as opaque metadata and retain the exact server/caller context.
No new agent subprocess framework is introduced: the Coordinator invokes installed Orca
primitives under this binding. Shell tools expose only read-only preflight/status.

## Version and capabilities

Resolve the executable once using the installed skill stub. Inspect `status --json` and
`skills get orchestration`. Load placement, coordinator-loop, messaging-and-gates and
recovery-and-cleanup references at their action gates. Examples below use `orca` only
as the selected executable; replace it if the session selected another binary.
Commands were checked against installed 1.4.222; reverify on a different host/version.
Do not pass a model unless the user named one; abstract capability intent is not a CLI
argument. Verify requested/effective receipts and preserve user setup policy.

## Operation binding

| Port operation | Orca mechanics and evidence |
| --- | --- |
| prepare | Inspect runtime, version guidance, owning repository identity, exact Git baseline and placement. Bind a native run only for authorized execution; record its mapping outside core task identity. Check all Nexus prerequisites first. |
| start | Create the native task from the bounded spec; map dependency IDs in adapter metadata. Start via `orchestration worker-start --task <native-task> --worktree <verified-placement> --agent <assigned-agent> --run <native-run> --retry-request <operation-id> --json`. Immutable base, mutation scope, assignment and identity must be carried in spec/placement; inspect returned identities. |
| observe | Use scoped paginated `worker-list --run <native-run> --include-remote --json`, then exact `worker-show --dispatch <native-attempt> --json` as warranted by installed recovery guidance. Normalize proven live/exited versus unknown; terminal liveness is not agent liveness. |
| collect | Consume explicit completion delivery for the active native attempt; inspect result artifacts, provenance, tests and capability receipts. `worker-read --dispatch <native-attempt>` may supply diagnostic evidence, never invented success. Completion is not Nexus acceptance. |
| cancel | Use the installed recovery contract and exact authorized attempt. `worker-stop` requires positive authority/evidence; `worker-abandon` fences orchestration without killing resources. Unknown liveness authorizes neither. Record requested/confirmed/unknown separately. |
| release | After accepted settlement use exact `worker-release --dispatch <native-attempt> --json`, proven immediate reuse, or user-requested retention. Observe ambiguous cleanup through installed recovery instructions. Never substitute terminal close. |
| delete checkout | Separate human-approved operation under `docs/worktree-lifecycle.md`; no port release calls removal. |

A native task/worker in ready/running/completed state does not choose project status or
routing. Normalize observations conservatively: accepted explicit succeeded/failed outcome
maps to that outcome; proven running agent maps to running; proven question wait maps to
awaiting_input; proven exit without result and missing/unrecognized fields map to unknown.
A cancellation receipt must distinguish fencing from confirmed process termination.
Never allow a normalized cancelled state to imply safe resource reuse without host proof.

## Asynchronous failures and recovery

Start receipts can name a dispatch and residual resources even on failure. Preserve them.
When response delivery is lost, inspect `orchestration request-show --request <operation-id>`
under the same caller identity. Reuse the original retry-request only when the installed
recovery contract permits replay; absent receipt is not proof no worker exists.

Retry of a proven failed/stopped attempt uses the same native task and explicit placement
with `--retry-of <native-attempt>`. Nexus decides finite budget, agent/capability and gates.
Unverifiable host or attempt state holds dispatch and backend switching. An abandon fence
alone does not prove a previous editor stopped and cannot authorize conflicting mutation.

## Current shell compatibility

`scripts/execution-backend.sh` selects the read-only backend port; `run.sh`, `doctor.sh`
and `status.sh` call it. The adapter owns all direct CLI calls and native diagnostic output.
Legacy helper names remain lazy shims for existing callers. Only Orca is configured; an
unsupported backend fails without fallback. Future adapters implement the same preflight
port plus the Coordinator lifecycle contract. No dummy production backend is added.

`nexus_backend_observation execution-id external-attempt-id observed-at receipt.json`
normalizes inspected worker-show projection receipts without CLI calls. `jq` is required
only for this JSON operation; legacy preflight still needs only Bash/Git/Orca. It refuses
to treat start readiness, process exit, missing durable evidence or another attempt as a
successful result. It deliberately leaves wait/cancellation detail unknown unless proven.

`tests/execution-contract.sh` checks asynchronous start versus result, live/no-result,
explicit durable success/failure, exit without result, stale identity, contact loss,
unsupported versions and backend failure. Prepare/start/cancel/release are Coordinator
operation walkthroughs below, not executable mutators or claims of live remote testing:

| Walkthrough | Required conclusion |
| --- | --- |
| prepare finds unresolved baseline or stale gate approval | HOLD start; preparation never creates a worker |
| start times out with residual native attempt | Preserve receipt; observe same attempt/operation, never second start |
| collect sees another attempt or idle/exit without outcome | NEEDS-WORK; no acceptance or release |
| cancel requested while host unreachable | unknown; retain resources, no stop/abandon or replacement |
| cancel returns fencing with remaining live editor | no conflicting mutation or checkout reuse |
| release lacks accepted explicit settlement | HOLD; no terminal or checkout removal |
| settled release returns ambiguous cleanup | observe exact recovery receipt; no guessed terminal close |
| terminal released after accepted result | keep checkout until separately authorized deletion eligibility |

Independent validation reviews these walkthroughs against the port contract. Live
mutation/cancellation is intentionally not exercised against user workers.

## Assignment capability limits

Installed CLI observations do not constitute a general agent/model availability catalog.
Verify launcher/account readiness, user-authorized model choice and observed launch receipts;
PATH presence and requested args alone cannot certify the required floor. On inspected
1.4.222, OpenCode model overrides require existing-worktree placement and do not support
reasoning-effort overrides. Never weaken isolated mutable placement to obtain an override;
use verified inheritance or a compatible agent. Always recheck installed guidance.
