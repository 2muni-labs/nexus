(() => {
  'use strict';
  const demo = window.officeSamples;
  let samples = demo;
  let snapshot = null;
  let mode = 'demo';
  let importGeneration = 0;
  const byId = id => document.getElementById(id);
  const svgNS = 'http://www.w3.org/2000/svg';
  const colors = { mint: '#b6d6bc', peach: '#edc3ab', lavender: '#cab9e2', gray: '#c8c6d0' };
  function character(sample) {
    const ears = sample.accessory === 'ears'
      ? '<path d="M-22-36Q-36-71-18-61L-8-43M10-43Q23-75 31-58L25-32" fill="' + colors[sample.tone] + '" stroke="#8c7f92" stroke-width="2"/>'
      : '<path d="M0-40Q-17-68-21-53Q-19-39 0-40Q5-67 18-58Q25-44 0-40" fill="#94b397" stroke="#71947b" stroke-width="2"/>';
    const face = sample.tone === 'gray'
      ? '<path d="M-13-14h5M9-14h5M-3-1h7" stroke="#63596f" stroke-width="2.5" stroke-linecap="round"/>'
      : '<circle cx="-10" cy="-14" r="2.5" fill="#63596f"/><circle cx="12" cy="-14" r="2.5" fill="#63596f"/><path d="M-2-4Q2 1 6-4" fill="none" stroke="#63596f" stroke-width="2" stroke-linecap="round"/>';
    return '<ellipse cy="39" rx="32" ry="10" fill="#9b899d" opacity=".17"/><path d="M-24 39V21Q-22-1 0-1Q24 0 26 21V39" fill="' + colors[sample.tone] + '" stroke="#8c7f92" stroke-width="2"/>' + ears + '<path d="M-30-19Q-31-46 0-45Q33-45 33-18Q33 6 1 8Q-30 7-30-19" fill="#fff5de" stroke="#8c7f92" stroke-width="2"/>' + face + '<ellipse cx="-19" cy="-7" rx="5" ry="3" fill="#eec1b9"/><ellipse cx="22" cy="-7" rx="5" ry="3" fill="#eec1b9"/><path d="M-16 38v7M16 38v7" stroke="#8c7f92" stroke-width="5" stroke-linecap="round"/>';
  }
  const desks = document.getElementById('desks');
  function render() {
  desks.replaceChildren();
  byId('legend-items').replaceChildren();
  const isSnapshot = mode === 'snapshot';
  const observedStyle = {running: ['mint', '✦', '실행 중 관찰'], awaiting_input: ['peach', 'Ⅱ', '입력 대기 관찰'], succeeded: ['lavender', '◇', '성공 결과 관찰'], failed: ['peach', '!', '실패 결과 관찰'], cancelled: ['gray', 'Ⅱ', '취소 관찰']}[snapshot?.execution?.status] || ['gray', '?', '실행 미확인'];
  samples = isSnapshot ? (snapshot ? [{...demo[0], id: 'work', name: '작업 1', tone: observedStyle[0], icon: observedStyle[1], status: observedStyle[2], task: snapshot.work.title, bubble: '관찰 사본'}] : []) : demo;
  document.querySelector('.sample-tag').textContent = isSnapshot ? '◷ 스냅샷' : '✳ 데모 샘플';
  document.querySelector('.scene-caption span:last-child').textContent = isSnapshot ? (snapshot ? '작업 1개 · 삽화' : '관찰 미확인 · 빈 책상') : '가상 동료 4명';
  document.querySelector('.scene-card').setAttribute('aria-label', isSnapshot ? '한 작업의 관찰 사본과 빈 장식 책상' : '네 명의 가상 에이전트가 있는 작은 오피스');
  document.querySelector('.field-label').textContent = isSnapshot ? '관찰된 작업' : '맡고 있는 샘플 작업';
  byId('office-desc').textContent = isSnapshot ? '장식용 빈 책상과 관찰된 작업 책상입니다. 작업 책상은 클릭 또는 Enter / Space로 선택하세요.' : '네 개의 데모 책상을 Tab으로 탐색하고 Enter 또는 Space로 선택하세요.';
  if (isSnapshot) demo.slice(snapshot ? 1 : 0).forEach(sample => {
    const empty = document.createElementNS(svgNS, 'g');
    empty.setAttribute('transform', `translate(${sample.x} ${sample.y})`);
    empty.setAttribute('aria-hidden', 'true');
    empty.innerHTML = '<use href="#desk" opacity=".45"/>';
    desks.append(empty);
  });
  samples.forEach((sample) => {
    const group = document.createElementNS(svgNS, 'g');
    group.setAttribute('class', 'desk');
    group.setAttribute('transform', `translate(${sample.x} ${sample.y})`);
    group.setAttribute('role', 'button');
    group.setAttribute('tabindex', '0');
    group.setAttribute('aria-label', isSnapshot ? `작업 책상, ${snapshot.work.title}, 스냅샷 삽화` : `${sample.name}의 책상, ${sample.status}, ${sample.task}, 데모 샘플`);
    group.setAttribute('aria-pressed', 'false');
    group.dataset.id = sample.id;
    group.innerHTML = `<path class="selection-ring" d="M-63 49L35 0 172 69 73 121Z"/><g transform="translate(62 -21)">${character(sample)}</g><use href="#desk"/><path class="speech" d="M23-120H110Q119-120 119-111V-96Q119-87 110-87H76L69-78 65-87H23Q14-87 14-96V-111Q14-120 23-120Z"/><text class="speech-text" x="66" y="-100" text-anchor="middle">${sample.bubble}</text><g transform="translate(-15 123)"><rect class="nameplate" width="158" height="38" rx="12"/><circle cx="18" cy="19" r="10" fill="${colors[sample.tone]}"/><text x="18" y="23" text-anchor="middle" class="desk-label">${sample.icon}</text><text x="35" y="17" class="desk-label">${sample.name}</text><text x="35" y="30" class="desk-state">${sample.status}</text></g>`;
    group.addEventListener('click', () => select(sample.id));
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select(sample.id);
      }
    });
    if (sample.id === 'coco') {
      group.querySelector('.speech').remove();
      group.querySelector('.speech-text').remove();
    }
    desks.append(group);
    const item = document.createElement('li');
    const icon = document.createElement('span');
    icon.className = `legend-symbol ${sample.tone}`;
    icon.textContent = sample.icon;
    icon.setAttribute('aria-hidden', 'true');
    item.append(icon, document.createTextNode(sample.status));
    document.getElementById('legend-items').append(item);
  });
  byId('snapshot-fields').hidden = !isSnapshot;
  if (samples.length) select(samples[0].id);
  else {
    byId('portrait').replaceChildren();
    ['agent-role', 'task-name', 'task-note'].forEach(id => byId(id).textContent = '');
    byId('detail-heading').textContent = '관찰 미확인';
    byId('detail-status').textContent = '정보 없음';
    byId('snapshot-fields').replaceChildren();
  }
  document.querySelector('.sample-notice p').textContent = isSnapshot ? '캐릭터는 작업의 삽화입니다. 실제 에이전트 배정·생존·승인·수락을 증명하지 않습니다.' : '이 동료는 데모 속 캐릭터예요. 실제 에이전트나 작업 기록이 아닙니다.';
  }

  function select(id) {
    const sample = samples.find((entry) => entry.id === id);
    desks.querySelectorAll('.desk').forEach((desk) => desk.setAttribute('aria-pressed', String(desk.dataset.id === id)));
    document.getElementById('agent-role').textContent = mode === 'snapshot' ? 'Work Item · 관찰 사본' : sample.role + ' · 샘플';
    document.getElementById('detail-heading').textContent = sample.name;
    const status = document.getElementById('detail-status');
    status.className = `status-pill ${sample.tone}`;
    status.textContent = `${sample.icon} ${sample.status}`;
    document.getElementById('task-name').textContent = sample.task;
    document.getElementById('task-note').textContent = sample.note;
    if (mode === 'snapshot') {
      byId('detail-heading').textContent = '작업 책상';
      byId('task-note').textContent = '실행 관찰과 GitHub Workflow는 별개입니다. 현재 생존·승인·수락 여부는 미확인입니다.';
      const fields = byId('snapshot-fields');
      fields.replaceChildren();
      function field(label, value) {
        const term = document.createElement('dt'); term.textContent = label;
        const detail = document.createElement('dd');
        if (value instanceof Node) detail.append(value); else detail.textContent = value;
        fields.append(term, detail);
      }
      const link = document.createElement('a');
      link.href = snapshot.work.url; link.textContent = snapshot.work.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
      const age = Date.now() - Date.parse(snapshot.observed_at);
      field('Issue', link);
      field('관찰 시각 · 실시간 아님', snapshot.observed_at + (age < -300000 ? ' · 미래 시각 주의' : age > 86400000 ? ' · 오래된 관찰 (24시간 초과)' : ' · 관찰 사본'));
      field('GitHub Workflow', snapshot.work.workflow_status || '미확인');
      const labels = {running: '실행 중으로 관찰', awaiting_input: '입력 대기로 관찰', succeeded: '성공 결과 관찰', failed: '실패 결과 관찰', cancelled: '취소로 관찰', unknown: '미확인'};
      field('실행 관찰', labels[snapshot.execution?.status] || '미확인');
      field('근거 · 출처', snapshot.execution?.source || '미확인');
      field('미확인', '현재 상태·에이전트 생존·배정·승인·수락');
    }
    const portrait = document.getElementById('portrait');
    portrait.style.background = `var(--${sample.tone})`;
    portrait.innerHTML = `<svg viewBox="-50 -70 100 125" xmlns="${svgNS}">${character(sample)}</svg>`;
  }
  byId('display-mode').addEventListener('change', event => {
    mode = event.target.value;
    byId('import-message').textContent = mode === 'demo' ? '데모입니다. 파일은 이 브라우저에서만 읽습니다.' : snapshot ? '관찰 사본 · 자동 갱신 없음' : '관찰 미확인 · JSON 파일을 가져오세요.';
    render();
  });
  byId('snapshot-file').addEventListener('change', event => {
    const generation = ++importGeneration;
    const file = event.target.files[0];
    snapshot = null;
    mode = 'snapshot'; byId('display-mode').value = mode;
    render();
    function fail(message) { byId('import-message').textContent = '가져오기 실패 · 관찰 미확인: ' + message; }
    if (!file) { fail('파일을 선택하세요.'); return; }
    if (file.size > window.officeSnapshot.MAX_BYTES) { fail('파일은 16 KiB 이하여야 합니다.'); event.target.value = ''; return; }
    byId('import-message').textContent = '읽는 중 · 관찰 미확인';
    const reader = new FileReader();
    reader.onload = () => {
      if (generation !== importGeneration) return;
      try { snapshot = window.officeSnapshot.parse(reader.result); byId('import-message').textContent = '관찰 사본을 읽었습니다 · 자동 갱신 없음'; }
      catch (error) { fail(error.message); }
      render();
    };
    reader.onerror = () => { if (generation === importGeneration) fail('파일을 읽을 수 없습니다.'); };
    reader.readAsText(file);
    event.target.value = '';
  });
  render();
})();
