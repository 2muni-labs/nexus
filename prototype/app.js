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
  let skin = 'illustration';
  let selectedId = null;
  let scene = [];
  function svg(tag, attributes = {}) {
    const node = document.createElementNS(svgNS, tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  }
  function asset(holder, registration) {
    const {width, height, anchor, display} = registration;
    const image = svg('image', {
      x: -anchor.x * display.width / width, y: -anchor.y * display.height / height,
      width: display.width, height: display.height, 'aria-hidden': 'true',
      class: registration.pixelated ? 'skin-art pixel-art' : 'skin-art'
    });
    const error = svg('g', {class: 'asset-error', role: 'img', 'aria-label': '이미지 파일 오류', 'aria-hidden': 'true'});
    error.append(svg('rect', {x: -38, y: -12, width: 92, height: 26, rx: 4}));
    const label = svg('text', {x: 8, y: 5, 'text-anchor': 'middle'});
    label.textContent = '! 이미지 오류';
    error.append(label);
    error.style.display = 'none';
    holder.replaceChildren(image, error);
    // Each replacement owns its own nodes; old requests cannot alter the new slot.
    const current = () => holder.isConnected && holder.firstChild === image;
    image.addEventListener('error', () => {
      if (!current()) return;
      image.style.display = 'none'; error.style.display = ''; error.setAttribute('aria-hidden', 'false');
    });
    image.addEventListener('load', () => {
      if (!current()) return;
      image.style.display = ''; error.style.display = 'none'; error.setAttribute('aria-hidden', 'true');
    });
    image.setAttribute('href', registration.src);
  }
  function paintPortrait(sample) {
    const portrait = byId('portrait');
    portrait.style.background = 'var(--paper)';
    const frame = svg('svg', {viewBox: '-50 -70 100 125'});
    const holder = svg('g');
    frame.append(holder); portrait.replaceChildren(frame);
    const desk = scene.find(entry => entry.work?.id === sample.id);
    asset(holder, window.officeSkins[skin].characters[desk.characterKey]);
  }
  const movement = window.officeMovement.create(() => { if (mode === 'movement') render(); });
  function paintMovement() {
    const actor = byId('movement-actor');
    actor.style.display = mode === 'movement' ? '' : 'none';
    if (mode !== 'movement') { actor.replaceChildren(); return; }
    const fact = movement.state();
    const point = window.officeMovement.position(fact);
    actor.style.transform = `translate(${point.x}px, ${point.y}px)`;
    actor.dataset.session = fact.session;
    actor.dataset.location = fact.location;
    const art = svg('g');
    asset(art, window.officeSkins[skin].characters['leaf-mint']);
    const label = svg('text', {x: 0, y: -85, 'text-anchor': 'middle', class: 'actor-label'});
    label.textContent = `${fact.session} ${fact.liveness === 'unknown' ? '?' : fact.liveness === 'exited' ? '· 종료' : ''}`;
    actor.replaceChildren(art, label);
    byId('movement-stage').textContent = `${fact.index + 1}/${window.officeMovement.count} · ${fact.label} · ${fact.playing ? '재생 중' : '정지'} — ${fact.reason}`;
    byId('movement-play').textContent = fact.playing ? '일시정지' : '재생';
    byId('movement-next').disabled = fact.index === window.officeMovement.count - 1;
    byId('movement-play').disabled = fact.index === window.officeMovement.count - 1;
  }
  function paintSkin() {
    const manifest = window.officeSkins[skin];
    desks.querySelectorAll('[data-art]').forEach(holder => {
      const desk = scene.find(entry => entry.id === holder.dataset.desk);
      asset(holder, holder.dataset.art === 'desk' ? manifest.desk : manifest.characters[desk.characterKey]);
    });
    paintMovement();
    const selected = samples.find(sample => sample.id === selectedId);
    if (selected) paintPortrait(selected);
  }
  const desks = document.getElementById('desks');
  function render() {
    const focusedDesk = document.activeElement?.dataset.id;
    desks.replaceChildren();
    byId('legend-items').replaceChildren();
    const isSnapshot = mode === 'snapshot';
    scene = window.officeScene.view(mode, snapshot, demo);
    if (mode === 'movement') {
      const fact = movement.state();
      scene = window.officeMovement.workspaces.map((workspace, index) => ({
        id: `movement-desk-${index}`, x: workspace.x, y: workspace.y,
        workId: workspace.task, characterKey: 'leaf-mint',
        work: {id: workspace.task, name: `작업 책상 ${index ? 'B' : 'A'}`, role: '이동 DEMO',
          task: workspace.title, status: index === 0 ? fact.workflowA : fact.index >= 10 ? 'In Progress' : 'Ready',
          tone: index === 0 && fact.delivered ? 'lavender' : 'mint', icon: index === 0 && fact.delivered ? '◇' : '·',
          note: `${workspace.task} / ${workspace.worktree}`, bubble: index === 0 && fact.delivered ? '검토 대기' : '가상 작업'}
      }));
    }
    byId('movement-controls').hidden = mode !== 'movement';
    byId('movement-fields').hidden = mode !== 'movement';
    samples = scene.filter(desk => desk.work).map(desk => desk.work);
    document.querySelector('.sample-tag').textContent = isSnapshot ? '◷ 스냅샷' : '✳ 데모 샘플';
    document.querySelector('.scene-caption span:last-child').textContent = isSnapshot ? (snapshot ? '작업 1개 · 삽화' : '관찰 미확인 · 빈 책상') : '가상 동료 4명';
    document.querySelector('.scene-card').setAttribute('aria-label', isSnapshot ? '한 작업의 관찰 사본과 빈 장식 책상' : '네 명의 가상 에이전트가 있는 작은 오피스');
    document.querySelector('.field-label').textContent = isSnapshot ? '관찰된 작업' : '맡고 있는 샘플 작업';
    byId('office-desc').textContent = isSnapshot ? '장식용 빈 책상과 관찰된 작업 책상입니다. 작업 책상은 클릭 또는 Enter / Space로 선택하세요.' : '네 개의 데모 책상을 Tab으로 탐색하고 Enter 또는 Space로 선택하세요.';
    if (mode === 'movement') {
      document.querySelector('.sample-tag').textContent = '이동 DEMO';
      document.querySelector('.scene-caption span:last-child').textContent = '가상 작업 책상 2개 · 세션 외형과 신원은 별개';
      document.querySelector('.scene-card').setAttribute('aria-label', '두 작업 공간의 세션 배정 이동 DEMO');
      byId('office-desc').textContent = '두 작업 책상을 Tab과 Enter 또는 Space로 선택하세요. 이동은 가상 배정 관찰의 연출입니다.';
    }
    scene.forEach(entry => {
      const sample = entry.work;
      const group = svg('g', {transform: `translate(${entry.x} ${entry.y})`});
      group.dataset.visualDesk = entry.id;
      group.dataset.work = entry.workId || '';
      const deskArt = svg('g', {'data-art': 'desk', 'data-desk': entry.id});
      if (!sample) {
        group.setAttribute('aria-hidden', 'true');
        group.setAttribute('opacity', '.45');
        group.append(deskArt); desks.append(group);
        return;
      }
      group.setAttribute('class', 'desk');
      group.setAttribute('role', 'button');
      group.setAttribute('tabindex', '0');
      group.setAttribute('aria-label', mode === 'movement' ? `${sample.name}, ${sample.task}, ${sample.status}, 이동 DEMO` : isSnapshot ? `작업 책상, ${snapshot.work.title}, 스냅샷 삽화` : `${sample.name}의 책상, ${sample.status}, ${sample.task}, 데모 샘플`);
      group.setAttribute('aria-pressed', 'false');
      group.dataset.id = sample.id;
      const offset = window.officeScene.characterOffset;
      const characterArt = svg('g', {transform: `translate(${offset.x} ${offset.y})`,
        'data-art': 'character', 'data-desk': entry.id, 'data-visual-character': entry.characterId});
      if (mode === 'movement') characterArt.style.display = 'none';
      group.append(svg('path', {class: 'selection-ring', d: 'M-63 49L35 0 172 69 73 121Z'}),
        svg('rect', {class: 'desk-hit-area', x: 12, y: -91, width: 100, height: 125, fill: 'transparent'}), characterArt, deskArt);
      if (sample.id !== 'coco') {
        group.append(svg('path', {class: 'speech', d: 'M23-120H110Q119-120 119-111V-96Q119-87 110-87H76L69-78 65-87H23Q14-87 14-96V-111Q14-120 23-120Z'}));
        const bubble = svg('text', {class: 'speech-text', x: 66, y: -100, 'text-anchor': 'middle'});
        bubble.textContent = sample.bubble; group.append(bubble);
      }
      const nameplate = svg('g', {transform: 'translate(-15 123)'});
      nameplate.append(svg('rect', {class: 'nameplate', width: 158, height: 38, rx: 12}), svg('circle', {cx: 18, cy: 19, r: 10, fill: colors[sample.tone]}));
      [[sample.icon, 18, 23, 'desk-label'], [sample.name, 35, 17, 'desk-label'], [sample.status, 35, 30, 'desk-state']].forEach(([value, x, y, className], index) => {
        const text = svg('text', {x, y, class: className});
        if (!index) text.setAttribute('text-anchor', 'middle');
        text.textContent = value; nameplate.append(text);
      });
      group.append(nameplate);
      group.addEventListener('click', () => select(sample.id));
      group.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault(); select(sample.id);
        }
      });
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
    paintSkin();
    if (samples.length) select(samples.some(sample => sample.id === selectedId) ? selectedId : samples[0].id);
    else {
      selectedId = null;
      byId('portrait').replaceChildren();
      ['agent-role', 'task-name', 'task-note'].forEach(id => byId(id).textContent = '');
      byId('detail-heading').textContent = '관찰 미확인';
      byId('detail-status').textContent = '정보 없음';
      byId('snapshot-fields').replaceChildren();
    }
    if (focusedDesk) [...desks.querySelectorAll('.desk')].find(node => node.dataset.id === focusedDesk)?.focus();
    document.querySelector('.sample-notice p').textContent = mode === 'movement' ? '스크립트 DEMO · 실제 Orca 세션이나 배정 관찰이 아닙니다.' : isSnapshot ? '캐릭터는 작업의 삽화입니다. 실제 에이전트 배정·생존·승인·수락을 증명하지 않습니다.' : '이 동료는 데모 속 캐릭터예요. 실제 에이전트나 작업 기록이 아닙니다.';
  }

  function select(id) {
    const sample = samples.find((entry) => entry.id === id);
    if (!sample) return;
    selectedId = id;
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
    if (mode === 'movement') {
      const fact = movement.state();
      const workspace = window.officeMovement.workspaces.find(entry => entry.task === id);
      const fields = byId('movement-fields');
      fields.replaceChildren();
      const values = [
        ['작업 / 공간 (가상)', `${workspace.task} / ${workspace.worktree}`],
        ['현재 시나리오 세션', fact.session],
        ['배정', fact.assignment === null ? '배정 없음' : `${window.officeMovement.workspaces[fact.assignment].task} / ${window.officeMovement.workspaces[fact.assignment].worktree}`],
        ['배정 근거 · DEMO', fact.reason],
        ['생존 / 마지막 위치', `${fact.liveness} / ${fact.location}`],
        ['작업 A 결과', fact.delivered ? '전달됨 · Review 대기' : '아직 전달 안 됨'],
        ['수락 / Done / release / 삭제 자격', '모두 부여되지 않음 · 결과와 종료도 별개']
      ];
      values.forEach(([label, value]) => {
        const term = document.createElement('dt'); term.textContent = label;
        const detail = document.createElement('dd'); detail.textContent = value;
        fields.append(term, detail);
      });
      byId('task-note').textContent = `${workspace.task} / ${workspace.worktree}는 이 책상에 고정됩니다. 초상화는 외형 예시이며 현재 배정 증거가 아닙니다.`;
      document.querySelector('.sample-notice p').textContent = '스크립트 DEMO · 실제 Orca 세션이나 배정 관찰이 아닙니다.';
    }
    paintPortrait(sample);
  }
  byId('skin-select').addEventListener('change', event => {
    movement.pause();
    skin = event.target.value;
    // Keep desk nodes, selection, keyboard focus, imported object and mode intact.
    paintSkin();
  });
  byId('display-mode').addEventListener('change', event => {
    movement.pause();
    mode = event.target.value;
    byId('import-message').textContent = mode === 'movement' ? '이동 DEMO · 가상 관찰 · 자동 실행 권한 없음' : mode === 'demo' ? '데모입니다. 파일은 이 브라우저에서만 읽습니다.' : snapshot ? '관찰 사본 · 자동 갱신 없음' : '관찰 미확인 · JSON 파일을 가져오세요.';
    render();
  });
  byId('snapshot-file').addEventListener('change', event => {
    movement.pause();
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
  byId('movement-play').addEventListener('click', () => movement.state().playing ? movement.pause() : movement.play());
  byId('movement-next').addEventListener('click', () => movement.step());
  byId('movement-reset').addEventListener('click', () => movement.reset());
  render();
})();
