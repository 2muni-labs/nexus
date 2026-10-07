# Provider-neutral decision policy. Never examines adapter metadata/native states.
def text: type == "string" and length > 0;
def boolean: type == "boolean";
def gates_ready:
  all(.gates[]; .result == "PASS" and (.manual_review_required | boolean) and
    (if .manual_review_required then
       .approval.status == "approved" and (.approval.reference | text) and
       .expected_scope != null and .approval.scope == .expected_scope
     else .approval.status == "not-required" and .approval.reference == null and .approval.scope == null end));
def ready:
  . as $s | (.readiness.evidence_ref | text) and gates_ready and
  all(["requirements_validated","ownership_verified","baseline_resolved","capabilities_verified","dependencies_accepted","execution_authorized"][];
    . as $key | $s.readiness[$key] == true);
def stopped:
  .backend.settled == true and .backend.liveness == "exited" and (.backend.evidence_ref | text);
def validated($revision):
  ($revision | text) and .validation.result == "PASS" and (.validation.evidence_ref | text) and
  .validation.candidate_head == $revision and
  (if .readiness.independent_validation_required == true then .validation.independent_session == true else true end);
def required_checks_pass:
  . as $s | .pr.checks_complete == true and (.pr.required_checks | type == "array" and length>0 and (unique|length) == length and all(.[];text)) and
  .pr.checks_head == .pr.head_revision and
  all(.pr.required_checks[]; . as $name |
    [$s.pr.checks[]? | select(.name == $name)] | length == 1 and .[0].state == "pass");
def proposal($decision; $status; $action; $reason):
  {work_item_id,observed_at,source_observation:.observation_ref,
   decision:$decision,proposed_status:$status,action:$action,reasons:[$reason],
   proposed_events:(if $status == .status then [] else
     [{type:"WORKFLOW_TRANSITION_PROPOSED",from:.status,to:$status}] end)};
def decide_workflow:
if (.work_item_id | text) and (.observed_at | text) and (.observation_ref | text)
   and (.inventory_complete | boolean) and (.inventory_ref | text)
   and (.human.paused | boolean) and (.human.cancel_requested | boolean)
   and (.gates | type == "array") and (.backend.settled | boolean)
   and (.backend.state as $state | ["none","preparing","running","awaiting_input","succeeded","failed","cancelled","unknown"] | index($state)) != null
   and (.backend.liveness as $live | ["live","exited","unknown"] | index($live)) != null
   and (.status as $status | $policy[0].states | index($status)) != null
   and (.kind == "implementation" or .kind == "non-code")
then
  if .human.paused then
    proposal("HOLD";.status;"pause-dispatch";"Human pause preserves active resources and prevents new dispatch")
  elif .human.cancel_requested then
    if .backend.liveness == "live" and (.human.cancellation_reference | text) and (.backend.evidence_ref | text) then
      proposal("PROPOSE";.status;"request-cancellation";"Exact authorized cancellation request; termination still requires host observation")
    else proposal("HOLD";"Blocked";"observe-cancellation";"Cancellation cannot prove termination or authorize action from unknown liveness") end
  elif .kind == "non-code" and (.human.non_code_acceptance_reference | text) and (.artifact_revision | text) and .human.non_code_acceptance_revision == .artifact_revision and
       stopped and .inventory_complete == true then
    proposal("PROPOSE";"Done";"record-accepted-disposition";"Exact non-code result has explicit accepted disposition and settled activity")
  elif .inventory_complete != true then
    proposal("HOLD";"Blocked";"complete-observation";"Incomplete backend inventory cannot authorize duplicate execution")
  elif .backend.state == "unknown" or (.backend.state != "none" and (.backend.liveness == "unknown" or (.backend.evidence_ref | text | not))) then
    proposal("HOLD";"Blocked";"observe-attempt";"Unknown attempt state or liveness requires authoritative evidence")
  elif .backend.liveness == "live" or .backend.state == "preparing" or .backend.state == "running" or .backend.state == "awaiting_input" then
    proposal("PROPOSE";"In Progress";"observe-active-attempt";"Preserve current active attempt; do not start another editor")
  elif .pr.exists == true then
    if .pr.merged == true then
      if (.pr.merge_evidence_ref | text) and (.pr.merge_approval_reference | text) and .pr.merge_approval_head == .pr.head_revision and
         validated(.pr.head_revision) and required_checks_pass and (.backend.state == "none" or stopped) then
        proposal("PROPOSE";"Done";"record-observed-merge";"Observed authorized merge has exact validation, required checks and acceptance")
      else proposal("HOLD";"Blocked";"verify-merged-acceptance";"Merge alone cannot supply missing acceptance, approval or check evidence") end
    elif (.validation.result == "FAIL" and .validation.candidate_head == .pr.head_revision) or
         (.pr.review_state == "changes-requested" and .pr.review_head == .pr.head_revision) or
         (.pr.checks_head == .pr.head_revision and any(.pr.checks[]?; .state == "fail")) then
      if stopped and ready then
        proposal("PROPOSE";"Ready";"prepare-remediation";"Route feedback to a bounded task under the same Work Item; preserve PR identity")
      else proposal("HOLD";"Blocked";"resolve-remediation-prerequisites";"Feedback needs a settled prior editor, readiness and scope-matching gate approval") end
    elif validated(.pr.head_revision) then
      proposal("PROPOSE";"Review";"await-review-and-checks";"Existing PR and exact validation prevent duplicate implementation; no automatic merge")
    else proposal("HOLD";"In Progress";"validate-existing-pr";"Existing PR lacks validation of its exact head; do not redispatch blindly") end
  elif .backend.state == "failed" or .backend.state == "cancelled" then
    if stopped and ready and .retry.approved == true and (.retry.reference | text) and (.retry.remaining | type == "number" and floor == . and .>0) then
      proposal("PROPOSE";"Ready";"prepare-bounded-retry";"Explicit finite retry decision preserves Work Item identity and prior failure evidence")
    else proposal("HOLD";"Blocked";"request-recovery-decision";"Failure is not permission for retry, reassignment or backend switch") end
  elif .backend.state == "succeeded" then
    if stopped and .validation.result == "FAIL" and (.validation.evidence_ref | text) and
       (.artifact_revision | text) and .validation.candidate_head == .artifact_revision then
      if ready then proposal("PROPOSE";"Ready";"prepare-remediation";"Validation feedback returns to a bounded implementation task")
      else proposal("HOLD";"Blocked";"resolve-remediation-prerequisites";"Validation failure needs an authorized bounded correction task") end
    elif stopped and validated(.artifact_revision) then
      proposal("PROPOSE";"In Progress";"prepare-pr-plan";"Accepted candidate may prepare a separately authorized publication plan")
    else proposal("HOLD";"In Progress";"request-independent-validation";"Worker success is not validation or Work Item completion") end
  elif .status == "Done" then
    proposal("HOLD";"Done";"verify-disposition";"Lost completion evidence does not authorize reopening or execution")
  elif .backend.state == "none" and ready then
    proposal("PROPOSE";"Ready";"prepare-execution";"Ready prerequisites permit a prepared execution request, never automatic dispatch")
  else proposal("HOLD";.status;"resolve-readiness";"Requirements, dependencies, capabilities or authorization remain unresolved") end
else error("Incomplete or invalid workflow observation; no decision can be accepted") end;
