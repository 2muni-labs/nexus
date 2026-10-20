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
    object(value, ['version', 'observed_at', 'work', 'execution']);
    if (value.version !== 1) throw Error('version: 1 형식만 지원합니다.');
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
    return {version: 1, observed_at: observed, work: {url, title: text(value.work.title, 160, false), workflow_status: status(value.work.workflow_status, workflow)}, execution: result};
  }
  const api = {parse, MAX_BYTES};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.officeSnapshot = api;
})(typeof window === 'undefined' ? globalThis : window);
