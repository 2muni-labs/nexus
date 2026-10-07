"""Recovery from normalized external facts, independent of hidden local state."""
import copy
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from test_workflow import BASE, stopped, pr
ROOT=Path(__file__).resolve().parents[1]
def snapshot():
    s=copy.deepcopy(BASE)
    s.update(sources={k:dict(complete=True,reference="external:"+k) for k in ["work_item","project","pull_requests","backend","git_refs"]},
             association_ref="issue-comment:1",executions=[],selected_execution_id=None,pull_requests=[],selected_pr_id=None)
    return s
class ReconciliationTests(unittest.TestCase):
    def decide(self,s):
        with tempfile.TemporaryDirectory(prefix="nexus-reconcile-test-") as tmp:
            p=Path(tmp)/"external.json";p.write_text(json.dumps(s))
            r=subprocess.run([str(ROOT/"scripts/reconcile.sh"),str(p)],cwd=tmp,text=True,capture_output=True)
        self.assertEqual(r.returncode,0,r.stderr)
        return json.loads(r.stdout)
    def test_no_local_cache_needed_and_idempotent_proposals(self):
        s=snapshot();first=self.decide(s)
        self.assertEqual(first["action"],"prepare-execution")
        self.assertFalse(first["reconciliation"]["applied"])
        s["local_cache"]={"status":"Done","active_attempt":"fake"}
        self.assertEqual(self.decide(s),first)
    def test_existing_pr_after_restart_no_second_start(self):
        s=snapshot();s["status"]="In Progress"
        p=pr();p.update(id="pr:1",work_item_id=s["work_item_id"])
        s.update(pull_requests=[p],selected_pr_id="pr:1")
        self.assertEqual(self.decide(s)["action"],"validate-existing-pr")
        s["validation"]=dict(result="PASS",candidate_head="abc",evidence_ref="external:validation")
        self.assertEqual(self.decide(s)["proposed_status"],"Review")
    def test_missing_sources_or_association_holds(self):
        s=snapshot();s["sources"]["backend"]["complete"]=False
        self.assertEqual(self.decide(s)["decision"],"HOLD")
        s=snapshot();s.pop("association_ref")
        self.assertEqual(self.decide(s)["decision"],"HOLD")
    def test_unknown_duplicate_live_and_stale_attempt_pointer(self):
        s=snapshot();e=stopped();e.update(execution_id="e1",work_item_id=s["work_item_id"])
        s.update(executions=[e],selected_execution_id="e1")
        e["liveness"]="unknown";self.assertEqual(self.decide(s)["decision"],"HOLD")
        e.update(liveness="live",state="running",settled=False)
        other=dict(e,execution_id="e2");s["executions"].append(other)
        self.assertEqual(self.decide(s)["decision"],"HOLD")
        s["executions"]=[e];s["selected_execution_id"]="missing"
        self.assertEqual(self.decide(s)["decision"],"HOLD")
    def test_missing_known_pointers_and_closed_unmerged_pr_hold(self):
        s=snapshot();s["selected_execution_id"]="lost-attempt"
        self.assertEqual(self.decide(s)["decision"],"HOLD")
        s=snapshot();s["selected_pr_id"]="lost-pr"
        self.assertEqual(self.decide(s)["decision"],"HOLD")
        s=snapshot();p=pr();p.update(id="pr1",work_item_id=s["work_item_id"],record_state="closed")
        s.update(pull_requests=[p],selected_pr_id="pr1")
        self.assertEqual(self.decide(s)["decision"],"HOLD")
        s=snapshot();s.pop("sources")
        self.assertEqual(self.decide(s)["decision"],"HOLD")

    def test_backend_switch_with_live_residual_holds(self):
        s=snapshot();old=stopped("failed");old.update(execution_id="old",work_item_id=s["work_item_id"],liveness="live")
        new=stopped();new.update(execution_id="new",work_item_id=s["work_item_id"])
        s.update(executions=[old,new],selected_execution_id="new")
        self.assertEqual(self.decide(s)["decision"],"HOLD")
    def test_prior_settlement_evidence_is_mandatory(self):
        s=snapshot();old=dict(stopped("failed"),execution_id="old",work_item_id=s["work_item_id"])
        old.pop("evidence_ref")
        current=dict(stopped("failed"),execution_id="new",work_item_id=s["work_item_id"])
        s.update(executions=[old,current],selected_execution_id="new",retry=dict(approved=True,reference="coordinator:retry",remaining=1))
        self.assertEqual(self.decide(s)["decision"],"HOLD")
        old["evidence_ref"]="host:old-settlement"
        self.assertEqual(self.decide(s)["action"],"prepare-bounded-retry")

    def test_other_associated_pr_needs_final_disposition(self):
        s=snapshot();p=pr();p.update(id="current",work_item_id=s["work_item_id"])
        old=dict(p,id="old",record_state="open")
        s.update(pull_requests=[old,p],selected_pr_id="current")
        self.assertEqual(self.decide(s)["decision"],"HOLD")
        old.update(record_state="closed",disposition_ref="external:rejected-pr")
        self.assertEqual(self.decide(s)["action"],"validate-existing-pr")

    def test_human_pause_and_work_identity_conflict(self):
        s=snapshot();s["human"]["paused"]=True
        self.assertEqual(self.decide(s)["action"],"pause-dispatch")
        s["executions"]=[dict(stopped(),execution_id="e1",work_item_id="other")]
        s["selected_execution_id"]="e1"
        self.assertEqual(self.decide(s)["decision"],"HOLD")
if __name__=="__main__":unittest.main()
