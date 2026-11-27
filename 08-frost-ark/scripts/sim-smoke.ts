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

// M1: deterministic climate, 4 Hz heat, insulation, exposure, fuel, all portraits and Latte.
import { addFuel, HEAT_HZ, heatAt, partOfDay, primaryHearth, upgradeHearth } from '../src/sim/heatField';
import { dropSupply, isDeckDrop, manuallyRecover } from '../src/sim/latte';
const m1create = () => {
  const w=createInitialWorld(202608);
  w.timeOfDay=.82;
  return w;
};
assert.equal(HEAT_HZ,4);
const pulse=m1create(), prev=JSON.stringify(pulse.ark.heatGrid);
stepWorld(pulse,7);
assert.equal(JSON.stringify(pulse.ark.heatGrid),prev,'Heat must not mutate between 4 Hz ticks');
stepWorld(pulse,1);
assert.notEqual(JSON.stringify(pulse.ark.heatGrid),prev,'First heat tick arrives at 8 simulation ticks');
const exposed=m1create(), shielded=m1create();
assert.ok(build(shielded,'wind_wall',24,27));
stepWorld(exposed,360);stepWorld(shielded,360);
assert.equal(exposed.weather,'snow');assert.equal(exposed.ambientTemp,-22);
assert.ok(heatAt(shielded,24.5,26.5)>heatAt(exposed,24.5,26.5)+1,'Built wind wall retains heat inside');
assert.ok(heatAt(exposed,24.5,25.5)>=15,'Warmth is reachable from the walkable tile beside the hearth');
assert.ok(heatAt(exposed,27.5,27.5)<0,'Unprotected corner remains cold');
exposed.player.x=27.51;exposed.player.y=27.5;exposed.player.warmth=2;
stepWorld(exposed,120);
assert.equal(exposed.player.warmth,0);
assert.ok(exposed.player.hp<100);
assert.equal(exposed.player.portraitMood,3);
exposed.player.x=24.5;exposed.player.y=25.5;exposed.player.warmth=60;
stepWorld(exposed,15);assert.equal(exposed.player.portraitMood,1);
assert.ok(exposed.player.warmth>60);
const focus=createInitialWorld();
assert.ok(startCharge(focus,{x:20,y:24}));stepWorld(focus,8);
assert.equal(focus.player.portraitMood,2);
const dusk=createInitialWorld();dusk.timeOfDay=.666;stepWorld(dusk,1);
assert.equal(partOfDay(dusk.timeOfDay),'黄昏');
assert.ok(dusk.ambientTemp<-4&&dusk.ambientTemp>-22);
const storm=m1create();storm.day=5;stepWorld(storm,8);
assert.equal(storm.weather,'whiteout');assert.equal(storm.ambientTemp,-55);
assert.equal(storm.latte.mood,'alert');
storm.timeOfDay=.999999;stepWorld(storm);
assert.equal(storm.day,6);assert.equal(storm.weather,'clear');
const cat=createInitialWorld();cat.player.x=24.5;cat.player.y=25.5;
const heater=primaryHearth(cat)!;
heater.fuel=8;stepWorld(cat,8);
assert.equal(cat.latte.mood,'hungry_hearth');assert.equal(cat.player.portraitMood,3);
assert.equal(addFuel(cat),null);assert.ok(heater.fuel>22);
assert.ok(dropSupply(cat));stepWorld(cat,30);
assert.ok(cat.sky.debris.find(isDeckDrop),'Lv.1 leaves a ground drop untouched');
assert.ok(manuallyRecover(cat));
cat.player.inventory[3]={itemId:'frost_iron_scrap',count:2};
assert.equal(upgradeHearth(cat),null);
assert.equal(heater.level,2);
const timberBefore=countItem(cat,'driftwood');
assert.ok(dropSupply(cat));assert.equal(countItem(cat,'driftwood'),timberBefore-1);
stepWorld(cat,60);
assert.equal(countItem(cat,'driftwood'),timberBefore,'Lv.2 Latte restores exactly one floor drop');
assert.equal(cat.sky.debris.filter(isDeckDrop).length,0);
assert.ok(cat.latte.autoLootUnlocked);
cat.player.x=27.5;cat.player.y=27.5;cat.timeOfDay=.82;stepWorld(cat,90);
assert.ok(dropSupply(cat));stepWorld(cat,60);
assert.ok(cat.sky.debris.find(isDeckDrop),'Lv.2 Latte cannot pick up outside its warm zone');
assert.equal(primaryHearth(deserializeWorld(serializeWorld(cat)))!.level,2);
console.log('[sim-smoke:M1] OK: 4 Hz, day/dusk/night/whiteout, wall, exposure/HP, fuel, portraits and cat warm-zone pickup');
