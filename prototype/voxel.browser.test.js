/* Load in a production HTTP page, then await runOfficeVoxelTests(window).
   These are DOM/controller checks. Native input and real GPU motion are separate. */
async function runOfficeVoxelTests(w){
  'use strict';
  const d=w.document,$=id=>d.getElementById(id),results=[];
  const assert=(value,label)=>{if(!value)throw Error(label);results.push(label);};
  const change=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new w.Event('change',{bubbles:true}));};
  const ready=async()=>{for(let i=0;i<200&&!w.officeVoxel.info().renderer;i++)await new Promise(r=>w.setTimeout(r,10));assert(!!w.officeVoxel.info().renderer,'actual WebGL renderer ready');};
  change('display-mode','voxel');await ready();$('voxel-reset').click();
  assert(d.querySelectorAll('#voxel-view').length===1&&d.querySelectorAll('header.topbar').length===1,'one product section/header');
  assert(d.querySelectorAll('#voxel-host canvas').length===1,'one actual canvas');
  assert(w.officeVoxel.info().renderer.webgl2&&w.officeVoxel.info().renderer.render.triangles>0,'WebGL2 geometry rendered');
  assert($('skin-select').disabled&&getComputedStyle($('skin-select')).display==='none','irrelevant 2D control hidden');
  assert(!w.officeVoxel.info().state.pending&&!w.officeVoxel.info().state.playing,'initial static, no animation');
  const ownership=JSON.stringify(w.officeVoxel.info().state.actors.map(s=>[s.id,s.task,s.worktree,s.session]));
  for(const s of w.officeVoxelWorld.staff){
    d.querySelector(`[data-voxel-staff="${s.id}"]`).click();assert(w.officeVoxel.info().selected===s.id,'select '+s.id);
    assert($('voxel-fields').textContent.includes(s.task)&&$('voxel-fields').textContent.includes(s.session),'explicit fictional details '+s.id);
  }
  const button=d.querySelector('[data-voxel-staff="bibi"]');button.focus();$('voxel-next').click();
  assert(button.isConnected&&d.activeElement===button,'frame/stage updates preserve staff button focus');
  assert(!w.officeVoxel.info().state.playing&&!w.officeVoxel.info().state.pending,'Next is a static stage');
  for(const palette of ['sorbet','daylight']){
    change('voxel-palette',palette);assert(w.officeVoxel.info().palette===palette,'palette '+palette);
    assert(JSON.stringify(w.officeVoxel.info().state.actors.map(s=>[s.id,s.task,s.worktree,s.session]))===ownership,'palette preserves identities');
    assert(w.officeVoxel.info().selected==='coco','palette preserves selection');
    assert(!w.officeVoxel.info().state.playing,'palette pauses');
  }
  for(let angle=1;angle<=4;angle++){
    d.querySelector('[data-voxel-camera="rotate"]').click();assert(w.officeVoxel.info().renderer.angle===angle%4,'camera preset '+angle);
    assert(w.officeVoxel.info().selected==='coco','camera keeps selection');
  }
  $('voxel-reset').click();assert(w.officeVoxel.info().state.time===0,'Reset pauses at zero');
  // A late manual file reader cannot replace a newer voxel mode selection.
  const RealReader=w.FileReader,pending=[];w.FileReader=class{constructor(){pending.push(this);}readAsText(){}};
  try{
    const transfer=new w.DataTransfer();transfer.items.add(new w.File(['{}'],'pending.json'));
    $('refresh-input').files=transfer.files;$('refresh-input').dispatchEvent(new w.Event('change',{bubbles:true}));
    assert(!w.officeVoxel.info().active&&w.officeVoxel.info().state===null,'selected import disposes demo');
    change('display-mode','voxel');await ready();
    pending[0].result=JSON.stringify(w.officeRoomSample);pending[0].onload();pending[0].onerror();pending[0].onabort();
    assert($('display-mode').value==='voxel'&&w.officeVoxel.info().active,'stale load/error/abort fenced');
  }finally{w.FileReader=RealReader;}
  for(const mode of ['demo','campus','rooms','movement','snapshot','view-import']){
    change('display-mode',mode);const off=w.officeVoxel.info();assert(!off.active&&!off.renderer&&!off.state,'dispose to '+mode);
    assert(off.accounting.lastDisposed.memory.geometries===0&&off.accounting.lastDisposed.memory.textures===0&&off.accounting.lastDisposed.listeners===0,'GPU/listeners released '+mode);
    assert(!d.querySelector('.office-layout').hidden&&!$('skin-select').disabled,'old view visible '+mode);
    change('display-mode','voxel');await ready();
  }
  for(const time of [125,129]){w.officeVoxel.diagnostics.seek(time);assert(w.officeVoxel.info().state.actors.every(s=>s.liveness==='unknown'),'unknown freezes '+time);}
  const pos=JSON.stringify(w.officeVoxel.info().state.actors.map(s=>s.position));w.officeVoxel.diagnostics.seek(125);assert(JSON.stringify(w.officeVoxel.info().state.actors.map(s=>s.position))===pos,'unknown positions stable');
  w.officeVoxel.diagnostics.seek(130);assert(w.officeVoxel.info().state.actors.every(s=>s.delivered&&s.session.endsWith('-a')||s.delivered&&s.session.endsWith('-b')),'delivery preserves original session');
  w.officeVoxel.diagnostics.seek(140);assert(w.officeVoxel.info().state.actors.every(s=>s.previousSession.status==='explicitly-exited-fictional'&&s.session.endsWith('-new')),'new work explicitly new session after fictional exit');
  $('voxel-reset').click();
  assert(d.documentElement.scrollWidth<=w.innerWidth+1,'no horizontal overflow '+w.innerWidth);
  assert([...d.querySelectorAll('[data-voxel-staff]')].every(b=>b.getBoundingClientRect().height>=44),'44px staff targets');
  return {passed:results.length,results,viewport:[w.innerWidth,w.innerHeight],source:'production DOM and actual renderer; scripted input, no frame-rate claim'};
}

// Exercise missed observer delivery in the same JS turn as a draw/control.
async function runOfficeVoxelResizeTests(w){
  const {createRenderer}=await import('./voxel-renderer.mjs'),d=w.document,results=[];
  const assert=(v,label)=>{if(!v)throw Error(label);results.push(label);};
  const host=d.createElement('div');host.style.cssText='position:fixed;left:0;top:0;width:915px;height:550px';d.body.append(host);
  const r=createRenderer(host),c=host.querySelector('canvas'),g=c.getContext('webgl2');
  const check=label=>{const b=host.getBoundingClientRect(),p=Math.min(w.devicePixelRatio||1,1.5);
    assert(c.width===Math.floor(b.width*p)&&c.height===Math.floor(b.height*p),label+' CSS / current DPR / canvas agree');
    assert(g.drawingBufferWidth===c.width&&g.drawingBufferHeight===c.height,label+' actual GL buffer agrees');
    const point=r.project('momo');assert(point&&Number.isFinite(point.x)&&Number.isFinite(point.y),label+' projection finite');
  };
  try{
    r.update(w.officeVoxelMotion.sample(0),0);check('969 initial');
    for(const [width,height,label,paint] of [[356,390,'390 paused draw',()=>r.draw()],[915,550,'969 paused camera',()=>r.camera('rotate')],[356,390,'390 moving update',()=>r.update(w.officeVoxelMotion.sample(6),6)],[915,550,'969 moving update',()=>r.update(w.officeVoxelMotion.sample(7),7)]]){
      host.style.width=width+'px';host.style.height=height+'px';paint();check(label);
    }
    const descriptor=Object.getOwnPropertyDescriptor(w,'devicePixelRatio');
    try{Object.defineProperty(w,'devicePixelRatio',{configurable:true,value:2});r.draw();check('DPR cap1.5');
      Object.defineProperty(w,'devicePixelRatio',{configurable:true,value:1});r.draw();check('DPR change1');
    }finally{if(descriptor)Object.defineProperty(w,'devicePixelRatio',descriptor);else delete w.devicePixelRatio;}
    const frames=r.info().frames;r.dispose();r.draw();w.dispatchEvent(new w.Event('resize'));
    assert(r.info().frames===frames&&r.info().listeners===0,'disposed resize/draw fenced; listeners removed');
    return {passed:results.length,results,scope:'scripted CSS bounds/DPR changes in isolated renderer; actual GPU buffer, no native-event claim'};
  }finally{r.dispose();host.remove();}
}
