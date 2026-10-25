/* Pure, Z-up world data. No renderer, observations or backend identities. */
(function (root) {
  'use strict';
  const point = (x=0,y=0,z=0) => ({x,y,z});
  const part = (role,x,y,z,w,d,h,extra={}) => ({role,position:point(x,y,z),size:point(w,d,h),...extra});
  const sockets = (extra={}) => ({ground:point(),...extra});
  function definition(id,w,d,h,parts,extra={}) {
    const artBounds=parts.length?{min:point(...['x','y','z'].map(k=>Math.min(...parts.map(p=>p.position[k]-p.size[k]/2)))),max:point(...['x','y','z'].map(k=>Math.max(...parts.map(p=>p.position[k]+p.size[k]/2))))}:{min:point(-w/2,-d/2,0),max:point(w/2,d/2,h)};
    return {id,footprint:{width:w,depth:d},height:h,anchor:point(),sockets:sockets(),parts,artBounds,
      hitAreas:[{min:point(-w/2,-d/2,0),max:point(w/2,d/2,h)}],...extra};
  }
  const deskParts = [part('wood',0,.25,.6875,2,1.25,.125),
    ...[-.8125,.8125].flatMap(x=>[-.25,.75].map(y=>part('woodDark',x,y,.3125,.125,.125,.625))),
    part('cream',.625,.25,.375,.5,1,.5),part('metal',.625,-.265,.5,.25,.025,.0625),
    part('metal',0,.625,.8125,.5,.375,.125),part('metal',0,.6875,1,.125,.125,.5),
    part('screenFrame',0,.6875,1.3125,1,.125,.625),part('screen',0,.6125,1.3125,.875,.025,.5),
    ...[0,1,2].map(i=>part('screenLine',-.125,.59375,1.1875+i*.125,.5-i*.125,.0125,.0375)),
    part('keyboard',-.125,.0625,.78125,.75,.3125,.0625),
    ...[0,1,2,3,4,5].map(i=>part('cream',-.4375+i*.125,.03125,.81875,.0625,.1875,.0125)),
    part('cream',.5,0,.8125,.125,.25,.125)];
  const chairParts = [part('metal',0,0,.125,.75,.125,.125),part('metal',0,0,.125,.125,.75,.125),
    ...[-1,1].flatMap(s=>[part('wheel',s*.3125,0,.0625,.125,.1875,.125),part('wheel',0,s*.3125,.0625,.1875,.125,.125)]),
    part('metal',0,0,.3125,.125,.125,.375),part('chair',0,0,.5,.75,.75,.125),
    part('chair',0,-.3125,.875,.75,.125,.75)];
  const plantParts = [part('pot',0,0,.25,.5,.5,.5),part('soil',0,0,.5125,.375,.375,.025),part('stem',0,0,.875,.125,.125,.75),
    ...[[0,0,1.25],[.25,0,1],[-.25,0,1.125],[0,.25,1.125],[0,-.25,.875]].map(([x,y,z],i)=>part(i%2?'leaf':'leafLight',x,y,z,.375,.375,.25))];
  const shelfParts = [part('woodDark',-.625,0,1.25,.125,.625,2.5),part('woodDark',.625,0,1.25,.125,.625,2.5),
    part('wood',0,.25,1.25,1.25,.125,2.5),...[.125,.875,1.625,2.375].map(z=>part('wood',0,0,z,1.25,.625,.125)),
    ...[.5,1.25,2].flatMap((z,j)=>[-.4375,-.1875,.0625,.3125].map((x,i)=>part(['bookMint','bookBlue','bookCoral'][(i+j)%3],x,-.0625,z,.1875,.375,.5)))];
  const definitions = {
    room:definition('room',6.5,6,3,[]),
    desk:definition('desk',2,2,.75,deskParts,{sockets:sockets({surface:point(0,.25,.75),interaction:point(0,-1,.0)})}),
    chair:definition('chair',.875,.875,1.25,chairParts,{sockets:sockets({seat:point(0,0,.5625),interaction:point(.875,0,0)})}),
    plant:definition('plant',.75,.75,1.5,plantParts),
    shelf:definition('shelf',1.5,.75,2.5,shelfParts),
    cup:definition('cup',.25,.25,.25,[part('ceramic',0,0,.125,.1875,.1875,.25),part('coffee',0,0,.25625,.125,.125,.0125),part('ceramic',.125,0,.125,.125,.0625,.125)]),
    sofa:definition('sofa',3,1.5,1.5,[part('woodDark',0,0,.1875,2.75,1.25,.375),part('sofa',0,0,.5625,2.75,1.25,.375),part('sofa',0,.5625,1,3,.25,1),...[-1.375,1.375].map(x=>part('sofa',x,0,.8125,.25,1.5,.875)),part('cushion',-.6875,.25,.875,.625,.25,.625),part('coral',.6875,.25,.875,.625,.25,.625)],{sockets:sockets({seat:point(0,-.125,.75)})}),
    coffeeTable:definition('coffeeTable',2,1,.5,[part('wood',0,0,.4375,2,1,.125),...[-.75,.75].flatMap(x=>[-.25,.25].map(y=>part('woodDark',x,y,.1875,.125,.125,.375))),part('bookBlue',.375,0,.5625,.625,.5,.125)],{sockets:sockets({surface:point(0,0,.5)})}),
    staff:definition('staff',.75,.75,2,[],{sockets:sockets({seat:point(0,0,.6875),hand:point(.375,.375,.875),head:point(0,0,1.625)}),artBounds:{min:point(-.5,-.5,0),max:point(.5,.5,2)}})
  };
  // Art registration is data too: renderer consumes joint-local cuboids, no identity inference.
  const staffModel={joints:[{id:'head',parentId:null,position:point(0,0,1.625)},
    ...[-1,1].flatMap(side=>[{id:side<0?'leftArm':'rightArm',parentId:null,position:point(side*.3125,0,1.1875)},
      {id:side<0?'leftLeg':'rightLeg',parentId:null,position:point(side*.15625,0,.6875)},
      {id:side<0?'leftKnee':'rightKnee',parentId:side<0?'leftLeg':'rightLeg',position:point(0,0,-.375)}])],
    parts:[part('$outfit',0,0,1,.5,.375,.625),part('cream',0,.2,1.125,.125,.025,.25),
      part('skin',0,0,0,.75,.625,.625,{joint:'head'}),part('$hair',0,-.0625,.3125,.875,.75,.125,{joint:'head'}),
      part('$hair',0,-.3125,0,.875,.125,.625,{joint:'head'}),
      ...[-1,1].map(side=>part('$hair',side*.375,.0625,.125,.125,.625,.375,{joint:'head'})),
      ...[-.25,0,.25].map(x=>part('$hair',x,.3125,.1875,.25,.125,.25,{joint:'head'})),
      ...[-.1875,.1875].map(x=>part('eye',x,.32,-.0625,.0625,.025,.125,{joint:'head'})),
      part('skin',0,.375,-.125,.125,.125,.125,{joint:'head'}),
      ...[-1,1].flatMap(side=>{const arm=side<0?'leftArm':'rightArm',leg=side<0?'leftLeg':'rightLeg',knee=side<0?'leftKnee':'rightKnee';return [
        part('$outfit',0,0,-.1875,.1875,.25,.375,{joint:arm}),part('skin',0,0,-.4375,.1875,.1875,.1875,{joint:arm}),
        part('pants',0,0,-.1875,.1875,.25,.375,{joint:leg}),part('pants',0,0,-.125,.1875,.25,.25,{joint:knee}),part('shoe',0,.0625,-.25,.25,.375,.125,{joint:knee})];})]};
  definitions.staff.parts=staffModel.parts;definitions.staff.model={kind:'articulated',joints:staffModel.joints};
  function actorModel(appearance){const extra=appearance.hair==='pink'?[part('pink',.4375,-.1875,.1875,.25,.375,.375,{joint:'head'}),part('coral',.4375,-.0625,.3125,.25,.125,.125,{joint:'head'})]:appearance.hair==='orange'?[part('orange',0,-.375,.0625,.625,.25,.5,{joint:'head'})]:[];
    return {joints:staffModel.joints,parts:[...definitions.staff.parts,...extra].map(p=>({...p,role:p.role==='$outfit'?appearance.outfit:p.role==='$hair'?appearance.hair:p.role}))};}
  const instances=[];
  function add(id,definitionId,x,y,z=0,extra={}) {instances.push({id,definitionId,parentId:null,position:point(x,y,z),orientation:0,...extra});}
  add('mint-room','room',-4.75,3); add('blue-room','room',4.75,3);
  const staff=[
    {id:'momo',name:'Momo · 모모',room:'mint-room',repository:'fiction/mint-studio',task:'MINT-01 · 첫 화면 이야기',worktree:'mint-story',session:'mint-session-a',hair:'brown',outfit:'mint',start:3},
    {id:'bibi',name:'Bibi · 비비',room:'mint-room',repository:'fiction/mint-studio',task:'MINT-02 · 초록 정원',worktree:'mint-garden',session:'mint-session-b',hair:'pink',outfit:'lilac',start:9},
    {id:'lulu',name:'Lulu · 루루',room:'blue-room',repository:'fiction/blue-workshop',task:'BLUE-01 · 자료 정리',worktree:'blue-library',session:'blue-session-a',hair:'navy',outfit:'blue',start:15},
    {id:'coco',name:'Coco · 코코',room:'blue-room',repository:'fiction/blue-workshop',task:'BLUE-02 · 새 창문',worktree:'blue-window',session:'blue-session-b',hair:'orange',outfit:'rose',start:21}
  ];
  staff.forEach((s,i)=>{
    const x=i<2?-5:5, y=i%2?4.25:1.5;
    s.desk=`desk-${s.id}`; s.chair=`chair-${s.id}`;
    add(s.desk,'desk',x,y,0,{association:s.id}); add(s.chair,'chair',x,y-.875,0,{association:s.id});
    add(`cup-${s.id}`,'cup',.75,.125,0,{parentId:s.desk,parentSocket:'surface',association:s.id});
    add(s.id,'staff',x,y-.875,0,{association:s.id});
  });
  add('mint-shelf','shelf',-6.75,5.5);add('blue-shelf','shelf',7,5.5);
  [[-7,3],[-3,5.25],[3,5.25],[7,.5],[-7,-4.75],[7,-4.75],[1,-.75]].forEach(([x,y],i)=>add(`plant-${i}`,'plant',x,y));
  add('sofa','sofa',4,-2); add('coffee-table','coffeeTable',4,-4); add('lounge-cup','cup',-.625,0,0,{parentId:'coffee-table',parentSocket:'surface'});
  add('lounge-shelf','shelf',7,-2.5);
  add('reading-table','coffeeTable',-5,-2.5);add('reading-chair-a','chair',-5,-3.5);add('reading-chair-b','chair',-6.5,-2.5,0,{orientation:270});add('reading-plant','plant',-7,-.75);
  // +orientation is counterclockwise viewed from +Z. Local +Y is forward.
  function rotate(p,degrees) {const a=degrees*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return point(p.x*c-p.y*s,p.x*s+p.y*c,p.z);}
  function plus(a,b){return point(a.x+b.x,a.y+b.y,a.z+b.z);}
  function transform(instance,items=instances,defs=definitions,seen=new Set()) {
    if(seen.has(instance.id))throw Error(`Parent cycle: ${instance.id}`);seen.add(instance.id);
    const def=defs[instance.definitionId];if(!def)throw Error(`Missing definition: ${instance.definitionId}`);
    if(!instance.parentId)return {position:{...instance.position},orientation:instance.orientation};
    const parent=items.find(v=>v.id===instance.parentId);if(!parent)throw Error(`Missing parent: ${instance.id}`);
    const t=transform(parent,items,defs,seen),pd=defs[parent.definitionId];
    const socket=instance.parentSocket?pd.sockets[instance.parentSocket]:point();
    if(!socket)throw Error(`Missing socket: ${instance.parentId}/${instance.parentSocket}`);
    return {position:plus(t.position,rotate(plus(socket,instance.position),t.orientation)),orientation:t.orientation+instance.orientation};
  }
  function socket(id,name,items=instances,defs=definitions){const i=items.find(v=>v.id===id);if(!i)throw Error(`Missing instance: ${id}`);const p=defs[i.definitionId]?.sockets[name];if(!p)throw Error(`Missing socket: ${id}/${name}`);const t=transform(i,items,defs);return plus(t.position,rotate(p,t.orientation));}
  function validate(defs=definitions,items=instances){
    const ids=new Set();
    Object.values(defs).forEach(d=>{
      if(!d.id||![d.footprint?.width,d.footprint?.depth,d.height].every(n=>Number.isFinite(n)&&n>0)||!d.sockets?.ground||!d.anchor)throw Error('Invalid definition dimensions/anchor/ground');
      [...Object.values(d.sockets),d.anchor].forEach(p=>{if(![p.x,p.y,p.z].every(Number.isFinite))throw Error(`Invalid socket: ${d.id}`);});
      if(!Array.isArray(d.parts)||!Array.isArray(d.hitAreas)||!d.hitAreas.length)throw Error(`Invalid model: ${d.id}`);
      if(d.model){const joints=new Set(d.model.joints.map(j=>j.id));if(d.model.kind!=='articulated'||joints.size!==d.model.joints.length||d.model.joints.some(j=>j.parentId&&!joints.has(j.parentId))||d.parts.some(p=>p.joint&&!joints.has(p.joint)))throw Error(`Invalid articulated model: ${d.id}`);}
      d.parts.forEach(p=>{if(!p.role||![p.size.x,p.size.y,p.size.z].every(n=>Number.isFinite(n)&&n>0)||![p.position.x,p.position.y,p.position.z].every(Number.isFinite))throw Error(`Invalid model part: ${d.id}`);});
    });
    items.forEach(i=>{if(ids.has(i.id))throw Error(`Duplicate instance: ${i.id}`);ids.add(i.id);if(!Number.isFinite(i.orientation)||![i.position.x,i.position.y,i.position.z].every(Number.isFinite))throw Error(`Invalid transform: ${i.id}`);transform(i,items,defs);});
    return true;
  }
  const bounds={min:point(-8,-6,-.375),max:point(8,6,3)};
  function occupancy(id,padding=0){const i=instances.find(v=>v.id===id),d=definitions[i.definitionId],t=transform(i);const corners=[[-1,-1],[-1,1],[1,-1],[1,1]].map(([x,y])=>plus(t.position,rotate(point(x*d.footprint.width/2,y*d.footprint.depth/2),t.orientation)));return {min:point(Math.min(...corners.map(p=>p.x))-padding,Math.min(...corners.map(p=>p.y))-padding),max:point(Math.max(...corners.map(p=>p.x))+padding,Math.max(...corners.map(p=>p.y))+padding)};}
  function blocked(p,r=.3){if(p.x-r<-8||p.x+r>8||p.y-r<-6||p.y+r>6)return true;
    if(p.x>1.5-r&&p.x<8&&Math.abs(p.y+.125)<r+.125)return true;
    if(p.y>0&&p.y<6&&Math.abs(Math.abs(p.x)-1.5)<r+.125&&(p.y<.5+r||p.y>2-r))return true;
    return instances.filter(i=>['desk','sofa','coffeeTable','shelf','plant'].includes(i.definitionId)).some(i=>{const b=occupancy(i.id,r);if(i.definitionId==='desk'){b.min.y=i.position.y-.375-r;b.max.y=i.position.y+.875+r;}return p.x>b.min.x&&p.x<b.max.x&&p.y>b.min.y&&p.y<b.max.y;});
  }
  const nodes={corridor:point(0,1.25),lounge:point(0,-3),interaction:point(-2.25,-4.75)};
  const edges={};
  staff.forEach((s,i)=>{
    const seat=socket(s.chair,'ground'),side=i<2?-1:1;
    nodes[`seat-${s.id}`]=seat; nodes[`aisle-${s.id}`]=point(side*2.5,seat.y);
    nodes[`door-${s.id}`]=point(side*2.5,1.25);
    const path=[`seat-${s.id}`,`aisle-${s.id}`,`door-${s.id}`,'corridor','lounge','interaction'];
    s.route=path;
    path.slice(1).forEach((id,j)=>{edges[`${path[j]}>${id}`]=[nodes[path[j]],nodes[id]];edges[`${id}>${path[j]}`]=[nodes[id],nodes[path[j]]];});
  });
  function route(ids,graph=edges){const out=[];for(let i=1;i<ids.length;i++){const e=graph[`${ids[i-1]}>${ids[i]}`];if(!e)return {points:[],reason:`경로 없음: ${ids[i-1]} → ${ids[i]}`};out.push(...e.slice(i===1?0:1));}return {points:out,reason:''};}
  function interpolate(points,distance){if(!points.length)return null;let rest=distance;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],len=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);if(rest<len&&len>0){const f=rest/len;return {position:point(a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f,a.z+(b.z-a.z)*f),orientation:Math.atan2(-(b.x-a.x),b.y-a.y)*180/Math.PI,direction:(Math.round(Math.atan2(b.x-a.x,b.y-a.y)/ (Math.PI/4))+8)%8,arrived:false};}rest-=len;}return {position:{...points.at(-1)},orientation:0,direction:0,arrived:true};}
  const length=points=>points.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-points[i].x,p.y-points[i].y,p.z-points[i].z),0);
  const api={actorModel,cell:1,voxel:1/8,point,part,definitions,instances,staff,bounds,nodes,edges,rotate,plus,transform,socket,validate,occupancy,blocked,route,interpolate,length};
  if(typeof module!=='undefined')module.exports=api;else root.officeVoxelWorld=api;
})(typeof window!=='undefined'?window:globalThis);
