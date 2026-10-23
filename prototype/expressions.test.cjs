'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {select, allowed} = require('./expressions.js');
const snapshot = require('./snapshot.js');
const movement = require('./movement.js');
const base = snapshot.parse(fs.readFileSync(path.join(__dirname, 'snapshot-v2-example.json'),'utf8'));
const now = Date.parse('2026-10-21T14:00:00Z');
function current() {
  const value = structuredClone(base);
  value.observed_at = value.office.observed_at = value.office.session.observed_at = value.office.assignment.observed_at = new Date(now-1000).toISOString();
  value.office.session.liveness = 'live'; value.work.workflow_status = 'In Progress';
  value.execution = {status: 'running', source: 'FICTIONAL observation'};
  return value;
}
const choose = value => select({mode: 'snapshot', snapshot: value, association: snapshot.association, now});
const fresh = current(), frozen = JSON.stringify(fresh);
assert.equal(choose(fresh).kind, 'typing'); assert.equal(choose(fresh).eligible, true);
for (const [status, kind, eligible] of [['awaiting_input','waiting',true], ['failed','failed',false], ['cancelled','cancelled',false], ['unknown','unknown',false], ['succeeded','static',false]]) {
  const value = current(); value.execution.status = status;
  assert.equal(choose(value).kind,kind); assert.equal(choose(value).eligible,eligible);
}
const review = current(); review.execution.status = 'succeeded'; review.work.workflow_status = 'Review';
assert.equal(choose(review).kind, 'review'); assert.equal(choose(review).eligible,true);
for (const change of [
  v=>v.office.session.liveness='unknown', v=>v.office.session.liveness='exited',
  v=>v.office.assignment=null, v=>v.office.session.workspace='display-wrong',
  v=>v.office.source=null, v=>v.execution.source=null,
  v=>v.office.session.source=null, v=>v.office.assignment.source=null,
  v=>v.observed_at=new Date(now+1000).toISOString(),
  v=>v.office.session.observed_at=new Date(now-86400001).toISOString(),
  v=>v.office.session.observed_at=new Date(now+1).toISOString(),
  v=>v.version=1, v=>v.office=null]) {
  const value=current(); change(value); assert.equal(choose(value).eligible,false);
}
assert.equal(select({mode:'view-import',snapshot:fresh,association:snapshot.association,now}).eligible,true);
assert.equal(select({mode:'rooms',snapshot:fresh,association:snapshot.association,now}).eligible,true);
assert.equal(select({mode:'snapshot',snapshot:fresh,association:snapshot.association,now:now+86400000}).eligible,false);
assert.equal(JSON.stringify(fresh),frozen, 'selection never mutates data');
for (let i=0;i<movement.count;i++) {
 const state=select({mode:'movement',movement:movement.frame(i)});
 assert.equal(state.eligible,[2,5,6,11].includes(i));
}
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'sample-data.js'),'utf8'),context);
assert.deepEqual(context.window.officeSamples.map(sample=>select({mode:'demo',sample}).kind).join(','),'typing,waiting,review,unknown');
for (const intent of [true,false]) for(const hidden of [true,false]) for(const reduced of [true,false]) for(const eligible of [true,false]) {
 assert.equal(allowed(intent,hidden,reduced,{eligible}),intent&&!hidden&&!reduced&&eligible);
}
// Optional expression frames preserve integer geometry, anchors and safe local SVGs.
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'skins.js'),'utf8'),context);
const manifest=context.window.officeSkins.simulation;
assert.equal(manifest.layout.positions.length,4);
assert.equal(new Set(Object.values(manifest.characters).map(c=>c.src)).size,4);
for(const character of Object.values(manifest.characters)) {
 for(const kind of ['typing','waiting','review']) {
  assert.equal(character.expressions[kind].length,2);
  for(const frame of character.expressions[kind]) {
   assert.equal(frame.width,24);assert.equal(frame.height,32);
   assert.equal(frame.anchor.x,12);assert.equal(frame.anchor.y,30);
   assert.equal(frame.display.width,48);assert.equal(frame.display.height,64);
   const source=fs.readFileSync(path.join(__dirname,frame.src),'utf8');
   assert.match(source,/viewBox="0 0 24 32"/);
   assert.doesNotMatch(source,/<(?:script|foreignObject|image|animate|set|filter|circle|ellipse)\b|\bon\w+\s*=|(?:\d\.\d)|(?:href|src)=["']https?:/i);
  }
 }
}
console.log('PASS work/wait/review/fail/cancel/unknown, conservative evidence, v1/v2/view/demo/movement, expiry, immutability, playback gates and safe integer staff frames');
// Run the actual DOM-local lifecycle function with controlled visibility/time/timers.
const app = fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
const refresh = app.slice(app.indexOf('  function refreshExpressions()'),app.indexOf('  function paintPortrait('));
const timers = new Map(); let next = 0;
const controls = Object.fromEntries(['expression-play','expression-status'].map(id=>[id,{textContent:'',setAttribute(k,v){this[k]=v}}]));
const holder={dataset:{desk:'one',expression:'typing'},hasAttribute:()=>false,querySelector:()=>({}),parentNode:{querySelector:()=>null}};
const doc={hidden:false,querySelectorAll:()=>[holder]};
const life={window:{officeExpressions:require('./expressions.js'),officeSkins:{simulation:{characters:{test:{}}}}},
 document:doc, reducedMotion:{matches:false},skin:'simulation',mode:'snapshot',scene:[{id:'one',characterKey:'test'}],
 expressionIntent:true,expressionTimer:null,Date:{now:()=>now},
 expressionState:()=>({kind:'typing',eligible:true,expiresAt:now+1000}),paintCharacter:()=>assert.fail('no duplicate repaint'),
 byId:id=>controls[id],clearTimeout:id=>timers.delete(id),setTimeout:(fn,ms)=>{const id=++next;timers.set(id,{fn,ms});return id}};
vm.createContext(life);vm.runInContext(refresh+'\nthis.refresh=refreshExpressions;',life);
life.refresh(); assert.equal(holder.dataset.playing,'true');assert.equal(timers.size,1);
for(let i=0;i<10;i++)life.refresh();assert.equal(timers.size,1,'one callback across repeated changes');
doc.hidden=true;life.refresh();assert.equal(holder.dataset.playing,'false');assert.equal(timers.size,0);
doc.hidden=false;life.refresh();assert.equal(holder.dataset.playing,'true');assert.equal(timers.size,1);
life.reducedMotion.matches=true;life.refresh();assert.equal(holder.dataset.playing,'false');assert.equal(timers.size,0);
life.reducedMotion.matches=false;life.refresh();assert.equal(holder.dataset.playing,'true');
life.expressionIntent=false;life.refresh();doc.hidden=true;life.refresh();doc.hidden=false;life.refresh();
assert.equal(holder.dataset.playing,'false');assert.equal(timers.size,0,'hidden resume never changes paused user intent');
life.expressionIntent=true;life.refresh();const expiry=[...timers.values()][0];
life.expressionState=()=>({kind:'typing',eligible:false});expiry.fn();
assert.equal(holder.dataset.playing,'false');assert.equal(timers.size,0,'staleness crossing removes replay timer');
console.log('PASS actual DOM playback lifecycle: one callback, pause, hidden/reduced stop and conditional resume, expiry');

for (const viewObservedAt of ['2099-01-01T00:00:00Z','2020-01-01T00:00:00Z']) assert.equal(select({mode:'view-import',snapshot:fresh,association:snapshot.association,viewObservedAt,now}).eligible,false);
