'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const campus = require('./campus.js');
const context={window:{}};
vm.runInNewContext(fs.readFileSync(__dirname+'/skins.js','utf8'),context);
const before=JSON.stringify(campus.assignments);
const scene=campus.view();
assert.equal(scene.length,4);
for(const field of ['id','workItem','workspace','session']) assert.equal(new Set(scene.map(e=>e.work[field])).size,4,field+' unique ownership');
for(const room of campus.rooms){
 const owned=scene.filter(e=>e.roomId===room.id);assert.equal(owned.length,2);
 owned.forEach(e=>{assert.equal(e.work.room.repository,room.repository);assert.equal(e.work.roomId,room.id);assert.equal(e.workId,e.work.workItem);assert.equal(e.work.observation,undefined);});
}
for(const skin of Object.values(context.window.officeSkins)){
 const original=JSON.stringify(skin), fitted=campus.manifest(skin);
 assert.equal(fitted.desk.src,skin.desk.src);assert.equal(fitted.desk.display.width,128);assert.equal(fitted.desk.display.height,96);
 for(const entry of scene){assert.equal(fitted.characters[entry.characterKey].src,skin.characters[entry.characterKey].src);assert.equal(fitted.characters[entry.characterKey].display.height,64);assert.equal(fitted.characters[entry.characterKey].expressions,undefined);}
 assert.equal(fitted.layout,campus.layout);assert.equal(JSON.stringify(skin),original,'adapter does not mutate shared skins');
}
assert.equal(JSON.stringify(campus.assignments),before);
scene[0].work.name='changed';assert.notEqual(campus.view()[0].work.name,'changed');
for(const file of ['campus-building','campus-front']){
 const art=fs.readFileSync(__dirname+'/assets/'+file+'.svg','utf8');
 assert.match(art,/viewBox="0 0 1000 640"/);
 assert.doesNotMatch(art,/<(?:script|foreignObject|iframe|image|animate|set)\b|\bon\w+\s*=|(?:href=|url\(|<!ENTITY|<!DOCTYPE)/i);
}
assert.doesNotMatch(fs.readFileSync(__dirname+'/campus.js','utf8'),/setTimeout|setInterval|fetch\(/);
console.log('PASS campus explicit two-room/four unique worktree-session ownership, stable skin-independent placement, compact original skin assets, no skin mutation, safe local static art');

const app=fs.readFileSync(__dirname+'/app.js','utf8');
const initial=app.match(/let mode = (.*);/)[1];
for(const query of ['', '?view=unknown', '?view=rooms', '?view=Campus', '?view=campus']){
 assert.equal(vm.runInNewContext(initial,{URLSearchParams,window:{location:{search:query}}}),query==='?view=campus'?'campus':'demo');
}
console.log('PASS only the exact campus query changes the existing initial mode');

for(const missing of [undefined,null]) assert.equal(campus.manifest(missing),missing);
for(const broken of [undefined,null,{}, {src:'assets/broken.svg',width:0}, {...context.window.officeSkins.simulation.desk,anchor:null}]){
 const fitted=campus.manifest({...context.window.officeSkins.simulation,desk:broken});
 assert.equal(fitted.desk,broken,'invalid desk reaches shared error renderer unchanged');
}
assert.deepEqual(Object.keys(campus.manifest({}).characters),[]);
const malformed={...context.window.officeSkins.simulation.characters['leaf-mint'],anchor:null};
assert.equal(campus.manifest({characters:{'leaf-mint':malformed}}).characters['leaf-mint'],malformed);
console.log('PASS absent skins/desks/characters and malformed registrations remain explicit errors without throwing or success-art substitution');
