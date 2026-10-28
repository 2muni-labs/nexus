#!/usr/bin/env python3
"""One explicit collection into an untrusted, sanitized static presentation copy."""
import argparse
import datetime as dt
import hashlib
import hmac
import importlib.util
import json
import os
from pathlib import Path
import re
import secrets
import stat
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location('orca_office', ROOT/'scripts/adapters/orca-office.py')
ORCA = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ORCA)
MAX_BYTES = 256*1024
WORKFLOW = ('Backlog', 'Ready', 'In Progress', 'Blocked', 'Review', 'Done')


def require(value):
    if not value:
        raise ValueError('invalid')


def keys(value, names):
    require(type(value) is dict and set(value) == set(names.split()))


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')


def private_path(path):
    path = Path(os.path.abspath(path))
    for part in (path, *path.parents):
        require(not part.is_symlink())
    return path


def load_scope(path):
    path = private_path(path)
    info = path.stat()
    require(stat.S_ISREG(info.st_mode) and info.st_uid == os.getuid() and not info.st_mode & 0o077 and info.st_nlink == 1)
    require(info.st_size <= 32768)
    scope = ORCA.literal(path.read_bytes())
    keys(scope, 'version logical_repository provider_repository scope_alias host runtime_id repo_id alias_salt issues runs workspaces bindings')
    require(type(scope['version']) is int and scope['version'] == 1 and scope['logical_repository'] == 'nexus' and scope['provider_repository'] == '2muni-labs/nexus')
    require(scope['host'] == 'local' and re.fullmatch(r'display-scope-[a-f0-9]{16}', scope['scope_alias']))
    require(re.fullmatch(r'[a-f0-9]{64}', scope['alias_salt']))
    for name in ('runtime_id', 'repo_id'):
        require(type(scope[name]) is str and re.fullmatch(r'[a-f0-9-]{36}', scope[name]))
    for name, limit in (('issues',16),('runs',4),('workspaces',16),('bindings',32)):
        require(type(scope[name]) is list and len(scope[name]) <= limit)
    require(scope['issues'] and len(set(scope['issues'])) == len(scope['issues']))
    require(all(type(n) is int and 0 < n < 2**53 for n in scope['issues']))
    require(len(set(scope['runs'])) == len(scope['runs']) and all(re.fullmatch(r'run_[a-f0-9]+', r) for r in scope['runs']))
    workspaces = set()
    for work in scope['workspaces']:
        keys(work, 'selector id instance_id')
        require(work['id'] not in workspaces and work['id'].startswith(scope['repo_id']+'::/'))
        require(work['selector'] == 'path:'+work['id'].split('::',1)[1])
        require(re.fullmatch(r'[a-f0-9-]{36}', work['instance_id']))
        workspaces.add(work['id'])
    for binding in scope['bindings']:
        keys(binding, 'issue_url run task dispatch workspace terminal incarnation evidence')
        require(binding['workspace'] in workspaces and binding['run'] in scope['runs'])
        require(binding['issue_url'] in ['https://github.com/'+scope['provider_repository']+'/issues/'+str(n) for n in scope['issues']])
        require(all(type(v) is str and 0 < len(v) <= 512 for v in binding.values()))
    return scope


class Sources:
    def __init__(self, owner):
        self.owner = owner
    now = staticmethod(now)

    def __call__(self, kind, identity):
        # Repeated rechecks are distinct source windows, not overwritten evidence.
        src = {'alias': self.owner.alias('source', kind+':'+identity+':'+str(len(self.owner.data['sources']))),
               'kind': kind, 'started_at': now(), 'observed_at': now(), 'result': 'unavailable',
               'read_complete': False, 'inventory_complete': None, 'reason': 'unknown'}
        require(len(self.owner.data['sources']) < 128)
        self.owner.data['sources'].append(src)
        return src


class Capture:
    def __init__(self, scope):
        self.scope = scope
        self.aliases = {}
        stamp = now()
        self.data = {'kind': 'nexus-office-presentation', 'office_version': 1,
          'scope_alias': scope['scope_alias'], 'capture_alias': 'display-capture-'+secrets.token_hex(8),
          'started_at': stamp, 'observed_at': stamp, 'collection_state': 'collecting',
          'repository': 'https://github.com/'+scope['provider_repository'],
          'selection': ['https://github.com/'+scope['provider_repository']+'/issues/'+str(n) for n in scope['issues']],
          'sources': [], 'work_items': [], 'workspaces': [], 'tasks': [], 'sessions': [], 'relations': [],
          'coverage': dict(selected_work_items=len(scope['issues']), selected_workspaces=len(scope['workspaces']), selected_runs=len(scope['runs']),
            observed_work_items=0, observed_workspaces=0, observed_tasks=0, observed_sessions=0,
            omitted_tasks=None, omitted_sessions=None, omitted_workspaces=None, global_complete=False),
          'diagnostics': ['collecting']}
        self.source = Sources(self)

    def alias(self, kind, identity):
        value = 'display-'+kind+'-'+hmac.new(bytes.fromhex(self.scope['alias_salt']),
                  (self.scope['scope_alias']+':'+kind+':'+identity).encode(), hashlib.sha256).hexdigest()[:16]
        require(value not in self.aliases or self.aliases[value] == (kind, identity))
        self.aliases[value] = (kind, identity)
        return value

    def diagnostic(self, code):
        # Generic adapter failures use the presentation diagnostic vocabulary;
        # the source's reason retains the operational detail 'failed'.
        if code == 'failed':
            code = 'unavailable'
        if code not in self.data['diagnostics']:
            self.data['diagnostics'].append(code)

    def provider(self, kind, identity, argv, env, runner):
        src = self.source(kind, identity)
        try:
            value = runner(argv, env=env)
            src.update(result='ok', read_complete=True, reason='selected')
            return value, src['alias']
        except Exception:
            self.diagnostic('unavailable')
            src.update(reason='failed')
            return None, src['alias']
        finally:
            src['observed_at'] = now()

    def collect(self, runner=ORCA.read, native_runner=ORCA.read):
        self.data['diagnostics'] = []
        env = {k:v for k,v in os.environ.items() if not k.startswith('GIT_CONFIG')}
        # Offline transport is explicit test-only; production never silently falls back.
        config = private_path(env.get('NEXUS_GITHUB_CONFIG', str(ROOT/'local/github.json')))
        mapping = ORCA.literal(config.read_bytes())
        require(mapping.get('repositories', {}).get('nexus', {}).get('repository') == self.scope['provider_repository'])
        project, project_src = self.provider('github-project','nexus',
            ['bash',str(ROOT/'scripts/projects.sh'),'read','nexus'],env,runner)
        if project and project.get('repository') != 'nexus':
            project = None
            self.diagnostic('identity')
        for number in self.scope['issues']:
            url = 'https://github.com/'+self.scope['provider_repository']+'/issues/'+str(number)
            issue, src = self.provider('github-issue',url,
                ['bash',str(ROOT/'scripts/work-items.sh'),'issue-read',self.scope['provider_repository'],str(number)],env,runner)
            if not issue:
                continue
            if not (issue.get('id') == url and issue.get('repository') == self.scope['provider_repository'] and
                    issue.get('provider') == 'github' and issue.get('kind') == 'issue' and issue.get('number') == number):
                self.diagnostic('identity')
                continue
            workflow = None
            rows = [row for row in (project or {}).get('work_items', []) if row.get('work_item_id') == url]
            if len(rows) > 1:
                self.diagnostic('conflict')
            elif rows and rows[0].get('fields',{}).get('status') in WORKFLOW:
                workflow = rows[0]['fields']['status']
            self.data['work_items'].append(dict(alias=self.alias('work',url), url=url, number=number,
                label='Issue #'+str(number), record_state=issue.get('record_state') if issue.get('record_state') in ('open','closed') else 'unknown',
                workflow=workflow, source=src, workflow_source=project_src if workflow else None, observed_at=now()))
        native = ORCA.collect(self.scope,self.source,self.diagnostic,runner=native_runner)
        workspaces = {w['id']:w for w in native['workspaces']}
        for work in native['workspaces']:
            work['alias'] = self.alias('workspace','local:'+work['instance'])
            self.data['workspaces'].append(dict(alias=work['alias'], label='Workspace '+str(len(self.data['workspaces'])+1),
                board=work['board'], source=work['source'], observed_at=now()))
        attempts = {}
        for task in native['attempts']:
            alias = self.alias('attempt',task['run']+':'+task['task']+':'+task['dispatch'])
            attempts[task['dispatch']] = alias
            self.data['tasks'].append(dict(alias=alias,task_alias=self.alias('task',task['run']+':'+task['task']),
                workspace=workspaces[task['workspace']]['alias'],stage=task['stage'],result=task['result'],source=task['source'],observed_at=now()))
        sessions = {}
        for session in native['sessions']:
            alias = self.alias('session','local:'+workspaces[session['workspace']]['instance']+':'+session['process'])
            sessions[session['terminal']] = alias
            self.data['sessions'].append(dict(alias=alias,label='Agent '+str(len(self.data['sessions'])+1),kind='terminal-agent',
                workspace=workspaces[session['workspace']]['alias'],agent_liveness=session['agent_liveness'],pty_liveness=session['pty_liveness'],
                continuity='unknown',source=session['source'],observed_at=now()))
        works = {w['url']:w['alias'] for w in self.data['work_items']}

        def relation(wid,url,terminal,dispatch,kind,src):
            if wid not in workspaces or url not in works or terminal is not None and terminal not in sessions:
                return
            self.data['relations'].append(dict(alias=self.alias('relation',kind+':'+wid+':'+url+':'+str(terminal)+':'+str(dispatch)),
                workspace=workspaces[wid]['alias'],work_item=works[url],session=sessions.get(terminal),task=attempts.get(dispatch),
                kind=kind,status='observed',source=src,observed_at=now()))

        for link in native['links']:
            # Session pairing requires both explicit native linkage and a matching observed assignment.
            session = next((s for s in native['sessions'] if s['terminal'] == link['terminal'] and s.get('dispatch') in attempts), None)
            if link['terminal'] is None or session:
                relation(link['workspace'],link['issue_url'],link['terminal'],session.get('dispatch') if session else None,'native-linked',link['source'])
        for binding in self.scope['bindings']:
            src = self.source('operator-binding',binding['dispatch'])
            matches = [s for s in native['sessions'] if all(s.get(k) == binding[k] for k in
                ('run','task','dispatch','workspace','terminal','incarnation')) and binding['dispatch'] in attempts]
            if len(matches) == 1:
                # Competing native links are conflicts, never newest-wins.
                incompatible = any(l['terminal'] == binding['terminal'] and l['issue_url'] != binding['issue_url'] for l in native['links'])
                if incompatible:
                    self.diagnostic('conflict')
                    src.update(result='conflict',reason='identity')
                    for r in self.data['relations']:
                        if r['session'] == sessions[binding['terminal']]:
                            r['status'] = 'conflict'
                else:
                    src.update(result='ok',read_complete=True,reason='selected')
                    relation(binding['workspace'],binding['issue_url'],binding['terminal'],binding['dispatch'],'operator-declared',src['alias'])
            else:
                self.diagnostic('identity')
                src.update(result='conflict',reason='identity')
            src['observed_at'] = now()
        for name in ('work_items','workspaces','tasks','sessions'):
            self.data['coverage']['observed_'+name] = len(self.data[name])
        self.data['coverage'].update(omitted_tasks=native['omitted_tasks'],omitted_sessions=native['omitted_sessions'])
        self.data['observed_at'] = now()
        self.data['collection_state'] = 'partial' if self.data['diagnostics'] else 'observed'
        return self.data


def validate(data):
    """Second output boundary: every string is controlled, aliased or canonical."""
    limits = {'sources':128,'work_items':16,'workspaces':16,'tasks':32,'sessions':32,'relations':64,'diagnostics':16}
    keys(data, 'kind office_version scope_alias capture_alias started_at observed_at collection_state repository selection sources work_items workspaces tasks sessions relations coverage diagnostics')
    schemas = {'sources':'alias kind started_at observed_at result read_complete inventory_complete reason',
      'work_items':'alias url number label record_state workflow source workflow_source observed_at',
      'workspaces':'alias label board source observed_at',
      'tasks':'alias task_alias workspace stage result source observed_at',
      'sessions':'alias label kind workspace agent_liveness pty_liveness continuity source observed_at',
      'relations':'alias workspace work_item session task kind status source observed_at'}
    aliases = set()
    for name, limit in limits.items():
        require(type(data[name]) is list)
        if len(data[name]) > limit:
            raise OverflowError('overflow')
        if name in schemas:
            for row in data[name]:
                keys(row, schemas[name])
                require(row['alias'] not in aliases)
                aliases.add(row['alias'])
    sources = {row['alias'] for row in data['sources']}
    groups = {name:{row['alias'] for row in data[name]} for name in ('work_items','workspaces','tasks','sessions')}
    for name in groups:
        require(data['coverage']['observed_'+name] == len(data[name]))
        for row in data[name]:
            require(row['source'] in sources)
    for row in data['relations']:
        require(row['source'] in sources and row['workspace'] in groups['workspaces'] and row['work_item'] in groups['work_items'])
        require(row['session'] is None or row['session'] in groups['sessions'])
        require(row['task'] is None or row['task'] in groups['tasks'])
    require(data['coverage']['global_complete'] is False)
    require(data['kind'] == 'nexus-office-presentation' and data['office_version'] == 1)
    require(data['collection_state'] in ('collecting','observed','partial','unavailable'))
    if data['collection_state'] in ('collecting','unavailable'):
        require(all(not data[name] for name in groups) and not data['relations'])
    allowed = set(WORKFLOW) | set('nexus-office-presentation collecting observed partial unavailable github-issue github-project orca-workspace orca-task-index orca-worker orca-terminal orca-reference operator-binding ok conflict overflow selected unknown truncated unsupported failed identity time todo in-progress in-review completed pending dispatched blocked succeeded superseded terminal-agent live exited native-linked operator-declared open closed'.split())
    def visit(value):
        if type(value) is dict:
            for item in value.values():
                visit(item)
        elif type(value) is list:
            for item in value:
                visit(item)
        elif type(value) is str:
            require(value in allowed or re.fullmatch(r'display-[a-z]+-[a-f0-9]{16}',value) or
                    re.fullmatch(r'https://github\.com/2muni-labs/nexus(?:/issues/[1-9][0-9]*)?',value) or
                    re.fullmatch(r'(?:Issue #|Workspace |Agent )[1-9][0-9]*',value) or
                    re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z',value))
        else:
            require(value is None or type(value) is bool or type(value) is int and 0 <= value < 2**53)
    visit(data)
    raw = json.dumps(data,separators=(',',':'),ensure_ascii=True).encode()
    require(len(raw) <= MAX_BYTES)
    return raw


def output_target(path):
    path = private_path(path)
    runtime = ROOT/'.runtime'
    require(path.is_relative_to(runtime) and path.suffix == '.json' and path.parent.is_dir())
    directory = path.parent
    while directory != runtime or directory == path.parent:
        require(directory.stat().st_uid == os.getuid() and not directory.stat().st_mode & 0o077)
        if directory == runtime:
            break
        directory = directory.parent
    if path.exists():
        info = path.stat()
        require(stat.S_ISREG(info.st_mode) and info.st_uid == os.getuid() and info.st_nlink == 1 and not info.st_mode & 0o077)
    return path


def atomic(path, data):
    raw = validate(data)
    fd, temporary = tempfile.mkstemp(prefix='.office-',dir=path.parent)
    try:
        with os.fdopen(fd,'wb') as stream:
            stream.write(raw)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary,path)
        directory = os.open(path.parent,os.O_RDONLY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--scope',required=True)
    parser.add_argument('--output',required=True)
    args = parser.parse_args(argv)
    installed = False
    lock = None
    capture = None
    try:
        scope = load_scope(args.scope)
        target = output_target(args.output)
        require(not private_path(args.scope).is_relative_to(target.parent))
        lock = target.with_suffix('.json.lock')
        descriptor = os.open(lock,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
        os.close(descriptor)
        capture = Capture(scope)
        atomic(target,capture.data)
        installed = True
        try:
            data = capture.collect()
            atomic(target,data)
        except (Exception, KeyboardInterrupt) as error:
            data = capture.data
            for name in ('sources','work_items','workspaces','tasks','sessions','relations'):
                data[name] = []
            for name in ('work_items','workspaces','tasks','sessions'):
                data['coverage']['observed_'+name] = 0
            data.update(collection_state='unavailable',observed_at=now(),diagnostics=['overflow' if isinstance(error, OverflowError) else 'unavailable'])
            atomic(target,data)
        print('presentation installed: '+capture.data['collection_state'])
        return 0 if capture.data['collection_state'] == 'observed' else 2
    except (Exception, KeyboardInterrupt):
        print('collection failed: '+('pending copy installed' if installed else 'no update installed'),file=sys.stderr)
        return 1
    finally:
        # A failed exclusive create never owns somebody else’s lock.
        if lock is not None and 'descriptor' in locals():
            lock.unlink(missing_ok=True)


if __name__ == '__main__':
    sys.exit(main())
