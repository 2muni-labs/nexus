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

// Observe production geometry through Three only while creating the real view;
// no renderer test API, replacement clock or transform repair is installed.
async function runOfficeVoxelContactTests(w){
  const T=await import('./vendor/three/three.module.js'),d=w.document,results=[],samples=[],seen=new Map();
  const assert=(v,label)=>{if(!v)throw Error(label);results.push(label);};
  const change=(id,value)=>{const e=d.getElementById(id);e.value=value;e.dispatchEvent(new w.Event('change',{bubbles:true}));};
  change('display-mode','demo');
  const add=T.Object3D.prototype.add;let scene;
  try{
    T.Object3D.prototype.add=function(...objects){if(this.isScene)scene=this;return add.apply(this,objects);};
    change('display-mode','voxel');
    for(let i=0;i<200&&!w.officeVoxel.info().renderer;i++)await new Promise(r=>w.setTimeout(r,10));
  }finally{T.Object3D.prototype.add=add;}
  assert(!!scene&&!!w.officeVoxel.info().renderer,'production scene ready; observation hook restored');
  const batches=scene.children.filter(o=>o.isInstancedMesh&&o.instanceMatrix.usage===T.DynamicDrawUsage);
  const parts=[];scene.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&o.userData.logicalId)parts.push(o);});
  const pairs=batches.map(batch=>({batch,parts:parts.filter(p=>p.material===batch.material)}));
  assert(pairs.every(p=>p.parts.length===p.batch.count),'all submitted actor cuboids mapped by material/order');
  const unit=new T.Box3(new T.Vector3(-.5,-.5,-.5),new T.Vector3(.5,.5,.5)),epsilon=1e-6;
  function check(label){
    const {state}=w.officeVoxel.info(),shoes=[];let matrixError=0,boundsError=0;
    assert(!state.playing&&!state.pending,label+' is paused without a presentation callback');
    for(const {batch,parts} of pairs)for(let i=0;i<parts.length;i++){
      const part=parts[i],matrix=new T.Matrix4();batch.getMatrixAt(i,matrix);
      matrixError=Math.max(matrixError,...matrix.elements.map((v,j)=>Math.abs(v-part.matrixWorld.elements[j])));
      const actual=unit.clone().applyMatrix4(matrix),final=unit.clone().applyMatrix4(part.matrixWorld);
      boundsError=Math.max(boundsError,actual.min.distanceTo(final.min),actual.max.distanceTo(final.max));
      assert(batch.userData.ids[i]===part.userData.logicalId,label+' submitted stable ID '+i);
      assert(batch.boundingBox.clone().expandByScalar(epsilon).containsBox(actual),label+' current batch bounds '+i);
      assert(actual.min.distanceTo(batch.boundingSphere.center)<=batch.boundingSphere.radius+epsilon&&actual.max.distanceTo(batch.boundingSphere.center)<=batch.boundingSphere.radius+epsilon,label+' current ray/culling sphere '+i);
      if(part.parent.children.length===2&&part.parent.children[1]===part&&part.scale.x===.25&&part.scale.y===.125&&part.scale.z===.375){
        const actor=state.actors.find(a=>a.id===part.userData.logicalId),side=part.parent.parent.position.x<0?-1:1;
        const step=actor.pose==='walk'?Math.sin(state.time*10+(side>0?Math.PI:0)):0;
        const expected=actor.position.z+Math.max(0,step)*.1;
        shoes.push({id:actor.id,side,sole:actual.min.y,expected});
        assert(Math.abs(actual.min.y-expected)<epsilon,label+' geometric sole contact '+actor.id+'/'+side+' actual='+actual.min.y+' expected='+expected);
        if(!seen.has(actor.id))seen.set(actor.id,new Set());
        seen.get(actor.id).add(actor.pose==='walk'?'walk':actor.phase==='lounge'?'idle':'seated');
      }
    }
    assert(shoes.length===8,label+' both shoes for all four staff');
    assert(matrixError<epsilon&&boundsError<epsilon,label+' final hierarchy equals submitted matrices/geometry');
    const canvas=d.querySelector('#voxel-host canvas'),pixels=canvas.toDataURL();
    for(let angle=0;angle<4;angle++){
      for(const actor of state.actors){const p=w.officeVoxel.project(actor.id),r=canvas.getBoundingClientRect();
        assert(p.x>=r.left&&p.x<=r.right&&p.y>=r.top&&p.y<=r.bottom,label+' actor within camera '+angle+'/'+actor.id);
      }
      d.querySelector('[data-voxel-camera="rotate"]').click();
    }
    assert(canvas.toDataURL()===pixels,label+' four camera redraws cannot correct the paused image');
    d.querySelector('[data-voxel-staff="'+w.officeVoxel.info().selected+'"]').click();
    assert(canvas.toDataURL()===pixels,label+' same-time selection cannot correct the paused image');
    assert(w.officeVoxel.info().state.time===state.time,label+' camera/selection preserve pose time');
    samples.push({label,time:state.time,matrixError,boundsError,shoes});
  }
  d.getElementById('voxel-reset').click();d.getElementById('voxel-reset').click();check('Reset');
  d.getElementById('voxel-next').click();assert(w.officeVoxel.info().state.time===6,'actual Next transitions zero to six');check('Reset then Next');
  for(const trip of w.officeVoxelMotion.schedule())for(const [name,time] of [
    ['walk',trip.start+.37],['idle',trip.start+trip.duration+1],['return',trip.end-.37],['seated',trip.end+.1]
  ]){w.officeVoxel.diagnostics.seek(time);check(trip.id+' '+name);}
  assert(w.officeVoxelWorld.staff.every(s=>['seated','walk','idle'].every(p=>seen.get(s.id)?.has(p))),'each staff exercised seated, idle and walking geometry');
  d.getElementById('voxel-reset').click();
  return {passed:results.length,results,samples,scope:'actual production Reset/Next and paused scenario transitions, submitted cuboids, contact, camera/selection pixel stability; scripted controls, no native-input or performance claim'};
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

async function runOfficeVoxelInputTests(w){
  const {createRenderer}=await import('./voxel-renderer.mjs'),d=w.document,results=[],picks=[];
  const assert=(v,label)=>{if(!v)throw Error(label);results.push(label);};
  const host=d.createElement('div');host.style.cssText='position:fixed;left:0;top:0;width:915px;height:550px';d.body.append(host);
  const T=await import('./vendor/three/three.module.js'),add=T.Object3D.prototype.add,wallGroups=new Set();let r;
  try{T.Object3D.prototype.add=function(...objects){if(this.userData.normal)wallGroups.add(this);return add.apply(this,objects);};r=createRenderer(host,{onSelect:id=>picks.push(id)});}
  finally{T.Object3D.prototype.add=add;}
  const c=host.querySelector('canvas'),captured=new Set(),captureCalls=[];
  // Synthetic PointerEvents are not active native pointers. Exercise ownership and
  // release paths explicitly; actual OS capture/input requires separate evidence.
  c.setPointerCapture=id=>{captured.add(id);captureCalls.push(['set',id]);};
  c.hasPointerCapture=id=>captured.has(id);
  c.releasePointerCapture=id=>{captured.delete(id);captureCalls.push(['release',id]);};
  const pointer=(type,x,y,extra={})=>c.dispatchEvent(new w.PointerEvent(type,{clientX:x,clientY:y,pointerId:7,pointerType:'mouse',isPrimary:true,button:0,buttons:type==='pointerup'?0:1,bubbles:true,cancelable:true,...extra}));
  const wheel=(deltaY,extra={},node=c)=>{const e=new w.WheelEvent('wheel',{deltaY,bubbles:true,cancelable:true,...extra});node.dispatchEvent(e);return e;};
  const camera=()=>JSON.stringify([r.info().angle,r.info().pan,r.info().zoom]);
  try{
    r.update(w.officeVoxelMotion.sample(0),0);
    for(let angle=0;angle<4;angle++)for(const zoom of [.75,1,2.5]){
      r.camera('reset');for(let i=0;i<angle;i++)r.camera('rotate');
      if(zoom!==1)wheel(zoom===.75?1e6:-1e6);
      const before=r.project('momo'),count=picks.length,pan=camera();
      pointer('pointerdown',400,250);pointer('pointermove',406,250);pointer('pointerup',406,250);
      assert(camera()===pan,'6px click-only at angle '+angle+' zoom '+zoom);
      assert(!captured.size,'click capture released '+angle+'/'+zoom);
      const beforeDragPicks=picks.length,start=r.project('momo');pointer('pointerdown',400,250);pointer('pointermove',450,280);
      const end=r.project('momo');assert(Math.abs(end.x-start.x-50)<.001&&Math.abs(end.y-start.y-30)<.001,'floor/camera-relative pan '+angle+'/'+zoom);
      pointer('pointerup',450,280);assert(picks.length===beforeDragPicks&&!captured.size,'drag never picks and releases '+angle+'/'+zoom);
      assert(Number.isFinite(before.x),'projection remains finite');
    }
    assert(wallGroups.size===11,'actual exterior/partition/lounge wall groups observed');
    const cutaway=()=>JSON.stringify([...wallGroups].map(g=>[g.userData.main.scale.y,g.userData.cap.position.y,g.userData.decoration?.visible]));
    for(let angle=0;angle<4;angle++){
      r.camera('reset');for(let i=0;i<angle;i++)r.camera('rotate');const before=cutaway();
      pointer('pointerdown',400,250);pointer('pointermove',5400,-4750);assert(cutaway()===before,'large positive pan preserves viewing-direction cutaway '+angle);
      pointer('pointermove',-4600,5250);assert(cutaway()===before,'large negative pan preserves viewing-direction cutaway '+angle);pointer('pointerup',-4600,5250);
    }
    r.camera('reset');picks.length=0;const head=r.project('coco');
    pointer('pointerdown',head.x,head.y);pointer('pointerup',head.x,head.y);
    assert(picks.at(-1)==='coco','visible Coco surface ray selects stable ID');
    const same=camera(),n=picks.length;
    pointer('pointerdown',400,250,{button:2,buttons:2});pointer('pointermove',450,280,{buttons:2});pointer('pointerup',450,280,{button:2});
    assert(camera()===same&&picks.length===n&&!captured.size,'secondary buttons ignored');
    pointer('pointerdown',400,250,{isPrimary:false});pointer('pointerup',400,250,{isPrimary:false});assert(!captured.size&&picks.length===n,'non-primary ignored');
    pointer('pointerdown',400,250);pointer('pointerdown',100,100,{pointerId:8});pointer('pointermove',150,150,{pointerId:8});pointer('pointerup',150,150,{pointerId:8});
    assert(camera()===same&&captured.has(7)&&!captured.has(8),'additional pointer cannot own/cancel primary');
    pointer('pointermove',-50,-50);pointer('pointerup',-50,-50);assert(!captured.size&&picks.length===n,'captured outside-up completes drag without pick');
    for(const type of ['pointercancel','lostpointercapture']){
      pointer('pointerdown',400,250);pointer(type,400,250);const stopped=camera();pointer('pointermove',500,300);pointer('pointerup',500,300);
      assert(camera()===stopped&&!captured.size&&picks.length===n,type+' fences stale move/up');
    }
    pointer('pointerdown',400,250);pointer('pointermove',420,250);pointer('pointermove',400,250);pointer('pointerup',400,250);
    assert(picks.length===n&&!captured.size,'crossed threshold stays drag after return');
    pointer('pointerdown',400,250);pointer('pointermove',500,300,{buttons:0});assert(!captured.size,'missing primary button cancels gesture');
    pointer('pointerdown',400,250);r.camera('reset');pointer('pointerup',400,250);assert(picks.length===n&&!captured.size,'explicit camera action fences old gesture');
    for(const [delta,mode,pixels] of [[20,0,20],[2,1,32],[.25,2,137.5]]){
      r.camera('reset');const e=wheel(delta,{deltaMode:mode});assert(e.defaultPrevented&&Math.abs(r.info().zoom-Math.exp(-pixels*.0015))<1e-10,'wheel unit normalized '+mode);
    }
    wheel(1e6);assert(r.info().zoom===.75,'wheel minimum .75');wheel(-1e6);assert(r.info().zoom===2.5,'wheel maximum2.5');
    const zoom=r.info().zoom;for(const extra of [{ctrlKey:true},{metaKey:true}])assert(!wheel(50,extra).defaultPrevented&&r.info().zoom===zoom,'browser zoom modifier untouched');
    assert(!wheel(50,{},d.body).defaultPrevented,'outside canvas page wheel untouched');
    assert(!wheel(0,{deltaX:100}).defaultPrevented&&r.info().zoom===zoom,'horizontal-only wheel untouched');
    r.camera('reset');assert(r.info().angle===0&&r.info().zoom===1&&r.info().pan.x===0&&r.info().pan.y===0,'camera reset restores initial preset');
    // Withhold observer/window event delivery by changing CSS and interacting
    // in this same JS task. The first action must use the new frustum.
    host.style.width='356px';host.style.height='390px';r.draw();const mobileHead=r.project('coco');
    host.style.width='915px';host.style.height='550px';r.draw();
    host.style.width='356px';host.style.height='390px';const beforeResizePick=picks.length;
    pointer('pointerdown',mobileHead.x,mobileHead.y);pointer('pointerup',mobileHead.x,mobileHead.y);
    assert(picks.length===beforeResizePick+1&&picks.at(-1)==='coco'&&c.width===Math.floor(356*Math.min(w.devicePixelRatio||1,1.5)),'first click after missed resize uses current frustum/buffer');
    const mobileStart=r.project('momo');host.style.width='915px';host.style.height='550px';r.draw();
    host.style.width='356px';host.style.height='390px';pointer('pointerdown',100,200);pointer('pointermove',130,220);pointer('pointerup',130,220);
    const mobileEnd=r.project('momo');assert(Math.abs(mobileEnd.x-mobileStart.x-30)<.001&&Math.abs(mobileEnd.y-mobileStart.y-20)<.001,'first drag after missed resize anchors current floor');
    r.camera('reset');host.style.width='915px';host.style.height='550px';r.draw();host.style.width='356px';host.style.height='390px';wheel(20);
    assert(c.width===Math.floor(356*Math.min(w.devicePixelRatio||1,1.5))&&Math.abs(r.info().zoom-Math.exp(-.03))<1e-10,'first wheel after missed resize fits current buffer');
    host.style.width='915px';host.style.height='550px';r.draw();host.style.width='356px';host.style.height='390px';const freshProject=r.project('coco');
    assert(Number.isFinite(freshProject.x)&&c.width===Math.floor(356*Math.min(w.devicePixelRatio||1,1.5)),'project diagnostic uses current frustum/buffer');
    pointer('pointerdown',100,200);host.style.width='915px';host.style.height='550px';pointer('pointermove',150,220);pointer('pointerup',150,220);
    assert(!captured.size,'missed resize during gesture releases stale capture');
    pointer('pointerdown',400,250);c.dispatchEvent(new w.Event('webglcontextlost',{cancelable:true}));const lost=camera();pointer('pointermove',500,300);wheel(100);pointer('pointerup',500,300);
    assert(!captured.size&&camera()===lost,'context loss releases capture and fences input');
    const frames=r.info().frames;r.dispose();pointer('pointerdown',400,250);pointer('pointermove',500,300);wheel(100);pointer('pointerup',500,300);
    assert(!captured.size&&r.info().listeners===0&&r.info().frames===frames,'dispose removes handlers and prevents later rendering');
    // Exercise production controller: gestures never start/reset its motion or
    // change selection/palette, including while its one callback is pending.
    const live=d.querySelector('#voxel-host canvas'),play=d.getElementById('voxel-play');
    d.getElementById('voxel-reset').click();w.officeVoxel.select('bibi');
    for(const playing of [false,true]){if(playing)play.click();const before=w.officeVoxel.info(),rect=live.getBoundingClientRect();
      live.dispatchEvent(new w.WheelEvent('wheel',{deltaY:20,cancelable:true}));
      for(const type of ['pointerdown','pointermove','pointerup'])live.dispatchEvent(new w.PointerEvent(type,{pointerId:9,isPrimary:true,button:0,buttons:type==='pointerup'?0:1,clientX:rect.left+100+(type==='pointerdown'?0:30),clientY:rect.top+100,bubbles:true}));
      const after=w.officeVoxel.info();assert(after.state.time===before.state.time&&after.state.playing===before.state.playing&&after.state.pending===before.state.pending&&after.selected===before.selected&&after.palette===before.palette,'production camera preserves motion/identity/palette '+playing);
      if(playing)play.click();
    }
    d.querySelector('[data-voxel-camera="reset"]').click();
    return {passed:results.length,results,captureCalls,scope:'production DOM and actual Three ray/projection, scripted event/capture contract; native delivery remains separate'};
  }finally{r.dispose();host.remove();}
}

// Controlled preferences/visibility belong only to a new test document. This
// never changes the real browser/OS preference or claims native transition proof.
async function runOfficeVoxelSuspensionTests(w){
  const html=await(await w.fetch('./index.html')).text(),frame=w.document.createElement('iframe'),results=[];
  frame.style.cssText='position:fixed;left:0;top:0;width:969px;height:1064px';
  const setup=`window.testHidden=false;Object.defineProperty(document,'hidden',{configurable:true,get:()=>testHidden});
    const actualMatch=window.matchMedia.bind(window),callbacks=new Set();
    window.testReduced={matches:false,media:'(prefers-reduced-motion: reduce)',addEventListener:(type,fn)=>callbacks.add(fn),removeEventListener:(type,fn)=>callbacks.delete(fn)};
    window.matchMedia=q=>q==='(prefers-reduced-motion: reduce)'?testReduced:actualMatch(q);
    window.testReduce=value=>{testReduced.matches=value;callbacks.forEach(fn=>fn({matches:value}));};`;
  frame.srcdoc=html.replace('<head>','<head><base href="'+w.location.href+'"><script>'+setup+'</script>');w.document.body.append(frame);
  const assert=(v,label)=>{if(!v)throw Error(label);results.push(label);};
  try{
    const f=frame.contentWindow;for(let n=0;n<300&&!f.officeVoxel?.info().renderer;n++){if(f.officeVoxel&&!f.officeVoxel.info().active)f.officeVoxel.mode('voxel');await new Promise(r=>w.setTimeout(r,10));}
    assert(!!f.officeVoxel?.info().renderer,'isolated production document ready');
    const play=f.document.getElementById('voxel-play');
    for(const reason of ['hidden','reduced']){
      play.click();await new Promise(r=>w.setTimeout(r,100));assert(f.officeVoxel.info().state.playing,'playing before '+reason);
      if(reason==='hidden'){f.testHidden=true;f.document.dispatchEvent(new f.Event('visibilitychange'));}else f.testReduce(true);
      const state=f.officeVoxel.info().state;assert(!state.playing&&!state.pending&&!!state.reason,'suspend cancels callback '+reason);
      await new Promise(r=>w.setTimeout(r,100));assert(f.officeVoxel.info().state.time===state.time,'suspension freezes elapsed '+reason);
      if(reason==='hidden'){f.testHidden=false;f.document.dispatchEvent(new f.Event('visibilitychange'));}else f.testReduce(false);
      assert(!f.officeVoxel.info().state.playing&&!f.officeVoxel.info().state.pending,'clear does not auto-resume '+reason);
    }
    play.click();f.dispatchEvent(new f.Event('pagehide'));
    const off=f.officeVoxel.info();assert(!off.renderer&&!off.state&&off.accounting.lastDisposed.listeners===0,'pagehide disposes renderer/listeners/clock');
    return {passed:results.length,results,scope:'scripted constraint transitions in isolated production iframe; no native media/visibility or OS preference claim'};
  }finally{frame.contentWindow?.dispatchEvent(new frame.contentWindow.Event('pagehide'));frame.remove();}
}
