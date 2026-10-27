"""Offline identity/privacy/atomicity tests. No live source or credential reads."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import time
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('office', ROOT/'scripts/office-observe.py')
O = importlib.util.module_from_spec(spec)
spec.loader.exec_module(O)
CANARY = 'PRIVATE /Users/private token ghp_secret task_secret ctx_secret transcript secret-title'
UUID = '11111111-1111-1111-1111-111111111111'
WID = UUID+'::/workspace'
URL = 'https://github.com/2muni-labs/nexus/issues/50'


def scope():
    return dict(version=1, logical_repository='nexus', provider_repository='2muni-labs/nexus',
        scope_alias='display-scope-0000000000000050', host='local', runtime_id=UUID, repo_id=UUID,
        alias_salt='ab'*32, issues=[50], runs=['run_1'],
        workspaces=[dict(selector='path:/workspace',id=WID,instance_id=UUID)],bindings=[])


def binding():
    return dict(issue_url=URL,run='run_1',task='task_1',dispatch='ctx_1',workspace=WID,
                terminal='term_1',incarnation=UUID,evidence='coordinator exact assignment')


class Fixture:
    def __init__(self):
        self.calls=[]
        self.mutate=lambda argv,value:None
        self.linked=False
        self.completed=False
        self.truncated=False
        self.bad=None

    def read(self, argv, env=None):
        self.calls.append(argv)
        if argv[0]=='bash':
            assert not any(k.startswith('GIT_CONFIG') for k in env)
            if argv[2]=='issue-read':
                return dict(id=URL,repository='2muni-labs/nexus',provider='github',kind='issue',number=50,record_state='open',title=CANARY,body=CANARY)
            return dict(repository='nexus',work_items=[dict(work_item_id=URL,fields=dict(status='In Progress'),metadata=dict(secret=CANARY))])
        args=argv[1:]
        if args[:2]==['skills','get']:
            return dict(name=args[2],markdown='verified guidance')
        if args[0]=='status':
            value=dict(runtime=dict(runtimeId=UUID,state='ready',appVersion='1.4.240'))
        elif args[:2]==['worktree','show']:
            value=dict(worktree=dict(id=WID,repoId=UUID,projectId='github:2muni-labs/nexus',hostId='local',instanceId=UUID,identity=dict(instanceId=UUID,executionHostId='local'),workspaceStatus='in-progress',displayName=CANARY,branch=CANARY))
        elif args[:2]==['terminal','list']:
            value=dict(terminals=[dict(handle='term_1',incarnationId=UUID,ptyId='pty_1',worktreeId=WID,executionHostId='local',agentIdentity='codex',orphaned=False,preview=CANARY,title=CANARY)],hostScope=dict(hostIds=['local'],omittedHostIds=[]),totalCount=1,truncated=self.truncated)
        elif args[:2]==['reference','find']:
            value=dict(query=URL,scope=dict(source='stored-metadata'),truncated=False,matches=[dict(reference=dict(url=URL),workspace=dict(id=WID,hostId='local'),agents=[dict(terminal='term_1',linked=self.linked,liveness='live')])])
        elif args[1]=='task-list':
            value=dict(runId='run_1',tasks=[dict(id='task_1',run_id='run_1',spec=CANARY)],count=1)
        elif args[1]=='worker-list':
            value=dict(scope=dict(run='run_1'),workers=[dict(dispatchId='ctx_1',taskId='task_1',runId='run_1',projection=self.projection())],page=dict(hasMore=False,nextCursor=None))
        elif args[1]=='worker-show':
            value=dict(dispatch=dict(id='ctx_1',taskId='task_1',runId='run_1',status='completed' if self.completed else 'dispatched',assigneeHandle='term_1',processIncarnation='pty_1:'+UUID),worker=dict(dispatchId='ctx_1',runtimeEpoch=UUID,worktreeId=WID),projection=self.projection(),terminal=dict(handle='term_1',incarnationId=UUID,worktreeId=WID,preview=CANARY),observation=dict(status='live'))
        else:
            raise AssertionError(argv)
        self.mutate(args,value)
        return dict(ok=True,result=value,_meta=dict(runtimeId=UUID))

    def projection(self):
        return dict(dispatchId='ctx_1',taskId='task_1',runId='run_1',workspace=dict(id=WID),host=dict(id='local'),stage=dict(dispatch='completed' if self.completed else 'dispatched'),outcome='succeeded' if self.completed else 'in_progress',liveness=dict(verdict='live',source='agent_status',observedAt=int(time.time()*1000)),evidence=dict(durable=True,liveStatus='fresh'))


class OfficeTests(unittest.TestCase):
    def setUp(self):
        (ROOT/'.runtime').mkdir(mode=0o700,exist_ok=True)
        self.temp=tempfile.TemporaryDirectory(dir=ROOT/'.runtime')
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        self.config=self.root/'config.json';self.config.write_text(json.dumps({'repositories':{'nexus':{'repository':'2muni-labs/nexus'}}}))
        # Every fixture contract runs without a discoverable host Orca executable.
        empty_bin=self.root/'empty-bin';empty_bin.mkdir()
        self.env=patch.dict(os.environ,{'NEXUS_GITHUB_CONFIG':str(self.config),'GIT_CONFIG_COUNT':'99',
            'PATH':str(empty_bin),'ORCA_CLI_COMMAND':'','ORCA_DEV_REPO_ROOT':''})
        self.env.start();self.addCleanup(self.env.stop)
        self.fixture=Fixture()

    def collect(self, s=None):
        capture=O.Capture(s or scope())
        capture.collect(runner=self.fixture.read,native_runner=self.fixture.read)
        return capture, O.validate(capture.data)

    def test_missing_native_executable_is_sanitized_failed_source(self):
        # Use the real native reader, with only the provider replaced by a fixture.
        with patch.dict(os.environ,{'ORCA_CLI_COMMAND':str(self.root/CANARY)}):
            capture=O.Capture(scope())
            capture.collect(runner=self.fixture.read)
        raw=O.validate(capture.data)
        self.assertEqual(capture.data['collection_state'],'partial')
        self.assertEqual(len(capture.data['work_items']),1)
        for key in ('workspaces','tasks','sessions','relations'):
            self.assertEqual(capture.data[key],[])
        native=[s for s in capture.data['sources'] if s['kind'].startswith('orca-')]
        self.assertEqual(len(native),1)
        self.assertEqual(native[0]['result'],'unavailable')
        self.assertEqual(native[0]['reason'],'failed')
        self.assertFalse(native[0]['read_complete'])
        self.assertIsNotNone(native[0]['observed_at'])
        self.assertIn('failed',capture.data['diagnostics'])
        self.assertFalse(capture.data['coverage']['global_complete'])
        for private in (CANARY,str(self.root),'FileNotFoundError'):
            self.assertNotIn(private.encode(),raw)

    def test_executable_selection_has_no_fallback(self):
        cases=[('Darwin',{},'orca'),
            ('Darwin',{'ORCA_DEV_REPO_ROOT':'/dev'},'orca-dev'),
            ('Linux',{},'orca-ide'),
            ('Linux',{'ORCA_DEV_REPO_ROOT':'/dev'},'orca-ide'),
            ('Linux',{'ORCA_SESSION_ID':'session'},'orca'),
            ('Linux',{'ORCA_SESSION_ID':'session','ORCA_DEV_REPO_ROOT':'/dev'},'orca-dev'),
            ('Linux',{'ORCA_CLI_COMMAND':'/selected/missing-orca'},'/selected/missing-orca')]
        for platform,env,expected in cases:
            with self.subTest(platform=platform,env=env), patch.dict(os.environ,env,clear=True), \
                    patch.object(O.ORCA.os,'uname',return_value=SimpleNamespace(sysname=platform)):
                self.assertEqual(O.ORCA.executable(),expected)

    def test_native_spawn_failure_uses_fixed_error(self):
        with self.assertRaises(O.ORCA.ReadError) as error:
            O.ORCA.read([str(self.root/CANARY),'status','--json'])
        self.assertEqual(str(error.exception),'failed')

    def test_unpaired_real_edges_private_fields_discarded(self):
        capture,raw=self.collect()
        self.assertEqual(capture.data['collection_state'],'observed')
        self.assertTrue(all(r['session'] is None for r in capture.data['relations']))
        self.assertEqual(capture.data['work_items'][0]['workflow'],'In Progress')
        for private in (CANARY,UUID,WID,'term_1','ctx_1','run_1','pty_1','/workspace','secret-title'):
            self.assertNotIn(private.encode(),raw)
        self.assertTrue(all(not any(v in ('send','read','worker-stop','worker-release','dispatch','exec') for v in argv[1:3]) for argv in self.fixture.calls if argv[0]!='bash'))

    def test_exact_inspected_runtime_versions_only(self):
        for version in ('1.4.240', '1.4.241', '1.4.242', '1.4.241-beta', '1.5.0', None):
            with self.subTest(version=version):
                self.fixture.mutate=lambda args,v: v['runtime'].update(appVersion=version) if args[0]=='status' else None
                capture,_=self.collect()
                supported=version in ('1.4.240', '1.4.241')
                self.assertEqual(capture.data['collection_state'], 'observed' if supported else 'partial')
                self.assertEqual(len(capture.data['workspaces']), 1 if supported else 0)
                self.assertEqual(len(capture.data['tasks']), 1 if supported else 0)
                if not supported:
                    self.assertIn('identity', capture.data['diagnostics'])

    def test_uninspected_version_at_final_recheck_clears_native_facts(self):
        status_reads=0
        def mutate(args, value):
            nonlocal status_reads
            if args[0]=='status':
                status_reads+=1
                value['runtime']['appVersion']='1.4.241' if status_reads==1 else '1.4.242'
        self.fixture.mutate=mutate
        capture,_=self.collect()
        self.assertEqual(status_reads, 2)
        self.assertEqual(capture.data['collection_state'], 'partial')
        self.assertIn('identity', capture.data['diagnostics'])
        for key in ('workspaces', 'tasks', 'sessions', 'relations'):
            self.assertEqual(capture.data[key], [])

    def test_operator_and_native_pairing_distinct(self):
        s=scope();s['bindings']=[binding()]
        capture,_=self.collect(s)
        self.assertEqual([r['kind'] for r in capture.data['relations'] if r['session']],['operator-declared'])
        self.fixture.linked=True
        capture,_=self.collect()
        self.assertEqual([r['kind'] for r in capture.data['relations'] if r['session']],['native-linked'])

    def test_stable_alias_and_new_incarnation(self):
        a,_=self.collect();b,_=self.collect()
        self.assertEqual(a.data['sessions'][0]['alias'],b.data['sessions'][0]['alias'])
        self.assertNotEqual(a.data['capture_alias'],b.data['capture_alias'])
        self.fixture.mutate=lambda args,value: value['terminals'][0].update(incarnationId='new') if args[:2]==['terminal','list'] else None
        c,_=self.collect()
        self.assertNotEqual(a.data['sessions'][0]['alias'],c.data['sessions'][0]['alias'])
        self.assertEqual(c.data['sessions'][0]['agent_liveness'],'unknown')

    def test_wrong_identity_edges_never_pair(self):
        cases=[('worktree','show',lambda v:v['worktree'].update(instanceId='wrong')),
          ('orchestration','task-list',lambda v:v.update(runId='wrong')),
          ('orchestration','worker-show',lambda v:v['dispatch'].update(taskId='wrong')),
          ('orchestration','worker-show',lambda v:v['worker'].update(runtimeEpoch='wrong')),
          ('orchestration','worker-show',lambda v:v['projection']['host'].update(id='remote')),
          ('orchestration','worker-show',lambda v:v['terminal'].update(incarnationId='wrong'))]
        for first,second,mutate in cases:
            with self.subTest(second=second,mutate=mutate):
                self.fixture.mutate=lambda args,v: mutate(v) if args[:2]==[first,second] else None
                s=scope();s['bindings']=[binding()]
                c,_=self.collect(s)
                self.assertFalse(any(r['session'] for r in c.data['relations']))
                self.assertEqual(c.data['collection_state'],'partial')

    def test_completed_does_not_prove_exit_or_done(self):
        self.fixture.completed=True
        c,_=self.collect()
        self.assertEqual(c.data['tasks'][0]['result'],'succeeded')
        self.assertEqual(c.data['sessions'][0]['agent_liveness'],'live')
        self.assertEqual(c.data['work_items'][0]['workflow'],'In Progress')
        self.fixture.mutate=lambda args,v:v['projection']['evidence'].update(durable=False) if args[1]=='worker-show' else None
        c,_=self.collect()
        self.assertEqual(c.data['tasks'][0]['result'],'unknown')

    def test_partial_inventory_is_not_empty_complete(self):
        self.fixture.truncated=True
        c,_=self.collect()
        self.assertEqual(c.data['sessions'],[])
        self.assertIn('overflow',c.data['diagnostics'])
        self.assertFalse(c.data['coverage']['global_complete'])
        self.assertTrue(all(s['inventory_complete'] is None for s in c.data['sources']))

    def test_private_scope_duplicates_symlinks_output_bounds(self):
        p=self.root/'scope.json';p.write_text(json.dumps(scope()));p.chmod(0o600)
        self.assertEqual(O.load_scope(p),scope())
        p.write_text('{"version":1,"version":1}')
        with self.assertRaises(Exception):O.load_scope(p)
        symlink=self.root/'link.json';symlink.symlink_to(p)
        with self.assertRaises(Exception):O.load_scope(symlink)
        with self.assertRaises(Exception):O.output_target(ROOT/'prototype/data.json')
        with self.assertRaises(Exception):O.output_target(symlink)
        c=O.Capture(scope());c.data['diagnostics']=['private secret']
        with self.assertRaises(Exception):O.validate(c.data)

    def test_pending_before_reads_atomic_failure_and_lock(self):
        private=self.root/'private';private.mkdir(mode=0o700)
        site=self.root/'site';site.mkdir(mode=0o700)
        p=private/'scope.json';p.write_text(json.dumps(scope()));p.chmod(0o600)
        target=site/'observed.json'
        observed=[]
        def interrupted(capture):
            observed.append(json.loads(target.read_bytes()))
            raise KeyboardInterrupt()
        with patch.object(O.Capture,'collect',interrupted):
            self.assertEqual(O.main(['--scope',str(p),'--output',str(target)]),2)
        self.assertEqual(observed[0]['collection_state'],'collecting')
        self.assertEqual(observed[0]['sessions'],[])
        self.assertEqual(json.loads(target.read_bytes())['collection_state'],'unavailable')
        lock=target.with_suffix('.json.lock');lock.write_text('other writer')
        before=target.read_bytes()
        self.assertEqual(O.main(['--scope',str(p),'--output',str(target)]),1)
        self.assertEqual(before,target.read_bytes());self.assertTrue(lock.exists())
        self.assertEqual(list(site.glob('.office-*')),[])

    def test_wrong_provider_mapping_aborts_before_source(self):
        self.config.write_text(json.dumps({'repositories':{'nexus':{'repository':'wrong/repo'}}}))
        with self.assertRaises(ValueError):self.collect()
        self.assertEqual(self.fixture.calls,[])

    def test_finite_pagination_and_stale_agent_evidence(self):
        self.fixture.mutate=lambda args,v:v['page'].update(hasMore=True,nextCursor='cursor') if args[1]=='worker-list' else None
        c,_=self.collect()
        self.assertIn('overflow',c.data['diagnostics'])
        self.assertEqual(len([a for a in self.fixture.calls if a[1:3]==['orchestration','worker-list']]),4)
        self.fixture.mutate=lambda args,v:v['projection']['evidence'].update(liveStatus='stale') if args[1]=='worker-show' else None
        c,_=self.collect()
        self.assertEqual(c.data['sessions'][0]['agent_liveness'],'unknown')
        self.assertEqual(c.data['sessions'][0]['pty_liveness'],'live')

    def test_output_validator_rejects_duplicates_refs_extra_keys_and_caps(self):
        c,_=self.collect()
        for mutate in (lambda d:d.update(extra='unknown'),
                       lambda d:d['sessions'].append(dict(d['sessions'][0])),
                       lambda d:d['sessions'][0].update(source='display-source-0000000000000000'),
                       lambda d:d.update(diagnostics=['unknown']*17)):
            value=copy.deepcopy(c.data);mutate(value)
            with self.assertRaises(Exception):O.validate(value)

    def test_native_read_size_timeout_nonzero_fixed_diagnostics(self):
        for code in ("print('x'*2200000)","import sys;sys.exit(2)"):
            with self.assertRaises(O.ORCA.ReadError):O.ORCA.read([os.sys.executable,'-c',code])

if __name__=='__main__':unittest.main()
