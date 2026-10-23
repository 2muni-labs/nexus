/* Fictional demo ownership is independent of decorative coordinates and skin art.
   This is not an observation protocol, a session feed, or a live building model. */
(() => {
  'use strict';
  const rooms = [
    {id: 'mint-room', label: '민트 작업실', repository: 'fiction/mint-studio'},
    {id: 'blue-room', label: '블루 작업실', repository: 'fiction/blue-workshop'}
  ];
  const assignments = [
    ['momo', '모모', 'mint-room', 'MINT-01', 'mint-story', 'mint-session-a', '첫 화면의 작은 이야기', 'mint', 'leaf-mint'],
    ['bibi', '비비', 'mint-room', 'MINT-02', 'mint-garden', 'mint-session-b', '작업실의 초록 정원', 'peach', 'ears-peach'],
    ['lulu', '루루', 'blue-room', 'BLUE-01', 'blue-library', 'blue-session-a', '책장 속 자료 정리', 'lavender', 'ears-lavender'],
    ['coco', '코코', 'blue-room', 'BLUE-02', 'blue-window', 'blue-session-b', '새로운 창문 그리기', 'gray', 'leaf-gray']
  ].map(([id, name, roomId, workItem, workspace, session, task, tone, characterKey]) =>
    ({id: `campus-${id}`, name, roomId, workItem, workspace, session, task, tone, characterKey}));
  // Fixed visual anchors only; moving/replacing artwork cannot change ownership.
  const positions = [{x:395,y:218}, {x:485,y:263}, {x:665,y:353}, {x:755,y:398}];
  const layout = {positions, characterOffset: {x:0,y:-8}, portraitViewBox:'-24 -62 48 64',
    hit:{x:-68,y:-76,width:136,height:146}, ring:'M-70 0L0-35 70 0 0 36Z',
    nameplate:'translate(-56 -105)', bubble:'translate(-65 -11)'};
  const roomArt = file => ({src:`assets/${file}.svg`,width:1000,height:640,
    anchor:{x:0,y:0},display:{width:1000,height:640},pixelated:false});
  function view() {
    return assignments.map((assignment, index) => {
      const room = rooms.find(room => room.id === assignment.roomId);
      return {...positions[index], id:`campus-desk-${index}`, characterId:`campus-staff-${index}`,
        characterKey:assignment.characterKey, workId:assignment.workItem, roomId:room.id,
        work:{...assignment, room, role:'건물 DEMO · 가상 동료', status:'고정 DEMO', icon:'·',
          note:`${room.label} · ${room.repository}`, bubble:'가상 작업'}};
    });
  }
  // Selected skin remains visible through the shared asset renderer. Compact staff
  // retain each skin's original art; all desks occupy the same logical 64×48 at 2×.
  function manifest(skin) {
    const fit = (art, width, height, anchor) => art && {...art,
      display:{width,height},anchor:anchor || art.anchor,expressions:undefined};
    const simulation = skin.desk.width === 64;
    return {...skin, room:roomArt('campus-building'),roomFront:roomArt('campus-front'),layout,
      desk:fit(skin.desk,128,96,simulation ? skin.desk.anchor : {x:120,y:80}),
      characters:Object.fromEntries(Object.entries(skin.characters).map(([key,art]) =>
        [key,fit(art,48,64)]))};
  }
  const api = {rooms, assignments, layout, view, manifest};
  if (typeof module !== 'undefined') module.exports = api;
  else window.officeCampus = api;
})();
