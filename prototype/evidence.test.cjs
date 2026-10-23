'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {parse, parseView} = require('./snapshot.js');
const {rows} = require('./evidence.js');
const view = JSON.parse(fs.readFileSync(__dirname + '/views-example.json', 'utf8'));
const base = view.records[0].observation, now = Date.parse(base.observed_at);
const read = value => parse(JSON.stringify(value));
const clone = () => structuredClone(base);
const state = (value, index) => rows(read(value), now)[index].state;
assert.equal(state(base, 0), 'revision 관찰 주장');
assert.equal(state(base, 1), 'Ready · 승인 아님');
assert.equal(state(base, 2), '성공');
assert.equal(state(base, 3), '대기');
assert.match(state(base, 4), /미확인/);
assert.equal(read(base).work.workflow_status, 'Review');
for (const evidence of [undefined, null, {}]) {
 const value = clone(); value.evidence = evidence;
 assert.ok(rows(read(value), now).every(row => row.state.startsWith('미확인')));
}
for (const field of ['revision','source','observed_at','url']) {
 for (const part of ['candidate','pr','review']) {
  const value = clone(); value.evidence[part][field] = null;
  assert.match(state(value, part === 'candidate' ? 0 : part === 'pr' ? 1 : 3), /미확인/);
 }
}
const mismatch=clone();mismatch.evidence.ci[0].revision='b'.repeat(40);
assert.match(state(mismatch,2),/불일치/);assert.equal(state(mismatch,3),'대기');
const repeated=clone();repeated.evidence.ci.push({...repeated.evidence.ci[0],state:'failure'});
assert.deepEqual(rows(read(repeated),now).slice(2,4).map(r=>r.state),['성공','실패']);
for(const [delta,label] of [[-86400001,/오래된/],[1,/미래/]]) {
 const value=clone();value.evidence.ci[0].observed_at=new Date(now+delta).toISOString();
 assert.match(state(value,2),label);
}
const inconsistent=clone();inconsistent.evidence.review.observed_at=new Date(now+1000).toISOString();
assert.match(rows(read(inconsistent),now+2000)[3].state,/충돌/);
assert.ok(rows(read(base),now+86400001).every(row=>row.state.startsWith('미확인')));
const validation=clone();validation.evidence.validation={...validation.evidence.review,state:'PASS',independent:true};
assert.match(state(validation,4),/PASS 주장.*수락 아님/);
for(const independent of [false,null]) {validation.evidence.validation.independent=independent;assert.match(state(validation,4),/독립 검증 미확인/);}
validation.evidence.validation.independent=true;validation.evidence.validation.url=validation.evidence.pr.url.replace(/\d+$/,'999');assert.match(state(validation,4),/PR 연결/);
for(const mutate of [v=>v.evidence.pr.revision='b'.repeat(40),v=>v.evidence.pr.source=null,
 v=>v.evidence.pr.observed_at=new Date(now-86400001).toISOString(),v=>v.evidence.pr.observed_at=new Date(now+1).toISOString()]) {
 const value=clone();value.evidence.review.state='approved';value.evidence.validation={...value.evidence.review,state:'PASS',independent:true};mutate(value);
 assert.match(state(value,3),/미확인/);assert.match(state(value,4),/미확인/);
 if(value.evidence.pr.revision!==value.evidence.candidate.revision)assert.match(state(value,0),/불일치/);
}
const submitted=clone();submitted.evidence.review.state='submitted';assert.match(state(submitted,3),/제출됨.*승인 아님/);
submitted.evidence.review.state='approved';assert.match(state(submitted,3),/승인 주장.*인증 안 됨/);
for(const mutate of [
 v=>v.evidence.candidate.revision='A'.repeat(40), v=>v.evidence.candidate.revision='a'.repeat(39),
 v=>v.evidence.candidate.url=v.evidence.candidate.url.replace(/a{40}$/, 'b'.repeat(40)),
 v=>v.evidence.ci=Array(9).fill(v.evidence.ci[0]), v=>v.evidence.ci=[null], v=>v.evidence.ci={},
 v=>v.evidence.ci[0].label='L'.repeat(81),v=>v.evidence.review.source='s'.repeat(161),
 v=>v.evidence.pr.state='merged', v=>v.evidence.pr.extra='anything', v=>v.evidence.native_id='hidden',
 v=>delete v.evidence.pr.observed_at,v=>v.evidence.pr.observed_at='2026-02-30T00:00:00Z',
 v=>v.evidence.validation={...v.evidence.review,state:'PASS',independent:'true'},
 ...['javascript:alert(1)','https://evil.example/runs/1','https://github.com.evil/example/fiction-paper/pull/1',
 'https://github.com/other/repo/pull/1','https://github.com/example/fiction-paper/pull/01',
 'https://github.com/example/fiction-paper/pull/1?x=y','https://github.com/example/fiction-paper/pull/1#fragment',
 'https://github.com/example/fiction-paper/../pull/1','https://github.com/example/fiction-paper/pull/1/'].map(url=>v=>v.evidence.pr.url=url),
 ...['https://github.com/example/fiction-paper/pull/1','https://evil.example/','<img src=x>','term_private','/Users/private/file','token=hidden','Bearer abc','ghp_private'].map(text=>v=>v.evidence.review.source=text)
]) {const value=clone();mutate(value);assert.throws(()=>read(value));}
const raw=JSON.stringify(base);assert.throws(()=>parse(raw.replace('"evidence":{','"evidence":{"ci":[],"ci":[],')),/중복/);
assert.throws(()=>parseView(JSON.stringify(view).replace('"evidence":{','"evidence":{"ci":[],"ci":[],')),/중복/);
const v1=clone();v1.version=1;delete v1.office;assert.throws(()=>read(v1));delete v1.evidence;assert.equal(read(v1).version,1);
assert.equal(parseView(JSON.stringify(view)).records[0].observation.evidence.candidate.revision,'a'.repeat(40));
const before=JSON.stringify(base);rows(read(base),now);assert.equal(JSON.stringify(base),before);
console.log('PASS evidence production parser and presentation: optional v2/view only, literal bounded claims, canonical references, privacy, duplicates, exact revision/time/source, separate failures/review/validation, immutable input');
