/* Scripted DEMO observations only; never a native session association or scheduler. */
(() => {
  'use strict';
  const workspaces = [
    {task: 'demo-task-A', worktree: 'demo-worktree-A', title: '정원 안내 만들기', x: 240, y: 330},
    {task: 'demo-task-B', worktree: 'demo-worktree-B', title: '새 환영 문구 만들기', x: 490, y: 455}
  ];
  // Facts contain no skin, animation progress, wall clock or real backend identifiers.
  const stages = [
    ['등장', 'demo-session-1', null, '입구', 'present', '첫 세션 등장 · 아직 배정 없음'],
    ['배정 확인 (가상)', 'demo-session-1', 0, '책상 A', 'present', '스크립트가 Task A / worktree A 배정을 명시'],
    ['작업', 'demo-session-1', 0, '책상 A', 'present', '동일 Task / worktree에서 작업 관찰'],
    ['생존 미확인 ?', 'demo-session-1', 0, '책상 A', 'unknown', '마지막 관찰 위치 유지 · 종료 추론 금지'],
    ['커피 · 대기', 'demo-session-1', 0, '커피', 'present', '같은 Task A / worktree A / session 1 · 자리 비움은 배정 해제 아님'],
    ['같은 작업 복귀', 'demo-session-1', 0, '책상 A', 'present', '커피에서 같은 책상으로 복귀 · 배정과 세션 유지'],
    ['결과 전달 · 검토 대기', 'demo-session-1', 0, '책상 A', 'present', '결과 전달은 세션 종료가 아님'],
    ['세션 종료 명시', 'demo-session-1', null, '책상 A', 'exited', '스크립트에 명시된 종료 관찰 · 결과 전달과 별도'],
    ['퇴장', 'demo-session-1', null, '출구', 'exited', '종료가 명시된 뒤에만 퇴장 연출'],
    ['새 세션 등장', 'demo-session-2', null, '입구', 'present', '같은 외형, 새로운 세션 · 이전 세션 재사용 아님'],
    ['새 작업 배정 (가상)', 'demo-session-2', 1, '책상 B', 'present', 'NEW Task B / NEW worktree B / NEW session 2'],
    ['새 작업', 'demo-session-2', 1, '책상 B', 'present', '새 세션만 두 번째 작업 책상에서 작업']
  ];
  function frame(index) {
    const [label, session, assignment, location, liveness, reason] = stages[index];
    return {index, label, session, assignment, location, liveness, reason,
      delivered: index >= 6, workflowA: index >= 6 ? 'Review' : 'In Progress',
      done: false, accepted: false, released: false, deletable: false};
  }
  // A few named anchors and explicit routes, not navigation/pathfinding.
  function anchor(location, layout) {
    if (layout?.movementAnchors?.[location]) return layout.movementAnchors[location];
    if (location === '책상 A' || location === '책상 B') {
      const index = location === '책상 A' ? 0 : 1;
      const desk = layout ? layout.positions[layout.movementSlots[index]] : workspaces[index];
      const offset = layout?.characterOffset || {x: 62, y: -21};
      return {x: desk.x + offset.x, y: desk.y + offset.y};
    }
    if (location === '커피') return {x: 680, y: 400};
    if (location === '우측 통로') return {x: 680, y: 530};
    if (location === '통로 A') return layout ? {x: 280, y: 490} : {x: 302, y: 450};
    if (location === '통로 B') return layout ? {x: 440, y: 510} : {x: 552, y: 515};
    return layout?.entrance || {x: 125, y: 480};
  }
  const routes = {1: ['입구', '통로 A', '책상 A'], 4: ['책상 A', '통로 A', '통로 B', '우측 통로', '커피'],
    5: ['커피', '우측 통로', '통로 B', '통로 A', '책상 A'], 8: ['책상 A', '통로 A', '출구'],
    10: ['입구', '통로 A', '통로 B', '우측 통로', '책상 B']};
  function position(fact, layout) {
    const visual = fact.visual;
    if (!visual || visual.progress === 1) return anchor(fact.location, layout);
    const points = routes[fact.index].map(location => anchor(location, layout));
    const lengths = points.slice(1).map((point, i) => Math.hypot(point.x - points[i].x, point.y - points[i].y));
    let distance = lengths.reduce((sum, length) => sum + length, 0) * visual.progress;
    for (let i = 0; i < lengths.length; i++) {
      if (distance <= lengths[i] || i === lengths.length - 1) {
        const ratio = lengths[i] ? distance / lengths[i] : 1;
        return {x: points[i].x + (points[i + 1].x - points[i].x) * ratio,
          y: points[i].y + (points[i + 1].y - points[i].y) * ratio};
      }
      distance -= lengths[i];
    }
  }
  function create(onChange, schedule = setTimeout, cancel = clearTimeout,
    now = () => performance.now(), onVisual = () => {}) {
    let index = 0, playing = false, timer = null, generation = 0;
    let progress = 1, started = 0, startProgress = 1, suspended = '';
    const duration = () => [4, 5, 10].includes(index) ? 3200 : 1600;
    const state = () => ({...frame(index), playing, suspended,
      visual: {progress, moving: playing && progress < 1}});
    function sample() {
      if (playing && progress < 1) progress = Math.min(1, startProgress + (now() - started) / duration());
    }
    function pause() {
      sample(); playing = false; generation++; cancel(timer); timer = null;
    }
    function queue() {
      const token = generation;
      timer = schedule(() => {
        if (!playing || token !== generation) return;
        timer = null;
        if (progress < 1) {
          sample(); onVisual(state());
          if (progress === 1) onChange(state());
          queue();
        } else advance(true);
      }, progress < 1 ? 40 : 2200);
    }
    function advance(animate = false) {
      if (index < stages.length - 1) index++;
      progress = animate && routes[index] ? 0 : 1;
      startProgress = progress; started = now();
      if (index === stages.length - 1) pause();
      onChange(state());
      if (playing) queue();
    }
    return {state, pause() { pause(); onChange(state()); },
      suspend(reason) { pause(); suspended = reason; onChange(state()); },
      play() {
        if (playing || suspended || index === stages.length - 1) return;
        playing = true; startProgress = progress; started = now(); onChange(state()); queue();
      },
      step() { pause(); advance(); },
      reset() { pause(); index = 0; progress = 1; onChange(state()); }};
  }
  const api = {workspaces, count: stages.length, frame, position, create};
  if (typeof module !== 'undefined') module.exports = api;
  else window.officeMovement = api;
})();
