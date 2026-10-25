import * as T from './vendor/three/three.module.js';
const W=window.officeVoxelWorld;
// The sole domain-to-renderer boundary: X/Y floor, Z up -> Three X/Z floor, Y up.
export const toThree=p=>new T.Vector3(p.x,p.z,-p.y);
const palettes={
  daylight:{background:'#eee7de',cream:'#f8f2e7',wood:'#e9b77b',woodDark:'#9e7654',metal:'#838e98',screenFrame:'#485d70',screen:'#c2e6f7',screenLine:'#709dcc',keyboard:'#eef1e8',chair:'#adc7bf',wheel:'#59636d',pot:'#eee8d9',soil:'#8a7350',stem:'#667d36',leaf:'#71a741',leafLight:'#9ec746',bookMint:'#7bb9a3',bookBlue:'#83a8d7',bookCoral:'#ed9b83',ceramic:'#fff6e7',coffee:'#6c4935',sofa:'#f3c661',cushion:'#b5d6b4',coral:'#ec967d',mintWall:'#91c9b0',blueWall:'#90afd6',loungeWall:'#ecaf92',floorMint:'#c5dfc7',floorBlue:'#c3d3e7',floorWood:'#e3bc93',grout:'#d1c5af',glass:'#c8e5e9',skin:'#f6c19d',brown:'#725039',pink:'#dc8192',navy:'#424c77',orange:'#d88645',mint:'#53a998',lilac:'#b69bcc',blue:'#628aca',rose:'#d88f9f',pants:'#4e586a',shoe:'#695c51',eye:'#3d3541'},
  sorbet:{background:'#e9e6ed',cream:'#fff5eb',wood:'#dfb895',woodDark:'#a28478',metal:'#9b9cae',screenFrame:'#5c627f',screen:'#d7e6ff',screenLine:'#9b9acf',keyboard:'#f7efee',chair:'#bdb0d7',wheel:'#686174',pot:'#f6e0cf',soil:'#8a7350',stem:'#647e50',leaf:'#86b57a',leafLight:'#b8cd8c',bookMint:'#90c8bd',bookBlue:'#ada9de',bookCoral:'#eda7a1',ceramic:'#fff4e4',coffee:'#6c4935',sofa:'#efb58c',cushion:'#c3b4df',coral:'#e9a0a6',mintWall:'#add3c6',blueWall:'#acaed5',loungeWall:'#eab4ab',floorMint:'#d7e5cd',floorBlue:'#ddd8ee',floorWood:'#ebd0ae',grout:'#d5c9c3',glass:'#d6e6f0',skin:'#f6c19d',brown:'#725039',pink:'#c77fa1',navy:'#4b537b',orange:'#c98d62',mint:'#7bb3a9',lilac:'#ae9acb',blue:'#9196ca',rose:'#d793a5',pants:'#64627d',shoe:'#79665b',eye:'#3d3541'}
};
export const paletteNames=Object.keys(palettes);
export function createRenderer(host,{onSelect=()=>{},onFailure=()=>{}}={}){
  W.validate();
  const canvas=document.createElement('canvas');canvas.setAttribute('aria-label','실제 3D 복셀 오피스 · 직원 선택은 아래 버튼으로도 가능');
  const gl=canvas.getContext('webgl2',{antialias:true,alpha:false,depth:true,preserveDrawingBuffer:true});
  if(!gl)throw Error('WebGL2 unavailable');
  let renderer;
  try{renderer=new T.WebGLRenderer({canvas,context:gl,antialias:true});}catch(e){gl.getExtension('WEBGL_lose_context')?.loseContext();throw e;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.outputColorSpace=T.SRGBColorSpace;
  const scene=new T.Scene(),camera=new T.OrthographicCamera(-10,10,8,-8,.1,100);
  const geometry=new T.BoxGeometry(1,1,1), materials={},batches=new Map(),walls=[],actors=new Map(),listeners=[];
  let palette='daylight',angle=0,zoom=1,pan={x:0,y:0},selected='momo',disposed=false,lost=false,frames=0,renderTimes=[],frameStamps=[];
  function mat(role){if(!palettes[palette][role])throw Error(`Unknown material role: ${role}`);return materials[role]??=new T.MeshLambertMaterial({color:palettes[palette][role]});}
  function box(parent,p,id=null){const m=new T.Mesh(geometry,mat(p.role));m.position.copy(toThree(p.position));m.scale.set(p.size.x,p.size.z,p.size.y);m.castShadow=true;m.receiveShadow=true;m.userData.logicalId=id;parent.add(m);return m;}
  function queue(p,id=null){if(!batches.has(p.role))batches.set(p.role,[]);batches.get(p.role).push({p,id});}
  function flush(){for(const [role,parts] of batches){const mesh=new T.InstancedMesh(geometry,mat(role),parts.length),temp=new T.Object3D();mesh.userData.ids=parts.map(v=>v.id);
      parts.forEach(({p},i)=>{temp.position.copy(toThree(p.position));temp.scale.set(p.size.x,p.size.z,p.size.y);temp.rotation.set(0,(p.orientation||0)*Math.PI/180,0);temp.updateMatrix();mesh.setMatrixAt(i,temp.matrix);});
      mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingBox();scene.add(mesh);}batches.clear();}
  const b=W.bounds, width=b.max.x-b.min.x,depth=b.max.y-b.min.y;
  box(scene,W.part('cream',0,0,-.375,width+.5,depth+.5,.5));
  const ground=box(scene,W.part('background',0,0,-.7125,width*2,depth*2,.125));ground.castShadow=false;const shadowCatcher=new T.ShadowMaterial({color:'#9c8e80',opacity:.18});ground.material=shadowCatcher;
  for(let x=b.min.x;x<b.max.x;x++)for(let y=b.min.y;y<b.max.y;y++){
    const role=y<0?'floorWood':x<-1.5?'floorMint':x>1.5?'floorBlue':'cream';
    queue(W.part(role,x+.5,y+.5,-.03125,.984375,.984375,.0625));
    // Fine wood end joints, all true cuboids.
    if(y<0)queue(W.part('wood',x+.5,y+.5,.003,.0125,.95,.003));
  }
  function wall(id,x,y,w,d,role,normal,full=3){
    const group=new T.Group();group.userData.normal=normal;group.userData.full=full;group.userData.role=role;
    const main=box(group,W.part(role,x,y,full/2,w,d,full));const cap=box(group,W.part('cream',x,y,full+.0625,w+.0625,d+.0625,.125));
    group.userData.main=main;group.userData.cap=cap;group.userData.size={x,y,w,d};walls.push(group);scene.add(group);return group;
  }
  // Exterior walls use actual window openings and opaque cuboid glazing.
  [-1,1].forEach(side=>{
    const cx=side*4.75,role=side<0?'mintWall':'blueWall';
    wall(`back-${side}`,cx,6,6.5,.25,role,{x:0,y:1});
    wall(`outer-${side}`,side*8,3,.25,6,role,{x:side,y:0});
    // Windows sit just inside the back wall, with frames, sill and blinds.
    const windowGroup=new T.Group();scene.add(windowGroup);walls.at(-2).userData.decoration=windowGroup;
    box(windowGroup,W.part('cream',cx,5.825,1.875,2.75,.125,1.5));
    box(windowGroup,W.part('glass',cx,5.7375,1.875,2.5,.0625,1.25));
    box(windowGroup,W.part('cream',cx,5.675,1.875,.0625,.0625,1.25));
    box(windowGroup,W.part('cream',cx,5.625,1.125,3,.375,.125));
    [0,1,2].forEach(i=>box(windowGroup,W.part('cream',cx,5.65,2.25+i*.125,2.625,.125,.0625)));
    // Framed geometric print on outer wall.
    const art=new T.Group();scene.add(art);walls.at(-1).userData.decoration=art;
    box(art,W.part('wood',side*7.825,2.75,1.875,.125,1,1.25));box(art,W.part('cream',side*7.7375,2.75,1.875,.0625,.875,1.125));
    box(art,W.part('bookCoral',side*7.69,2.625,1.875,.025,.375,.375));box(art,W.part('bookBlue',side*7.69,2.9375,1.6875,.025,.25,.25));
    // Door opening 1.5 wide; the camera-facing partition is cut away.
    wall(`partition-low-${side}`,side*1.5,.25,.25,.5,role,{x:-side,y:0});
    wall(`partition-high-${side}`,side*1.5,4,.25,4,role,{x:-side,y:0});
    wall(`front-${side}`,cx,-6,6.5,.25,'cream',{x:0,y:-1},1);
  });
  // Warm lounge half-wall leaves a broad connecting corridor at x=0.
  wall('lounge',4.75,-.125,6.5,.25,'loungeWall',{x:0,y:1},1.5);
  // Rug and coffee cabinet, original cuboid models.
  queue(W.part('coral',4,-3.375,.015,4.75,4.25,.03));queue(W.part('cushion',4,-3.375,.035,4.25,3.75,.015));
  queue(W.part('wood',-4,-4.75,.5,2.5,.875,1));queue(W.part('cream',-4,-4.75,1.0625,2.625,1,.125));
  queue(W.part('screenFrame',-4.5,-4.75,1.4375,.625,.625,.625));queue(W.part('metal',-4.5,-5.1,1.4375,.375,.0625,.25));
  [-3.75,-3.375].forEach(x=>W.definitions.cup.parts.forEach(p=>queue({...p,position:W.plus(p.position,W.point(x,-4.75,1.125))})));
  // Rectangular lamp, luminous-looking opaque cream rather than extra lights.
  queue(W.part('metal',2,-1,.0625,.5,.5,.125));queue(W.part('woodDark',2,-1,1.125,.125,.125,2));queue(W.part('ceramic',2,-1,2.125,.5,.5,.5));
  W.instances.filter(i=>i.definitionId!=='staff').forEach(i=>{
    const t=W.transform(i);W.definitions[i.definitionId].parts.forEach(p=>queue({...p,position:W.plus(t.position,W.rotate(p.position,t.orientation)),orientation:t.orientation},i.association||i.id));
  });flush();
  // Articulated actor models use shared geometry/materials, independent from identity.
  function actor(s){const root=new T.Group();scene.add(root);const joints={},model=W.actorModel(s);
    for(const j of model.joints){const g=new T.Group();g.position.copy(toThree(j.position));(j.parentId?joints[j.parentId]:root).add(g);joints[j.id]=g;}
    for(const p of model.parts)box(p.joint?joints[p.joint]:root,p,s.id);
    return {root,joints,id:s.id};
  }
  W.staff.forEach(s=>actors.set(s.id,actor(s)));
  const selection=new T.Group();scene.add(selection);
  [[0,-.55,1.1,.0625],[0,.55,1.1,.0625],[-.55,0,.0625,1.1],[.55,0,.0625,1.1]].forEach(([x,y,w,d])=>{const m=box(selection,W.part('ceramic',x,y,.02,w,d,.04));m.userData.ignorePick=true;m.castShadow=false;});
  const debug=new T.Group();debug.visible=false;scene.add(debug);
  const debugMaterial=new T.LineBasicMaterial({color:'#7962b2',depthTest:false});
  const debugGeometries=[];
  function lines(points){const geo=new T.BufferGeometry().setFromPoints(points.map(toThree));debugGeometries.push(geo);const line=new T.LineSegments(geo,debugMaterial);line.renderOrder=2;line.userData.ignorePick=true;debug.add(line);}
  for(let x=-8;x<=8;x++)lines([W.point(x,-6,.05),W.point(x,6,.05)]);
  for(let y=-6;y<=6;y++)lines([W.point(-8,y,.05),W.point(8,y,.05)]);
  W.instances.forEach(i=>{const t=W.transform(i),d=W.definitions[i.definitionId],o=W.occupancy(i.id),z=.1;
    lines([W.point(o.min.x,o.min.y,z),W.point(o.max.x,o.min.y,z),W.point(o.max.x,o.min.y,z),W.point(o.max.x,o.max.y,z),W.point(o.max.x,o.max.y,z),W.point(o.min.x,o.max.y,z),W.point(o.min.x,o.max.y,z),W.point(o.min.x,o.min.y,z),t.position,W.plus(t.position,W.point(0,0,d.height))]);
    Object.keys(d.sockets).forEach(name=>{const p=W.socket(i.id,name);lines([W.plus(p,W.point(-.1,0,0)),W.plus(p,W.point(.1,0,0)),W.plus(p,W.point(0,-.1,0)),W.plus(p,W.point(0,.1,0))]);});
  });
  scene.add(new T.AmbientLight(0xffffff,1.8));
  const light=new T.DirectionalLight(0xfff2dd,1.4);light.position.copy(toThree(W.point(-6,-8,24)));light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-14;light.shadow.camera.right=14;light.shadow.camera.top=14;light.shadow.camera.bottom=-14;light.shadow.radius=3;light.shadow.normalBias=.015;light.shadow.bias=-.00015;scene.add(light);
  const target=new T.Vector3();
  function fit(){if(disposed)return;const rect=host.getBoundingClientRect(),w=Math.max(1,rect.width),h=Math.max(1,rect.height);renderer.setSize(w,h,false);
    const az=(45+90*angle)*Math.PI/180,el=30*Math.PI/180;
    target.copy(toThree(W.point(pan.x,pan.y,.8)));camera.position.copy(target).add(new T.Vector3(Math.sin(az)*Math.cos(el)*30,Math.sin(el)*30,Math.cos(az)*Math.cos(el)*30));camera.lookAt(target);camera.updateMatrixWorld();
    // Fit the actual world corners including wall height at each preset angle.
    const corners=[];for(const x of [b.min.x-.5,b.max.x+.5])for(const y of [b.min.y-.5,b.max.y+.5])for(const z of [b.min.z,b.max.z+.5])corners.push(toThree(W.point(x,y,z)).applyMatrix4(camera.matrixWorldInverse));
    const spanX=Math.max(...corners.map(v=>v.x))-Math.min(...corners.map(v=>v.x)),spanY=Math.max(...corners.map(v=>v.y))-Math.min(...corners.map(v=>v.y));
    const aspect=w/h,half=Math.max(spanY/2,spanX/(aspect*2))*1.06/zoom;camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();
    const cameraWorld=W.point(camera.position.x,-camera.position.z,camera.position.y);
    walls.forEach(group=>{const n=group.userData.normal,front=n.x*cameraWorld.x+n.y*cameraWorld.y>0,full=group.userData.full,height=front?.5:full,{x,y}=group.userData.size;
      group.userData.main.scale.y=height;group.userData.main.position.y=height/2;group.userData.cap.position.copy(toThree(W.point(x,y,height+.0625)));if(group.userData.decoration)group.userData.decoration.visible=!front;
    });draw();
  }
  function draw(){if(disposed||lost)return;const start=performance.now();frameStamps.push(start);if(frameStamps.length>1200)frameStamps.shift();renderer.render(scene,camera);frames++;renderTimes.push(performance.now()-start);if(renderTimes.length>1200)renderTimes.shift();}
  let current=[],currentTime=0;
  function update(values,time=currentTime){current=values;currentTime=time;for(const s of values){const a=actors.get(s.id);if(!a)throw Error('Missing actor model');a.root.position.copy(toThree(s.position));a.root.rotation.y=s.orientation*Math.PI/180;
      const seated=s.pose==='work'||(s.pose==='wait'&&['working','reserved','unknown','delivered','new-session','blocked'].includes(s.phase));
      // Seated feet remain on the floor; hips shift over the seat and knees fold forward.
      const seatOffset=seated?W.socket(s.chair,'seat').z-W.definitions.staff.sockets.seat.z-s.position.z:0;
      a.root.position.y+=seatOffset;
      const swing=s.pose==='walk'?Math.sin(time*10)*.38:0;
      const typing=s.pose==='work'?Math.sin(time*6)*.025:0;
      a.joints.leftArm.rotation.x=seated?1.1+typing:swing;a.joints.rightArm.rotation.x=seated?1.1-typing:-swing;
      a.joints.leftLeg.rotation.x=seated?Math.PI/2:-swing;a.joints.rightLeg.rotation.x=seated?Math.PI/2:swing;
      // Feet are articulated separately from the thighs so seated shoes rest at Z=0.
      for(const name of ['leftKnee','rightKnee']){const knee=a.joints[name];knee.rotation.x=seated?-Math.PI/2:0;knee.children[0].scale.y=seated?.5:.25;knee.children[0].position.y=seated?-.25:-.125;}
      a.root.updateMatrixWorld(true);
      for(const [side,legName,kneeName] of [[-1,'leftLeg','leftKnee'],[1,'rightLeg','rightKnee']]){const knee=a.joints[kneeName],leg=a.joints[legName],shoe=knee.children[1];
        const step=s.pose==='walk'?Math.sin(time*10+ (side>0?Math.PI:0)):0;
        const foot=a.root.localToWorld(new T.Vector3(side*.15625,.0625+(seated?-seatOffset:Math.max(0,step)*.1),seated?-.4375:-.0625+step*.15));
        shoe.position.copy(knee.worldToLocal(foot));shoe.rotation.x=-leg.rotation.x-knee.rotation.x;
      }
    }
    const selectedActor=values.find(v=>v.id===selected);if(selectedActor)selection.position.copy(toThree(selectedActor.position));draw();
  }
  const ray=new T.Raycaster();
  let down=null;
  function listen(node,type,fn,options){node.addEventListener(type,fn,options);listeners.push(()=>node.removeEventListener(type,fn,options));}
  listen(canvas,'pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
  listen(canvas,'pointerup',e=>{if(!down||Math.hypot(down.x-e.clientX,down.y-e.clientY)>6)return;down=null;const r=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);
    const hits=ray.intersectObjects(scene.children,true).filter(h=>{let o=h.object;while(o){if(!o.visible||o.userData.ignorePick)return false;o=o.parent;}return true;});
    const hit=hits[0];if(!hit)return;const id=hit.object.userData.ids?.[hit.instanceId]??hit.object.userData.logicalId;if(W.staff.some(s=>s.id===id))onSelect(id);
  });
  listen(canvas,'webglcontextlost',e=>{e.preventDefault();if(disposed)return;lost=true;onFailure('context-lost');});
  listen(canvas,'webglcontextrestored',()=>{if(!disposed)onFailure('context-restored-retry');});
  const resize=new ResizeObserver(fit);resize.observe(host);host.replaceChildren(canvas);fit();
  return {update,draw,select(id){selected=id;update(current);},camera(action){if(action==='rotate')angle=(angle+1)%4;else if(action==='reset'){angle=0;zoom=1;pan={x:0,y:0};}else if(action==='in')zoom=Math.min(2.5,zoom*1.2);else if(action==='out')zoom=Math.max(.75,zoom/1.2);else if(action==='left')pan.x-=1;else if(action==='right')pan.x+=1;else if(action==='up')pan.y+=1;else if(action==='down')pan.y-=1;fit();},
    palette(value){if(!palettes[value])throw Error('Unknown palette');palette=value;Object.entries(materials).forEach(([role,m])=>m.color.set(palettes[palette][role]));scene.background=new T.Color(palettes[palette].background);draw();},
    debug(value){debug.visible=value;draw();},
    info(){return {version:T.REVISION,webgl2:true,frames,angle,palette,zoom,pan:{...pan},render: {...renderer.info.render},memory:{...renderer.info.memory},programs:renderer.info.programs?.length,renderMilliseconds:renderTimes.slice(),frameStamps:frameStamps.slice(),graphics:{vendor:gl.getParameter(gl.VENDOR),renderer:gl.getParameter(gl.RENDERER),version:gl.getParameter(gl.VERSION),unmaskedRenderer:gl.getExtension('WEBGL_debug_renderer_info')?gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL):null},actors:actors.size,canvas:canvas.isConnected,disposed,lost,listeners:listeners.length};},
    project(id){const actor=current.find(v=>v.id===id);if(!actor)return null;const p=toThree(W.plus(actor.position,W.point(0,0,1.6))).project(camera),r=canvas.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};},
    loseContext(){gl.getExtension('WEBGL_lose_context')?.loseContext();},restoreContext(){gl.getExtension('WEBGL_lose_context')?.restoreContext();},
    dispose(){if(disposed)return;disposed=true;resize.disconnect();listeners.splice(0).forEach(fn=>fn());scene.traverse(o=>{if(o.isInstancedMesh)o.dispose();});geometry.dispose();debugGeometries.forEach(g=>g.dispose());debugMaterial.dispose();shadowCatcher.dispose();Object.values(materials).forEach(m=>m.dispose());light.shadow.dispose();renderer.renderLists.dispose();renderer.dispose();renderer.forceContextLoss();scene.clear();canvas.remove();current=[];actors.clear();}
  };
}
