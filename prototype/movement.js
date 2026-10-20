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
    ['배정 해제 · 물러남', 'demo-session-1', null, '책상 A 옆', 'present', 'Task A 배정만 해제 · 다른 worktree로 이동하지 않음'],
    ['같은 작업 복귀', 'demo-session-1', 0, '책상 A', 'present', '같은 세션이 같은 Task A / worktree A로 재배정'],
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
  function position(fact) {
    if (fact.location === '책상 A' || fact.location === '책상 B') {
      const desk = workspaces[fact.location === '책상 A' ? 0 : 1];
      return {x: desk.x + 62, y: desk.y - 21};
    }
    return fact.location === '책상 A 옆' ? {x: 205, y: 410} : {x: 125, y: 480};
  }
  function create(onChange, schedule = setTimeout, cancel = clearTimeout) {
    let index = 0, playing = false, timer = null, generation = 0;
    const state = () => ({...frame(index), playing});
    function pause() {
      playing = false; generation++; cancel(timer); timer = null;
    }
    function queue() {
      const token = generation;
      timer = schedule(() => {
        if (!playing || token !== generation) return;
        timer = null; advance();
      }, 2200);
    }
    function advance() {
      if (index < stages.length - 1) index++;
      if (index === stages.length - 1) pause();
      onChange(state());
      if (playing) queue();
    }
    return {state, pause() { pause(); onChange(state()); },
      play() { if (playing || index === stages.length - 1) return; playing = true; onChange(state()); queue(); },
      step() { pause(); advance(); },
      reset() { pause(); index = 0; onChange(state()); }};
  }
  const api = {workspaces, count: stages.length, frame, position, create};
  if (typeof module !== 'undefined') module.exports = api;
  else window.officeMovement = api;
})();
