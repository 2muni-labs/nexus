"""Offline Project mapping and exact-plan write conformance."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[1]
MOCK='''#!/usr/bin/env python3
import json,os,sys
from pathlib import Path
args=sys.argv[1:]; query=next(x[6:] for x in args if x.startswith("query="))
with open(os.environ["MOCK_CALLS"],"a") as f: f.write(json.dumps(args)+"\\n")
state=Path(os.environ["MOCK_STATE"])
if query.startswith("mutation"):
 state.write_text("Ready")
 if os.environ.get("MOCK_BAD_RESPONSE"): print("{}");sys.exit()
 print(json.dumps({"data":{"updateProjectV2ItemFieldValue":{"projectV2Item":{"id":"item1"}}}}));sys.exit()
if "owner:" in query:
 print(json.dumps({"data":{"owner":{"projectV2":{"id":"project1","number":1,"url":"https://github.com/users/a/projects/1","title":"Nexus","repositories":{"nodes":[{"nameWithOwner":"a/b"}],"pageInfo":{"hasNextPage":False}}}}}}));sys.exit()
if "fields(first" in query:
 names=["Backlog","Ready","In Progress","Blocked","Review","Done"]
 fields=[{"id":"field1","name":"Workflow","options":[{"id":n,"name":n} for n in names]}, {"id":"field2","name":"Priority","options":[{"id":n,"name":n} for n in ["P0","P1","P2","P3"]]}]
 if os.environ.get("MOCK_BAD_FIELD"): fields=fields[1:]
 print(json.dumps([{"data":{"node":{"fields":{"nodes":fields,"pageInfo":{"hasNextPage":bool(os.environ.get("MOCK_FIELDS_INCOMPLETE")),"endCursor":None}}}}}])) ;sys.exit()
value=state.read_text() if state.exists() else "Backlog"
item={"id":"item1","content":{"url":"https://github.com/a/b/issues/1","repository":{"nameWithOwner":"a/b"}},"fieldValues":{"nodes":[{"name":value,"optionId":value,"field":{"id":"field1","name":"Workflow"}}],"pageInfo":{"hasNextPage":False}}}
print(json.dumps([{"data":{"node":{"items":{"nodes":[item],"pageInfo":{"hasNextPage":bool(os.environ.get("MOCK_ITEMS_INCOMPLETE")),"endCursor":None}}}}}]))
'''
class ProjectTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(prefix="nexus-project-test-"); self.dir=Path(self.tmp.name)
        self.mock=self.dir/"gh";self.mock.write_text(MOCK);self.mock.chmod(0o755)
        self.config=json.loads((ROOT/"local/github.json.example").read_text())
        self.config["repositories"]["nexus"]["repository"]="a/b"
        self.config["repositories"]["nexus"]["project"].update(owner="a",number=1)
        self.cfg=self.dir/"config.json";self.cfg.write_text(json.dumps(self.config))
        self.req=self.dir/"request.json";self.req.write_text(json.dumps(dict(issue_url="https://github.com/a/b/issues/1",field="status",expected_value="Backlog",value="Ready")))
        self.calls=self.dir/"calls";self.state=self.dir/"state"
        self.env=dict(os.environ,NEXUS_GH_COMMAND=str(self.mock),NEXUS_GITHUB_CONFIG=str(self.cfg),MOCK_CALLS=str(self.calls),MOCK_STATE=str(self.state))
    def tearDown(self): self.tmp.cleanup()
    def run_cli(self,*args,good=True):
        r=subprocess.run([str(ROOT/"scripts/projects.sh"),*args],cwd=ROOT,env=self.env,text=True,capture_output=True)
        self.assertEqual(r.returncode==0,good,r.stdout+r.stderr)
        return json.loads(r.stdout) if good else r
    def writes(self):
        return sum(any(x.startswith("query=mutation") for x in json.loads(line)) for line in self.calls.read_text().splitlines()) if self.calls.exists() else 0
    def test_read_normalizes_and_prepare_no_write(self):
        s=self.run_cli("read","nexus");self.assertEqual(s["work_items"][0]["fields"]["status"],"Backlog")
        p=self.run_cli("field-update","nexus",str(self.req));self.assertFalse(p["applied"]);self.assertEqual(self.writes(),0)
    def test_exact_apply_reobserves_and_repeat_no_write(self):
        p=self.run_cli("field-update","nexus",str(self.req))
        args=("field-update","nexus",str(self.req),"--apply","--approved-plan",p["plan_oid"],"--approval-reference","human:1")
        result=self.run_cli(*args);self.assertTrue(result["observed"]);self.assertEqual(self.writes(),1)
        self.assertTrue(self.run_cli(*args)["unchanged"]);self.assertEqual(self.writes(),1)
    def test_stale_and_wrong_repository(self):
        self.state.write_text("Review");self.run_cli("field-update","nexus",str(self.req),good=False);self.assertEqual(self.writes(),0)
        request=json.loads(self.req.read_text());request["issue_url"]="https://github.com/other/repo/issues/1";self.req.write_text(json.dumps(request))
        self.run_cli("field-update","nexus",str(self.req),good=False)
    def test_missing_fields_and_shared_board(self):
        self.env["MOCK_BAD_FIELD"]="1";self.run_cli("read","nexus",good=False)
        self.env.pop("MOCK_BAD_FIELD");self.config["repositories"]["foundry"]=self.config["repositories"]["nexus"]
        self.cfg.write_text(json.dumps(self.config));self.run_cli("read","nexus",good=False)
    def test_incomplete_outer_pagination_and_case_alias_board(self):
        for flag in ["MOCK_FIELDS_INCOMPLETE","MOCK_ITEMS_INCOMPLETE"]:
            self.env[flag]="1"
            self.run_cli("field-update","nexus",str(self.req),good=False)
            self.assertEqual(self.writes(),0)
            self.env.pop(flag)
        other=json.loads(json.dumps(self.config["repositories"]["nexus"]))
        other["project"]["owner"]="A"
        self.config["repositories"]["foundry"]=other
        self.cfg.write_text(json.dumps(self.config))
        self.run_cli("read","nexus",good=False)

    def test_unconfigured_no_api_and_ambiguous_mutation(self):
        p=self.run_cli("field-update","nexus",str(self.req));self.env["MOCK_BAD_RESPONSE"]="1"
        self.run_cli("field-update","nexus",str(self.req),"--apply","--approved-plan",p["plan_oid"],"--approval-reference","human:1",good=False)
        self.assertEqual(self.writes(),1)
        self.config["repositories"]["nexus"]["project"]["number"]=None;self.cfg.write_text(json.dumps(self.config))
        self.run_cli("read","nexus",good=False)
if __name__=="__main__": unittest.main()
