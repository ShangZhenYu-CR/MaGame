// Headless logic regression tests. This uses a fake DOM and gamepad; it does not
// replace a browser rendering test or a physical-controller playthrough.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function game() {
  const context2d = new Proxy({
    createLinearGradient: () => ({addColorStop() {}}),
    measureText: text => ({width: text.length * 10}),
  }, {get: (target, prop) => target[prop] || (() => {}), set: (target, prop, value) => (target[prop] = value, true)});
  const nodes = {
    game: {getContext: () => context2d},
    overlay: {classList: {add() {}, remove() {}}},
    title: {}, story: {}, objective: {},
    go: {click() {this.onclick();}},
  };
  let pads = [];
  const env = {
    console, Math,
    Image: class {constructor() {this.complete = false;}},
    document: {getElementById: id => nodes[id]},
    addEventListener() {},
    navigator: {getGamepads: () => pads},
    requestAnimationFrame() {},
  };
  env.window = env;
  vm.createContext(env);
  for (const file of ['audio.js', 'combat.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), env, {filename: file});
  }
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8'), env, {filename: 'game.js'});
  return {
    run: source => vm.runInContext(source, env),
    tick(n = 1) {for (let i = 0; i < n; i++) vm.runInContext('update()', env);},
    pad(button = -1, axis = 0, slot = 0) {pads = Array(slot).fill(null); pads.push({axes: [axis], buttons: Array.from({length: 16}, (_, i) => ({pressed: i === button}))});},
    unpad() {pads = [];},
  };
}
function test(name, fn) {
  try {fn(); console.log(`PASS ${name}`);}
  catch (error) {console.error(`FAIL ${name}: ${error.stack}`); process.exitCode = 1;}
}

test('keyboard starts game and shop commission enters bottle', () => {
  const g = game();
  g.run('taps.confirm=true'); g.tick();
  assert.equal(g.run('mode'), 'shop');
  g.run('player.x=817;taps.interact=true'); g.tick();
  assert.equal(g.run('dialogue'), 1);
  g.run('player.x=665;taps.interact=true'); g.tick();
  assert.equal(g.run('mode'), 'world');
});

test('first chasm can be crossed with an ordinary jump', () => {
  const g = game(); g.run('init();enterWorld();player.x=670;player.y=368;player.vy=0;player.ground=true;keys.right=true;taps.jump=true');
  g.tick(42); g.run('keys.right=false');
  assert.ok(g.run('player.x') > 770, 'player reached the other bank');
  assert.ok(g.run('player.y') < 500, 'player did not fall through the gap');
});

test('checkpoint retry preserves collected shards without granting missing ones', () => {
  const g = game(); g.run('init();enterWorld();shards[0].taken=true;fragments=1;player.x=2000'); g.tick();
  assert.equal(g.run('checkpoint'), 1);
  g.run('enterWorld(true)');
  assert.equal(g.run('fragments'), 1);
  assert.deepEqual(Array.from(g.run('shards.map(s=>s.taken)')), [true, false, false]);
  assert.equal(g.run('player.x'), 1980);
});

test('boss defeat transitions to shop and vase repair completes chapter', () => {
  const g = game(); g.run('init();enterWorld();shards.forEach(s=>s.taken=true);fragments=3;player.x=3260;player.y=368;player.facing=1;boss.hp=1;player.cool=0;strike(false)');
  assert.equal(g.run('mode'), 'return');
  g.run('player.x=665;taps.interact=true'); g.tick();
  assert.equal(g.run('mode'), 'repair');
  g.run('time=27;taps.interact=true'); g.tick();
  assert.equal(g.run('repairStep'), 0, 'pressing outside the target does not advance');
  assert.equal(g.run('mode'), 'repair');
  for (let i = 1; i <= 3; i++) {
    g.run('time=0;taps.interact=true'); g.tick();
    assert.equal(g.run('repairStep'), i);
  }
  assert.equal(g.run('mode'), 'win');
});

test('standard gamepad starts, moves, and toggles pause after release', () => {
  const g = game(); g.pad(0); g.tick();
  assert.equal(g.run('mode'), 'shop');
  g.pad(-1, 1); g.tick(50);
  assert.ok(g.run('player.x') > 200, 'left stick moved character');
  g.pad(9); g.tick(); assert.equal(g.run('mode'), 'pause');
  g.pad(); g.tick(); g.pad(9); g.tick();
  assert.equal(g.run('mode'), 'shop');
});

test('boss shield blocks damage until all three shards are collected', () => {
  const g = game(); g.run('init();enterWorld();player.x=3260;player.y=368;player.facing=1;player.cool=0;strike(false)');
  assert.equal(g.run('boss.hp'), 28);
  g.run('fragments=3;player.cool=0;strike(false)');
  assert.equal(g.run('boss.hp'), 27);
});

test('damage grants temporary immunity, and dashing avoids damage', () => {
  const g = game(); g.run('init();enterWorld();hurt();hurt()');
  assert.equal(g.run('player.hp'), 7);
  g.run('player.inv=0;player.dash=3;hurt()');
  assert.equal(g.run('player.hp'), 7);
});

test('falling into a gap consumes health and returns to checkpoint', () => {
  const g = game(); g.run('init();enterWorld();checkpoint=1;player.x=1950;player.y=601'); g.tick();
  assert.equal(g.run('player.hp'), 7);
  assert.equal(g.run('player.x'), 2010);
  assert.ok(g.run('player.inv') > 0);
});

test('gamepad in nonzero slot works and reconnect clears button edges', () => {
  const g = game(); g.pad(0, 0, 1); g.tick();
  assert.equal(g.run('mode'), 'shop', 'A on slot 1 starts game');
  g.pad(-1, 1, 1); g.tick(50);
  assert.ok(g.run('player.x') > 200, 'left stick on slot 1 moves player');
  g.pad(9, 0, 1); g.tick(); assert.equal(g.run('mode'), 'pause');
  g.unpad(); g.tick();
  g.pad(9, 0, 1); g.tick(); assert.equal(g.run('mode'), 'shop', 'pressed button after reconnect is a fresh edge');
});

test('gamepad X attacks and held button is not repeatedly fired', () => {
  const g = game();
  g.run('init();enterWorld();player.x=340;player.y=368;player.facing=1;player.ground=true');
  g.pad(2); g.tick();
  assert.equal(g.run('enemies[0].hp'), 2, 'first X press damages enemy');
  g.tick(25);
  assert.equal(g.run('enemies[0].hp'), 2, 'holding X does not generate another press');
});
