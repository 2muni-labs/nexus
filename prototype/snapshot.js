/* Display data only; not a backend receipt or policy input. Classic script for file://. */
(function (root) {
  'use strict';
  const MAX_BYTES = 16384;
  const workflow = ['Backlog', 'Ready', 'In Progress', 'Blocked', 'Review', 'Done'];
  const execution = ['running', 'awaiting_input', 'succeeded', 'failed', 'cancelled', 'unknown'];
  function object(value, keys) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) throw Error('지원하지 않는 데이터 형식입니다.');
  }
  function text(value, max, nullable) {
    if (nullable && value == null) return null;
    if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]|(?:file:\/\/|[A-Za-z]:\\|(?:^|\s|["'(])\/[A-Za-z0-9_.~-]+\/)|\b(?:term|ctx|task|run|wtr)_[A-Za-z0-9-]+/i.test(value)) throw Error('문자열 길이 또는 비공개 경로·식별자를 확인하세요.');
    return value.trim();
  }
  function status(value, allowed) {
    const label = text(value, 80, true);
    return allowed.includes(label) ? label : null;
  }
  function parse(raw) {
    if (new TextEncoder().encode(raw).length > MAX_BYTES) throw Error('파일은 16 KiB 이하여야 합니다.');
    let value;
    try { value = JSON.parse(raw); } catch (_) { throw Error('JSON을 읽을 수 없습니다.'); }
    object(value, value.version === 2 ? ['version', 'observed_at', 'work', 'execution', 'office'] : ['version', 'observed_at', 'work', 'execution']);
    if (![1, 2].includes(value.version)) throw Error('version: 1 또는 2 형식만 지원합니다.');
    if (value.version === 2) { uniqueKeys(raw); privateBoundary(value); }
    const observed = text(value.observed_at, 30, false);
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(observed) || !Number.isFinite(Date.parse(observed)) || new Date(observed).toISOString() !== observed.replace(/Z$/, observed.includes('.') ? 'Z' : '.000Z')) throw Error('관찰 시각은 유효한 UTC ISO 시각이어야 합니다.');
    object(value.work, ['url', 'title', 'workflow_status']);
    const url = value.work.url;
    if (typeof url !== 'string' || url.length > 300) throw Error('Issue 주소를 확인하세요.');
    if (new URL(url).href !== url || !/^https:\/\/github\.com\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9_.-]+\/issues\/[1-9]\d*$/.test(url)) throw Error('정규 GitHub HTTPS Issue 주소가 필요합니다.');
    let result = null;
    if (value.execution != null) {
      object(value.execution, ['status', 'source']);
      result = {status: status(value.execution.status, execution), source: text(value.execution.source, 240, true)};
    }
    const parsed = {version: value.version, observed_at: observed, work: {url, title: text(value.work.title, 160, false), workflow_status: status(value.work.workflow_status, workflow)}, execution: result};
    if (value.version === 2) parsed.office = office(value.office);
    return parsed;
  }
  // JSON.parse keeps only the last repeated key; reject ambiguous v2 input first.
  function uniqueKeys(raw) {
    const stack = [];
    for (const match of raw.matchAll(/"(?:\\[\s\S]|[^"\\])*"|[{}\[\]]/g)) {
      const token = match[0];
      if (token === '{' || token === '[') stack.push(token === '{' ? new Set() : null);
      else if (token === '}' || token === ']') stack.pop();
      else if (/^\s*:/.test(raw.slice(match.index + token.length))) {
        const keys = stack[stack.length - 1];
        const key = JSON.parse(token);
        if (keys?.has(key)) throw Error('중복 JSON 키는 지원하지 않습니다.');
        keys?.add(key);
      }
    }
  }
  // V2 is one manually sanitized display record, never an adapter receipt.
  function privateBoundary(value) {
    const visit = item => {
      if (typeof item === 'string') {
        if (/[<>`\\]|[\u0000-\u001f\u007f]|(?:^|[\s"'(=])(?:\/|~\/)|\b(?:file:|https?:)(?!\/\/github\.com\/)|\b(?:term|ctx|task|run|wtr|repo|session|dispatch)_[a-z0-9-]+|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|\b(?:gh[pousr]_|github_pat_|sk-|AKIA|ASIA)|(?:password|secret|token|api[_ -]?key|private[_ -]?key)\s*[:=]|\bbearer\s+\S+|BEGIN .*PRIVATE KEY|(?:transcript|rollout)\s*[:=]/i.test(item)) throw Error('비공개 경로·영수증·비밀·마크업을 제거하세요.');
        if (item.length > 300) throw Error('문자열 한도를 초과했습니다.');
      } else if (item && typeof item === 'object') Object.values(item).forEach(visit);
    };
    visit(value);
  }
  function exact(value, keys, optional = []) {
    object(value, keys);
    if (keys.some(key => !optional.includes(key) && !Object.hasOwn(value, key))) throw Error('v2 필수 필드를 확인하세요.');
  }
  function time(value) {
    const result = text(value, 30, false);
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(result) || !Number.isFinite(Date.parse(result)) || new Date(result).toISOString() !== result.replace(/Z$/, result.includes('.') ? 'Z' : '.000Z')) throw Error('유효한 UTC ISO 시각이 필요합니다.');
    return result;
  }
  function alias(value, nullable = false) {
    if (nullable && value === null) return null;
    if (typeof value !== 'string' || !/^display-[a-z0-9][a-z0-9-]{0,32}$/.test(value)) throw Error('display- 표시 별칭이 필요합니다.');
    return value;
  }
  function nullableEnum(value, values) {
    if (value !== null && typeof value !== 'string') throw Error('상태 형식을 확인하세요.');
    return values.includes(value) ? value : null;
  }
  function office(value) {
    if (value == null) return null;
    exact(value, ['source', 'observed_at', 'coverage', 'repository', 'workspace', 'session', 'assignment', 'retention'], ['source', 'repository', 'workspace', 'session', 'assignment', 'retention']);
    if (value.coverage !== 'single-record') throw Error('single-record 범위만 지원합니다.');
    const out = {source: text(value.source, 240, true), observed_at: time(value.observed_at), coverage: value.coverage};
    for (const name of ['repository', 'workspace', 'session', 'assignment', 'retention']) {
      const part = value[name];
      if (part == null) { out[name] = null; continue; }
      if (name === 'repository') {
        exact(part, ['alias', 'label', 'url']);
        if (typeof part.url !== 'string' || !/^https:\/\/github\.com\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9_.-]+$/.test(part.url) || new URL(part.url).href !== part.url || /\/(?:\.|\.\.)$/.test(part.url)) throw Error('정규 GitHub 저장소 주소가 필요합니다.');
        out[name] = {alias: alias(part.alias), label: text(part.label, 80, false), url: part.url};
      } else if (name === 'workspace') {
        exact(part, ['alias', 'label', 'repository']);
        out[name] = {alias: alias(part.alias), label: text(part.label, 80, false), repository: alias(part.repository)};
      } else if (name === 'session') {
        exact(part, ['alias', 'label', 'workspace', 'liveness', 'source', 'observed_at'], ['source']);
        out[name] = {alias: alias(part.alias), label: text(part.label, 80, false), workspace: alias(part.workspace, true), liveness: nullableEnum(part.liveness, ['live', 'exited', 'unknown']), source: text(part.source, 240, true), observed_at: time(part.observed_at)};
      } else if (name === 'assignment') {
        exact(part, ['session', 'workspace', 'work_url', 'source', 'observed_at'], ['source']);
        if (typeof part.work_url !== 'string' || !/^https:\/\/github\.com\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9_.-]+\/issues\/[1-9]\d*$/.test(part.work_url) || new URL(part.work_url).href !== part.work_url) throw Error('배정 Issue 주소를 확인하세요.');
        out[name] = {session: alias(part.session), workspace: alias(part.workspace), work_url: part.work_url, source: text(part.source, 240, true), observed_at: time(part.observed_at)};
      } else {
        exact(part, ['state', 'source'], ['source']);
        out[name] = {state: nullableEnum(part.state, ['retained', 'removed', 'unknown']), source: text(part.source, 240, true)};
      }
    }
    return out;
  }
  function association(snapshot, now = Date.now()) {
    const bundle = snapshot.office;
    const conflicts = [];
    const missing = [];
    const dates = [snapshot.observed_at];
    if (!bundle) return {state: 'missing', attached: false, conflicts, missing: ['office'], temporal: temporal(dates, now)};
    dates.push(bundle.observed_at);
    const {repository: repo, workspace: desk, session, assignment: relation, retention} = bundle;
    for (const key of ['repository', 'workspace', 'session', 'assignment']) if (!bundle[key]) missing.push(key);
    if (!bundle.source) missing.push('office.source');
    const aliases = [repo?.alias, desk?.alias, session?.alias].filter(Boolean);
    if (new Set(aliases).size !== aliases.length) conflicts.push('duplicate aliases');
    if (repo && snapshot.work.url.slice(0, snapshot.work.url.indexOf('/issues/')) !== repo.url) conflicts.push('repository / Issue');
    if (repo && desk && desk.repository !== repo.alias) conflicts.push('workspace / repository');
    if (session) {
      dates.push(session.observed_at);
      if (!session.source) missing.push('session.source');
      if (!session.workspace) missing.push('session.workspace');
      else if (desk && session.workspace !== desk.alias) conflicts.push('session / workspace');
    }
    if (relation) {
      dates.push(relation.observed_at);
      if (!relation.source) missing.push('assignment.source');
      if (session && relation.session !== session.alias) conflicts.push('assignment / session');
      if (desk && relation.workspace !== desk.alias) conflicts.push('assignment / workspace');
      if (relation.work_url !== snapshot.work.url) conflicts.push('assignment / Issue');
    }
    if (Date.parse(bundle.observed_at) > Date.parse(snapshot.observed_at) || [session, relation].some(part => part && Date.parse(part.observed_at) > Date.parse(bundle.observed_at))) conflicts.push('inconsistent observation times');
    if (session?.liveness === 'exited' && relation) conflicts.push('exited session / assignment');
    if (retention?.state === 'removed' && relation) conflicts.push('removed workspace / assignment');
    if (relation && session && (!session.workspace || session.workspace !== relation.workspace)) conflicts.push('session / assignment workspace');
    const state = conflicts.length ? 'conflict' : missing.length ? 'missing' : 'associated';
    const dateState = conflicts.includes('inconsistent observation times') ? 'inconsistent' : temporal(dates, now);
    return {state, attached: state === 'associated' && dateState !== 'future', conflicts, missing, temporal: dateState};
  }
  function temporal(dates, now) {
    if (dates.some(date => Date.parse(date) > now)) return 'future';
    return dates.some(date => now - Date.parse(date) > 86400000) ? 'stale' : 'observation-copy';
  }
  const api = {parse, association, temporal, MAX_BYTES};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.officeSnapshot = api;
})(typeof window === 'undefined' ? globalThis : window);
