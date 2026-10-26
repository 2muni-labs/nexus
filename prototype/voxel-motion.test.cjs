const assert=require('node:assert/strict'),W=require('./voxel-world.js'),M=require('./voxel-motion.js');
const schedule=M.schedule();
for(let i=1;i<schedule.length;i++)assert.ok(schedule[i].start>schedule[i-1].end);
for(let t=0;t<145;t+=.05){const actors=M.sample(t);assert.ok(actors.filter(s=>s.reservation).length<=1);
  for(const s of actors){if(s.pose==='walk')assert.equal(W.blocked(s.position),false,`${s.id} blocked at ${JSON.stringify(s.position)} t=${t}`);
    for(const other of actors.filter(o=>o.id!==s.id))assert.ok(Math.hypot(s.position.x-other.position.x,s.position.y-other.position.y)>.65,`collision ${s.id} ${other.id}`);
  }
}
for(const s of W.staff){const atLounge=M.sample(schedule.find(t=>t.id===s.id).start+schedule.find(t=>t.id===s.id).duration+1).find(a=>a.id===s.id);assert.equal(atLounge.phase,'lounge');assert.equal(atLounge.session,s.session);assert.equal(atLounge.task,s.task);assert.equal(atLounge.worktree,s.worktree);}
assert.deepEqual(M.sample(125).map(s=>s.position),M.sample(129).map(s=>s.position));
assert.ok(M.sample(125).every(s=>s.liveness==='unknown'));
assert.ok(M.sample(130).every(s=>s.delivered&&s.phase==='delivered'));
assert.ok(M.sample(140).every((s,i)=>s.session!==W.staff[i].session&&s.worktree!==W.staff[i].worktree&&s.task!==W.staff[i].task));
assert.ok(M.sample(20,{}).every(s=>s.phase==='blocked'&&s.pose==='wait'));
const obstructed={...W.edges,'seat-momo>aisle-momo':[W.nodes['seat-momo'],W.point(-5,1.5),W.nodes['aisle-momo']]};assert.match(M.sample(8,obstructed)[0].reason,/경로 막힘/);assert.deepEqual(M.sample(8,obstructed)[0].position,W.nodes['seat-momo']);
let now=0,next=0,callbacks=new Map(),canceled=[];
const c=M.create({now:()=>now,request:cb=>{callbacks.set(++next,cb);return next;},cancel:id=>{callbacks.delete(id);canceled.push(id);}});
c.play();assert.equal(callbacks.size,1);const stale=callbacks.get(next);now=1500;c.pause();const frozen=c.state().time;assert.equal(frozen,1.5);stale(8000);assert.equal(c.state().time,frozen);assert.equal(callbacks.size,0);
c.play();now=2000;const cb=callbacks.get(next);callbacks.delete(next);cb(now);assert.equal(c.state().time,2);assert.equal(callbacks.size,1);
c.suspend('hidden');const suspended=c.state();now=100000;stale(now);c.play();assert.equal(c.state().playing,false);assert.equal(c.state().time,suspended.time);assert.equal(callbacks.size,0);
c.suspend('');assert.equal(c.state().playing,false);c.next();assert.equal(c.state().time,6);assert.equal(c.state().playing,false);c.reset();assert.equal(c.state().time,0);c.dispose();c.play();assert.equal(callbacks.size,0);
// Exercise the production default timer rather than only an injected callback API.
const realSet=global.setTimeout,realClear=global.clearTimeout;let nativeNow=0,owned=new Map(),handle=0,defaultPaints=0;
try{global.setTimeout=(cb,delay)=>{assert.ok(delay>=1&&delay<=16);owned.set(++handle,{cb,delay});return handle;};global.clearTimeout=id=>owned.delete(id);
 const native=M.create({now:()=>nativeNow,onChange:()=>defaultPaints++});native.play();assert.equal(owned.size,1);assert.equal(owned.get(handle).delay,16);
 const tick=owned.get(handle).cb;owned.delete(handle);nativeNow=34;tick();assert.equal(native.state().time,.034);assert.equal(owned.size,1);assert.ok(defaultPaints>=2);
 native.pause();assert.equal(owned.size,0);const before=native.state().time;nativeNow=100;tick();assert.equal(native.state().time,before);
 native.play();assert.equal(owned.size,1);native.suspend('reduced-motion');assert.equal(owned.size,0);native.suspend('');assert.equal(native.state().playing,false);native.dispose();
}finally{global.setTimeout=realSet;global.clearTimeout=realClear;}
let reentrant;now=0;callbacks.clear();reentrant=M.create({now:()=>now,request:cb=>{callbacks.set(++next,cb);return next;},cancel:id=>callbacks.delete(id),onChange:s=>{if(s.time>0)reentrant.dispose();}});reentrant.play();const active=callbacks.get(next);callbacks.delete(next);now=100;active(now);assert.equal(callbacks.size,0);
console.log('voxel motion: all routes/furniture clearance, reservations/collision, identity, unknown freeze, no-path, elapsed pause, suspension and stale callbacks PASS');
