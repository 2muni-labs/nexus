'use strict';
// Exercise the production import/picker handlers with controlled asynchronous FileReader.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const parser = require('./snapshot.js');
const views = require('./views.js');
const movement = require('./movement.js');
const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const handlers = app.slice(app.indexOf("  byId('display-mode').addEventListener"), app.indexOf('  stopHiddenMovement();'));
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
  const timers = new Map();
  let nextTimer = 0, renders = 0;
  const controls = new Map();
  const node = id => controls.get(id) || controls.set(id, {id, value:'', textContent:'', handlers:{},
    addEventListener(type, fn) { this.handlers[type] = fn; }, click() { this.clicks = (this.clicks || 0) + 1; }}).get(id);
  const doc = {body:{id:'body'}, activeElement:null}; doc.activeElement = doc.body;
  const state = {window:{officeSnapshot:parser, officeViews:views}, document:doc,
    Date:class extends Date { constructor(...args) {super(...(args.length ? args : [now]));} static now() {return now;} },
    snapshot:null, importedView:null, mode:'demo', scene:[], selectedId:null, roomURL:'', projectURL:'', skin:'pixel',
    importGeneration:0, expressionIntent:true,
    movement:movement.create(() => {}, fn => {const id = ++nextTimer; timers.set(id, fn); return id;}, id => timers.delete(id), () => 0), byId:node,
    desks:{addEventListener(type, fn) { this[type] = fn; }, querySelectorAll() {return state.scene.filter(entry=>entry.work).map(entry => ({dataset:{id:entry.work.id}, focus() {doc.activeElement=this;}}));}},
    FileReader:class {constructor(){readers.push(this);} readAsText(file){if(file.throws)throw Error('private path');} },
    select(id) {state.selectedId = id;},
    render() {
      renders++;
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
  return {state,node,doc,readers,start,complete,timers,renders:()=>renders};
}
// A newer explicit mode choice owns the display, even when old reads settle later.
for (const mode of ['demo', 'movement', 'campus']) {
  for (const completion of ['onload', 'onerror', 'onabort']) {
    const chosen = harness(), value = fixture();
    chosen.complete(chosen.start(value), value);
    const history = chosen.node('import-history').textContent;
    const pending = chosen.start(value);
    chosen.node('display-mode').value = mode;
    chosen.doc.activeElement = chosen.node('display-mode');
    chosen.node('display-mode').handlers.change({target:chosen.node('display-mode')});
    chosen.state.select(mode === 'movement' ? 'demo-task-B' : 'coco');
    if (mode === 'movement') chosen.node('movement-play').handlers.click();
    assert.equal(chosen.state.mode, mode);
    assert.equal(chosen.timers.size, mode === 'movement' ? 1 : 0);
    const timer = [...chosen.timers.entries()][0];
    function display() {
      return JSON.stringify({mode:chosen.state.mode, selected:chosen.state.selectedId,
        room:chosen.state.roomURL, project:chosen.state.projectURL, snapshot:chosen.state.snapshot,
        view:chosen.state.importedView, expression:chosen.state.expressionIntent,
        controls:['display-mode','room-select','project-select','movement-play','import-message','import-attempt','import-history'].map(id =>
          [chosen.node(id).value, chosen.node(id).textContent]),
        focus:chosen.doc.activeElement.id, renders:chosen.renders(), player:chosen.state.movement.state()});
    }
    const before = display();
    if (completion === 'onload') chosen.complete(pending, value);
    else pending[completion]();
    assert.equal(display(), before, `${mode}: obsolete ${completion} preserves chosen display and player`);
    assert.equal(chosen.node('import-history').textContent, history);
    assert.equal(chosen.timers.size, mode === 'movement' ? 1 : 0);
    if (timer) {
      assert.equal(chosen.timers.get(timer[0]), timer[1], 'obsolete read keeps the current player timer');
      chosen.timers.delete(timer[0]); timer[1]();
      assert.equal(chosen.state.movement.state().index, 1, 'the retained timer still advances movement');
      assert.equal(chosen.timers.size, 1);
      const lateTimer = [...chosen.timers.values()][0];
      chosen.node('display-mode').handlers.change({target:{value:'demo'}});
      assert.equal(chosen.state.movement.state().playing, false);
      assert.equal(chosen.timers.size, 0, 'leaving movement cancels autoplay');
      lateTimer();
      assert.equal(chosen.timers.size, 0, 'cancelled movement callback cannot restart autoplay');
    }
    chosen.complete(chosen.start(value), value);
    assert.equal(chosen.state.mode, 'view-import', 'a fresh import still succeeds after changing mode');
    assert.ok(chosen.state.importedView);
    assert.equal(chosen.timers.size, 0);
  }
}
console.log('PASS newer mode choices fence obsolete load/error/abort; movement keeps one live timer, leaving cancels it, fresh imports succeed');
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
 const single=harness();const v=fixture().records[0].observation;if(version===1){v.version=1;delete v.office;delete v.evidence;}
 single.complete(single.start(v),v);assert.equal(single.state.snapshot.version,version);
 single.state.desks.focusin({target:{closest:()=>({dataset:{id:'work'}})}});
 single.complete(single.start(v),v);assert.equal(single.doc.activeElement.dataset.id,'work');assert.match(single.node('import-message').textContent,/유지/);
 single.complete(single.start({}),{});assert.equal(single.state.snapshot,null);
}
// Candidate-bound evidence survives the actual production manual refresh handler unchanged.
const evidenceRefresh=harness(), withEvidence=fixture();
evidenceRefresh.complete(evidenceRefresh.start(withEvidence),withEvidence);
const beforeEvidence=JSON.stringify(evidenceRefresh.state.importedView.records[0].observation.evidence);
evidenceRefresh.complete(evidenceRefresh.start(withEvidence),withEvidence);
assert.equal(JSON.stringify(evidenceRefresh.state.importedView.records[0].observation.evidence),beforeEvidence);
assert.equal(evidenceRefresh.state.expressionIntent,false);
const newCandidate=fixture();const freshEvidence=newCandidate.records[0].observation.evidence;
freshEvidence.candidate.revision='c'.repeat(40);freshEvidence.candidate.url=freshEvidence.candidate.url.replace(/a{40}$/,'c'.repeat(40));
evidenceRefresh.complete(evidenceRefresh.start(newCandidate),newCandidate);
const retainedEvidence=evidenceRefresh.state.importedView.records[0].observation.evidence;
assert.equal(retainedEvidence.candidate.revision,'c'.repeat(40));
assert.equal(require('./evidence.js').rows(evidenceRefresh.state.importedView.records[0].observation,now)[2].state.startsWith('미확인'),true);

console.log('PASS production refresh handlers: fresh picker, v1/v2/view, paused imports, identity/filter/skin/focus retention, reset, cancel, reordered reads, read/abort/size/parse errors, history, stale/future and chronological fences');
