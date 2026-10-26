"""Presentation-only Orca metadata boundary. Never performs lifecycle/control calls."""
import json
import os
import shutil
import subprocess
import time

LIMIT = 2 * 1024 * 1024


class ReadError(Exception):
    pass


def literal(raw):
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ReadError('unsupported')
            result[key] = value
        return result
    return json.loads(raw, object_pairs_hook=pairs)


def read(argv, env=None):
    """Bound memory while reading; fixed diagnostics never forward stderr."""
    import selectors
    with subprocess.Popen(argv, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                          env=env, start_new_session=True) as child:
        output = bytearray()
        selector = selectors.DefaultSelector()
        selector.register(child.stdout, selectors.EVENT_READ)
        deadline = time.monotonic() + 45
        try:
            while selector.get_map():
                if time.monotonic() > deadline:
                    raise ReadError('failed')
                for key, _ in selector.select(.1):
                    data = os.read(key.fd, 65536)
                    if not data:
                        selector.unregister(key.fileobj)
                        continue
                    output.extend(data)
                    if len(output) > LIMIT:
                        raise ReadError('overflow')
            if child.wait(timeout=max(.01, deadline-time.monotonic())):
                raise ReadError('failed')
            return literal(output)
        except (ValueError, OSError, subprocess.TimeoutExpired):
            raise ReadError('unsupported') from None
        finally:
            selector.close()
            if child.poll() is None:
                import signal
                os.killpg(child.pid, signal.SIGKILL)
                child.wait()


def executable():
    command = os.environ.get('ORCA_CLI_COMMAND')
    if not command:
        command = 'orca-dev' if os.environ.get('ORCA_DEV_REPO_ROOT') else 'orca'
        if os.uname().sysname == 'Linux' and not os.environ.get('ORCA_SESSION_ID'):
            command = 'orca-ide'
    if not shutil.which(command):
        raise ReadError('failed')
    return command


def collect(scope, source, diagnostic, runner=read):
    """Return only whitelisted native identity edges; caller aliases them before output."""
    command = executable()
    runtime = scope['runtime_id']
    repo = scope['repo_id']
    result = {'workspaces': [], 'attempts': [], 'sessions': [], 'links': [],
              'omitted_tasks': None, 'omitted_sessions': None}

    def call(kind, key, args):
        src = source(kind, key)
        try:
            envelope = runner([command, *args, '--json'])
            if envelope.get('ok') is not True or envelope.get('_meta', {}).get('runtimeId') != runtime:
                raise ReadError('identity')
            value = envelope['result']
            if type(value) is not dict:
                raise ReadError('unsupported')
            src.update(result='ok', read_complete=True, reason='selected')
            return value, src['alias']
        except (ReadError, KeyError, TypeError, ValueError) as error:
            code = str(error) if str(error) in ('identity', 'overflow', 'failed') else 'unsupported'
            src.update(result='overflow' if code == 'overflow' else 'unavailable', reason=code)
            diagnostic(code)
            return None, src['alias']
        finally:
            src['observed_at'] = source.now()

    def status():
        value, _ = call('orca-workspace', 'runtime', ['status'])
        return bool(value and value.get('runtime', {}).get('runtimeId') == runtime and
                    value.get('runtime', {}).get('state') == 'ready' and
                    value.get('runtime', {}).get('appVersion') == '1.4.240')

    if not status():
        diagnostic('identity')
        return result
    # Guidance is version-bound. These calls read no account/config/transcript data.
    for guide in ('orchestration', 'orca-cli'):
        try:
            value = runner([command, 'skills', 'get', guide, '--json'])
            if value.get('name') != guide or type(value.get('markdown')) is not str:
                raise ReadError('unsupported')
        except (ReadError, ValueError, TypeError):
            diagnostic('unsupported')
            return result

    native = {}

    def workspace(expected):
        value, src = call('orca-workspace', expected['id'],
                          ['worktree', 'show', '--worktree', expected['selector']])
        work = (value or {}).get('worktree', {})
        if not (work.get('id') == expected['id'] and work.get('repoId') == repo and
                work.get('projectId') == 'github:' + scope['provider_repository'] and
                work.get('hostId') == 'local' and work.get('instanceId') == expected['instance_id'] and
                work.get('identity', {}).get('instanceId') == expected['instance_id'] and
                work.get('identity', {}).get('executionHostId') == 'local'):
            diagnostic('identity')
            return None
        return {'id': expected['id'], 'instance': expected['instance_id'], 'source': src,
                'board': work.get('workspaceStatus') if work.get('workspaceStatus') in
                ('todo', 'in-progress', 'in-review', 'completed') else 'unknown'}

    for expected in scope['workspaces']:
        work = workspace(expected)
        if not work:
            continue
        native[work['id']] = work
        result['workspaces'].append(work)
        value, src = call('orca-terminal', work['id'],
                          ['terminal', 'list', '--worktree', expected['selector'], '--limit', '33'])
        if not value:
            continue
        rows = value.get('terminals')
        hosts = value.get('hostScope', {})
        if type(rows) is not list or hosts.get('hostIds') != ['local'] or hosts.get('omittedHostIds') != []:
            diagnostic('unsupported')
            continue
        if value.get('truncated') is not False or len(rows) > 32 or value.get('totalCount') != len(rows):
            diagnostic('overflow')
            result['omitted_sessions'] = max(1, value.get('totalCount', 33)-32) if type(value.get('totalCount')) is int else None
            continue
        for row in rows:
            # Explicit process identity, never lastOutputAt/preview/agentWait.
            if row.get('agentIdentity') not in ('codex', 'claude', 'omp', 'pi', 'grok'):
                continue
            if (row.get('worktreeId') != work['id'] or row.get('executionHostId') != 'local' or
                    type(row.get('handle')) is not str or type(row.get('incarnationId')) is not str or
                    type(row.get('ptyId')) is not str or row.get('orphaned') is not False):
                diagnostic('identity')
                continue
            if len(result['sessions']) >= 32:
                diagnostic('overflow')
                result['omitted_sessions'] = (result['omitted_sessions'] or 0)+1
                continue
            result['sessions'].append({'terminal': row['handle'], 'incarnation': row['incarnationId'],
                'process': row['ptyId']+':'+row['incarnationId'], 'workspace': work['id'],
                'agent_liveness': 'unknown', 'pty_liveness': 'unknown', 'source': src})

    for run in scope['runs']:
        index, _ = call('orca-task-index', run, ['orchestration', 'task-list', '--run', run, '--brief'])
        if (not index or index.get('runId') != run or type(index.get('tasks')) is not list or
                len(index['tasks']) > 400 or index.get('count') != len(index['tasks'])):
            diagnostic('unsupported')
            continue
        tasks = {t.get('id'): t for t in index['tasks'] if t.get('run_id') == run}
        cursor = None
        seen = set()
        for page_index in range(4):
            args = ['orchestration', 'worker-list', '--run', run, '--include-remote']
            if cursor is not None:
                args += ['--cursor', cursor]
            value, _ = call('orca-worker', run+':'+str(page_index), args)
            if not value or value.get('scope', {}).get('run') != run or type(value.get('workers')) is not list:
                diagnostic('identity')
                break
            if len(value['workers']) > 100:
                diagnostic('overflow')
                break
            for row in value['workers']:
                projection = row.get('projection', {})
                wid = projection.get('workspace', {}).get('id')
                if wid not in native:
                    continue
                dispatch, task = row.get('dispatchId'), row.get('taskId')
                if (dispatch in seen or task not in tasks or row.get('runId') != run or
                        projection.get('dispatchId') != dispatch or projection.get('taskId') != task or
                        projection.get('runId') != run or projection.get('host', {}).get('id') != 'local'):
                    diagnostic('identity')
                    continue
                seen.add(dispatch)
                if len(result['attempts']) >= 32:
                    diagnostic('overflow')
                    result['omitted_tasks'] = 1
                    continue
                exact, src = call('orca-worker', dispatch, ['orchestration', 'worker-show', '--dispatch', dispatch])
                if not exact:
                    continue
                d, w, p = exact.get('dispatch', {}), exact.get('worker', {}), exact.get('projection', {})
                if not (d.get('id') == dispatch and d.get('taskId') == task and d.get('runId') == run and
                        w.get('dispatchId') == dispatch and w.get('runtimeEpoch') == runtime and
                        w.get('worktreeId') == wid and p.get('dispatchId') == dispatch and
                        p.get('taskId') == task and p.get('runId') == run and
                        p.get('workspace', {}).get('id') == wid and p.get('host', {}).get('id') == 'local'):
                    diagnostic('identity')
                    continue
                outcome = 'unknown'
                if (d.get('status') == 'completed' and p.get('stage', {}).get('dispatch') == 'completed' and
                        p.get('evidence', {}).get('durable') is True and
                        p.get('outcome') in ('succeeded', 'failed', 'superseded')):
                    outcome = p['outcome']
                elif d.get('status') == 'dispatched':
                    outcome = 'in-progress'
                result['attempts'].append({'run': run, 'task': task, 'dispatch': dispatch, 'workspace': wid,
                    'stage': d.get('status') if d.get('status') in ('pending', 'dispatched', 'completed', 'blocked') else 'unknown',
                    'result': outcome, 'source': src})
                terminal = exact.get('terminal') or {}
                for session in result['sessions']:
                    if session['workspace'] != wid or session['terminal'] != d.get('assigneeHandle'):
                        continue
                    if (terminal.get('handle') != session['terminal'] or
                            terminal.get('incarnationId') != session['incarnation'] or
                            d.get('processIncarnation') != session['process'] or
                            terminal.get('worktreeId') != wid):
                        diagnostic('identity')
                        continue
                    live = p.get('liveness', {}).get('verdict')
                    session['agent_liveness'] = live if (live == 'live' and p.get('evidence', {}).get('liveStatus') == 'fresh' and type(p.get('liveness', {}).get('observedAt')) is int and 0 <= int(time.time()*1000)-p['liveness']['observedAt'] <= 300000 or live == 'exited' and p.get('liveness', {}).get('source') in ('resource_release', 'agent_status')) else 'unknown'
                    live = exact.get('observation', {}).get('status')
                    session['pty_liveness'] = live if live in ('live', 'exited') else 'unknown'
                    session.update(dispatch=dispatch, task=task, run=run, source=src)
            page = value.get('page', {})
            if page.get('hasMore') is False:
                break
            cursor = page.get('nextCursor')
            if type(cursor) is not str or not cursor or page_index == 3:
                diagnostic('overflow')
                result['omitted_tasks'] = None
                break

    for issue in scope['issues']:
        url = 'https://github.com/'+scope['provider_repository']+'/issues/'+str(issue)
        value, src = call('orca-reference', url,
                          ['reference', 'find', url, '--repo', 'id:'+repo, '--limit', '33'])
        if not value or value.get('query') != url or value.get('scope', {}).get('source') != 'stored-metadata':
            diagnostic('identity')
            continue
        if value.get('truncated') is not False or type(value.get('matches')) is not list or len(value['matches']) > 32:
            diagnostic('overflow')
            continue
        for match in value['matches']:
            wid = match.get('workspace', {}).get('id')
            if wid not in native:
                continue
            if match.get('workspace', {}).get('hostId') != 'local' or match.get('reference', {}).get('url') != url:
                diagnostic('identity')
                continue
            result['links'].append({'workspace': wid, 'issue_url': url, 'terminal': None, 'source': src})
            for agent in match.get('agents', []):
                if agent.get('linked') is True:
                    result['links'].append({'workspace': wid, 'issue_url': url,
                                            'terminal': agent.get('terminal'), 'source': src})
    # A runtime/workspace replacement invalidates the capture rather than pairing stale edges.
    if not status() or any(not workspace(w) for w in scope['workspaces']):
        diagnostic('identity')
        for key in ('workspaces', 'attempts', 'sessions', 'links'):
            result[key] = []
    return result
