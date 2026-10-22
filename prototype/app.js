(() => {
  'use strict';
  const demo = window.officeSamples;
  let samples = demo;
  let snapshot = null;
  let importedView = null;
  let roomURL = '';
  let projectURL = '';
  const roomSample = window.officeSnapshot.parseView(JSON.stringify(window.officeRoomSample));
  let mode = 'demo';
  let importGeneration = 0;
  const byId = id => document.getElementById(id);
  const svgNS = 'http://www.w3.org/2000/svg';
  const colors = { mint: '#b6d6bc', peach: '#edc3ab', lavender: '#cab9e2', gray: '#c8c6d0' };
  let skin = 'simulation';
  let selectedId = null;
  let scene = [];
  function svg(tag, attributes = {}) {
    const node = document.createElementNS(svgNS, tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  }
  function asset(holder, registration) {
    const valid = registration && typeof registration.src === 'string' && registration.src.length > 0 &&
      [registration.width, registration.height, registration.display?.width, registration.display?.height].every(value => Number.isFinite(value) && value > 0) &&
      [registration.anchor?.x, registration.anchor?.y].every(Number.isFinite);
    const image = svg('image', {'aria-hidden': 'true'});
    if (valid) {
      const {width, height, anchor, display} = registration;
      Object.entries({x: -anchor.x * display.width / width, y: -anchor.y * display.height / height,
        width: display.width, height: display.height,
        class: registration.pixelated ? 'skin-art pixel-art' : 'skin-art'
      }).forEach(([key, value]) => image.setAttribute(key, value));
    }
    const error = svg('g', {class: 'asset-error', role: 'img', 'aria-label': '이미지 파일 오류', 'aria-hidden': 'true'});
    error.append(svg('rect', {x: -38, y: -12, width: 92, height: 26, rx: 4}));
    const label = svg('text', {x: 8, y: 5, 'text-anchor': 'middle'});
    label.textContent = '! 이미지 오류';
    error.append(label);
    if (holder.id === 'room-art' || holder.id === 'room-front-art') error.setAttribute('transform', 'translate(440 710)');
    error.style.display = 'none';
    holder.replaceChildren(image, error);
    // Each replacement owns its own nodes; old requests cannot alter the new slot.
    const current = () => holder.isConnected && holder.firstChild === image;
    const fail = () => {
      if (!current()) return;
      image.style.display = 'none'; error.style.display = ''; error.setAttribute('aria-hidden', 'false');
      error.dataset.failed = 'true'; updateAssetMessage();
    };
    image.addEventListener('error', fail);
    image.addEventListener('load', () => {
      if (!current()) return;
      image.style.display = ''; error.style.display = 'none'; error.setAttribute('aria-hidden', 'true');
      delete error.dataset.failed; updateAssetMessage();
    });
    if (valid) image.setAttribute('href', registration.src);
    else {
      image.style.display = 'none'; error.style.display = ''; error.setAttribute('aria-hidden', 'false');
      error.dataset.failed = 'true';
    }
    updateAssetMessage();
  }
  function updateAssetMessage() {
    const failed = document.querySelectorAll('.asset-error[data-failed="true"]').length;
    byId('asset-message').textContent = failed ? `! 이미지 오류 ${failed}개 · 등록 또는 파일을 확인하고 다시 불러오거나 스킨을 바꾸세요. 작업 선택과 상세 정보는 계속 사용할 수 있습니다.` : '';
    byId('asset-retry').hidden = !failed;
  }
  let expressionIntent = true;
  let expressionTimer = null;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function expressionState(entry, actor = false) {
    if (mode === 'movement' && !actor) return {kind: 'static', eligible: false};
    return window.officeExpressions.select({mode, sample: entry?.work,
      snapshot: entry?.work?.observation || snapshot, movement: movement.state(),
      viewObservedAt: mode === 'rooms' ? roomSample.observed_at : mode === 'view-import' ? importedView?.observed_at : null,
      association: window.officeSnapshot.association});
  }
  function paintCharacter(holder, registration, state) {
    holder.dataset.expression = state.kind;
    const frames = registration?.expressions?.[state.kind];
    // Absence is compatible static art; declared-but-invalid frames are explicit errors.
    if (frames === undefined) { asset(holder, registration); return; }
    holder.replaceChildren();
    if (!Array.isArray(frames) || frames.length < 2 || frames.length > 3) { asset(holder, null); return; }
    holder.dataset.frames = frames.length;
    frames.forEach((frame, index) => {
      const slot = svg('g', {class: `expression-frame frame-${index}`});
      slot.style.setProperty('--frames', frames.length);
      slot.style.setProperty('--frame', index);
      holder.append(slot); asset(slot, frame);
    });
  }
  function refreshExpressions() {
    clearTimeout(expressionTimer); expressionTimer = null;
    let expiry = Infinity, active = 0;
    document.querySelectorAll('#desks [data-art="character"], #movement-actor [data-actor-art]').forEach(holder => {
      const actor = holder.hasAttribute('data-actor-art');
      const entry = actor ? null : scene.find(item => item.id === holder.dataset.desk);
      if (!actor && (mode === 'movement' || entry?.showCharacter === false)) return;
      const state = expressionState(entry, actor);
      const registration = window.officeSkins[skin]?.characters?.[actor ? 'leaf-mint' : entry?.characterKey];
      if (holder.dataset.expression !== state.kind) paintCharacter(holder, registration, state);
      const playing = window.officeExpressions.allowed(expressionIntent, document.hidden, reducedMotion.matches, state);
      holder.dataset.playing = String(playing);
      if (playing && holder.querySelector('.expression-frame')) active++;
      if (playing && state.expiresAt) expiry = Math.min(expiry, state.expiresAt);
      const signal = holder.parentNode.querySelector('.compact-signal');
      if (signal) signal.textContent = state.symbol || '·';
    });
    byId('expression-play').textContent = expressionIntent ? '표정 일시정지' : '표정 재생';
    byId('expression-play').setAttribute('aria-pressed', String(expressionIntent));
    byId('expression-status').textContent = document.hidden ? '숨김 · 표정 정지' : reducedMotion.matches ? '동작 줄이기 · 표정 정지'
      : !expressionIntent ? '표정 정지 · 시나리오와 별개' : active ? `${active}개 표정 재현 · 실시간 아님` : '정적 표시 · 재현 근거/프레임 없음';
    // Only an active imported visual replay owns one bounded expiry callback.
    if (Number.isFinite(expiry)) expressionTimer = setTimeout(refreshExpressions, Math.max(1, Math.min(30000, expiry - Date.now())));
  }
  function paintPortrait(sample) {
    const portrait = byId('portrait');
    portrait.style.background = 'var(--paper)';
    const frame = svg('svg', {viewBox: window.officeSkins[skin]?.layout?.portraitViewBox || '-50 -70 100 125'});
    const holder = svg('g');
    frame.append(holder); portrait.replaceChildren(frame);
    const desk = scene.find(entry => entry.work?.id === sample.id);
    if (desk.showCharacter === false) { updateAssetMessage(); portrait.textContent = '미연결'; return; }
    asset(holder, window.officeSkins[skin]?.characters?.[desk.characterKey]);
  }
  const movement = window.officeMovement.create(() => { if (mode === 'movement') render(); });
  function paintMovement() {
    const actor = byId('movement-actor');
    actor.style.display = mode === 'movement' ? '' : 'none';
    if (mode !== 'movement') { actor.replaceChildren(); return; }
    const fact = movement.state();
    const layout = window.officeSkins[skin]?.layout;
    let point = window.officeMovement.position(fact);
    if (layout) {
      const index = fact.location === '책상 A' ? 0 : fact.location === '책상 B' ? 1 : -1;
      const slot = index < 0 ? null : layout.positions[layout.movementSlots[index]];
      point = slot ? {x: slot.x + layout.characterOffset.x, y: slot.y + layout.characterOffset.y}
        : fact.location === '책상 A 옆' ? layout.beside : layout.entrance;
    }
    actor.style.transform = `translate(${point.x}px, ${point.y}px)`;
    actor.dataset.session = fact.session;
    actor.dataset.location = fact.location;
    const art = svg('g', {'data-actor-art': 'true'});
    paintCharacter(art, window.officeSkins[skin]?.characters?.['leaf-mint'], expressionState(null, true));
    const label = svg('text', {x: 0, y: skin === 'simulation' ? -78 : -85, 'text-anchor': 'middle', class: 'actor-label'});
    label.textContent = `${fact.session} ${fact.liveness === 'unknown' ? '?' : fact.liveness === 'exited' ? '· 종료' : ''}`;
    actor.replaceChildren(art, label);
    byId('movement-stage').textContent = `${fact.index + 1}/${window.officeMovement.count} · ${fact.label} · ${fact.playing ? '재생 중' : '정지'} — ${fact.reason}`;
    byId('movement-play').textContent = fact.playing ? '일시정지' : '재생';
    byId('movement-next').disabled = fact.index === window.officeMovement.count - 1;
    byId('movement-play').disabled = fact.index === window.officeMovement.count - 1;
  }
  function paintSkin() {
    const manifest = window.officeSkins[skin];
    byId('office').dataset.skin = skin;
    applyLayout();
    asset(byId('room-art'), manifest?.room);
    asset(byId('room-front-art'), manifest?.roomFront);
    desks.querySelectorAll('[data-art]').forEach(holder => {
      const desk = scene.find(entry => entry.id === holder.dataset.desk);
      if (holder.dataset.art === 'character' && desk.showCharacter === false) { holder.replaceChildren(); return; }
      if (holder.dataset.art === 'desk') asset(holder, manifest?.desk);
      else paintCharacter(holder, manifest?.characters?.[desk.characterKey], expressionState(desk));
    });
    paintMovement();
    refreshExpressions();
    const selected = samples.find(sample => sample.id === selectedId);
    if (selected) paintPortrait(selected);
    updateAssetMessage();
  }
  function applyLayout() {
    const layout = window.officeSkins[skin]?.layout;
    byId('office').setAttribute('viewBox', layout ? '0 40 880 650' : '0 0 880 790');
    [...desks.children].forEach((group, index) => {
      const entry = scene[index];
      const slot = mode === 'movement' ? (layout?.movementSlots[index] ?? index) : (entry.slot ?? index);
      const point = layout?.positions[slot] || entry;
      group.setAttribute('transform', `translate(${point.x} ${point.y})`);
      const offset = layout?.characterOffset || window.officeScene.characterOffset;
      group.querySelector('[data-art="character"]')?.setAttribute('transform', `translate(${offset.x} ${offset.y})`);
      group.querySelector('.selection-ring')?.setAttribute('d', layout?.ring || 'M-63 49L35 0 172 69 73 121Z');
      const hit = group.querySelector('.desk-hit-area');
      if (hit) Object.entries(layout?.hit || {x: 12, y: -91, width: 100, height: 125}).forEach(([k,v]) => hit.setAttribute(k,v));
      group.querySelector('.nameplate-group')?.setAttribute('transform', layout?.nameplate || 'translate(-15 123)');
      group.querySelector('.bubble-group')?.setAttribute('transform', layout?.bubble || '');
    });
  }
  const desks = document.getElementById('desks');
  function render() {
    const focusedDesk = document.activeElement?.dataset.id;
    desks.replaceChildren();
    byId('legend-items').replaceChildren();
    const isView = mode === 'rooms' || mode === 'view-import';
    const isSnapshot = mode === 'snapshot' || isView;
    const viewData = mode === 'rooms' ? roomSample : importedView;
    let viewSelection = null;
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
    byId('view-controls').hidden = !isView;
    if (isView) {
      scene = [];
      if (viewData) {
        viewSelection = window.officeViews.select(viewData, roomURL, projectURL, selectedId);
        roomURL = viewSelection.roomURL; projectURL = viewSelection.projectURL; selectedId = viewSelection.selectedId;
        function options(id, entries, value) {
          const select = byId(id);
          select.replaceChildren(...entries.map(entry => {
            const option = document.createElement('option'); option.value = entry.url; option.textContent = entry.label; return option;
          }));
          select.value = value; select.disabled = false;
        }
        options('room-select', viewSelection.rooms, roomURL);
        options('project-select', [{url: '', label: '모든 작업 · Project 필터 없음'}, ...viewData.projects], projectURL);
        const positions = window.officeScene.view('demo', null, demo);
        scene = viewSelection.records.map(record => {
          const index = viewSelection.owned.indexOf(record);
          const entry = window.officeScene.view('snapshot', record.observation, demo)[0];
          return {...entry, slot: index, id: record.id, x: positions[index].x, y: positions[index].y,
            characterKey: positions[index].characterKey,
            work: {...entry.work, id: record.id, observation: record.observation, memberships: record.projects}};
        });
        const unknown = viewSelection.owned.filter(record => record.projects === null).length;
        byId('view-summary').textContent = `${mode === 'rooms' ? '가상 샘플 · 실제 데이터 아님' : '미검증 수동 주장 · 실시간 아님'} · 이 방 ${viewSelection.records.length}/${viewSelection.owned.length}개 기록 · Project 회원 관계 미확인 ${unknown}개${!scene.length ? ' · 일치하는 작업 없음' : ''} · ${viewData.observed_at} · ${viewData.source}`;
      } else {
        for (const id of ['room-select', 'project-select']) { byId(id).replaceChildren(); byId(id).disabled = true; }
        byId('view-summary').textContent = '수동 보기 미확인 · 보기 JSON을 가져오세요.';
      }
    }
    byId('movement-controls').hidden = mode !== 'movement';
    byId('movement-fields').hidden = mode !== 'movement';
    samples = scene.filter(desk => desk.work).map(desk => desk.work);
    document.querySelector('.sample-tag').textContent = isSnapshot ? '◷ 스냅샷' : '✳ 데모 샘플';
    document.querySelector('.scene-caption span:last-child').textContent = isSnapshot ? (snapshot ? snapshot.version === 2 ? '단일 관찰 기록 · 전체 현황 아님' : '작업 1개 · 삽화' : '관찰 미확인 · 빈 책상') : '가상 동료 4명';
    document.querySelector('.scene-card').setAttribute('aria-label', isSnapshot ? '한 작업의 관찰 사본과 빈 장식 책상' : '네 명의 가상 에이전트가 있는 작은 오피스');
    document.querySelector('.field-label').textContent = isSnapshot ? '관찰된 작업' : '맡고 있는 샘플 작업';
    byId('office-desc').textContent = isSnapshot ? '장식용 빈 책상과 관찰된 작업 책상입니다. 작업 책상은 클릭 또는 Enter / Space로 선택하세요.' : '네 개의 데모 책상을 Tab으로 탐색하고 Enter 또는 Space로 선택하세요.';
    if (mode === 'movement') {
      document.querySelector('.sample-tag').textContent = '이동 DEMO';
      document.querySelector('.scene-caption span:last-child').textContent = '가상 작업 책상 2개 · 세션 외형과 신원은 별개';
      document.querySelector('.scene-card').setAttribute('aria-label', '두 작업 공간의 세션 배정 이동 DEMO');
      byId('office-desc').textContent = '두 작업 책상을 Tab과 Enter 또는 Space로 선택하세요. 이동은 가상 배정 관찰의 연출입니다.';
    }
    if (isSnapshot && snapshot?.version === 2) {
      document.querySelector('.scene-caption span:first-child').textContent = snapshot.office?.repository?.label || '저장소 미확인';
      const observation = window.officeSnapshot.association(snapshot);
      const marker = observation.temporal === 'stale' ? ' · 오래된 관찰 (24시간 초과)' : observation.temporal === 'future' ? ' · 미래 시각 · 현재 아님' : observation.temporal === 'inconsistent' ? ' · 시각 충돌 · 현재 아님' : '';
      document.querySelector('.scene-caption span:last-child').textContent += marker;
      document.querySelector('.scene-card').setAttribute('aria-label', '가져온 단일 저장소·공간·세션 관찰 주장');
    } else document.querySelector('.scene-caption span:first-child').textContent = '작은 오피스';
    if (isView) {
      document.querySelector('.sample-tag').textContent = mode === 'rooms' ? '가상 2개 방 · 샘플' : '수동 보기 · 미검증';
      document.querySelector('.scene-caption span:first-child').textContent = viewSelection?.rooms.find(room => room.url === roomURL)?.label || '저장소 방 미확인';
      document.querySelector('.scene-caption span:last-child').textContent = `${scene.length}개 기록 · ${mode === 'rooms' ? '가상 샘플' : '가져온 주장'} · 전체 현황 아님`;
      document.querySelector('.scene-card').setAttribute('aria-label', '선택한 저장소 소유 책상과 명시한 Project 보기');
      byId('office-desc').textContent = '선택한 방에 속하는 작업만 표시합니다. Tab과 Enter 또는 Space로 책상을 선택하세요. Project는 배정을 바꾸지 않습니다.';
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
      group.setAttribute('aria-label', mode === 'movement' ? `${sample.name}, ${sample.task}, ${sample.status}, 이동 DEMO` : isSnapshot ? `${sample.name}, ${sample.observation?.work.title || snapshot?.work.title}, ${(sample.observation || snapshot)?.version === 2 ? '가져온 관찰 주장' : '스냅샷 삽화'}` : `${sample.name}의 책상, ${sample.status}, ${sample.task}, 데모 샘플`);
      group.setAttribute('aria-pressed', 'false');
      group.dataset.id = sample.id;
      const offset = window.officeScene.characterOffset;
      const characterArt = svg('g', {transform: `translate(${offset.x} ${offset.y})`,
        'data-art': 'character', 'data-desk': entry.id, 'data-visual-character': entry.characterId});
      if (mode === 'movement' || entry.showCharacter === false) characterArt.style.display = 'none';
      group.append(svg('path', {class: 'selection-ring', d: 'M-63 49L35 0 172 69 73 121Z'}),
        svg('rect', {class: 'desk-hit-area', x: 12, y: -91, width: 100, height: 125, fill: 'transparent'}), characterArt, deskArt);
      if (sample.id !== 'coco') {
        const speech = svg('g', {class: 'bubble-group'});
        speech.append(svg('path', {class: 'speech', d: 'M23-120H110Q119-120 119-111V-96Q119-87 110-87H76L69-78 65-87H23Q14-87 14-96V-111Q14-120 23-120Z'}));
        const bubble = svg('text', {class: 'speech-text', x: 66, y: -100, 'text-anchor': 'middle'});
        bubble.textContent = sample.bubble; speech.append(bubble); group.append(speech);
      }
      const nameplate = svg('g', {class: 'nameplate-group', transform: 'translate(-15 123)'});
      nameplate.append(svg('rect', {class: 'nameplate', width: 158, height: 38, rx: 12}), svg('circle', {cx: 18, cy: 19, r: 10, fill: colors[sample.tone]}));
      [[sample.icon, 18, 23, 'desk-label'], [sample.name, 35, 17, 'desk-label'], [sample.status, 35, 30, 'desk-state']].forEach(([value, x, y, className], index) => {
        const text = svg('text', {x, y, class: className});
        if (!index) text.setAttribute('text-anchor', 'middle');
        text.textContent = index === 1 && value.length > 18 ? value.slice(0, 18) + '…' : value; nameplate.append(text);
      });
      const signal = svg('text', {class: 'compact-signal', x: 55, y: -50, 'text-anchor': 'middle'});
      signal.textContent = sample.icon; group.append(signal, nameplate);
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
      byId('detail-heading').textContent = isView && viewData ? '일치하는 작업 없음' : '관찰 미확인';
      byId('detail-status').textContent = '정보 없음';
      byId('detail-status').className = 'status-pill gray';
      byId('snapshot-fields').replaceChildren();
    }
    byId('work-count').textContent = `${samples.length} WORK · ${isView ? '선택한 방·Project' : '표시한 작업'}`;
    byId('data-source').textContent = isView ? `${mode === 'rooms' ? 'FICTIONAL · ' : '수동 · '}${viewData?.source || '가져온 보기 없음'}`
      : mode === 'snapshot' ? `수동 · ${snapshot?.execution?.source || '출처 미확인'} · 자동 갱신 없음`
      : mode === 'movement' ? 'FICTIONAL · 세션 배정 DEMO' : 'FICTIONAL · 가상 직원 4명';
    byId('observation-time').textContent = isView ? `보기 관찰 ${viewData?.observed_at || '미확인'}`
      : mode === 'snapshot' ? `관찰 ${snapshot?.observed_at || '미확인'}` : '고정 DEMO · 실제 관찰 시각 없음';
    const shownAt = isView ? viewData?.observed_at : mode === 'snapshot' ? snapshot?.observed_at : null;
    if (shownAt && Date.now() - Date.parse(shownAt) > 86400000) byId('observation-time').textContent += ' · 오래된 관찰 · 현재 상태 아님';
    updateAssetMessage();
    if (focusedDesk) [...desks.querySelectorAll('.desk')].find(node => node.dataset.id === focusedDesk)?.focus();
    document.querySelector('.sample-notice p').textContent = isView ? (mode === 'rooms' ? '가상 2개 방 샘플 · 실제 저장소나 배정 데이터가 아닙니다.' : '수동 관찰과 Project 회원 관계는 미검증 주장입니다. 출처를 인증하지 않습니다.') : mode === 'movement' ? '스크립트 DEMO · 실제 Orca 세션이나 배정 관찰이 아닙니다.' : isSnapshot && snapshot?.version === 2 ? '연결과 출처는 가져온 관찰의 주장입니다. 인증된 backend 사실이나 Nexus 정책 입력이 아닙니다.' : isSnapshot ? '캐릭터는 작업의 삽화입니다. 실제 에이전트 배정·생존·승인·수락을 증명하지 않습니다.' : '이 동료는 데모 속 캐릭터예요. 실제 에이전트나 작업 기록이 아닙니다.';
  }

  function select(id) {
    const sample = samples.find((entry) => entry.id === id);
    if (!sample) return;
    const currentSnapshot = sample.observation || snapshot;
    const isView = mode === 'rooms' || mode === 'view-import';
    selectedId = id;
    desks.querySelectorAll('.desk').forEach((desk) => desk.setAttribute('aria-pressed', String(desk.dataset.id === id)));
    document.getElementById('agent-role').textContent = (mode === 'snapshot' || isView) ? 'Work Item · 관찰 사본' : sample.role + ' · 샘플';
    document.getElementById('detail-heading').textContent = sample.name;
    const status = document.getElementById('detail-status');
    status.className = `status-pill ${sample.tone}`;
    status.textContent = `${sample.icon} ${sample.status}`;
    document.getElementById('task-name').textContent = sample.task;
    document.getElementById('task-note').textContent = sample.note;
    if (mode === 'snapshot' || isView) {
      byId('detail-heading').textContent = currentSnapshot.version === 2 ? currentSnapshot.office?.workspace?.label || '공간 미확인' : '작업 책상';
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
      link.href = currentSnapshot.work.url; link.textContent = currentSnapshot.work.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
      const age = Date.now() - Date.parse(currentSnapshot.observed_at);
      field('Issue', link);
      field('관찰 시각 · 실시간 아님', currentSnapshot.observed_at + (age < 0 ? ' · 미래 시각 주의' : age > 86400000 ? ' · 오래된 관찰 (24시간 초과)' : ' · 관찰 사본'));
      field('GitHub Workflow', currentSnapshot.work.workflow_status || '미확인');
      const labels = {running: '실행 중으로 관찰', awaiting_input: '입력 대기로 관찰', succeeded: '성공 결과 관찰', failed: '실패 결과 관찰', cancelled: '취소로 관찰', unknown: '미확인'};
      field('실행 관찰', labels[currentSnapshot.execution?.status] || '미확인');
      field('근거 · 출처', currentSnapshot.execution?.source || '미확인');
      if (currentSnapshot.version === 2) {
        const bundle = currentSnapshot.office;
        const relation = window.officeSnapshot.association(currentSnapshot);
        const stamp = part => part ? `${part.observed_at} · ${part.source || '출처 미확인'}` : '관찰 없음';
        field('범위', isView ? '선택한 방의 수동 기록 · 전체 현황 아님 · 자동 갱신 없음' : '가져온 단일 기록만 · 전체 fleet 현황 아님 · 자동 갱신 없음');
        if (isView) {
          const data = mode === 'rooms' ? roomSample : importedView;
          field('Project · 명시한 회원 관계', sample.memberships === null ? '미확인 · 추론 안 함' : sample.memberships.length ? sample.memberships.map(url => `${data.projects.find(project => project.url === url).label} · ${url}`).join(' / ') : '명시한 회원 관계 없음');
          field('보기 관찰 · 출처 · 미검증 주장', `${data.observed_at} · ${data.source}`);
        }
        field('시간 유효성', relation.temporal === 'inconsistent' ? '관찰 시각 충돌 · 현재 관찰 아님' : relation.temporal === 'future' ? '미래 시각 · 현재 관찰 아님 · 연결 표시 보류' : relation.temporal === 'stale' ? '오래된 관찰 · 24시간 초과 · 현재 상태 아님' : '관찰 사본 · 현재 상태 증명 아님');
        field('연결 · 가져온 관찰 주장', relation.state === 'conflict' ? `충돌 · 연결 없음: ${relation.conflicts.join(', ')}` : relation.state === 'missing' ? `미연결 · 근거 없음: ${relation.missing.join(', ')}` : relation.attached ? 'session → workspace → Work Item · 가져온 배정 주장' : '시간 주의 · 연결 표시 보류');
        field('저장소 / 방', bundle?.repository ? `${bundle.repository.label} · ${bundle.repository.alias} · ${bundle.repository.url}` : '미확인');
        field('공간 / 책상', bundle?.workspace ? `${bundle.workspace.label} · ${bundle.workspace.alias} → ${bundle.workspace.repository}` : '미확인');
        field('세션 / 캐릭터', bundle?.session ? `${bundle.session.label} · ${bundle.session.alias} → ${bundle.session.workspace || '미연결'}` : '미확인 · 캐릭터 연결 없음');
        field('세션 생존 · 별도 관찰 주장', bundle?.session?.source ? bundle.session.liveness || '미확인' : '미확인 · 출처 없음');
        field('세션 근거', stamp(bundle?.session));
        field('배정 근거', bundle?.assignment ? `${bundle.assignment.session} → ${bundle.assignment.workspace} → ${bundle.assignment.work_url} · ${stamp(bundle.assignment)}` : '없음 · 임의 연결 안 함');
        field('bundle 관찰 · 출처', bundle ? `${bundle.observed_at} · ${bundle.source || '미확인'}` : '미확인');
        field('체크아웃 보존 · 별도 주장', bundle?.retention?.source ? `${bundle.retention.state || '미확인'} · ${bundle.retention.source}` : '미확인');
        field('수락 / Done / 삭제 자격', '이 사본은 부여하지 않음 · 결과·명시적 종료·release와 별개');
        byId('task-note').textContent = 'GitHub Workflow, 실행 결과, 세션 생존, 배정, 체크아웃 보존은 별개의 가져온 주장입니다. 출처를 인증하거나 현재 상태를 추론하지 않습니다.';
      } else field('미확인', '현재 상태·에이전트 생존·배정·승인·수락');
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
  byId('expression-play').addEventListener('click', () => { expressionIntent = !expressionIntent; refreshExpressions(); });
  document.addEventListener('visibilitychange', refreshExpressions);
  reducedMotion.addEventListener('change', refreshExpressions);
  byId('asset-retry').addEventListener('click', paintSkin);
  byId('skin-select').addEventListener('change', event => {
    movement.pause();
    skin = event.target.value;
    // Keep desk nodes, selection, keyboard focus, imported object and mode intact.
    paintSkin();
  });
  byId('room-select').addEventListener('change', event => { roomURL = event.target.value; render(); });
  byId('project-select').addEventListener('change', event => { projectURL = event.target.value; render(); });
  byId('display-mode').addEventListener('change', event => {
    movement.pause();
    mode = event.target.value;
    expressionIntent = false;
    byId('import-message').textContent = mode === 'movement' ? '이동 DEMO · 가상 관찰 · 자동 실행 권한 없음' : mode === 'demo' ? '데모입니다. 파일은 이 브라우저에서만 읽습니다.' : mode === 'rooms' ? '가상 2개 방 샘플 · 실제 관찰 데이터가 아닙니다.' : mode === 'view-import' ? (importedView ? '미검증 수동 보기 · 자동 갱신 없음' : '수동 보기 JSON을 가져오세요.') : snapshot ? '관찰 사본 · 자동 갱신 없음' : '관찰 미확인 · JSON 파일을 가져오세요.';
    render();
  });
  // Manual local reads only. Generations fence every completion, including cancel.
  let lastAccepted = null;
  let importContext = null;
  let logicalFocus = null;
  const observationWatermarks = new Map();
  desks.addEventListener('focusin', event => {
    const desk = event.target.closest?.('.desk');
    if (desk) logicalFocus = desk.dataset.id;
  });
  function importIdentity(entry) {
    if (!entry?.work) return null;
    const value = entry.work.observation || snapshot;
    return JSON.stringify([entry.work.id, value?.work.url,
      value?.office?.repository?.url || null, value?.office?.workspace?.alias || null]);
  }
  function captureImportContext() {
    if (!snapshot && !importedView) return importContext;
    return {mode, roomURL, projectURL, selected: importIdentity(scene.find(entry => entry.work?.id === selectedId)),
      focus: importIdentity(scene.find(entry => entry.work?.id === logicalFocus))};
  }
  let attemptStartedAt = null;
  function attempt(outcome, started = false) {
    if (started || !attemptStartedAt) attemptStartedAt = new Date().toISOString();
    byId('import-attempt').textContent = `파일 읽기 시도 ${attemptStartedAt} · ${outcome}`;
  }
  function cancelImport() {
    ++importGeneration;
    attempt('취소 · 표시와 마지막 성공 관찰 유지', true);
  }
  function readObservation(event) {
    const file = event.target.files?.[0];
    event.target.value = ''; // A fresh choice, including the same path, must read a new File.
    if (!file) { cancelImport(); return; }
    const generation = ++importGeneration;
    importContext = captureImportContext();
    const previous = importContext;
    movement.pause(); expressionIntent = false;
    snapshot = null; importedView = null; selectedId = null; roomURL = ''; projectURL = '';
    mode = 'snapshot'; byId('display-mode').value = mode;
    render();
    attempt('읽는 중 · 이전 표시 지움', true);
    byId('import-message').textContent = '읽는 중 · 관찰 미확인 · 서버 수집 없음';
    function fail(message) {
      if (generation !== importGeneration) return;
      attempt('실패 · 표시 데이터 없음');
      // Never show file names, paths, FileReader errors or untrusted exception text.
      byId('import-message').textContent = `파일 갱신 실패 · 이전 표시 지움 · ${message}`;
    }
    if (file.size > window.officeSnapshot.VIEW_MAX_BYTES) { fail('보기 최대 64 KiB, 단일 기록 최대 16 KiB입니다.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      if (generation !== importGeneration) return;
      let input;
      try { input = window.officeSnapshot.parseView(reader.result); }
      catch (_) { fail('허용된 JSON 관찰 형식과 비공개 정보 제거 여부를 확인하세요.'); return; }
      const observedAt = input.kind === 'view' ? input.observed_at : input.snapshot.observed_at;
      const records = input.kind === 'view' ? input.records.map(record => record.observation) : [input.snapshot];
      const coverage = JSON.stringify(records.map(value => value.work.url).sort());
      const stamps = [[`${input.kind}:${coverage}`, observedAt],
        ...records.map(value => [value.work.url, value.observed_at])];
      if (stamps.some(([key, stamp]) => Date.parse(stamp) < (observationWatermarks.get(key) ?? -Infinity))) {
        fail('이전에 읽은 관찰보다 오래된 파일입니다.'); return;
      }
      const age = Date.now() - Date.parse(observedAt);
      if (age < 0) { fail('미래 시각의 관찰입니다.'); return; }
      stamps.forEach(([key, stamp]) => observationWatermarks.set(key, Date.parse(stamp)));
      if (input.kind === 'view') { importedView = input; mode = 'view-import'; }
      else { snapshot = input.snapshot; mode = 'snapshot'; }
      let reset = false;
      if (previous?.mode === mode) {
        roomURL = previous.roomURL; projectURL = previous.projectURL;
        if (importedView) {
          if (!importedView.records.some(record => record.observation.office.repository.url === roomURL)) { roomURL = ''; reset = true; }
          if (projectURL && !importedView.projects.some(project => project.url === projectURL)) { projectURL = ''; reset = true; }
        }
      } else if (previous) reset = true;
      byId('display-mode').value = mode;
      render();
      const retained = previous?.selected && scene.find(entry => importIdentity(entry) === previous.selected);
      if (retained) select(retained.work.id);
      else if (previous?.selected) reset = true;
      const focused = previous?.focus && scene.find(entry => importIdentity(entry) === previous.focus);
      const active = document.activeElement;
      if (focused && (active === document.body || active?.dataset?.id || ['refresh-file', 'refresh-input', 'snapshot-file'].includes(active?.id))) {
        [...desks.querySelectorAll('.desk')].find(node => node.dataset.id === focused.work.id)?.focus();
      }
      if (previous?.focus && !focused) reset = true;
      lastAccepted = {observedAt, importedAt: new Date().toISOString()};
      byId('import-history').textContent = `마지막 성공 관찰 ${lastAccepted.observedAt} · 읽기 수락 ${lastAccepted.importedAt} · 미검증 수동 사본`;
      attempt('성공 · 표정 정지');
      byId('import-message').textContent = `${age > 86400000 ? '오래된 관찰 · 24시간 초과 · 현재 상태 아님' : '관찰 사본 · 현재 상태 증명 아님'} · ${reset ? '신원/보기 변경으로 선택·필터·포커스 일부 초기화' : '일치하는 방·Project·선택·포커스 유지'} · 자동 수집 없음`;
      importContext = null;
    };
    reader.onerror = () => fail('파일을 읽을 수 없습니다. 새 파일을 선택하세요.');
    reader.onabort = () => fail('파일 읽기가 중단되었습니다.');
    try { reader.readAsText(file); }
    catch (_) { fail('파일을 읽을 수 없습니다. 새 파일을 선택하세요.'); }
  }
  byId('refresh-file').addEventListener('click', () => {
    const picker = byId('refresh-input');
    ++importGeneration;
    picker.value = ''; picker.click();
  });
  for (const id of ['snapshot-file', 'refresh-input']) {
    byId(id).addEventListener('change', readObservation);
    byId(id).addEventListener('cancel', cancelImport);
  }
  byId('movement-play').addEventListener('click', () => movement.state().playing ? movement.pause() : movement.play());
  byId('movement-next').addEventListener('click', () => movement.step());
  byId('movement-reset').addEventListener('click', () => movement.reset());
  render();
})();
