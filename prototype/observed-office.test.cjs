'use strict';
const assert=require('node:assert/strict'),O=require('./observed-office.js');
function fixture(){
 const a=(k,n)=>`display-${k}-${n.toString(16).padStart(16,'0')}`,stamp='2026-10-26T12:00:00.000Z',source=a('source',1),workspace=a('workspace',1),session=a('session',1),attempt=a('attempt',1),work=a('work',1);
 return {kind:'nexus-office-presentation',office_version:1,scope_alias:a('scope',1),capture_alias:a('capture',1),started_at:stamp,observed_at:stamp,collection_state:'observed',repository:'https://github.com/2muni-labs/nexus',selection:['https://github.com/2muni-labs/nexus/issues/50'],sources:[{alias:source,kind:'orca-reference',started_at:stamp,observed_at:stamp,result:'ok',read_complete:true,inventory_complete:null,reason:'selected'}],work_items:[{alias:work,url:'https://github.com/2muni-labs/nexus/issues/50',number:50,label:'Issue #50',record_state:'open',workflow:'In Progress',source,workflow_source:source,observed_at:stamp}],workspaces:[{alias:workspace,label:'Workspace 1',board:'in-progress',source,observed_at:stamp}],tasks:[{alias:attempt,task_alias:a('task',1),workspace,stage:'dispatched',result:'in-progress',source,observed_at:stamp}],sessions:[{alias:session,label:'Agent 1',kind:'terminal-agent',workspace,agent_liveness:'live',pty_liveness:'live',continuity:'unknown',source,observed_at:stamp}],relations:[{alias:a('relation',1),workspace,work_item:work,session:null,task:null,kind:'native-linked',status:'observed',source,observed_at:stamp}],coverage:{selected_work_items:1,selected_workspaces:1,selected_runs:1,observed_work_items:1,observed_workspaces:1,observed_tasks:1,observed_sessions:1,omitted_tasks:null,omitted_sessions:null,omitted_workspaces:null,global_complete:false},diagnostics:[]};
}
function parse(v){return O.parse(JSON.stringify(v));}
const now=Date.parse('2026-10-26T12:00:01.000Z');
// Synthetic missing-native partial copy: retain provider facts and failed source detail.
const partial=fixture(),github=partial.sources[0];
github.kind='github-issue';
partial.sources.push({...github,alias:'display-source-0000000000000002',kind:'orca-workspace',result:'unavailable',read_complete:false,reason:'failed'});
partial.collection_state='partial';partial.diagnostics=['unavailable','identity'];
for(const key of ['workspaces','tasks','sessions','relations'])partial[key]=[];
for(const key of ['workspaces','tasks','sessions'])partial.coverage['observed_'+key]=0;
const acceptedPartial=parse(partial),partialView=O.project(acceptedPartial,{},now);
assert.equal(acceptedPartial.collection_state,'partial');
assert.equal(acceptedPartial.work_items[0].workflow,'In Progress');
assert.equal(acceptedPartial.sources[1].reason,'failed');
assert.equal(acceptedPartial.sources[1].result,'unavailable');
assert.equal(acceptedPartial.coverage.selected_workspaces,1);
assert.equal(acceptedPartial.coverage.observed_workspaces,0);
assert.equal(acceptedPartial.coverage.global_complete,false);
assert.equal(acceptedPartial.coverage.omitted_workspaces,null);
assert.equal(partialView.unmapped_work.length,1);assert.equal(partialView.desks.length,0);
for(const diagnostics of [['failed','identity'],['unknown'],['unavailable','unavailable']]){
 const bad=structuredClone(partial);bad.diagnostics=diagnostics;
 assert.throws(()=>parse(bad),undefined,'diagnostic normalization must not weaken strict consumer vocabulary or uniqueness');
}
// Cross the real Python producer -> strict consumer boundary without editing its
// payload. Gather every failure case before asserting, so one mismatch hides none.
const produced=require('node:child_process').spawnSync('python3',['-B','-c',`
import importlib.util,json
from pathlib import Path
p=Path('tests/test_office_observations.py')
s=importlib.util.spec_from_file_location('office_cases',p)
T=importlib.util.module_from_spec(s);s.loader.exec_module(T)
rows=[]
for name,error,result,reason,diagnostics in T.NATIVE_FAILURES:
 t=T.OfficeTests();t.setUp()
 try:
  _,raw=t.collect_native_failure(error)
  rows.append(dict(case=name,result=result,reason=reason,diagnostics=diagnostics,raw=raw.decode()))
 except Exception as e:rows.append(dict(case=name,error=type(e).__name__))
 finally:t.doCleanups()
print(json.dumps(rows))
`],{cwd:require('node:path').join(__dirname,'..'),encoding:'utf8'});
assert.equal(produced.status,0,produced.stderr||String(produced.error));
const nativeFailures=JSON.parse(produced.stdout),boundaryFailures=[];
assert.equal(nativeFailures.length,9);
for(const row of nativeFailures){
 try{
  assert.ok(!row.error,row.error);
  const data=O.parse(row.raw),native=data.sources.filter(s=>s.kind.startsWith('orca-')),view=O.project(data,{},Date.parse(data.observed_at));
  assert.equal(native.length,1);assert.equal(native[0].result,row.result);assert.equal(native[0].reason,row.reason);
  assert.equal(native[0].read_complete,false);assert.equal(native[0].inventory_complete,null);
  assert.deepEqual(data.diagnostics,row.diagnostics);assert.equal(data.collection_state,'partial');
  assert.equal(data.work_items.length,1);assert.equal(data.work_items[0].workflow,'In Progress');
  assert.equal(data.work_items[0].url,partial.work_items[0].url);
  assert.ok(data.sources.filter(s=>s.kind.startsWith('github-')).every(s=>s.result==='ok'&&s.read_complete));
  assert.equal(data.coverage.selected_workspaces,1);assert.equal(data.coverage.observed_workspaces,0);
  assert.equal(data.coverage.observed_work_items,1);assert.equal(data.coverage.global_complete,false);
  for(const key of ['omitted_workspaces','omitted_tasks','omitted_sessions'])assert.equal(data.coverage[key],null);
  assert.equal(view.unmapped_work.length,1);assert.equal(view.desks.length,0);
  for(const key of ['workspaces','tasks','sessions','relations'])assert.deepEqual(data[key],[]);
 }catch(error){boundaryFailures.push({case:row.case,error:error.message});}
}
assert.deepEqual(boundaryFailures,[],'all production native failure captures must reach strict presentation');
for(const reason of ['overflow','unknown-reason']){
 const bad=structuredClone(partial);bad.sources[1].result='overflow';bad.sources[1].reason=reason;
 assert.throws(()=>parse(bad),undefined,'normalizing the producer must preserve strict reason grammar');
}
let v=fixture();assert.equal(O.project(parse(v),{},now).desks[0].session,null);assert.equal(O.project(v,{},now).unmapped_sessions.length,1);
function pair(v){v.relations[0].session=v.sessions[0].alias;v.relations[0].task=v.tasks[0].alias;return v;}
v=pair(fixture());assert.ok(O.project(parse(v),{},now).desks[0].session);assert.ok(!O.project(v,{},now).desks[0].historical);
for(const [name,mutate]of [
 ['wrong version',v=>v.office_version=2],['extra root key',v=>v.preview='secret'],['extra row key',v=>v.sessions[0].preview='secret'],['raw ID',v=>v.sessions[0].alias='term_123'],['title',v=>v.work_items[0].label='secret title'],['foreign URL',v=>v.work_items[0].url='https://github.com/foreign/repo/issues/50'],['crossref',v=>v.tasks[0].workspace='display-workspace-0000000000000002'],['duplicate alias',v=>v.sessions.push({...v.sessions[0]})],['count mismatch',v=>v.coverage.observed_tasks=0],['invented continuity',v=>v.sessions[0].continuity='same-conversation'],['workflow from open',v=>v.work_items[0].workflow='open'],['success while dispatched',v=>v.tasks[0].result='succeeded'],['unsafe timestamp',v=>v.sources[0].observed_at='today'],['collection with old facts',v=>v.collection_state='collecting'],['native enum',v=>v.workspaces[0].board='custom-column'],['bad label markup',v=>v.workspaces[0].label='<img src=x>'],['bad global completeness',v=>v.coverage.global_complete=true]]){
 const bad=fixture();mutate(bad);assert.throws(()=>parse(bad),undefined,name);
}
assert.throws(()=>O.parse(JSON.stringify(fixture()).replace('"office_version":1','"office_version":1,"office_version":1')));
assert.throws(()=>O.parse(' '.repeat(O.MAX_BYTES)+'{}'));assert.throws(()=>O.parse('['.repeat(25)+'0'+']'.repeat(25)));
for(const live of ['unknown','exited']){v=pair(fixture());v.sessions[0].agent_liveness=live;const p=O.project(parse(v),{},now);assert.equal(!!p.desks[0].session,live!=='exited');assert.equal(p.desks[0].historical,true);}
v=pair(fixture());assert.equal(O.project(v,{},now+O.AGE).desks[0].historical,true);assert.equal(O.project(v,{},now-2000).desks[0].session,null);
v=pair(fixture());v.relations[0].status='conflict';assert.equal(O.project(v,{},now).desks[0].session,null);
v=pair(fixture());v.sources[0].result='unavailable';v.sources[0].read_complete=false;assert.equal(O.project(parse(v),{},now).desks[0].session,null);
v=fixture();for(let i=2;i<=16;i++){v.workspaces.push({...v.workspaces[0],alias:'display-workspace-'+i.toString(16).padStart(16,'0'),label:'Workspace '+i});}v.coverage.selected_workspaces=v.coverage.observed_workspaces=16;parse(v);let all=[];for(let page=0;page<8;page++)all.push(...O.project(v,{page},now).desks.map(d=>d.workspace.alias));assert.equal(new Set(all).size,16);assert.equal(O.project(v,{scope:'other',page:7},now).page,0);
v=pair(fixture());const s={...v.sessions[0],alias:'display-session-0000000000000002',label:'Agent 2'};v.sessions.push(s);v.coverage.observed_sessions++;v.relations.push({...v.relations[0],alias:'display-relation-0000000000000002',session:s.alias});assert.equal(O.project(parse(v),{session:s.alias},now).desks[0].session.alias,s.alias);assert.equal(O.project(v,{},now).desks[0].candidates.length,2);
const order=O.createOrder();v=fixture();const pending=fixture();pending.collection_state='collecting';for(const k of ['work_items','workspaces','tasks','sessions','relations'])pending[k]=[];for(const k of ['work_items','workspaces','tasks','sessions'])pending.coverage['observed_'+k]=0;
assert.equal(order.accept(parse(pending)),true);assert.equal(order.accept(parse(pending)),'unchanged');assert.equal(order.accept(parse(v)),true);assert.equal(order.accept(parse(pending)),false);
for(let i=0;i<2;i++)assert.equal(order.accept(parse(v)),'unchanged','identical validated saved copy can reload repeatedly');
function reverseKeys(v){return Array.isArray(v)?v.map(reverseKeys):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).reverse().map(([k,n])=>[k,reverseKeys(n)])):v;}
assert.equal(order.accept(parse(reverseKeys(v))),'unchanged','JSON object key order is not capture content');
for(const mutate of [v=>v.workspaces[0].board='completed',v=>v.sessions[0].agent_liveness='exited',v=>v.observed_at='2026-10-26T12:00:01.000Z',v=>v.started_at='2026-10-26T12:00:01.000Z',v=>v.collection_state='partial']){const changed=fixture();mutate(changed);assert.equal(order.accept(parse(changed)),false,'changed same-ID facts/time/state rejected');assert.equal(order.accept(parse(v)),'unchanged','rejected mutation does not poison installed identity');}
const immutable=O.createOrder(),mutable=parse(fixture());assert.equal(immutable.accept(mutable),true);mutable.workspaces[0].board='completed';assert.equal(immutable.accept(mutable),false,'guard retains immutable content, not a mutable object reference');
const old=structuredClone(v);old.capture_alias='display-capture-0000000000000002';old.started_at='2026-10-26T11:59:59.000Z';assert.equal(order.accept(parse(old)),false);old.started_at=v.started_at;assert.equal(order.accept(parse(old)),false);old.started_at='2026-10-26T12:00:02.000Z';assert.equal(order.accept(parse(old)),true);assert.equal(order.accept(parse(v)),false,'identical old capture cannot roll back a newer watermark');
console.log('PASS observed contract: strict grammar/privacy/types/counts, references, chronology, unpaired/conflict/stale/exit, 16 desks/paging and multi-session projection');
module.exports={fixture,pair};

// Run the actual production read/import controller with controlled transport and painting.
// Browser checks separately verify real DOM, focus and WebGL pixels.
async function controllerRegression(){
 const fs=require('node:fs'),vm=require('node:vm'),source=fs.readFileSync(require('node:path').join(__dirname,'voxel.js'),'utf8');
 const nodes=new Map(),requests=[],readers=[],timers=new Map();let timer=0,current=now;
 const doc={body:{},activeElement:null};doc.activeElement=doc.body;
 function node(id){if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',children:[],handlers:{},addEventListener(k,fn){this.handlers[k]=fn;},click(){return this.handlers.click?.();}});return nodes.get(id);}
 const state={O,order:O.createOrder(),active:true,observedMode:true,observedGeneration:0,observed:null,observationSelection:{},selectedRecord:null,restoreFocus:null,lastSuccess:null,ownedFetch:null,ownedReader:null,ageTimer:null,readTimer:null,
  document:doc,$:node,AbortController,TextDecoder,URL,location:{href:'http://127.0.0.1/preview/index.html'},Date:class extends Date{static now(){return current;}},
  setTimeout(fn){timers.set(++timer,fn);return timer;},clearTimeout(id){timers.delete(id);},fetch(url,options){return new Promise((resolve,reject)=>requests.push({url,options,resolve,reject}));},
  FileReader:class{constructor(){readers.push(this);}readAsText(){}abort(){this.onabort?.();}},
  projection(){return state.observed&&O.project(state.observed,state.observationSelection,current);},
  paintObserved(){state.painted=state.projection();}
 };
 vm.createContext(state);vm.runInContext(source.slice(source.indexOf('  function cancelObserved()'),source.indexOf('  const reduced='))+source.slice(source.indexOf('  function beginRead()'),source.indexOf("  $('observed-prev')")),state);
 const value=pair(fixture()),raw=JSON.stringify(value),response=text=>({ok:true,redirected:false,url:new URL('./observed-office.json',state.location.href).href,headers:new Headers(),body:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(text));c.close();}})});
 async function refresh(text=raw){const work=node('observed-refresh').click();assert.equal(state.observed,null,'every read initially clears facts');requests.at(-1).resolve(response(text));await work;}
 function startImport(text){node('observed-file').handlers.change({target:{files:[{size:text.length}],value:''}});return readers.at(-1);}
 function complete(reader,text){reader.result=text;reader.onload();}
 await refresh();const history=node('observed-history').textContent;
 state.observationSelection={scope:value.scope_alias,workspace:value.workspaces[0].alias,session:value.sessions[0].alias,page:0};state.selectedRecord={kind:'sessions',alias:value.sessions[0].alias};
 for(let i=0;i<2;i++){await refresh();assert.ok(state.painted.desks[0].session,'first load then refresh twice retains actual facts');assert.equal(state.observed.observed_at,value.observed_at);assert.match(node('observed-status').textContent,/새 수집 없음/);assert.equal(state.observationSelection.workspace,value.workspaces[0].alias);assert.equal(state.selectedRecord.alias,value.sessions[0].alias);}
 current=Date.parse(value.observed_at)+O.AGE+1;await refresh();assert.equal(state.painted.historical,true);assert.match(node('observed-status').textContent,/과거 관찰/);assert.equal(node('observed-history').textContent,history,'reload does not fabricate a fresh timestamp');
 const failed=node('observed-refresh').click();requests.at(-1).reject(Error('private transport'));await failed;assert.equal(state.observed,null);assert.equal(state.painted,null);assert.equal(node('observed-history').textContent,history);await refresh();assert.ok(state.painted.desks[0].session,'same valid file restores after transport failure');
 complete(startImport('{}'),'{}');assert.equal(state.observed,null);complete(startImport(raw),raw);assert.ok(state.painted.desks[0].session,'same valid import restores after invalid import');
 const changed=structuredClone(value);changed.sessions[0].agent_liveness='exited';complete(startImport(JSON.stringify(changed)),JSON.stringify(changed));assert.equal(state.observed,null,'valid mutated same ID is rejected');assert.match(node('observed-status').textContent,/변경된 사본 거부/);await refresh();
 const first=node('observed-refresh').click(),r1=requests.at(-1),second=node('observed-refresh').click(),r2=requests.at(-1);assert.equal(r1.options.signal.aborted,true);r2.resolve(response(raw));await second;r1.resolve(response(JSON.stringify(changed)));await first;assert.ok(state.painted.desks[0].session,'late read cannot erase newer identical result');
 const late=startImport(raw);state.observedMode=false;state.observedGeneration++;state.painted='new demo view';complete(late,raw);late.onerror();late.onabort();assert.equal(state.painted,'new demo view','obsolete callbacks cannot mutate newer mode');
 state.observedMode=true;const newer=structuredClone(value);newer.capture_alias='display-capture-0000000000000002';newer.started_at='2026-10-26T12:00:02.000Z';await refresh(JSON.stringify(newer));await refresh();assert.equal(state.observed,null,'previous identical capture remains fenced after newer capture');
 state.order=O.createOrder();const overflow=nativeFailures.find(row=>row.case==='overflow');await refresh(overflow.raw);
 assert.equal(state.observed.collection_state,'partial');assert.equal(state.painted.unmapped_work.length,1);assert.equal(state.painted.desks.length,0);
 assert.deepEqual(Array.from(state.observed.diagnostics),['overflow','identity']);assert.equal(state.observed.sources.at(-1).reason,'truncated');
 console.log('PASS production controller: load/refresh twice, original age/history, failed transport and invalid import retry, immutable same-ID mutation, generation/mode/older fences and selection');
}
controllerRegression().catch(error=>{console.error(error);process.exitCode=1;});
