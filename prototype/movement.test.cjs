'use strict';
const assert = require('node:assert/strict');
const {frame, position, create, count, workspaces} = require('./movement.js');
const delivered = frame(6);
assert.equal(delivered.liveness, 'present');
assert.equal(delivered.workflowA, 'Review');
for (const flag of ['done', 'accepted', 'released', 'deletable']) assert.equal(delivered[flag], false);
assert.equal(frame(7).liveness, 'exited');
assert.deepEqual(position(frame(3)), position(frame(2)), 'unknown keeps last observed position');
assert.equal(frame(3).liveness, 'unknown');
assert.equal(frame(4).assignment, frame(2).assignment, 'coffee preserves Task/worktree assignment');
assert.equal(frame(4).session, frame(2).session);
assert.equal(frame(5).session, frame(2).session);
assert.equal(frame(5).assignment, frame(2).assignment);
assert.notDeepEqual(position(frame(4)), position(frame(5)));
assert.notEqual(frame(10).session, frame(6).session);
assert.notEqual(workspaces[frame(10).assignment].task, workspaces[frame(6).assignment].task);
assert.notEqual(workspaces[frame(10).assignment].worktree, workspaces[frame(6).assignment].worktree);
const callbacks = []; const cancelled = []; let observations = 0;
const player = create(() => observations++, fn => {callbacks.push(fn); return callbacks.length;}, id => cancelled.push(id));
player.play(); player.play(); assert.equal(callbacks.length, 1, 'play is idempotent');
player.pause(); callbacks[0](); assert.equal(player.state().index, 0, 'stale pause callback ignored');
player.play(); const stale = callbacks.at(-1); player.reset(); player.play(); stale();
assert.equal(player.state().index, 0, 'reset invalidates earlier timer even after play');
callbacks.at(-1)(); assert.equal(player.state().index, 1);
player.step(); assert.equal(player.state().index, 2); assert.equal(player.state().playing, false);
callbacks.at(-1)(); assert.equal(player.state().index, 2, 'step cancels autoplay');
for (let i = 0; i < count + 2; i++) player.step();
assert.equal(player.state().index, count - 1); assert.equal(player.state().playing, false);
player.play(); assert.equal(player.state().playing, false);
player.reset(); assert.equal(player.state().session, 'demo-session-1'); assert.equal(player.state().index, 0);
assert.ok(cancelled.length && observations);
console.log('PASS movement facts, identity, unknown location, result/exit, reset and stale timers');

// Controlled clock exercises the production waypoint interpolation and timer lifecycle.
let clock = 0, nextTimer = 0;
const timers = new Map(), visualUpdates = [];
const moving = create(() => {}, (fn, delay) => {const id = ++nextTimer; timers.set(id, {fn, delay}); return id;},
  id => timers.delete(id), () => clock, state => visualUpdates.push(state));
function tick(ms) {clock += ms; const [id, job] = timers.entries().next().value; timers.delete(id); job.fn();}
moving.play();tick(2200);
assert.equal(moving.state().index, 1);assert.equal(moving.state().visual.progress, 0);
assert.deepEqual(position(moving.state()), position(frame(0)), 'approach starts at previous location');
tick(400);const quarter = position(moving.state());
assert.notDeepEqual(quarter, position(frame(0)));assert.notDeepEqual(quarter, position(frame(1)));
assert.equal(moving.state().visual.progress, .25);assert.equal(timers.size, 1);
moving.pause();const frozen = JSON.stringify(position(moving.state()));clock += 5000;
assert.equal(JSON.stringify(position(moving.state())), frozen);assert.equal(timers.size, 0);
moving.play();tick(400);assert.equal(moving.state().visual.progress, .5);
const oldTick = [...timers.values()][0].fn;
moving.suspend('hidden');assert.equal(timers.size, 0);moving.play();assert.equal(timers.size, 0);
moving.suspend('');moving.play();oldTick();assert.equal(moving.state().visual.progress, .5);
tick(800);assert.equal(moving.state().visual.progress, 1);assert.deepEqual(position(moving.state()), position(frame(1)));
tick(2200);assert.equal(moving.state().index, 2);tick(2200);
assert.equal(moving.state().liveness, 'unknown');assert.deepEqual(position(moving.state()), position(frame(2)));
tick(2200);assert.equal(moving.state().index, 4);tick(800);
assert.notDeepEqual(position(moving.state()),position(frame(4)), 'physical coffee excursion has intermediate positions');
moving.step();assert.equal(moving.state().index, 5);assert.equal(moving.state().visual.progress, 1);
assert.equal(timers.size, 0, 'step is the static accessible equivalent');
moving.reset();assert.deepEqual(position(moving.state()), position(frame(0)));assert.equal(timers.size, 0);
assert.ok(visualUpdates.length);
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const context = {window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'skins.js'), 'utf8'),context);
const layout = context.window.officeSkins.simulation.layout;
assert.deepEqual(position(frame(1),layout), {x:280,y:410});
assert.deepEqual(position(frame(10),layout), {x:600,y:410});
assert.deepEqual({...position(frame(4),layout)}, {x:710,y:414});
// Actual DOM-local visibility/reduced handler and visual painter, no substitute controller.
const app = fs.readFileSync(path.join(__dirname, 'app.js'),'utf8');
const nodes = new Map();const byId = id => nodes.get(id) || nodes.set(id,{style:{},textContent:'',insertBefore(){}}).get(id);
const dom = {window:{officeMovement:require('./movement.js'),officeSkins:context.window.officeSkins},
  movement:moving, document:{hidden:false}, reducedMotion:{matches:false}, refreshExpressions(){},
  skin:'simulation', byId, desks:{}};
vm.createContext(dom);
vm.runInContext(app.slice(app.indexOf('  function paintMotion()'), app.indexOf('  function paintMovement()')) +
  app.slice(app.indexOf('  function stopHiddenMovement()'),app.indexOf("  document.addEventListener('visibilitychange'")) +
  ';this.stop=stopHiddenMovement;this.paint=paintMotion;',dom);
moving.play();tick(2200);tick(400);dom.paint();
assert.match(byId('movement-motion').textContent,/25%/);assert.match(byId('movement-actor').style.transform,/translate/);
for (const reason of ['hidden','reduced']) {
  dom.document.hidden = reason === 'hidden';dom.reducedMotion.matches = reason === 'reduced';dom.stop();
  assert.equal(moving.state().playing,false);assert.equal(timers.size,0);moving.play();assert.equal(timers.size,0);
  dom.paint();assert.match(byId('movement-motion').textContent, /정지/);
  dom.document.hidden=false;dom.reducedMotion.matches=false;dom.stop();
  assert.equal(moving.state().playing,false,'becoming visible never silently restarts');moving.play();
}
moving.pause();
console.log('PASS continuous route positions, visual/stage separation, pause/resume freeze, unknown freeze, static step/reset, stale callbacks, simulation anchors and production hidden/reduced/painter handlers');
