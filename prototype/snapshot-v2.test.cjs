const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {parse, association, MAX_BYTES} = require('./snapshot.js');
const example = JSON.parse(fs.readFileSync(__dirname + '/snapshot-v2-example.json', 'utf8'));
const clone = () => structuredClone(example);
const read = value => parse(JSON.stringify(value));
const now = Date.parse(example.observed_at);
const check = value => association(read(value), now);
const valid = read(example);
assert.equal(check(example).state, 'associated');
assert.equal(check(example).attached, true);
assert.equal(valid.work.workflow_status, 'Review');
assert.equal(valid.execution.status, 'succeeded');
assert.equal(valid.office.session.liveness, 'unknown'); // association never invents liveness
for (const part of ['repository','workspace','session','assignment']) {
  const value = clone(); value.office[part] = null;
  assert.equal(check(value).state, 'missing', part);
  assert.equal(check(value).attached, false, part);
  delete value.office[part]; assert.equal(check(value).state,'missing');
}
for (const part of [undefined, null]) assert.equal(check({...clone(), office:part}).attached,false);
for (const [part,key] of [['office','source'],['session','source'],['assignment','source'],['session','workspace']]) {
  const value=clone(); (part==='office'?value.office:value.office[part])[key]=null;
  assert.equal(check(value).attached,false, part+'.'+key);
}
for(const name of ['session','assignment']) {const value=clone();delete value.office[name].source;assert.equal(check(value).attached,false);}
const conflicts = [
  v=>v.office.repository.url='https://github.com/foreign/fiction',
  v=>v.office.workspace.repository='display-other',
  v=>v.office.session.workspace='display-other',
  v=>v.office.assignment.session='display-other',
  v=>v.office.assignment.workspace='display-other',
  v=>v.office.assignment.work_url='https://github.com/example/fiction/issues/2',
  v=>v.office.session.alias='display-desk',
  v=>v.office.session.observed_at='2026-01-02T00:00:00Z',
  v=>v.office.observed_at='2026-01-02T00:00:00Z',
  v=>v.office.session.liveness='exited',
  v=>v.office.retention={state:'removed',source:'Manual claim'}
];
for (const mutate of conflicts) {
  const value=clone(); mutate(value);
  assert.equal(check(value).state,'conflict', mutate.toString());
  assert.equal(check(value).attached,false);
}
assert.equal(association(valid,now+86400000).temporal,'observation-copy');
assert.equal(association(valid,now+86400001).temporal,'stale');
assert.equal(association(valid,now+86400001).attached,true); // historical association, marked non-current
assert.equal(association(valid,now-1).temporal,'future');
assert.equal(association(valid,now-1).attached,false);
for (const bad of ['<b>unsafe</b>','/Users/private/data','~/private','C:\\private','file:///private','term_private','ctx_private','task_private','repo_private','session_private','12345678-abcd-abcd-abcd-123456789abc','ghp_abc','sk-abc','password=abc','Bearer abc','token: abc','-----BEGIN RSA PRIVATE KEY-----','transcript: raw','https://evil.example/a','a\nline']) {
  const value=clone(); value.work.title=bad;
  assert.throws(()=>read(value),bad);
}
for(const mutate of [
  v=>v.version=3,
  v=>v.office.extra=true,
  v=>v.office.coverage='fleet',
  v=>v.office.session=[],
  v=>v.office.session.liveness=42,
  v=>v.office.workspace.alias='native-name',
  v=>v.office.repository.url+='?token=x',
  v=>v.office.assignment.work_url='javascript:alert(1)',
  v=>v.office.workspace.label='x'.repeat(81),
  v=>v.office.source='x'.repeat(241),
  v=>v.office.assignment.observed_at='2026-02-30T00:00:00Z'
]) {const value=clone();mutate(value);assert.throws(()=>read(value),mutate.toString());}
const unknown=clone();unknown.office.session.liveness='idle';unknown.office.retention.state='Completed';
assert.equal(read(unknown).office.session.liveness,null);
assert.equal(read(unknown).office.retention.state,null);
assert.throws(()=>parse(JSON.stringify({...clone(),extra:'x'.repeat(MAX_BYTES)})));
assert.throws(()=>parse(JSON.stringify(clone()).replace('"workspace":"display-desk"','"workspace":"display-other","workspace":"display-desk"')));
assert.throws(()=>parse(JSON.stringify(clone()).replace('"label":"Fiction room"','"label":"one","la\\u0062el":"two"')));
// The common scene must never render a session at an unrelated desk.
const context={window:{officeSnapshot:require('./snapshot.js')}};
vm.runInNewContext(fs.readFileSync(__dirname+'/scene.js','utf8'),context);
const demo=[{id:'momo',name:'demo'}];
const scene=value=>context.window.officeScene.view('snapshot',read(value),demo)[0];
assert.equal(scene(example).showCharacter,true);
for(const mutate of conflicts){const value=clone();mutate(value);assert.equal(scene(value).showCharacter,false);}
assert.equal(context.window.officeScene.view('snapshot',{version:1,observed_at:example.observed_at,work:example.work,execution:null},demo)[0].showCharacter,true);
const demoScene=context.window.officeScene.view('demo',valid,demo)[0];
assert.equal(demoScene.work.name,'demo');
assert.equal(demoScene.showCharacter,true);
assert.equal(demoScene.characterId,'visual-character-momo');
console.log('PASS: v2 explicit relation, missing/conflicting references and evidence, temporal markers, privacy, bounds, v1 illustrative scene');
