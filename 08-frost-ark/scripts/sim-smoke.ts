import assert from 'node:assert/strict';
import { createInitialWorld, stepWorld } from '../src/sim/world';
import { deserializeWorld, serializeWorld } from '../src/sim/save';

// Deterministic headless smoke verification (Dot must APPEND assertions per milestone, never weaken/delete)
const w1 = createInitialWorld(202608);
const w2 = createInitialWorld(202608);

stepWorld(w1, 30 * 120); // Simulate 2 minutes
stepWorld(w2, 30 * 120);

assert.equal(serializeWorld(w1), serializeWorld(w2), 'Simulation must be deterministic for same seed');

const snapshot = serializeWorld(w1);
const restored = deserializeWorld(snapshot);
assert.deepEqual(restored, w1, 'Save/load round-trip must preserve WorldState identically');

assert.ok(w1.ark.buoyancyUsed <= w1.ark.buoyancyMax, 'Starter ark must fit inside buoyancy budget');
assert.ok(
  w1.ark.buildings.some((b) => b.defId === 'hearth_core'),
  'Starter ark must contain central hearth_core',
);

console.log(
  `[sim-smoke] OK (tick=${w1.tick}, day=${w1.day}, weather=${w1.weather}, ambientTemp=${w1.ambientTemp}°C)`,
);

// M0: play the same world actions without Canvas or browser storage.
import { build, countItem, craftTorch, isDeck } from '../src/sim/ark';
import { aim, fire, startCharge } from '../src/sim/cloud';
const m0 = createInitialWorld(202608);
const mid = m0.ark.size / 2;
assert.equal(m0.ark.decks.filter(Boolean).length, 49, 'M0 starter deck must be exactly 7 × 7');
assert.ok(m0.ark.buildings.some(b => b.defId === 'storage_box'), 'M0 starts with a storage box');
const startY = m0.player.y;
stepWorld(m0, 120, { x: 0, y: 1 });
assert.ok(m0.player.y > startY, 'Movement must advance on deck');
assert.ok(m0.player.y < mid + 4 - .2, 'Player radius must stop at the open edge');
const fishing = createInitialWorld(202608);
const crate = fishing.sky.debris.find(d => d.loot.some(s => s.itemId === 'driftwood'))!;
assert.ok(crate, 'Opening current carries driftwood');
assert.ok(fishing.sky.debris.some(d => d.loot[0].itemId === 'frost_iron_scrap'), 'Opening current carries frost iron');
assert.ok(fishing.sky.debris.some(d => d.loot[0].itemId === 'rope'), 'Opening current carries rope');
const wood = countItem(fishing, 'driftwood');
assert.ok(startCharge(fishing, crate));
stepWorld(fishing, 26);
assert.equal(fishing.player.grapple.charge, 1, 'Hold reaches full charge');
aim(fishing, {x:crate.x+.6,y:crate.y});
fire(fishing);
let caught = false;
for (let i=0;i<85;i++) {
  stepWorld(fishing);
  caught ||= fishing.player.grapple.caughtDebrisId===crate.id;
}
assert.ok(caught, 'Released hook must physically catch the driftwood crate');
assert.ok(!fishing.player.grapple.active && !fishing.sky.debris.some(d=>d.id===crate.id));
assert.equal(countItem(fishing, 'driftwood'), wood+3, 'The retract deposits collected loot exactly once');
assert.ok(!build(fishing,'wood_deck',mid+7,mid), 'Reject disconnected construction');
assert.equal(countItem(fishing, 'driftwood'),wood+3,'Invalid placement must not spend inventory');
assert.ok(build(fishing,'wood_deck',mid+4,mid+2), 'Orthogonal edge accepts deck');
assert.ok(isDeck(fishing,mid+4,mid+2));
assert.equal(countItem(fishing,'driftwood'),wood+1);
assert.ok(craftTorch(fishing),'Handcraft torch from driftwood and rope');
assert.equal(countItem(fishing,'torch_item'),2);
assert.ok(build(fishing,'torch_post',mid+4,mid+2),'Torch can sit on the new deck');
assert.equal(countItem(fishing,'torch_item'),1);
assert.ok(!build(fishing,'torch_post',mid+4,mid+2),'Reject overlapping torch');
assert.equal(countItem(fishing,'torch_item'),1);
const roundTrip = deserializeWorld(serializeWorld(fishing));
assert.deepEqual(roundTrip,fishing,'Save after catch and building retains all state');
assert.throws(()=>deserializeWorld('{"saveVersion":1}'),/存档数据/,'Reject malformed same-version save');
assert.throws(()=>deserializeWorld('{"saveVersion":99}'),/存档版本/,'Reject unsupported save version');
console.log('[sim-smoke:M0] OK: movement, cloud loot, grapple, expansion, craft, validation and save round-trip');

// M0 refinement: native artwork and transactional storage on the unchanged world contract.
import { nearestStorage, storageContents, transferStorage } from '../src/sim/storage-box';
import { MANAN_FRAME, MANAN_POSES, mananPixels, type Direction } from '../src/render/manan-atlas';
const lockerWorld=createInitialWorld();
assert.equal(nearestStorage(lockerWorld),undefined,'Starting point is outside locker interaction range');
assert.notEqual(transferStorage(lockerWorld,'rope','deposit'),null);
stepWorld(lockerWorld,11,{x:1,y:0});
assert.ok(nearestStorage(lockerWorld));
assert.equal(transferStorage(lockerWorld,'rope','deposit'),null);
assert.equal(countItem(lockerWorld,'rope'),3);
assert.deepEqual(storageContents(lockerWorld),[{itemId:'rope',count:1}]);
const lockerReload=deserializeWorld(serializeWorld(lockerWorld));
assert.deepEqual(storageContents(lockerReload),storageContents(lockerWorld));
assert.throws(()=>deserializeWorld(JSON.stringify({...lockerWorld,storageM0:[{itemId:'rope',count:999}]})),/储物箱数据/);
assert.equal(transferStorage(lockerReload,'rope','withdraw'),null);
assert.equal(countItem(lockerReload,'rope'),4);
assert.equal(storageContents(lockerReload).length,0);
assert.equal(storageContents(deserializeWorld(serializeWorld(createInitialWorld()))).length,0,'Old saves can omit the storage extension');
const noSpace=deserializeWorld(serializeWorld(lockerWorld));
noSpace.player.inventory=noSpace.player.inventory.map(()=>({itemId:'driftwood',count:99}));
assert.notEqual(transferStorage(noSpace,'rope','withdraw'),null);
assert.deepEqual(storageContents(noSpace),[{itemId:'rope',count:1}],'Failed withdrawal cannot consume the locker stack');

assert.equal(MANAN_FRAME,64);
assert.equal(MANAN_POSES,5);
const frameBytes=new Set<string>();
for(let d=0;d<4;d++)for(let p=0;p<MANAN_POSES;p++){
  const art=mananPixels(d as Direction,p);
  assert.equal(art.length,64*64*4);
  const colors=new Set<string>();
  for(let j=0;j<art.length;j+=4)if(art[j+3])colors.add(art.slice(j,j+3).join(','));
  assert.ok(colors.size>=13,'each direction has real native shade clusters, not a placeholder');
  frameBytes.add(Buffer.from(art).toString('base64'));
}
assert.equal(frameBytes.size,20,'four directional idle poses and sixteen distinct walk frames');
console.log('[sim-smoke:M0-refinement] OK: locker transfers, overflow protection, old-save load, native 64×64 ×20');
