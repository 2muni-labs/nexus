/* Display identities only: no real environment, session or agent assignment is inferred. */
(() => {
  'use strict';
  const desks = [
    {id: 'visual-desk-1', x: 335, y: 255, characterId: 'visual-character-momo', characterKey: 'leaf-mint', demoWorkId: 'momo'},
    {id: 'visual-desk-2', x: 555, y: 365, characterId: 'visual-character-bibi', characterKey: 'ears-peach', demoWorkId: 'bibi'},
    {id: 'visual-desk-3', x: 120, y: 370, characterId: 'visual-character-lulu', characterKey: 'ears-lavender', demoWorkId: 'lulu'},
    {id: 'visual-desk-4', x: 340, y: 485, characterId: 'visual-character-coco', characterKey: 'leaf-gray', demoWorkId: 'coco'}
  ];
  function view(mode, snapshot, demo) {
    const observed = {running: ['mint', '✦', '실행 중 관찰'], awaiting_input: ['peach', 'Ⅱ', '입력 대기 관찰'], succeeded: ['lavender', '◇', '성공 결과 관찰'], failed: ['peach', '!', '실패 결과 관찰'], cancelled: ['gray', 'Ⅱ', '취소 관찰']}[snapshot?.execution?.status] || ['gray', '?', '실행 미확인'];
    return desks.map((desk, index) => {
      const work = mode === 'demo' ? demo.find(sample => sample.id === desk.demoWorkId)
        : snapshot && index === 0 ? {...demo[0], id: 'work', name: '작업 1', tone: observed[0], icon: observed[1], status: observed[2], task: snapshot.work.title, bubble: '관찰 사본'} : null;
      return {...desk, work, workId: work ? (mode === 'demo' ? `demo-work-${work.id}` : snapshot.work.url) : null};
    });
  }
  window.officeScene = {view, characterOffset: {x: 62, y: -21}};
})();
