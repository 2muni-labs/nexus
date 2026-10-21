const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const snapshot = require('./snapshot.js');
const {select} = require('./views.js');
const example = JSON.parse(fs.readFileSync(__dirname + '/views-example.json', 'utf8'));
const read = value => snapshot.parseView(JSON.stringify(value));
const data = read(example);
const [shared, solo] = data.projects.map(project => project.url);
const a = select(data, '', '', null), bURL = a.rooms[1].url;
assert.equal(a.rooms.length, 2); assert.equal(a.records.length, 2);
assert.equal(a.selectedId, 'display-record-1');
assert.equal(select(data, a.roomURL, shared, 'display-record-1').selectedId, 'display-record-1');
const b = select(data, bURL, shared, a.selectedId);
assert.deepEqual(b.records.map(record => record.id), ['display-record-3']);
assert.equal(b.selectedId, 'display-record-3');
assert.equal(b.records[0].observation.work.url, 'https://github.com/example/fiction-garden/issues/3');
assert.equal(select(data, bURL, solo, b.selectedId).selectedId, null);
assert.equal(select(data, bURL, solo, b.selectedId).records.length, 0);
assert.equal(select(data, bURL, '', null).records.length, 2);
assert.equal(select(data, bURL, '', 'display-record-4').selectedId, 'display-record-4');
assert.equal(select(data, bURL, shared, 'display-record-4').selectedId, 'display-record-3');
assert.equal(select(data, 'invalid', 'invalid', null).roomURL, a.roomURL);
assert.equal(data.records[1].projects.length, 0);
assert.equal(data.records[3].projects, null);
assert.equal(data.records[0].observation.work.workflow_status, 'Review');
assert.equal(data.records[0].observation.execution.status, 'succeeded');
const frozen = JSON.stringify(data); select(data, bURL, shared, null); assert.equal(JSON.stringify(data), frozen);
const context = {window: {officeSnapshot: snapshot}};
vm.runInNewContext(fs.readFileSync(__dirname + '/views-sample.js', 'utf8'), context);
assert.deepEqual(JSON.parse(JSON.stringify(context.window.officeRoomSample)), example);
vm.runInNewContext(fs.readFileSync(__dirname + '/scene.js', 'utf8'), context);
// Valid v2 syntax with bad semantic pairing is preserved as a visible conflict, never attached.
for (const mutate of [v => v.office.assignment.work_url += '9', v => v.office.session.workspace = 'display-other', v => v.office.session.liveness = 'exited', v => v.office.session.observed_at = '2026-01-02T00:00:00Z']) {
  const value = structuredClone(example); mutate(value.records[0].observation);
  const observation = read(value).records[0].observation;
  assert.equal(snapshot.association(observation).attached, false);
  assert.equal(context.window.officeScene.view('snapshot', observation, [{id:'momo'}])[0].showCharacter, false);
}
for (const mutate of [
  v => v.extra = true, v => v.view_version = 2, v => delete v.source,
  v => v.observed_at = '2026-02-30T00:00:00Z', v => v.observed_at = '2025-01-01T00:00:00Z',
  v => v.projects.push(v.projects[0]), v => v.projects[0].url += '?a=b',
  v => v.projects[0].url = 'https://github.com/example/fiction-paper/projects/1',
  v => v.projects[0].url = 'https://github.com/orgs/example/projects/01',
  v => v.projects[0].label = 'x'.repeat(81), v => v.records[0].extra = true,
  v => v.records[0].projects = [shared, shared], v => v.records[0].projects = ['https://github.com/orgs/example/projects/99'],
  v => v.records[0].projects = {}, v => v.records[0].id = v.records[1].id,
  v => v.records[0].id = v.records[0].observation.office.repository.alias,
  v => v.records[1].observation.work.url = v.records[0].observation.work.url,
  v => v.records[0].observation.version = 1,
  v => v.records[0].observation.office.repository.url = 'https://github.com/other/repo',
  v => v.records[0].observation.office.workspace.repository = 'display-other',
  v => v.records[1].observation.office.repository.label = 'Conflicting room',
  v => v.records[1].observation.office.repository.alias = 'display-other',
  v => v.records[1].observation.office.workspace.alias = v.records[0].observation.office.workspace.alias,
  v => v.records[1].observation.office.session.alias = v.records[0].observation.office.session.alias,
  v => v.records = [], v => v.records = Array(9).fill(v.records[0]), v => v.projects = Array(9).fill(v.projects[0])
]) {const value = structuredClone(example); mutate(value); assert.throws(() => read(value), mutate.toString());}
for (const attack of ['<script>', '../private', '/Users/private/file', '~/private', 'C:\\private', 'term_private', 'ctx_private', 'repo_private', 'session_private', '12345678-abcd-abcd-abcd-123456789abc', 'ghp_abc', 'password=abc', 'Bearer abc', 'https://evil.example/a', 'a\nline', '`code`']) {
  for (const field of ['source', 'label', 'title']) {
    const value = structuredClone(example);
    if (field === 'source') value.source = attack;
    if (field === 'label') value.projects[0].label = attack;
    if (field === 'title') value.records[0].observation.work.title = attack;
    assert.throws(() => read(value), field + ': ' + attack);
  }
}
// Enforce the presentation room/desk limits with individually valid, distinct records.
for (const rooms of [1, 5]) {
  const value = structuredClone(example); value.records = [];
  for (let i = 0; i < 5; i++) {
    const record = structuredClone(example.records[0]), observation = record.observation;
    const room = rooms === 1 ? 0 : i, repo = 'display-room-' + room;
    const url = 'https://github.com/example/fiction-' + room;
    record.id = 'display-new-' + i; observation.work.url = url + '/issues/' + (i + 1);
    observation.office.repository = {alias: repo, label: 'Fiction ' + room, url};
    observation.office.workspace = {alias: 'display-space-' + i, label: 'Fiction desk', repository: repo};
    observation.office.session = null; observation.office.assignment = null;
    value.records.push(record);
  }
  assert.throws(() => read(value), rooms === 1 ? 'five desks' : 'five rooms');
}
const noCatalog = structuredClone(example); noCatalog.projects = []; noCatalog.records.forEach(record => record.projects = null);
assert.equal(select(read(noCatalog), '', '', null).records.length, 2);
assert.throws(() => snapshot.parseView(JSON.stringify(example).replace('"label":"Fiction · Shared garden"', '"label":"one","la\\u0062el":"two"')));
assert.throws(() => snapshot.parseView(' '.repeat(snapshot.VIEW_MAX_BYTES + 1)));
assert.throws(() => snapshot.parseView(JSON.stringify(example).replace('"view_version":1', '"view_version":1,"view_version":1')));
assert.equal(snapshot.parseView(fs.readFileSync(__dirname + '/snapshot-v2-example.json','utf8')).kind, 'single');
console.log('PASS: bounded room envelope, explicit cross-repository Projects, ownership and selection reset, privacy/ref attacks, no false pairing, unchanged single v2');
