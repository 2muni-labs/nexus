# Planning and routing

Read `config/planning.yaml`, `config/routing.yaml`, `config/review.yaml` and the plan
contract together. Task classification covers type, complexity, risk, context size,
parallelizability, repository, dependencies and mutation scope. Testing/documentation/
integration tasks can write only when the plan explicitly declares that scope.

## Select a task class

| Task characteristics | Class |
| --- | --- |
| Design/contract decisions | architecture |
| Implementation with high/critical complexity or architecture sensitivity | implementation-complex |
| Ordinary implementation | implementation-standard |
| Proven mechanical, low-risk edits | implementation-mechanical |
| Debugging / testing / documentation / research | corresponding class |
| Compatibility gate or candidate combination | integration |
| Independent review / final validation | independent-review / validation |

Large context or high complexity raises the capability floor to deep. Risk, critical
complexity and architecture sensitivity apply additional overrides. Review/validation
sessions themselves do not recursively require another validator solely because they
are independent: mandatory validation applies to the candidate changes and design outputs.
The multi-upstream rule targets **mutable integration changes**; a read-only compatibility
gate still inspects evidence and blocks consumers until PASS. Count distinct mutable result
inputs contributing to a candidate, including inputs carried through prerequisite gates;
counting only immediate dependencies would incorrectly hide T2/T3 behind G1. A mutable
integration task declares these input IDs as `upstream_mutations` in its plan.

## Resolve policy to capabilities

1. Pick a task class from the configurable catalog, based on the task's characteristics.
2. Apply every matching override. Profile rank is `fast < standard < deep < critical`;
   select the highest floor. Independent-validation flags combine with logical OR.
3. Resolve preferred agent, then compatible fallback on the actual execution host.
4. Read local capability data; verify launcher, account, model and supported effort.
5. Record requested/effective agent, profile, model/effort, fallback reason and validation.

Fast means low reasoning/latency priority; standard is balanced; deep favors high reasoning;
critical requires the strongest verified suitable capability. Profile reasoning labels are
policy intents. `maximum` is **not** an Orca effort flag. Never send abstract profile names
as model IDs. A mechanical task cannot lower a critical/high-risk override.

Optional agent absence alone never fails a workflow. Fallback must preserve the required
capability floor; if no compatible capability is verified, hold the task and report the
missing mapping. A separate Codex session can provide independent review when Antigravity
is unavailable; independence is about session and evidence, not vendor diversity.

`local/capabilities.yaml.example` documents local data with null model/effort and unverified
status. A user-maintained chosen-model mapping supplies authorization for that model;
verify support before launch. Null means inherit, not a quality certification. Unmapped
low/medium-risk work can inherit defaults with recorded uncertainty and policy-required
validation. Unknown floors for high-risk/critical work hold dispatch. Unsupported effort
may use an equivalent supported setting or inherit with a reason only when the required
floor remains verified. A fallback below the floor is blocked.

## Installed Orca contract

Inspect `orca status --json` and `orca skills get orchestration` before depending on
Orca behavior. Respect `ORCA_CLI_COMMAND` / development override; Linux outside managed
sessions uses `orca-ide` to avoid launching the system screen reader. Read version-matched
references and command help before using conditional flags.

On inspected Orca 1.4.222, the relevant mechanisms are run creation, native dependency
tasks, worker-start, task-list readiness, gate-create/gate-resolve, explicit worker_done
messages through check, and worker-release. Exact flags belong to the installed guide,
not a Nexus command wrapper. Native readiness is necessary but gate/baseline evidence
must also satisfy policy before dispatch.

Current launch preferences have agent/placement constraints: model overrides require a
user-chosen supported model; effort overrides require that model and verified support.
OpenCode model overrides are limited to existing-worktree placement and do not support
reasoning-effort overrides. An independently mutable task still requires its own isolated
worktree; never weaken isolation to obtain a model override. Prefer verified inherited
settings or an appropriate compatible agent.

The inspected CLI advertises no general live agent/model catalog query. `agent-context`
provides command context, not model discovery. PATH presence alone does not prove agent
availability. Use host launcher/account verification, local mappings and observed launch
receipts; record pending resolution until verified. No invented discovery command.

## Decision record

For each non-trivial task, `.runtime/runs/<run-id>/routing.yaml` records concise operational
reasons (for example architecture-sensitive, large context, required contract review),
requested/effective configuration, verification source and fallback. No private reasoning
or raw transcripts. Plans name requirements/findings, acceptance checks, dependency waves,
gates and validation tasks. Transient records do not become Git history automatically.
