"""Architecture invariants across synthetic normalized assignments and metadata."""
import copy
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from test_workflow import BASE, stopped, pr
from test_reconciliation import snapshot
ROOT=Path(__file__).resolve().parents[1]
class ArchitectureTests(unittest.TestCase):
    def evaluate(self,script,s):
        with tempfile.TemporaryDirectory(prefix="nexus-architecture-test-") as tmp:
            p=Path(tmp)/"facts.json";p.write_text(json.dumps(s))
            r=subprocess.run([str(ROOT/"scripts"/script),str(p)],cwd=tmp,text=True,capture_output=True)
        self.assertEqual(r.returncode,0,r.stderr)
        return json.loads(r.stdout)
    def test_agent_and_backend_replacement_preserves_workflow_semantics(self):
        s=copy.deepcopy(BASE);s["backend"]=stopped();s["pr"]=pr()
        s["validation"]=dict(result="PASS",candidate_head="abc",evidence_ref="external:validation")
        expected=self.evaluate("workflow.sh",s)
        for agent,backend in [("codex","orca"),("synthetic-agent","synthetic-backend")]:
            s["assignment"]=dict(id="assignment-1",agent=agent,backend=backend)
            s["backend"]["external_receipt"]={"backend":backend,"metadata":{"native_state":"Done","workspace":"opaque", "priority":"critical"}}
            self.assertEqual(self.evaluate("workflow.sh",s),expected)
    def test_recovery_does_not_interpret_provider_metadata(self):
        s=snapshot();s["assignment"]={"agent":"synthetic-agent"}
        expected=self.evaluate("reconcile.sh",s)
        s["metadata"]={"orca_task_state":"completed","github_state":"closed","model":"unverified","cache":"Done"}
        self.assertEqual(self.evaluate("reconcile.sh",s),expected)
    def test_replacement_cannot_bypass_capability_or_approval_floor(self):
        s=copy.deepcopy(BASE);s["readiness"]["capabilities_verified"]=False
        for backend in ["orca","synthetic-backend"]:
            s["assignment"]={"backend":backend,"agent":"synthetic-agent","profile":"critical"}
            self.assertEqual(self.evaluate("workflow.sh",s)["decision"],"HOLD")
        s=copy.deepcopy(BASE)
        s["gates"]=[dict(result="PASS",manual_review_required=True,expected_scope={"head":"new"},approval=dict(status="approved",reference="human",scope={"head":"old"}))]
        self.assertEqual(self.evaluate("workflow.sh",s)["decision"],"HOLD")
if __name__=="__main__":unittest.main()
