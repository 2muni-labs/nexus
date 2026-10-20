const assert = require('node:assert/strict');
const {parse, MAX_BYTES} = require('./snapshot.js');
const valid = {version:1, observed_at:'2026-01-01T00:00:00Z', work:{url:'https://github.com/example/fiction/issues/1',title:'가상 작업',workflow_status:'Review'},execution:{status:'succeeded',source:'가상 수동 관찰'}};
const read = value => parse(JSON.stringify(value));
assert.equal(read(valid).work.workflow_status, 'Review'); // success must not become Done
assert.equal(read(valid).execution.status, 'succeeded');
assert.equal(read({...valid,execution:null}).execution, null);
assert.equal(read({...valid,work:{...valid.work,workflow_status:'mystery'},execution:{}}).work.workflow_status,null);
assert.deepEqual(read({...valid,execution:{}}).execution,{status:null,source:null});
const unsafe = '<img src=x onerror=alert(1)><script>alert(1)</script>';
assert.equal(read({...valid,work:{...valid.work,title:unsafe}}).work.title,unsafe); // plain text, not markup
for (const url of ['javascript:alert(1)','http://github.com/a/b/issues/1','https://github.com/a/b/issues/1?x=1','https://github.com/a/b/issues/0','https://github.com.evil/a/b/issues/1','https://github.com/a/../issues/1']) assert.throws(()=>read({...valid,work:{...valid.work,url}}));
for (const source of ['/Users/person/private','file:///tmp/data','/etc/passwd','/opt/tool/config','ctx_private123','C:\\secret']) assert.throws(()=>read({...valid,execution:{source}}));
for (const value of [{...valid,version:2},{...valid,extra:true},{...valid,observed_at:'2026-02-30T00:00:00Z'},{...valid,work:{...valid.work,title:'x'.repeat(161)}},{...valid,execution:[]},{...valid,execution:{status:4}}]) assert.throws(()=>read(value));
assert.throws(()=>parse('{'));
assert.throws(()=>parse(' '.repeat(MAX_BYTES+1)));
console.log('PASS: snapshot bounds, schema, links, unknowns, status separation and untrusted text');
