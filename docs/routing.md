# Planning and routing

Read `config/planning.yaml`, `config/routing.yaml`, `config/review.yaml` and the plan
contract together. Task classification covers type, complexity, risk, context size,
parallelizability, repository, dependencies and mutation scope. Testing/documentation/
integration tasks can write only when the plan explicitly declares that scope.

## Versioned Codex model guidance

As reviewed on 2026-10-28, Nexus recommends **GPT-6.1 Sol** for the Coordinator
entry session and for complex coding and coordinated work. GPT-6.1 Terra is a
candidate for visual reasoning, computer use and scoped fixes; GPT-6 Sol is a
previous coding option, GPT-6 Astra for the most demanding tasks, and GPT-6 Luna
for focused low-risk work. These are use-case recommendations, not fixed mappings
from a logical purpose or a policy profile to a model. Apply the actual requirements
and every matching profile and validation rule before considering a candidate.

The declarative `model_guidance` in `config/routing.yaml` records these recommendations
for Coordinator judgment. It does not select a model, change a user's configuration,
pass a launch flag, or validate a capability. The existing checker pins the policy
revision but does not interpret this advisory block; operators apply it manually.
An explicit user-selected model takes precedence over the Coordinator recommendation;
verify its suitability and actual model and effort in the exact session before work.
An unsuitable or unknown high-risk capability holds rather than silently switching.
Review the guidance when provider guidance, model/client, capabilities or task scope
changes. Model names, availability and effort labels do not prove floor equivalence.

Sources reviewed 2026-10-28: [model selection](https://developers.openai.com/api/docs/guides/model-selection),
[latest model](https://developers.openai.com/api/docs/guides/latest-model),
[GPT-6.1 Terra](https://developers.openai.com/api/docs/models/gpt-6.1-terra),
[GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol), and
[GPT-6 Sol](https://developers.openai.com/api/docs/models/gpt-6-sol).
These versioned sources inform suitability, not account access or session evidence.

## Optional logical purpose

`routing.logical_purpose` is an optional uppercase alias declared in
[config/routing.yaml](../config/routing.yaml). It describes work within existing
task classes and assignment roles; it is neither an agent, provider/model nor an
execution backend. Omission preserves existing class preferences. The Coordinator
does not infer aliases from prose or insert tasks for optional purposes.

| Canonical purpose | Allowed task classes | Assignment roles | Preferred agent |
| --- | --- | --- | --- |
| FAST | research | planner, reviewer | Codex |
| CODE | implementation-standard, implementation-complex | implementer | Codex |
| CODE_FAST | implementation-mechanical | implementer | Codex |
| GENERAL | research | planner, reviewer | Codex |
| REVIEW | independent-review, debugging | reviewer | Codex |
| DEEP_REVIEW | independent-review | reviewer | Codex |
| ARCHITECT | architecture | planner, reviewer | Codex |
| CHALLENGER | independent-review | reviewer | Codex |

FAST retains research's standard floor, raised by all matching rules; it does
not select the fast profile. REVIEW/debugging is read-only diagnosis with the
existing independent-review fresh-session requirement. Repairs require a separate
implementer task. ARCHITECT retains deep and mandatory independent validation;
its preference requires compatible verified effective capabilities before work.
DEEP_REVIEW/CHALLENGER do not establish model-family diversity from client names.

The [static checker](plan-validation.md) checks purpose spelling, class/type
consistency, scope and any supplied assignment's role even without an execution
selector. Read-only purposes reject writes; CODE/CODE_FAST cannot give a reviewer
write authority. When no assignment is supplied, it checks observable task scope
without certifying a session's authority. Purpose review assignments declare the
fresh `validation_sessions.validation` session; matching strings are evidence
claims, never proof of real independence.

Purpose preferences follow the latest Codex default for every role, superseding
older CODE_FAST/OpenCode and ARCHITECT/Antigravity preferences. They must match
each allowed class's configured defaults. Automatic client fallback remains disabled.
An explicitly task-authorized compatible alternate selection also needs a nonempty
`fallback:` reason
in `routing.reasons` or supplied assignment `evidence`, for example
`fallback: explicitly authorized OpenCode for this task; unchanged floor verified`.
The marker makes an explanation inspectable; its truth and adequacy remain a
Coordinator check. It cannot supply alternate-client authorization or excuse any floor.
The separate `agent_authorization` claim and verified selected resolution remain
required for optional clients; an alias or explanation supplies neither.

Examples: CODE/implementation-standard prefers Codex at standard or a raised
floor; CODE_FAST/implementation-mechanical prefers Codex with all overrides;
REVIEW/debugging prefers Codex at deep in a fresh review session;
ARCHITECT/architecture prefers Codex at deep with independent validation.
Cost and latency rank only candidates meeting all authority, capability, context,
tool, isolation, independence and approval requirements. A purpose is not a
ranking that permits replacement writers or bypasses human approval.

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
3. State needed tools, usable context, output contracts and reasoning/judgment,
   then apply an explicit purpose preference (otherwise the class preference) and
   compare default Codex and any explicitly task-authorized compatible alternative
   against those requirements, recording the accepted candidate, each rejected or
   unavailable candidate and the selection reason. A prior one-task choice is not a
   catalog default or standing precedent.
4. Resolve user-authorized local mapping/default ownership; leave the task-local
   mapping null unless the user named or authorized a model. Verify installed support
   and account readiness on the actual host, preserving evidence scope and uncertainty;
   never invent a provider ID or availability.
5. Record requested launch settings, observe actual model/effort in the exact session,
   and complete the blocking Coordinator checkpoint before source mutation. Record
   effective evidence, suitability rationale, fallback reason and validation.

Follow [model selection and verification](model-selection-verification.md) for the
full sequence, two-stage start, evidence states and rechecks. Suitability needs versioned
evidence connected to task needs; model naming, price, user authorization and successful
tests do not certify capability. Provider effort labels have no universal equivalence.

Fast means low reasoning/latency priority; standard is balanced; deep favors high reasoning;
critical requires the strongest verified suitable capability. Profile reasoning labels are
policy intents. `maximum` is **not** a backend CLI effort flag. Never send abstract profile names
as model IDs. A mechanical task cannot lower a critical/high-risk override.

All task classes prefer Codex with null automatic fallback. Antigravity and OpenCode
remain optional catalog extensions. Default unavailability or quota means HOLD; neither
availability nor quota authorizes switching clients. Alternate selection needs explicit
task-scoped authorization and verified capability matching with unchanged floors and
validation. Record `routing.agent_authorization: {agent, evidence}` for an alternate
client, naming the selected catalog agent and exact authorization reference. The static
checker checks this claim, not the authority or host evidence behind it. Codex validation
uses a fresh session and new worktree; independence does not require vendor diversity.

`local/capabilities.yaml.example` documents inert mapping intent with null model/effort
and unverified status, including an unverified OpenCode deep example. A user-maintained
mapping records prior task-scoped authorization; it cannot grant authorization itself.
Keep actual observed model/effort and exact-session evidence in a separate ignored sidecar.
`verified: true` requires fresh consistent evidence of the scoped mapping match and profile
suitability; any observation alone is insufficient, and the flag cannot authorize launch
or certify a floor by itself. Verify support and the live checkpoint before work.
Null means inherit, not a quality certification. Unmapped
low/medium-risk, non-critical work can inherit defaults only with a concrete bounded
Coordinator decision recording uncertainty, operational reason and required validation;
this never certifies suitability. Unknown floors for high-risk/critical work hold dispatch.
Known setting mismatches or below-floor capability block work at every risk. Unsupported
effort holds until a suitable supported equivalent is verified/authorized or a justified
default decision preserves policy; unknown equivalence alone cannot release work.
Unavailable default choices HOLD. Any alternate client selection requires explicit
task authorization and verified capability matching, not merely an available model.
Stale/conflicting evidence holds pending exact-session reobservation.

## Backend selection and assignment

Use config/execution-backends.yaml and schemas/agent-assignment.yaml after task/agent
classification. The Router chooses the backend; adapters execute the exact assignment
and report effective capabilities. Native state/IDs never choose policy or task priority.
Only Orca is currently configured; unavailable capability/backend holds work rather than
inventing LocalGit/remote fallbacks. For its installed operations and launch restrictions,
read docs/adapters/orca.md and current version guidance.

A reviewer/validator/planner has read-only authority. Independent validation has a separate
logical session, newly created isolated non-main worktree and exact candidate. Codex
is default for all roles; alternate clients are explicit opt-ins. Every new task, including
DIRECT and read-only tasks, gets a new worktree at an exact baseline.
Split separately reviewable changes into linked Issues when parallel isolation benefits the
work; never share an editor workspace merely to preserve default Issue/worktree cardinality.
After parallel results require exact compatibility gates and integrated validation before
consumers, including conditional intermediate human approval.

Retry/reassignment/backend replacement is a finite explicit Coordinator decision after
settlement and proven editor exit. Fencing without termination does not permit conflicting
mutation. Preserve Work Item/task identity, immutable artifacts, floors and validation;
reverify assignment/placement in a newly created non-main worktree on the selected host.
The same active attempt may continue its own worktree; settled attempts cannot supply
a reused workspace for a new task. Human overrides cannot silently waive these
safety requirements. See docs/multi-agent.md for scenario evidence and limits.

## Decision record

For each non-trivial task, `.runtime/runs/<run-id>/routing.yaml` records concise operational
reasons (for example architecture-sensitive, large context, required contract review),
requested/effective configuration, verification source, accepted/rejected candidates and
fallback reason. Task-local mapping source, freshness, scope and default ownership belong
in the ignored sidecar; null means inherit, not a certified or globally authorized mapping.
No private reasoning or raw transcripts. Plans name requirements/findings, acceptance checks, dependency waves,
gates and validation tasks. Transient records do not become Git history automatically.
Use existing `routing.resolution` and assignment `requested`/`effective`/`evidence`;
keep extra host/session/timestamp and checkpoint details in an ignored sidecar as described
in the procedure, without adding unsupported fields to strict check-plan JSON. Reobserve
after reuse, resume, setting/host/account/version/scope changes or quota interruption.
