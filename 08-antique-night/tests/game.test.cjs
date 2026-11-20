// Headless logic regression tests. This uses a fake DOM and gamepad; it does not
// replace a browser rendering test or a physical-controller playthrough.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function makeStorage() {
  const data = new Map();
  return {getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key)};
}
function game(localStorage = makeStorage()) {
  const context2d = new Proxy({
    createLinearGradient: () => ({addColorStop() {}}),
    measureText: text => ({width: text.length * 10}),
  }, {get: (target, prop) => target[prop] || (() => {}), set: (target, prop, value) => (target[prop] = value, true)});
  const nodes = {
    game: {getContext: () => context2d},
    overlay: {classList: {add() {}, remove() {}}},
    title: {}, story: {}, objective: {},
    newgame: {style: {}, click() {this.onclick();}},
    go: {click() {this.onclick();}},
  };
  let pads = [];
  const listeners = {};
  const env = {
    console, Math, localStorage,
    confirm: () => true,
    Image: class {constructor() {this.complete = false;}},
    document: {getElementById: id => nodes[id]},
    addEventListener(name, fn) {listeners[name] = fn;},
    navigator: {getGamepads: () => pads},
    requestAnimationFrame() {},
  };
  env.window = env;
  vm.createContext(env);
  for (const file of ['audio.js', 'combat.js', 'player-combat.js', 'save.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), env, {filename: file});
  }
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8'), env, {filename: 'game.js'});
  return {
    run: source => vm.runInContext(source, env),
    tick(n = 1) {for (let i = 0; i < n; i++) vm.runInContext('update()', env);},
    pad(button = -1, axis = 0, slot = 0) {pads = Array(slot).fill(null); pads.push({axes: [axis], buttons: Array.from({length: 16}, (_, i) => ({pressed: i === button}))});},
    unpad() {pads = [];},
    key(type, key) {listeners[type]({key, preventDefault() {}});},
    nodes, env,
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

test('repairing the broken bridge creates a traversable path and saves it', () => {
  const storage=makeStorage(),g=game(storage);g.run('init();enterWorld();player.x=660;player.y=368;player.vy=0;player.ground=true');
  g.key('keydown','e');g.tick(95);g.key('keyup','e');
  assert.equal(g.run('bridgeDone'),true);assert.equal(JSON.parse(storage.getItem('magame08-progress-v1')).bridge,true);
  g.key('keydown','d');g.tick(85);g.key('keyup','d');assert.ok(g.run('player.x')>930);assert.ok(g.run('player.y')<450);
  const reload=game(storage);reload.nodes.go.click();assert.equal(reload.run('bridgeDone'),true);
});

test('bridge repair can be interrupted and gamepad A does not jump beside it',()=>{
  const g=game();g.run('init();enterWorld();player.x=660;player.y=368;player.ground=true');
  g.pad(0);g.tick(15);assert.ok(g.run('bridgeProgress')>0);assert.equal(g.run('player.ground'),true);
  g.pad(-1,1);g.tick(30);assert.equal(g.run('bridgeDone'),false);
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
  const g = game(); g.run('init();enterWorld();shards.forEach(s=>s.taken=true);fragments=3;player.x=3260;player.y=368;player.facing=1;boss.hp=1;taps.attack=true');
  g.tick();
  assert.equal(g.run('mode'), 'world', 'boss survives the attack startup');
  g.tick(4);
  assert.equal(g.run('mode'), 'return', 'boss is defeated when attack becomes active');
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
  const g = game(); g.run('init();enterWorld();player.x=3260;player.y=368;player.facing=1;taps.attack=true');
  g.tick(5);
  assert.equal(g.run('boss.hp'), 28, 'shield blocks an active attack');
  g.tick(15);
  g.run('fragments=3;taps.attack=true'); g.tick(5);
  assert.equal(g.run('boss.hp'), 27, 'an active attack damages an unshielded boss');
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
  assert.equal(g.run('enemies[0].hp'), 3, 'attack does not hit during startup');
  g.tick(4);
  assert.equal(g.run('enemies[0].hp'), 2, 'first X press damages enemy on its active frame');
  g.tick(25);
  assert.equal(g.run('enemies[0].hp'), 2, 'holding X does not generate another press');
});

test('repair can pause and resume without losing progress', () => {
  const g = game();
  g.run("init();mode='return';player.x=665;taps.interact=true"); g.tick();
  assert.equal(g.run('mode'), 'repair');
  g.run('time=0;taps.interact=true'); g.tick();
  assert.equal(g.run('repairStep'), 1);
  g.run('taps.pause=true'); g.tick(); assert.equal(g.run('mode'), 'pause');
  g.run('taps.pause=true'); g.tick(); assert.equal(g.run('mode'), 'repair');
  assert.equal(g.run('repairStep'), 1);
});

test('gamepad A can finish all three repair steps', () => {
  const g = game();
  g.run("init();mode='return';player.x=665;interact()");
  for (let i = 0; i < 3; i++) {
    g.pad(); g.tick();
    g.run('time=0'); g.pad(0); g.tick();
  }
  assert.equal(g.run('mode'), 'win');
});


test('Shift combined with movement handles uppercase keydown and keyup', () => {
  const g = game(); g.run('init();enterWorld()');
  g.key('keydown', 'Shift'); g.key('keydown', 'D');
  assert.equal(g.run('!!keys.right'), true, 'uppercase keydown sets right movement');
  g.tick(10); assert.ok(g.run('player.x') > 65, 'Shift+D moves right');
  g.key('keyup', 'D'); g.key('keyup', 'Shift');
  assert.equal(g.run('!!keys.right'), false, 'shifted keyup stops right movement');
});


test('losing focus clears held and queued keyboard input', () => {
  const g = game(); g.run('init();enterWorld()');
  g.key('keydown', 'd'); g.key('keydown', 'j');
  assert.equal(g.run('!!keys.right'), true); assert.equal(g.run('!!taps.attack'), true);
  g.key('blur', '');
  assert.equal(g.run('!!keys.right'), false); assert.equal(g.run('!!taps.attack'), false);
});


test('heavy attack has a longer windup and dodge cancels before impact', () => {
  const g = game();
  g.run('init();enterWorld();player.x=340;player.y=368;player.ground=true;player.facing=1');
  g.key('keydown', 'k'); g.tick(6); g.key('keyup', 'k');
  assert.equal(g.run('enemies[0].hp'), 3, 'heavy windup does not hit immediately');
  g.key('keydown', 'Shift'); g.tick(); g.key('keyup', 'Shift');
  g.tick(14);
  assert.equal(g.run('enemies[0].hp'), 3, 'cancelled heavy never hits');
  assert.ok(g.run('player.combat.dashCooldown') > 0, 'dodge has independent cooldown');
});

test('receiving damage cancels an attack during its windup', () => {
  const g = game();
  g.run('init();enterWorld();player.x=340;player.y=368;player.ground=true;player.facing=1');
  g.key('keydown', 'k'); g.tick(3); g.key('keyup', 'k');
  g.run('hurt()'); g.tick(15);
  assert.equal(g.run('enemies[0].hp'), 3, 'interrupted attack cannot deal damage later');
  assert.equal(g.run('player.hp'), 7);
});

test('reloading after a shard and checkpoint restores actual progress', () => {
  const storage = makeStorage(); const first = game(storage);
  first.run('init();enterWorld();player.x=1040;player.y=270'); first.tick();
  assert.equal(first.run('fragments'), 1);
  first.run('player.x=2000;player.y=350'); first.tick();
  assert.equal(first.run('checkpoint'), 1);
  const reload = game(storage);
  assert.equal(reload.nodes.go.textContent, '继续游戏');
  reload.nodes.go.click();
  assert.equal(reload.run('mode'), 'world');
  assert.equal(reload.run('checkpoint'), 1);
  assert.equal(reload.run('fragments'), 1);
  assert.deepEqual(Array.from(reload.run('shards.map(s=>s.taken)')), [true, false, false]);
  assert.equal(reload.run('player.x'), 1980);
});

test('repair progress survives a page reload and finishes correctly', () => {
  const storage = makeStorage(); const first = game(storage);
  first.run("init();enterWorld();shards.forEach(s=>s.taken=true);fragments=3;mode='return';player.x=665;interact();time=0;taps.interact=true"); first.tick();
  assert.equal(first.run('repairStep'), 1);
  const reload = game(storage); reload.nodes.go.click();
  assert.equal(reload.run('mode'), 'repair');
  assert.equal(reload.run('repairStep'), 1);
  for (let i=0;i<2;i++) {reload.run('time=0;taps.interact=true'); reload.tick();}
  assert.equal(reload.run('mode'), 'win');
});

test('starting a new game requires confirmation before overwriting', () => {
  const storage = makeStorage(); const first = game(storage);
  first.run('init();enterWorld();shards[0].taken=true;checkpoint=1;saveProgress()');
  const reload = game(storage); const before = storage.getItem('magame08-progress-v1');
  reload.env.confirm = () => false; reload.nodes.newgame.click();
  assert.equal(storage.getItem('magame08-progress-v1'), before);
  assert.equal(reload.run('mode'), 'title');
  reload.env.confirm = () => true; reload.nodes.newgame.click();
  assert.equal(reload.run('mode'), 'shop');
  assert.equal(reload.run('checkpoint'), 0);
  assert.equal(JSON.parse(storage.getItem('magame08-progress-v1')).stage, 'shop');
});

test('corrupt and unsupported stored saves fall back safely to new game', () => {
  const storage = makeStorage(); storage.setItem('magame08-progress-v1','{invalid');
  let reload = game(storage); assert.equal(reload.run('pendingSave'), null);
  reload.nodes.go.click(); assert.equal(reload.run('mode'), 'shop');
  storage.setItem('magame08-progress-v1', JSON.stringify({version:999, stage:'world'}));
  reload = game(storage); assert.equal(reload.run('pendingSave'), null);
  reload.nodes.go.click(); assert.equal(reload.run('mode'), 'shop');
});

test('new game can be confirmed by keyboard without touching pointer', () => {
  const storage = makeStorage(), first = game(storage);
  first.run('init();enterWorld();shards[0].taken=true;checkpoint=1;saveProgress()');
  const reload=game(storage);const before=storage.getItem('magame08-progress-v1');
  reload.key('keydown','n');reload.tick();reload.key('keyup','n');
  assert.equal(storage.getItem('magame08-progress-v1'),before);
  reload.key('keydown','n');reload.tick();reload.key('keyup','n');
  assert.equal(reload.run('mode'),'shop');assert.equal(reload.run('checkpoint'),0);
});

test('new game can be confirmed by gamepad Y', () => {
  const storage=makeStorage(),first=game(storage);first.run('init();enterWorld();checkpoint=1;saveProgress()');
  const reload=game(storage);reload.pad(3);reload.tick();assert.equal(reload.run('mode'),'title');
  reload.pad();reload.tick();reload.pad(3);reload.tick();assert.equal(reload.run('mode'),'shop');
});

test('armored porcelain beast blocks light hits and two heavy hits break armor',()=>{
 const g=game();g.run('init();enterWorld();player.x=1690;player.y=368;player.facing=1;player.ground=true');
 g.run('hitTarget(enemies[2],false)');assert.equal(g.run('enemies[2].hp'),4);assert.equal(g.run('enemies[2].armor'),2);
 g.run('hitTarget(enemies[2],true)');assert.equal(g.run('enemies[2].armor'),1);
 g.run('hitTarget(enemies[2],true)');assert.equal(g.run('enemies[2].armor'),0);
 g.run('hitTarget(enemies[2],false)');assert.equal(g.run('enemies[2].hp'),3);
});
