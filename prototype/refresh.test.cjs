'use strict';
// Exercise the production import/picker handlers with controlled asynchronous FileReader.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const parser = require('./snapshot.js');
const views = require('./views.js');
const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const handlers = app.slice(app.indexOf('  // Manual local reads only.'), app.indexOf("  byId('movement-play').addEventListener"));
const now = Date.parse('2026-10-22T12:00:00Z');
const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'views-example.json'), 'utf8'));
function fixture(delta = 0) {
  const value = structuredClone(base);
  value.observed_at = new Date(now - 1000 + delta).toISOString();
  value.records.forEach(({observation: v}) => {
    v.observed_at = v.office.observed_at = value.observed_at;
    if(v.office.session) v.office.session.observed_at=value.observed_at;
    if(v.office.assignment) v.office.assignment.observed_at=value.observed_at;
  });
  return value;
}
function harness() {
  const readers = [];
  const controls = new Map();
  const node = id => controls.get(id) || controls.set(id, {id, value:'', textContent:'', handlers:{},
    addEventListener(type, fn) { this.handlers[type] = fn; }, click() { this.clicks = (this.clicks || 0) + 1; }}).get(id);
  const doc = {body:{id:'body'}, activeElement:null}; doc.activeElement = doc.body;
  const state = {window:{officeSnapshot:parser, officeViews:views}, document:doc,
    Date:class extends Date { constructor(...args) {super(...(args.length ? args : [now]));} static now() {return now;} },
    snapshot:null, importedView:null, mode:'demo', scene:[], selectedId:null, roomURL:'', projectURL:'', skin:'pixel',
    importGeneration:0, expressionIntent:true, movement:{pause() {}}, byId:node,
    desks:{addEventListener(type, fn) { this[type] = fn; }, querySelectorAll() {return state.scene.filter(entry=>entry.work).map(entry => ({dataset:{id:entry.work.id}, focus() {doc.activeElement=this;}}));}},
    FileReader:class {constructor(){readers.push(this);} readAsText(file){if(file.throws)throw Error('private path');} },
    select(id) {state.selectedId = id;},
    render() {
      state.scene=[];
      if (state.importedView) {
        const chosen=views.select(state.importedView,state.roomURL,state.projectURL,state.selectedId);
        Object.assign(state,{roomURL:chosen.roomURL,projectURL:chosen.projectURL,selectedId:chosen.selectedId});
        state.scene=chosen.records.map(record=>({workId:record.observation.work.url,work:{id:record.id,observation:record.observation}}));
      } else if(state.snapshot) {state.scene=[{workId:state.snapshot.work.url,work:{id:'work'}},{work:null},{work:null},{work:null}];state.selectedId='work';}
    }
  };
  vm.createContext(state);vm.runInContext(handlers,state);
  function start(value, options={}) {
    const target=node('refresh-input');target.files=value===null?[]:[{size:JSON.stringify(value).length,...options}];
    target.handlers.change({target});return readers.at(-1);
  }
  function complete(reader,value) {reader.result=JSON.stringify(value);reader.onload();}
  return {state,node,doc,readers,start,complete};
}
const h=harness(), value=fixture();
h.node('refresh-file').handlers.click();assert.equal(h.node('refresh-input').clicks,1);assert.equal(h.node('refresh-input').value,'');
h.complete(h.start(value),value);
assert.equal(h.state.mode,'view-import');assert.equal(h.state.expressionIntent,false);assert.equal(h.state.skin,'pixel');
const record=h.state.scene[0];h.state.selectedId=record.work.id;
h.state.desks.focusin({target:{closest:()=>({dataset:{id:record.work.id}})}});
const room=h.state.roomURL, project=h.state.importedView.projects[0].url;
h.state.projectURL=project;h.state.render();
// Preserve valid room, Project, stable work/desk identity, focus, and skin.
const selected=h.state.selectedId;h.complete(h.start(value),value);
assert.equal(h.state.roomURL,room);assert.equal(h.state.projectURL,project);assert.equal(h.state.selectedId,selected);
assert.equal(h.doc.activeElement.dataset.id,record.work.id);assert.match(h.node('import-message').textContent,/유지/);
const history=h.node('import-history').textContent, observation=h.state.importedView;
h.start(null);assert.equal(h.state.importedView,observation);assert.equal(h.node('import-history').textContent,history);
h.node('refresh-input').handlers.cancel();assert.equal(h.state.importedView,observation);
// Reordered completion cannot overwrite a newer request, and cancel fences pending reads.
const old=h.start(fixture(-100)), fresh=h.start(fixture(100));
h.complete(fresh,fixture(100));h.complete(old,fixture(-100));assert.equal(h.state.importedView.observed_at,fixture(100).observed_at);
const pending=h.start(value);h.start(null);h.complete(pending,value);assert.equal(h.state.importedView,null);
// Valid-to-invalid removes data but preserves truthful last-success history.
h.complete(h.start(fixture(100)),fixture(100));const accepted=h.node('import-history').textContent;
h.complete(h.start({secret:'private'}),{secret:'private'});assert.equal(h.state.snapshot,null);assert.equal(h.state.importedView,null);
assert.equal(h.node('import-history').textContent,accepted);assert.match(h.node('import-attempt').textContent,/失敗|실패/);
// Chronological rejection remains active after an invalid file; no resurrection.
h.complete(h.start(value),value);assert.equal(h.state.importedView,null);assert.match(h.node('import-message').textContent,/오래된 파일/);
for(const event of ['onerror','onabort']) {const r=h.start(value);r[event]();assert.equal(h.state.importedView,null);assert.doesNotMatch(h.node('import-message').textContent,/private/);}
h.start(value,{throws:true});assert.match(h.node('import-message').textContent,/읽을 수 없습니다/);
h.start(value,{size:65537});assert.match(h.node('import-message').textContent,/64 KiB/);
// Fresh identities reset explicitly. Same record ID with another Issue is not the same work.
const changed=fixture(200);changed.records[0].observation.work.url=changed.records[0].observation.work.url.replace(/\d+$/, '999');
if(changed.records[0].observation.office.assignment) changed.records[0].observation.office.assignment.work_url=changed.records[0].observation.work.url;
h.complete(h.start(changed),changed);assert.match(h.node('import-message').textContent,/초기화/);
// An unrelated older Work Item is not a rollback of the previous identity.
const other=harness();const first=fixture().records[0].observation;other.complete(other.start(first),first);
const unrelated=structuredClone(first);unrelated.work.url=unrelated.work.url.replace(/\d+$/, '778');unrelated.office.assignment.work_url=unrelated.work.url;
unrelated.observed_at=unrelated.office.observed_at=unrelated.office.session.observed_at=unrelated.office.assignment.observed_at=new Date(now-2000).toISOString();
other.complete(other.start(unrelated),unrelated);assert.equal(other.state.snapshot.work.url,unrelated.work.url);assert.match(other.node('import-message').textContent,/초기화/);
// Removed room and Project reset with explanation; a control used mid-read keeps focus.
const removed=harness();removed.complete(removed.start(value),value);
removed.state.projectURL=value.projects[0].url;removed.state.render();
const replacement=fixture();replacement.records=replacement.records.filter(r=>r.observation.office.repository.url!==removed.state.roomURL);
replacement.projects=[];replacement.records.forEach(r=>r.projects=[]);
removed.complete(removed.start(replacement),replacement);assert.equal(removed.state.projectURL,'');assert.match(removed.node('import-message').textContent,/초기화/);
const controlFocus=harness();const singleValue=fixture().records[0].observation;controlFocus.complete(controlFocus.start(singleValue),singleValue);
controlFocus.state.desks.focusin({target:{closest:()=>({dataset:{id:'work'}})}});
const loading=controlFocus.start(singleValue);controlFocus.doc.activeElement=controlFocus.node('skin-select');
controlFocus.complete(loading,singleValue);assert.equal(controlFocus.doc.activeElement.id,'skin-select');
const stale=harness(), historical=fixture(-86400001);stale.complete(stale.start(historical),historical);
assert.match(stale.node('import-message').textContent,/오래된 관찰.*현재 상태 아님/);
const future=harness();future.complete(future.start(fixture(2000)),fixture(2000));assert.equal(future.state.importedView,null);
// Both single formats use exactly the same guarded handler and Work Item identity.
for(const version of [1,2]) {
 const single=harness();const v=fixture().records[0].observation;if(version===1){v.version=1;delete v.office;}
 single.complete(single.start(v),v);assert.equal(single.state.snapshot.version,version);
 single.state.desks.focusin({target:{closest:()=>({dataset:{id:'work'}})}});
 single.complete(single.start(v),v);assert.equal(single.doc.activeElement.dataset.id,'work');assert.match(single.node('import-message').textContent,/유지/);
 single.complete(single.start({}),{});assert.equal(single.state.snapshot,null);
}
console.log('PASS production refresh handlers: fresh picker, v1/v2/view, paused imports, identity/filter/skin/focus retention, reset, cancel, reordered reads, read/abort/size/parse errors, history, stale/future and chronological fences');
