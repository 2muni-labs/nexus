/* Selected-work display only; no trust, acceptance, collection or policy evaluation. */
(function (root) {
  'use strict';
  const labels = {draft: 'Draft', ready: 'Ready · 승인 아님', success: '성공', failure: '실패', pending: '대기',
    cancelled: '취소', submitted: '제출됨 · 승인 아님', approved: '승인 주장 · 인증 안 됨',
    changes_requested: '변경 요청', commented: '의견', PASS: 'PASS 주장 · 수락 아님', FAIL: 'FAIL', 'NEEDS-WORK': 'NEEDS-WORK'};
  function rows(snapshot, now = Date.now()) {
    const e = snapshot?.version === 2 ? snapshot.evidence : null, candidate = e?.candidate;
    function age(part) {
      if (!part?.revision || !part.source || !part.observed_at || !part.url) return '불완전한 근거';
      const stamp = Date.parse(part.observed_at), rootTime = Date.parse(snapshot.observed_at);
      if (stamp > now || rootTime > now) return '미래 시각';
      if (stamp > rootTime) return '관찰 시각 충돌';
      if (now - stamp > 86400000 || now - rootTime > 86400000) return '오래된 관찰 · 24시간 초과';
      return '';
    }
    let candidateReason = age(candidate);
    if (!candidateReason && e?.pr?.revision && e.pr.revision !== candidate.revision) candidateReason = 'PR candidate revision 불일치';
    function row(label, part, kind) {
      let reason = candidateReason || age(part);
      if (!reason && part.revision !== candidate.revision) reason = 'candidate revision 불일치';
      if (!reason && kind !== 'candidate' && (!part.state || part.state === 'unknown')) reason = '결과 미확인';
      if (!reason && kind === 'ci' && !part.label) reason = 'CI 이름 미확인';
      if (!reason && ['review', 'validation'].includes(kind) && (!e.pr || age(e.pr) || e.pr.revision !== candidate.revision || part.url !== e.pr.url)) reason = 'PR 연결 미확인';
      if (!reason && kind === 'validation' && part.independent !== true) reason = '독립 검증 미확인';
      return {label, state: reason ? '미확인 · ' + reason : kind === 'candidate' ? 'revision 관찰 주장' : labels[part.state],
        claim: kind === 'candidate' ? null : labels[part?.state] || null, revision: part?.revision || null, source: part?.source || null, observed_at: part?.observed_at || null, url: part?.url || null};
    }
    return [row('Candidate · PR 기준 revision', candidate, 'candidate'), row('PR · 공개 준비', e?.pr, 'pr'),
      ...(e?.ci?.length ? e.ci.map((part, i) => row('CI ' + (i + 1) + ' · ' + (part.label || '이름 미확인'), part, 'ci')) : [row('CI · 관찰 없음', null, 'ci')]),
      row('Review · 결정', e?.review, 'review'), row('독립 검증 · 결과', e?.validation, 'validation')];
  }
  function render(container, snapshot, options = {}) {
    const doc = container.ownerDocument;
    container.replaceChildren();
    const heading = doc.createElement('h3'); heading.textContent = '선택 작업 근거';
    const notice = doc.createElement('p'); notice.className = 'evidence-notice';
    notice.textContent = options.fictional ? '가상 DEMO · 실제 관찰 아님' : '수동 가져오기 · 미검증 주장 · 출처 인증 안 됨';
    const coverage = doc.createElement('p'); coverage.className = 'evidence-notice'; coverage.textContent = 'CI는 제공된 관찰만 · 전체·필수 체크 범위 미확인';
    const list = doc.createElement('dl');
    if (!snapshot) notice.textContent = '선택한 작업의 근거 없음 · 미확인';
    for (const row of rows(snapshot, options.now)) {
      const term = doc.createElement('dt'); term.textContent = row.label;
      const detail = doc.createElement('dd');
      const state = doc.createElement('strong'); state.textContent = row.state; detail.append(state);
      if (row.claim && row.state.startsWith('미확인')) { const claim = doc.createElement('small'); claim.textContent = '기록된 주장: ' + row.claim; detail.append(claim); }
      if (row.revision) { const rev = doc.createElement('code'); rev.textContent = row.revision.slice(0, 8); rev.title = row.revision; detail.append(rev); }
      if (row.source || row.observed_at || row.revision || row.url) {
        const provenance = doc.createElement('details');
        const summary = doc.createElement('summary'); summary.textContent = '출처 · 시각 · revision'; provenance.append(summary);
        const facts = doc.createElement('small'); facts.textContent = `${row.source || '출처 미확인'} · ${row.observed_at || '시각 미확인'}`; provenance.append(facts);
        if (row.revision) { const full = doc.createElement('code'); full.textContent = row.revision; provenance.append(full); }
        if (row.url) { const link = doc.createElement('a'); link.href = row.url; link.textContent = 'GitHub 근거 열기'; link.target = '_blank'; link.rel = 'noopener noreferrer'; provenance.append(link); }
        detail.append(provenance);
      }
      list.append(term, detail);
    }
    const limit = doc.createElement('p'); limit.className = 'evidence-notice';
    limit.textContent = 'CI 성공 ≠ Review 승인 ≠ 독립 검증 ≠ 수락 · merge · Done. 이 패널은 어느 권한도 부여하지 않습니다.';
    container.append(heading, notice, coverage, list, limit);
  }
  const api = {rows, render};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.officeEvidence = api;
})(typeof window === 'undefined' ? globalThis : window);
