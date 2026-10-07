include "workflow-policy";
def recovery_hold($reason): proposal("HOLD";"Blocked";"reobserve-external-state";$reason);
def inventory_valid:
  has("selected_execution_id") and has("selected_pr_id") and
  (.executions|type == "array") and (.pull_requests|type == "array") and
  (. as $s | all(.executions[]; (.execution_id|text) and .work_item_id == $s.work_item_id and
    (.settled|boolean) and (.state as $v | ["preparing","running","awaiting_input","succeeded","failed","cancelled","unknown"]|index($v)) != null and
    (.liveness as $v | ["live","exited","unknown"]|index($v)) != null)) and
  (. as $s | all(.pull_requests[]; (.id|text) and .work_item_id == $s.work_item_id and .exists == true)) and
  ([.executions[].execution_id]|unique|length) == (.executions|length) and
  ([.pull_requests[].id]|unique|length) == (.pull_requests|length);
. as $original |
(if (.work_item_id|text) and (.observation_ref|text) and (.observed_at|text) and
    (.status as $state | $policy[0].states | index($state)) != null then
   if inventory_valid|not then recovery_hold("Conflicting, duplicate or unbound external identities")
   elif (.association_ref|text|not) or
        (. as $s | any(["work_item","project","pull_requests","backend","git_refs"][];
          . as $key | $s.sources[$key].complete != true or ($s.sources[$key].reference|text|not))) then
     recovery_hold("Missing complete external state or durable work/attempt/PR association")
   elif ((.executions|length)==0 and .selected_execution_id != null) or
        ((.pull_requests|length)==0 and .selected_pr_id != null) then
     recovery_hold("Known external attempt/PR pointer missing from complete inventory; absence is not settlement")
   elif any(.executions[]; .liveness == "unknown" or .state == "unknown") then
     recovery_hold("Unknown attempt liveness or outcome cannot permit retry or backend switching")
   elif ([.executions[]|select(.liveness == "live")]|length)>1 then
     recovery_hold("Multiple live attempts require investigation; do not start or cancel by inference")
   elif (.executions|length)>0 and
        ([.executions[]|select(.execution_id==$original.selected_execution_id)]|length)!=1 then
     recovery_hold("Current attempt pointer is absent or ambiguous; preserve all results")
   elif (.pull_requests|length)>0 and
        ([.pull_requests[]|select(.id==$original.selected_pr_id)]|length)!=1 then
     recovery_hold("Current PR pointer is absent or ambiguous; no duplicate PR/execution")
   elif any(.executions[]; .liveness=="live" and .execution_id!=$original.selected_execution_id) then
     recovery_hold("A different attempt still has a live editor; no conflicting mutation")
   elif any(.executions[]; .execution_id!=$original.selected_execution_id and
        (.settled!=true or (.evidence_ref|text|not))) then
     recovery_hold("Prior attempt settlement is not proven")
   elif any(.pull_requests[]; .id!=$original.selected_pr_id and
        ((.record_state!="closed" and .record_state!="merged") or (.disposition_ref|text|not))) then
     recovery_hold("Other associated PR has unresolved disposition; no duplicate completion")
   elif any(.pull_requests[]; .id==$original.selected_pr_id and .record_state=="closed" and .merged!=true) then
     recovery_hold("Selected PR closed without merge; require explicit disposition or remediation decision")
   else
     .backend = (if (.executions|length)==0 then {state:"none",liveness:"unknown",settled:false}
                 else [.executions[]|select(.execution_id==$original.selected_execution_id)][0] end) |
     .pr = (if (.pull_requests|length)==0 then {exists:false}
            else [.pull_requests[]|select(.id==$original.selected_pr_id)][0] end) |
     .inventory_complete = true |
     .inventory_ref = .sources.backend.reference |
     decide_workflow
   end
 else error("Missing canonical work identity/status/source observation") end) |
. + {reconciliation:{observed_status:$original.status,
  change_required:(.proposed_status != $original.status),applied:false,
  source_refs:(($original.sources // {})|to_entries|map(.value.reference)),association_ref:$original.association_ref}}
