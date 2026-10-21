'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = {window: {}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'skins.js'), 'utf8'), context);
const frames = {room: [880, 790, 0, 0], roomFront: [880, 790, 0, 0], desk: [240, 240, 64, 80]};
for (const [skin, manifest] of Object.entries(context.window.officeSkins)) {
  for (const [key, registration] of [...Object.entries(manifest).filter(([key]) => key !== 'characters'), ...Object.entries(manifest.characters)]) {
    const expected = frames[key] || [100, 125, 50, 70];
    assert.deepEqual([registration.width, registration.height, registration.anchor.x, registration.anchor.y], expected);
    assert.equal(registration.display.width, expected[0]); assert.equal(registration.display.height, expected[1]);
    assert.equal(registration.pixelated, skin === 'pixel');
    assert.match(registration.src, /^assets\/[a-z-]+\.svg$/);
    const source = fs.readFileSync(path.join(__dirname, registration.src), 'utf8');
    assert.match(source, new RegExp(`viewBox="0 0 ${expected[0]} ${expected[1]}"`));
    if (key.startsWith('room')) assert.match(source, new RegExp(`width="${expected[0]}" height="${expected[1]}"`));
    assert.doesNotMatch(source, /<(?:script|foreignObject|iframe|image|animate|set)\b|\bon\w+\s*=|<!DOCTYPE|<!ENTITY/i);
    for (const match of source.matchAll(/(?:href\s*=\s*["']([^"']+)|url\(([^)]+)\))/g)) {
      const ref = match[1] || match[2]; assert.match(ref, /^#[a-zA-Z][\w-]*$/);
      assert.ok(source.includes(`id="${ref.slice(1)}"`));
    }
    if (skin === 'pixel' && key.startsWith('room')) {
      assert.match(source, /shape-rendering="crispEdges"/);
      assert.doesNotMatch(source, /(?:\d\.\d)|<(?:ellipse|circle|filter|text)\b/);
      for (const match of source.matchAll(/\bd="([^"]+)"/g)) assert.doesNotMatch(match[1], /[CQAST]/i);
    }
  }
}
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const office = html.slice(html.indexOf('<svg id="office"'), html.indexOf('</svg>', html.indexOf('<svg id="office"')));
assert.doesNotMatch(office, /<(?:path|use|ellipse|defs|pattern|filter)\b/);
assert.ok(office.indexOf('id="room-art"') < office.indexOf('id="desks"'));
assert.ok(office.indexOf('id="room-front-art"') > office.indexOf('id="movement-actor"'));
assert.doesNotMatch(fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8'), /radial-gradient/);
// Exercise the actual shared renderer, including malformed registration and stale events.
class Node {
  constructor(tag) { this.tag = tag; this.attributes = {}; this.style = {}; this.dataset = {}; this.children = []; this.listeners = {}; this.isConnected = true; }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children.forEach(node => node.isConnected = false); this.children = nodes; }
  get firstChild() { return this.children[0]; }
  addEventListener(name, fn) { this.listeners[name] = fn; }
}
const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const renderer = app.slice(app.indexOf('  function asset('), app.indexOf('  function updateAssetMessage('));
const renderContext = {svg: (tag, attrs = {}) => {const node = new Node(tag); Object.entries(attrs).forEach(([k,v]) => node.setAttribute(k,v)); return node;}, updateAssetMessage: () => {}};
vm.runInNewContext(renderer + '\nthis.asset = asset;', renderContext);
const holder = new Node('g');
for (const broken of [undefined, null, {}, {width: 0}, {...context.window.officeSkins.pixel.room, anchor: null}]) {
  renderContext.asset(holder, broken); assert.equal(holder.children[1].dataset.failed, 'true');
}
renderContext.asset(holder, context.window.officeSkins.pixel.room);
const oldImage = holder.firstChild;
oldImage.listeners.error(); assert.equal(holder.children[1].dataset.failed, 'true');
oldImage.listeners.load(); assert.equal(holder.children[1].dataset.failed, undefined);
renderContext.asset(holder, context.window.officeSkins.illustration.room);
oldImage.listeners.error(); assert.equal(holder.children[1].dataset.failed, undefined);
holder.firstChild.listeners.error(); assert.equal(holder.children[1].dataset.failed, 'true');
oldImage.listeners.load(); assert.equal(holder.children[1].dataset.failed, 'true');
holder.firstChild.listeners.load(); assert.equal(holder.children[1].dataset.failed, undefined);
console.log('PASS skin descriptors, SVG safety/local references/integer room geometry, static layer order, missing registration, recovery and stale events');
