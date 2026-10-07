# Workflow decision controller

The Coordinator owns the controller. `scripts/workflow.sh observation.json` is a pure
one-shot policy evaluator, not a scheduler, runtime, daemon or store. It proposes an action
and visible status; it never starts workers, publishes, changes a Project or merges.
`config/workflow.json` defines the visible states and policy constraints;
`schemas/workflow-observation.yaml` defines externally evidenced observations.

Supply fresh canonical work identity, observation time/reference, complete backend
inventory evidence, normalized attempt state/liveness/settlement, explicit human controls,
readiness/capability evidence and exact gate approval scope. The Coordinator verifies the
snapshot sources; fabricated booleans or approval strings are not authority. Unknown
liveness, incomplete inventory, unresolved baselines or stale gate approval hold dispatch.
Input metadata is not an authoritative local cache; losing it requires external observation.

The evaluator distinguishes worker success, accepted validation, review, observed merge
and Done. Validation and check observations bind to exact candidate/head revisions;
independent_session is required when routing demands it. Required checks must be configured
explicitly and completely observed; an empty or missing set does not mean PASS. Non-code
completion requires accepted exact artifact disposition and settled observed resources.

Feedback from current-head validation/CI/review returns a proposed bounded remediation task
under the same Issue, preserving Work Item/PR identity. Stale feedback does not authorize
remediation against a changed candidate. A retry needs proven settlement/exit, exact bounded
Coordinator decision, remaining integral budget and readiness. Backend switch/reassignment
has the same safety floor. No automatic retry or backend choice occurs in this evaluator.

Pause blocks future dispatch while preserving active resources. Cancel proposes a request
only with exact authorization and positive live-host evidence; unknown state holds action.
Resume/reprioritize/reassign/routing overrides must be recorded externally, reobserved and
passed through normal gates/floors. Cancellation/fencing never implies safe checkout reuse.

Outputs explicitly say `proposed_status` and `proposed_events`. They are not accomplished
transitions or event sourcing. Apply a reviewed provider write plan only with its exact
human authority and compare fresh observations again. Record the resulting actual event,
source and Work Item/task/attempt/artifact references outside disposable local state.

Tests cover readiness, stale approval, unknown/live activity, success without acceptance,
existing PR/no duplicate start, head changes, remediation, finite retry, human pause/cancel,
required checks and exact authorized merge. Neither backend-native states nor provider API
payloads appear in the decision policy; adapters normalize those at their boundaries.
