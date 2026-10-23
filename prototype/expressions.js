/* Pure presentation selector. Replay never changes an observation or proves current activity. */
(() => {
  'use strict';
  const symbols = {typing: '✦', waiting: '?', review: '▤', failed: '!', cancelled: '×', unknown: '?', static: '·'};
  function select({mode, sample, snapshot, movement, association, viewObservedAt = null, now = Date.now()}) {
    const result = (kind, eligible = false, reason = '', expiresAt = null) => ({kind, eligible, symbol: symbols[kind], reason, expiresAt});
    let execution, workflow;
    let expiresAt = null;
    if (mode === 'movement') {
      if (movement?.liveness !== 'present' || movement.assignment === null) return result('unknown', false, '배정·생존 미확인 또는 종료');
      if (movement.index === 6) return result('review', true, '가상 Review 관찰');
      return [2, 5, 11].includes(movement.index) ? result('typing', true, '가상 작업 관찰') : result('static');
    }
    if (mode === 'demo') {
      execution = sample?.executionStatus; workflow = sample?.workflowStatus;
      if (sample?.liveness !== 'live') return result('unknown', false, '가상 생존 미확인');
    } else {
      execution = snapshot?.execution?.status; workflow = snapshot?.work?.workflow_status;
      if (viewObservedAt && (!Number.isFinite(Date.parse(viewObservedAt)) || Date.parse(viewObservedAt) > now || now - Date.parse(viewObservedAt) > 86400000)) return result('unknown', false, '보기 관찰 시각 주의');
      // Negative/unknown outcomes retain their own distinct static symbols.
      if (execution === 'failed' || execution === 'cancelled') return result(execution);
      if (snapshot?.version !== 2) return result('unknown', false, 'v1 삽화 · 세션 아님');
      const relation = association(snapshot, now);
      if (!relation.attached || relation.temporal !== 'observation-copy' || snapshot.office?.session?.liveness !== 'live' || !snapshot.execution?.source) {
        return result('unknown', false, '시간·연결·생존·출처 근거 불충분');
      }
      expiresAt = Math.min(...[snapshot.observed_at, snapshot.office.observed_at,
        snapshot.office.session.observed_at, snapshot.office.assignment.observed_at].map(Date.parse)) + 86400000 + 1;
    }
    if (execution === 'failed' || execution === 'cancelled') return result(execution);
    if (!['running', 'awaiting_input', 'succeeded'].includes(execution)) return result('unknown');
    if (workflow === 'Review') return result('review', true, 'Review 시각 재현 · 승인 아님', expiresAt);
    if (execution === 'running') return result('typing', true, '작업 관찰의 시각 재현', expiresAt);
    if (execution === 'awaiting_input') return result('waiting', true, '입력 대기 관찰의 시각 재현', expiresAt);
    return result('static', false, '성공 결과 ≠ 현재 작업·Done');
  }
  function allowed(intent, hidden, reduced, state) { return Boolean(intent && !hidden && !reduced && state.eligible); }
  const api = {select, allowed};
  if (typeof module !== 'undefined') module.exports = api;
  else window.officeExpressions = api;
})();
