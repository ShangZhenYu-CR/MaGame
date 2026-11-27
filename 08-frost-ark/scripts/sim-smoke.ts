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
