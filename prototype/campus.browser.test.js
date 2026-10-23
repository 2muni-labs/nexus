/* Run in the production page via runOfficeCampusTests(window).
   Scripted click/keyboard injection tests handlers; native input is checked separately. */
async function runOfficeCampusTests(w) {
  'use strict';
  const d=w.document, get=id=>d.getElementById(id), results=[];
  const assert=(v,label)=>{if(!v)throw Error(label);results.push(label);};
  function change(id,value){get(id).value=value;get(id).dispatchEvent(new w.Event('change',{bubbles:true}));}
  const facts=()=>[...d.querySelectorAll('.desk')].map(n=>[n.dataset.id,n.dataset.room,n.dataset.work,n.getAttribute('transform')]);
  function selected(assignment){
    const content=get('campus-fields').textContent;
    for(const value of [assignment.workItem,assignment.workspace,assignment.session,w.officeCampus.rooms.find(r=>r.id===assignment.roomId).repository]) assert(content.includes(value),'selection '+value);
    assert(get('detail-heading').textContent===assignment.name,'selected name '+assignment.name);
    assert(d.querySelectorAll('.desk[aria-pressed="true"]').length===1,'exactly one selection');
    assert(!get('campus-fields').querySelector('script,a,img,iframe'),'literal fictional details');
  }
  change('display-mode','campus');const original=JSON.stringify(facts());
  for(const skin of ['simulation','illustration','pixel']){
    change('skin-select',skin);assert(JSON.stringify(facts())===original,skin+' keeps ownership and placement');
    assert(get('office').getAttribute('viewBox')==='0 0 1000 640',skin+' building bounds');
    for(const [index,a] of w.officeCampus.assignments.entries()){
      const desk=d.querySelector(`.desk[data-id="${a.id}"]`);
      if(index%2){desk.focus();desk.dispatchEvent(new w.KeyboardEvent('keydown',{key:index===1?'Enter':' ',bubbles:true}));}
      else desk.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
      selected(a);
      const image=desk.querySelector('[data-art="character"] image');assert(image.getAttribute('height')==='64',skin+' compact staff');
      assert(image.getAttribute('href')===w.officeSkins[skin].characters[a.characterKey].src,skin+' preserves character art');
      const portrait=get('portrait').querySelector('svg'), box=portrait.viewBox.baseVal, p=portrait.querySelector('image');
      assert(Number(p.getAttribute('y'))>=box.y-.01 && Number(p.getAttribute('y'))+Number(p.getAttribute('height'))<=box.y+box.height+.01,skin+' full portrait fits');
    }
    const old=d.querySelector('[data-art="desk"] image');change('skin-select',skin==='pixel'?'simulation':'pixel');
    old.dispatchEvent(new w.Event('error'));assert(!get('asset-message').textContent,'late asset errors ignored');
    assert(!d.querySelector('[data-playing="true"]'),'static campus owns no replay');
    assert(get('movement-actor').style.display==='none','movement actor removed');
  }
  for(const mode of ['demo','rooms','movement','snapshot','view-import']){
    change('display-mode',mode);assert(get('office').dataset.mode===mode,'leave campus '+mode);
    assert(get('campus-fields').hidden,'campus details hidden '+mode);
    change('display-mode','campus');assert(JSON.stringify(facts())===original,'return from '+mode);
  }
  // Exercise real FileReader and all public import formats, then return to campus.
  const fixture=JSON.parse(JSON.stringify(w.officeRoomSample));const stamp=new Date(Date.now()-1000).toISOString();
  fixture.observed_at=stamp;fixture.records.forEach(({observation:v})=>{v.observed_at=v.office.observed_at=stamp;for(const p of [v.office.session,v.office.assignment])if(p)p.observed_at=stamp;});
  for(const version of [1,2,'view']){
    const value=version==='view'?fixture:JSON.parse(JSON.stringify(fixture.records[0].observation));
    if(version===1){value.version=1;delete value.office;delete value.evidence;}
    const transfer=new w.DataTransfer();transfer.items.add(new w.File([JSON.stringify(value)],'fixture.json',{type:'application/json'}));
    const input=get('refresh-input');input.files=transfer.files;input.dispatchEvent(new w.Event('change',{bubbles:true}));
    for(let i=0;i<100&&get('import-attempt').textContent.includes('읽는 중');i++)await new Promise(r=>w.setTimeout(r,10));
    assert(get('display-mode').value===(version==='view'?'view-import':'snapshot'),'import '+version);
    change('display-mode','campus');assert(JSON.stringify(facts())===original,'import does not enter campus facts '+version);
  }
  // A deliberately pending reader cannot override a newer campus intent.
  const RealReader=w.FileReader, pending=[];
  w.FileReader=class{constructor(){pending.push(this);}readAsText(){}};
  try{
    const transfer=new w.DataTransfer();transfer.items.add(new w.File(['{}'],'pending.json'));
    const input=get('refresh-input');input.files=transfer.files;input.dispatchEvent(new w.Event('change',{bubbles:true}));
    change('display-mode','campus');const before=d.querySelector('.office-layout').textContent;
    pending[0].result=JSON.stringify(fixture);pending[0].onload();pending[0].onerror();pending[0].onabort();
    assert(get('display-mode').value==='campus'&&d.querySelector('.office-layout').textContent===before,'pending load/error/abort preserve campus intention');
  } finally {w.FileReader=RealReader;}
  assert(d.documentElement.scrollWidth<=w.innerWidth+1,'no horizontal page overflow '+w.innerWidth);
  assert(get('campus-fields').scrollWidth<=get('campus-fields').clientWidth+1,'details fit '+w.innerWidth);
  assert(get('evidence-panel').hidden,'fictional campus does not present observed evidence');
  change('skin-select','simulation');d.querySelector('.desk').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  return {passed:results.length,results,width:w.innerWidth,transport:w.location.protocol,source:'production DOM/SVG; scripted input'};
}
