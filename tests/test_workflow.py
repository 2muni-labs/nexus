"""Provider-neutral workflow policy tests; no remote calls or runtime state."""
import copy
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[1]
BASE={"work_item_id":"work-1","kind":"implementation","status":"Backlog","observed_at":"t1","observation_ref":"external:1",
      "inventory_complete":True,"inventory_ref":"fleet:1","backend":{"state":"none","liveness":"unknown","settled":False},
      "human":{"paused":False,"cancel_requested":False},"gates":[],
      "readiness":dict.fromkeys(["requirements_validated","ownership_verified","baseline_resolved","capabilities_verified","dependencies_accepted","execution_authorized"],True)}
BASE["readiness"]["evidence_ref"]="approved-plan:1"
def stopped(state="succeeded"):
    return {"state":state,"liveness":"exited","settled":True,"evidence_ref":"host:attempt-1"}
def pr():
    return {"exists":True,"head_revision":"abc","review_state":"pending","review_head":"abc","merged":False,"checks_complete":True,
            "checks_head":"abc","required_checks":["test"],"checks_mode":"legacy-single","legacy_checks_reference":"legacy:work-1",
            "checks":[{"name":"test","state":"pass"}]}

def merged_runs():
    s=copy.deepcopy(BASE); s["backend"]=stopped(); s["pr"]=pr()
    s["pr"].pop("legacy_checks_reference")
    s["pr"].update(merged=True,merge_evidence_ref="merge:1",merge_approval_reference="human:1",merge_approval_head="abc",
                   checks_mode="verified-runs",checks_evidence_ref="checks:1",required_check_producers={"test":["producer:1"]},
                   checks=[dict(id="run:1",name="test",state="pass",head_revision="abc",producer_ref="producer:1",provenance_verified=True)])
    s["validation"]=dict(result="PASS",candidate_head="abc",evidence_ref="validation:1")
    return s
class WorkflowTests(unittest.TestCase):
    def decide(self,s,good=True):
        with tempfile.TemporaryDirectory(prefix="nexus-workflow-test-") as tmp:
            p=Path(tmp)/"input.json"; p.write_text(json.dumps(s))
            r=subprocess.run([str(ROOT/"scripts/workflow.sh"),str(p)],text=True,capture_output=True)
        self.assertEqual(r.returncode==0,good,r.stderr)
        return json.loads(r.stdout) if good else r
    def test_ready_and_incomplete_inventory(self):
        s=copy.deepcopy(BASE); self.assertEqual(self.decide(s)["action"],"prepare-execution")
        s["inventory_complete"]=False; self.assertEqual(self.decide(s)["decision"],"HOLD")
    def test_live_unknown_and_stale_manual_approval(self):
        s=copy.deepcopy(BASE); s["backend"]=dict(state="running",liveness="live",settled=False,evidence_ref="host:1")
        self.assertEqual(self.decide(s)["action"],"observe-active-attempt")
        s["backend"]["liveness"]="unknown"; self.assertEqual(self.decide(s)["action"],"observe-attempt")
        s=copy.deepcopy(BASE); s["gates"]=[dict(result="PASS",manual_review_required=True,expected_scope={"gate":"g1","head":"abc"},approval=dict(status="approved",reference="human:1",scope={"gate":"g1","head":"old"}))]
        self.assertEqual(self.decide(s)["decision"],"HOLD")
    def test_success_is_not_done(self):
        s=copy.deepcopy(BASE); s["backend"]=stopped()
        self.assertEqual(self.decide(s)["action"],"request-independent-validation")
        self.assertNotEqual(self.decide(s)["proposed_status"],"Done")
    def test_existing_pr_no_redispatch_exact_validation(self):
        s=copy.deepcopy(BASE); s["backend"]=stopped(); s["pr"]=pr()
        self.assertEqual(self.decide(s)["action"],"validate-existing-pr")
        s["validation"]=dict(result="PASS",candidate_head="abc",evidence_ref="validation:1")
        self.assertEqual(self.decide(s)["proposed_status"],"Review")
        s["pr"]["head_revision"]="new"; self.assertEqual(self.decide(s)["action"],"validate-existing-pr")
    def test_feedback_and_bounded_retry(self):
        s=copy.deepcopy(BASE); s["backend"]=stopped(); s["pr"]=pr(); s["pr"]["review_state"]="changes-requested"
        self.assertEqual(self.decide(s)["action"],"prepare-remediation")
        s=copy.deepcopy(BASE); s["backend"]=stopped("failed")
        self.assertEqual(self.decide(s)["decision"],"HOLD")
        s["retry"]=dict(approved=True,reference="coordinator:1",remaining=1)
        self.assertEqual(self.decide(s)["action"],"prepare-bounded-retry")
        s["retry"]["remaining"]=0; self.assertEqual(self.decide(s)["decision"],"HOLD")
    def test_merged_requires_exact_acceptance_checks_and_human_reference(self):
        s=copy.deepcopy(BASE); s["backend"]=stopped(); s["pr"]=pr(); s["pr"].update(merged=True,merge_evidence_ref="github:merge",merge_approval_reference="human:merge",merge_approval_head="abc")
        self.assertEqual(self.decide(s)["decision"],"HOLD")
        s["validation"]=dict(result="PASS",candidate_head="abc",evidence_ref="validation:1")
        self.assertEqual(self.decide(s)["proposed_status"],"Done")
        s["pr"]["checks"]=[]; self.assertEqual(self.decide(s)["decision"],"HOLD")
    def test_stale_feedback_and_independent_validation_floor(self):
        s=copy.deepcopy(BASE); s["backend"]=stopped(); s["pr"]=pr()
        s["pr"].update(review_state="changes-requested",review_head="old",checks_head="old",checks=[dict(name="test",state="fail")])
        s["validation"]=dict(result="FAIL",candidate_head="old",evidence_ref="old")
        self.assertEqual(self.decide(s)["action"],"validate-existing-pr")
        s["validation"]=dict(result="PASS",candidate_head="abc",evidence_ref="current",independent_session=False)
        s["readiness"]["independent_validation_required"]=True
        self.assertEqual(self.decide(s)["action"],"validate-existing-pr")

    def test_required_review_binds_exact_head_and_evidence_after_merge(self):
        s=copy.deepcopy(BASE);s["backend"]=stopped();s["pr"]=pr()
        s["pr"].update(merged=True,merge_evidence_ref="merge:1",merge_approval_reference="human:1",merge_approval_head="abc",review_required=True)
        s["validation"]=dict(result="PASS",candidate_head="abc",evidence_ref="validation:1")
        self.assertEqual(self.decide(s)["decision"],"HOLD")
        s["pr"].update(review_state="approved",review_evidence_ref="github:review",review_head="old")
        self.assertEqual(self.decide(s)["decision"],"HOLD")
        s["pr"]["review_head"]="abc";self.assertEqual(self.decide(s)["proposed_status"],"Done")
        s["pr"].pop("review_evidence_ref");self.assertEqual(self.decide(s)["decision"],"HOLD")
        s["pr"]["review_required"]="true";self.assertEqual(self.decide(s)["decision"],"HOLD")

    def test_stale_pre_pr_feedback_and_conflicting_required_checks(self):
        s=copy.deepcopy(BASE); s["backend"]=stopped(); s["artifact_revision"]="new"
        s["validation"]=dict(result="FAIL",candidate_head="old",evidence_ref="old-validation")
        self.assertEqual(self.decide(s)["action"],"request-independent-validation")
        s["validation"]["candidate_head"]="new"
        self.assertEqual(self.decide(s)["action"],"prepare-remediation")
        s["pr"]=pr(); s["pr"].update(merged=True,merge_evidence_ref="merge:1",merge_approval_reference="human:1",merge_approval_head="abc")
        s["validation"]=dict(result="PASS",candidate_head="abc",evidence_ref="validation:1")
        for state in ["fail","pending","pass"]:
            s["pr"]["checks"]=[dict(name="test",state="pass"),dict(name="test",state=state)]
            self.assertEqual(self.decide(s)["decision"],"HOLD")

    def test_noncode_acceptance_revision_binding(self):
        s=copy.deepcopy(BASE); s.update(kind="non-code",backend=stopped(),artifact_revision="new")
        s["human"].update(non_code_acceptance_reference="human:1",non_code_acceptance_revision="old")
        self.assertNotEqual(self.decide(s)["proposed_status"],"Done")
        s["human"]["non_code_acceptance_revision"]="new"
        self.assertEqual(self.decide(s)["proposed_status"],"Done")

    def test_repeated_success_observations_and_distinct_runs(self):
        s=merged_runs()
        for same_identity in [True,False]:
            duplicate=dict(s["pr"]["checks"][0],id="run:1" if same_identity else "run:2")
            s["pr"]["checks"].append(duplicate)
            self.assertEqual(self.decide(s)["proposed_status"],"Done")
        s["pr"]["checks"].reverse()
        self.assertEqual(self.decide(s)["proposed_status"],"Done")

    def test_repeated_checks_never_hide_conflicts_or_untrusted_facts(self):
        for identity in ["run:1","run:2"]:
            for change in [dict(state="fail"),dict(state="pending"),dict(state="unknown"),
                           dict(head_revision="old"),dict(provenance_verified=False),
                           dict(producer_ref="unexpected"),dict(id=None),dict(name="other")]:
                with self.subTest(identity=identity,change=change):
                    s=merged_runs(); s["pr"]["checks"].append(dict(s["pr"]["checks"][0],id=identity))
                    s["pr"]["checks"][-1].update(change)
                    # A separate non-required name is harmless; aliasing one identity is not.
                    expected="Done" if identity == "run:2" and change == dict(name="other") else "Blocked"
                    self.assertEqual(self.decide(s)["proposed_status"],expected)

    def test_missing_managed_inventory_provenance_and_discovery_hold(self):
        for key,value in [("checks_complete",False),("checks_complete",None),("checks_head","old"),
                          ("checks_evidence_ref",None),("checks_mode",None),("required_checks",None),
                          ("required_checks",[]),("required_check_producers",None),
                          ("required_check_producers",{}),("required_check_producers",{"test":[]})]:
            with self.subTest(key=key,value=value):
                s=merged_runs(); s["pr"][key]=value
                self.assertEqual(self.decide(s)["decision"],"HOLD")
        for key in ["id","head_revision","producer_ref","provenance_verified"]:
            s=merged_runs(); s["pr"]["checks"][0].pop(key)
            self.assertEqual(self.decide(s)["decision"],"HOLD")

    def test_multiple_required_names_and_producers_need_every_success(self):
        s=merged_runs();s["pr"]["required_checks"].append("build")
        s["pr"]["required_check_producers"]["build"]=["producer:2"]
        self.assertEqual(self.decide(s)["decision"],"HOLD")
        s["pr"]["checks"].append(dict(s["pr"]["checks"][0],id="run:2",name="build",producer_ref="producer:2"))
        self.assertEqual(self.decide(s)["proposed_status"],"Done")
        s["pr"]["required_check_producers"]["test"].append("producer:3")
        self.assertEqual(self.decide(s)["decision"],"HOLD")
        s["pr"]["checks"].append(dict(s["pr"]["checks"][0],id="run:3",producer_ref="producer:3"))
        self.assertEqual(self.decide(s)["proposed_status"],"Done")
        s["pr"]["checks"][1]["state"]="pending"
        self.assertEqual(self.decide(s)["decision"],"HOLD")

    def test_legacy_checks_require_explicit_scope_and_cannot_downgrade_runs(self):
        s=merged_runs();s["pr"]["checks_mode"]="legacy-single"
        s["pr"]["legacy_checks_reference"]="legacy:1"
        self.assertEqual(self.decide(s)["decision"],"HOLD")
        s["pr"].pop("required_check_producers")
        self.assertEqual(self.decide(s)["decision"],"HOLD")
        s["pr"]["checks"]=[dict(name="test",state="pass")]
        self.assertEqual(self.decide(s)["proposed_status"],"Done")
        s["pr"].pop("legacy_checks_reference")
        self.assertEqual(self.decide(s)["decision"],"HOLD")

    def test_human_pause_cancel_and_malformed_input(self):
        s=copy.deepcopy(BASE); s["human"]["paused"]=True; self.assertEqual(self.decide(s)["action"],"pause-dispatch")
        s["human"].update(paused=False,cancel_requested=True,cancellation_reference="human:cancel")
        self.assertEqual(self.decide(s)["action"],"observe-cancellation")
        s["backend"]=dict(state="running",liveness="live",settled=False,evidence_ref="host:1")
        self.assertEqual(self.decide(s)["action"],"request-cancellation")
        self.decide({},good=False)
if __name__=="__main__": unittest.main()
