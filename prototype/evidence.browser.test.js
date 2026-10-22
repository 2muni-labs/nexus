/* Browser-only tests: call runOfficeEvidenceTests(appIframe.contentWindow, optionalSanitizedV2).
   The iframe must load index.html at 969px or 390px. No dependencies or network calls. */
async function runOfficeEvidenceTests(w, actual) {
  'use strict';
  const d = w.document, get = id => d.getElementById(id), results = [];
  function assert(value, name) { if (!value) throw Error(name); results.push(name); }
  function change(id, value) { const node = get(id); node.value = value; node.dispatchEvent(new w.Event('change', {bubbles:true})); }
  const content = () => get('evidence-panel').textContent;
  async function importFile(value) {
    const transfer = new w.DataTransfer(); transfer.items.add(new w.File([JSON.stringify(value)], 'sanitized.json', {type:'application/json'}));
    const input = get('refresh-input'); input.files = transfer.files; input.dispatchEvent(new w.Event('change',{bubbles:true}));
    for(let i=0;i<100;i++) { if(!get('import-attempt').textContent.includes('읽는 중')) break; await new Promise(r=>w.setTimeout(r,10)); }
    // FileReader completion is asynchronous even when a read-attempt label has changed.
    await new Promise(r=>w.setTimeout(r,30));
  }
  const fixture = JSON.parse(JSON.stringify(w.officeRoomSample));
  const stamp = new Date(Date.now()-2000).toISOString();
  fixture.observed_at = stamp;
  for(const {observation:v} of fixture.records) {
    v.observed_at=v.office.observed_at=stamp;
    for(const part of [v.office.session,v.office.assignment]) if(part)part.observed_at=stamp;
    if(v.evidence) for(const part of [v.evidence.candidate,v.evidence.pr,...v.evidence.ci,v.evidence.review,v.evidence.validation]) if(part)part.observed_at=stamp;
  }
  const original = JSON.stringify(fixture);
  for(const skin of ['simulation','illustration','pixel']) {
    change('skin-select',skin);
    change('display-mode','rooms');
    assert(content().includes('가상 DEMO') && content().includes('기록된 주장: 성공'),skin+' fictional historical evidence');
    await importFile(fixture);
    assert(content().includes('미검증 주장') && content().includes('전체·필수 체크 범위 미확인'),skin+' untrusted partial coverage');
    const states=[...get('evidence-panel').querySelectorAll('dd>strong')].map(n=>n.textContent);
    assert(states[2]==='성공' && states[3]==='대기' && states[4].startsWith('미확인'),skin+' CI success pending review unknown validation');
    const desk=d.querySelector('.desk[data-id="display-record-2"]');desk.focus();desk.dispatchEvent(new w.FocusEvent('focusin',{bubbles:true}));desk.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
    assert(content().includes('실패') && content().includes('제출됨 · 승인 아님'),skin+' separate failure and submitted review');
    const before = content();
    const originalFocus=w.SVGElement.prototype.focus, focused=[];
    w.SVGElement.prototype.focus=function(...args){focused.push(this.dataset.id);return originalFocus.apply(this,args);};
    try { await importFile(fixture); } finally { w.SVGElement.prototype.focus=originalFocus; }
    assert(content()===before && focused.includes('display-record-2'),skin+' refresh selection panel and production focus restore target');
    assert(get('expression-play').getAttribute('aria-pressed')==='false',skin+' imported expressions paused');
    const retainedDesk=d.querySelector('.desk[data-id="display-record-2"]');
    const nextSkin = skin==='pixel'?'simulation':'pixel';change('skin-select',nextSkin);
    assert(content()===before && d.querySelector('.desk[data-id="display-record-2"]')===retainedDesk,skin+' skin focus panel retention');
    change('room-select','https://github.com/example/fiction-garden');
    assert(content().includes('revision 불일치'),skin+' mismatched revision unknown');
    change('project-select','https://github.com/users/example/projects/2');
    assert(content().includes('근거 없음') && !get('evidence-panel').querySelector('a'),skin+' filtered empty clears evidence links');
    change('project-select','');change('room-select','https://github.com/example/fiction-paper');
    const long=JSON.parse(JSON.stringify(fixture));long.records[0].observation.evidence.ci[0].label='긴이름'.repeat(26);
    await importFile(long);
    const eight=JSON.parse(JSON.stringify(long));const ci=eight.records[0].observation.evidence.ci[0];
    eight.records[0].observation.evidence.ci=Array.from({length:8},(_,i)=>({...ci,label:ci.label+i,state:i===7?'failure':'success',url:ci.url+(i?'0'.repeat(i):'')}));
    await importFile(eight);
    assert(get('evidence-panel').querySelectorAll('dt').length===12 && content().includes('실패'),skin+' eight CI observations preserve failure');
    const panel=get('evidence-panel');
    panel.querySelectorAll('details').forEach(detail=>detail.open=true);
    const box=panel.getBoundingClientRect();
    assert(panel.scrollWidth<=panel.clientWidth+1 && box.right<=w.innerWidth+1,skin+' long label panel fits viewport '+w.innerWidth);
    assert(d.documentElement.scrollWidth<=w.innerWidth+1,skin+' page no horizontal overflow');
    assert(!panel.querySelector('img,script,iframe,svg'),skin+' literal DOM only');
    assert([...panel.querySelectorAll('a')].every(a=>a.href.startsWith('https://github.com/example/fiction-paper/')) && [...panel.querySelectorAll('a')].every(a=>a.rel==='noopener noreferrer'),skin+' canonical safe links');
  }
  assert(JSON.stringify(fixture)===original,'input fixture not mutated');
  const v2=JSON.parse(JSON.stringify(fixture.records[0].observation));delete v2.evidence;
  await importFile(v2);assert(content().includes('미확인')&&!get('evidence-panel').querySelector('a'),'old v2 remains valid unknown evidence');
  const v1={version:1,observed_at:stamp,work:v2.work,execution:v2.execution};
  await importFile(v1);assert(content().includes('미확인')&&get('display-mode').value==='snapshot' && get('import-attempt').textContent.includes('성공'),'v1 unchanged');
  const literal=JSON.parse(JSON.stringify(fixture.records[0].observation));literal.evidence.review.source='Fiction & quotation " only';
  await importFile(literal);assert(content().includes('Fiction & quotation " only'),'source literal textContent');
  literal.evidence.review.source='<img src=x onerror=alert(1)>';
  await importFile(literal);assert(content().includes('근거 없음')&&!get('evidence-panel').querySelector('a'),'unsafe import clears panel and links');
  if(actual) {
    await importFile(actual);
    const states=[...get('evidence-panel').querySelectorAll('dd>strong')].map(n=>n.textContent);
    assert(states.filter(s=>s==='성공').length===2 && states.at(-1).startsWith('미확인') && states.at(-2).startsWith('미확인'),'private actual copy two CI successes review validation unknown');
    assert(content().includes(actual.evidence.candidate.revision),'actual immutable candidate mapping');
  }
  change('display-mode','rooms');
  return {width:w.innerWidth, checks:results.length, results};
}
