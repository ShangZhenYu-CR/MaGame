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
import { build, countItem, craftTorch, isDeck, fitsOnDeck, hasBuildingContact } from '../src/sim/ark';
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

// M2: research, loaded footprints, production, automation, and persistent undo.
import { buildIssue, buildingAt, inventoryChange } from '../src/sim/ark';
import { collectIndustry, dismantle, efficiencyAt, industryPanel, pendingDismantle, startIndustry,
  stepIndustry, techOptions, undoDismantle, unlockTech } from '../src/sim/industry';
import { getIndustrySave } from '../src/sim/m2-state';
const m2=createInitialWorld();
const grant=(w:typeof m2,itemId:string,count:number)=>assert.ok(inventoryChange(w,[],[{itemId,count}]));
const go=(w:typeof m2,x:number,y:number)=>{w.player.x=x;w.player.y=y;};
const frost=(w:typeof m2,b:{gx:number;gy:number},t:number)=>{w.ark.heatGrid[b.gy*w.ark.size+b.gx]=t;};
const pulseIndustry=(w:typeof m2,n:number)=>{for(let i=0;i<n;i++)stepIndustry(w);};
assert.equal(m2.ark.buoyancyUsed,50);
assert.equal(m2.ark.buoyancyMax,64);
assert.equal(getIndustrySave(deserializeWorld(serializeWorld(m2))),undefined,'legacy save loads without M2 metadata');
assert.match(buildIssue(m2,'furnace',22,24)!,/研究/);
assert.match(unlockTech(m2,'tier2_automation')!,/木工台/);
assert.ok(build(m2,'workbench',23,25));
assert.equal(m2.ark.buoyancyUsed,51);
go(m2,24.5,25.5);
assert.equal(unlockTech(m2,'tier2_automation'),null);
assert.equal(techOptions(m2).find(t=>t.id==='tier2_automation')!.unlocked,true);
assert.match(unlockTech(m2,'tier3_fortress')!,/霜铁锭/);
for(const id of ['coal_chunk','ice_shard'])assert.ok(m2.sky.debris.some(d=>d.loot.some(s=>s.itemId===id)));
grant(m2,'frost_iron_scrap',12);grant(m2,'coal_chunk',9);grant(m2,'rope',14);grant(m2,'driftwood',20);
assert.ok(build(m2,'furnace',23,26));
const m2Furnace=buildingAt(m2,23,26)!,m2Recipe='smelt_frost_iron';
go(m2,24.5,26.5);
const beforeScrap=countItem(m2,'frost_iron_scrap');
frost(m2,m2Furnace,-23);
assert.equal(efficiencyAt(m2,m2Furnace),0);
assert.match(startIndustry(m2,m2Furnace.id,m2Recipe)!,/结冻/);
assert.equal(countItem(m2,'frost_iron_scrap'),beforeScrap);
frost(m2,m2Furnace,20);
assert.equal(startIndustry(m2,m2Furnace.id,m2Recipe),null);
assert.match(startIndustry(m2,m2Furnace.id,m2Recipe)!,/上一批/);
assert.equal(countItem(m2,'frost_iron_scrap'),beforeScrap-2);
frost(m2,m2Furnace,-1);
assert.equal(efficiencyAt(m2,m2Furnace),.4);
pulseIndustry(m2,75);
assert.ok(Math.abs(industryPanel(m2,m2Furnace.id)!.job!.progress-1)<.00001,'subzero progress is exactly 40%');
frost(m2,m2Furnace,-25);pulseIndustry(m2,30);
assert.ok(Math.abs(industryPanel(m2,m2Furnace.id)!.job!.progress-1)<.00001,'frozen job makes no progress');
assert.deepEqual(deserializeWorld(serializeWorld(m2)),m2,'in-flight jobs survive save and reload');
frost(m2,m2Furnace,20);pulseIndustry(m2,210);
assert.deepEqual(industryPanel(m2,m2Furnace.id)!.output,[{itemId:'frost_iron_ingot',count:1}]);
assert.equal(collectIndustry(m2,m2Furnace.id),null);
assert.equal(countItem(m2,'frost_iron_ingot'),1);
assert.notEqual(collectIndustry(m2,m2Furnace.id),null);
grant(m2,'ice_shard',14);grant(m2,'frost_iron_ingot',10);grant(m2,'warm_fur',4);grant(m2,'raw_root',2);
assert.equal(unlockTech(m2,'tier3_fortress'),null);
assert.equal(countItem(m2,'frost_iron_ingot'),10);
assert.ok(build(m2,'buoyancy_core',22,26));
assert.equal(m2.ark.buoyancyMax,96);
assert.ok(build(m2,'iron_deck',22,27));
assert.equal(m2.ark.decks[27*m2.ark.size+22],2);
assert.ok(build(m2,'heat_relay',27,26));
assert.ok(build(m2,'stove',25,25));
assert.ok(build(m2,'warm_wall',26,27));
assert.ok(build(m2,'greenhouse',26,21));
assert.equal(buildingAt(m2,27,22)?.defId,'greenhouse','greenhouse occupies 2×2');
const plant=buildingAt(m2,27,22)!;
go(m2,25.5,22);
for(let y=21;y<23;y++)for(let x=26;x<28;x++)frost(m2,{gx:x,gy:y},18);
assert.equal(startIndustry(m2,plant.id,'grow_roots'),null);
pulseIndustry(m2,720);
assert.equal(collectIndustry(m2,plant.id),null);
assert.equal(countItem(m2,'raw_root'),4);
assert.equal(startIndustry(m2,plant.id,'grow_roots'),null);
frost(m2,{gx:27,gy:22},-26);pulseIndustry(m2,899);
assert.ok(industryPanel(m2,plant.id)?.job,'short deep freeze pauses planting');
stepIndustry(m2);
assert.equal(industryPanel(m2,plant.id)?.job,null,'sustained deep freeze kills the crop');
assert.notEqual(collectIndustry(m2,plant.id),null);
const cook=buildingAt(m2,25,25)!;
go(m2,24.5,25.5);frost(m2,cook,18);
assert.equal(startIndustry(m2,cook.id,'cook_baked_root'),null);
pulseIndustry(m2,52);
const cooking=industryPanel(m2,cook.id)!.job,woodAtCook=countItem(m2,'driftwood');
assert.equal(dismantle(m2,cook.gx,cook.gy),null);
assert.equal(buildingAt(m2,cook.gx,cook.gy),undefined);
const reloadCooking=deserializeWorld(serializeWorld(m2));
assert.equal(undoDismantle(reloadCooking),null);
assert.deepEqual(industryPanel(reloadCooking,cook.id)!.job,cooking,'undo restores exact station job');
assert.equal(countItem(reloadCooking,'driftwood'),woodAtCook,'station undo cannot duplicate build costs');
pulseIndustry(reloadCooking,150);
assert.equal(collectIndustry(reloadCooking,cook.id),null);
assert.equal(countItem(reloadCooking,'baked_root'),2);

const heatTest=m1create(), unheated=m1create();
go(heatTest,24.5,27.5);grant(heatTest,'frost_iron_ingot',2);grant(heatTest,'coal_chunk',2);
heatTest.unlockedTech.push('tier2_automation');
assert.ok(build(heatTest,'heat_relay',27,24));
stepWorld(heatTest,330);stepWorld(unheated,330);
assert.ok(heatAt(heatTest,27.5,25.5)>heatAt(unheated,27.5,25.5)+5,'relay extends viable warmth');

const network=createInitialWorld();
grant(network,'rope',15);grant(network,'frost_iron_ingot',2);grant(network,'driftwood',20);
network.unlockedTech.push('tier2_automation');
assert.match(buildIssue(network,'catch_net',22,23)!,/外侧/);
assert.ok(build(network,'catch_net',21,24));
assert.ok(build(network,'sorter_arm',22,24));
const net=buildingAt(network,21,24)!,arm=buildingAt(network,22,24)!;
frost(network,net,18);frost(network,arm,18);
network.sky.debris.push({id:'fixture_net',x:20.1,y:24.2,vx:0,vy:0,loot:[{itemId:'warm_fur',count:2}]});
pulseIndustry(network,60);
assert.ok(!network.sky.debris.some(d=>d.id==='fixture_net'));
go(network,23.5,25);
assert.deepEqual(industryPanel(network,arm.id)!.output,[{itemId:'warm_fur',count:2}]);
assert.equal(countItem(network,'warm_fur'),0,'arm stores without teleporting to bag');
assert.equal(collectIndustry(network,arm.id),null);
assert.equal(countItem(network,'warm_fur'),2);
assert.notEqual(collectIndustry(network,arm.id),null,'collected goods cannot be duplicated');
const movingNetwork=createInitialWorld();
grant(movingNetwork,'rope',10);movingNetwork.unlockedTech.push('tier2_automation');
assert.ok(build(movingNetwork,'catch_net',21,26));
const streamNet=buildingAt(movingNetwork,21,26)!;
stepWorld(movingNetwork,420);
go(movingNetwork,22.5,26.5);
assert.ok(industryPanel(movingNetwork,streamNet.id)!.intake.some(s=>s.itemId==='driftwood'),
  'natural opening crate can be caught without fixture or hook');

const demo=createInitialWorld();
const corePos={x:23,y:26};
demo.unlockedTech.push('tier2_automation');
grant(demo,'frost_iron_ingot',3);grant(demo,'ice_shard',4);grant(demo,'driftwood',60);
const max=demo.ark.buoyancyMax;
assert.ok(build(demo,'buoyancy_core',corePos.x,corePos.y));
for(let x=28;x<43;x++)assert.ok(build(demo,'wood_deck',x,26));
assert.match(dismantle(demo,corePos.x,corePos.y)!,/超载/);
assert.match(dismantle(demo,33,26)!,/拆断/);
assert.match(dismantle(demo,24,24)!,/不可拆除/);
const beforeDemolition=countItem(demo,'driftwood');
assert.equal(dismantle(demo,42,26),null);
assert.equal(isDeck(demo,42,26),false,'removes immediately');
assert.equal(pendingDismantle(demo)?.remainingSeconds,4);
assert.equal(countItem(demo,'driftwood'),beforeDemolition,'materials remain in escrow');
assert.match(buildIssue(demo,'wood_deck',42,26)!,/撤销/);
const afterReload=deserializeWorld(serializeWorld(demo));
assert.equal(undoDismantle(afterReload),null);
assert.equal(isDeck(afterReload,42,26),true,'pending demolition survives import and undo');
assert.equal(countItem(afterReload,'driftwood'),beforeDemolition,'undo cannot duplicate materials');
stepWorld(demo,119);
assert.ok(pendingDismantle(demo));
stepWorld(demo,1);
assert.equal(pendingDismantle(demo),null);
assert.equal(countItem(demo,'driftwood'),beforeDemolition+2,'single refund at exactly four seconds');
stepWorld(demo,120);
assert.equal(countItem(demo,'driftwood'),beforeDemolition+2);
assert.equal(dismantle(demo,41,26),null);stepWorld(demo,120);
assert.equal(dismantle(demo,40,26),null);stepWorld(demo,120);
assert.equal(dismantle(demo,corePos.x,corePos.y),null);
assert.equal(demo.ark.buoyancyMax,max);
assert.equal(undoDismantle(demo),null);
assert.equal(demo.ark.buoyancyMax,max+32);
const crowded=createInitialWorld();
crowded.player.inventory=crowded.player.inventory.map(()=>({itemId:'rope',count:99}));
assert.equal(dismantle(crowded,21,21),null);
const beforeWalk=crowded.player.x;
stepWorld(crowded,4,{x:1,y:0});
assert.ok(crowded.player.x>beforeWalk,'undo timer does not interrupt walking');
stepWorld(crowded,116);
assert.ok(crowded.sky.debris.some(d=>isDeckDrop(d)&&d.loot.some(s=>s.itemId==='driftwood'&&s.count===2)),
  'full bag moves refund to recoverable floor drop');
const corrupt=JSON.parse(serializeWorld(network));
corrupt.industryM2.stations[arm.id].job={recipeId:m2Recipe,progress:0,duration:100,cold:0};
assert.throws(()=>deserializeWorld(JSON.stringify(corrupt)),/M2 设备/);
console.log('[sim-smoke:M2] OK: gates, buoyancy, footprints, heat network, jobs, greenhouse freeze, net→sorter, 4s undo and save migration');

// M3: sailing, physical dock interactions, seamless collision, seeded maps
// and sparse resource persistence. The starter dock is reached by sailing.
import { DISCOVERY_RADIUS, helmPoint, navigationPanel, nearHelm, seedIslands, setDestination, toggleCruise } from '../src/sim/sky-map';
import { areaAt, consumeIslandNode, dockedIsland, gangwayGeometry, islandNodes, islandNodeRemaining,
  nearGangway, nearestIslandNode, toggleGangway } from '../src/sim/island';
import { getNavigation } from '../src/sim/m3-state';

const m3=createInitialWorld(202608);
const nav0=navigationPanel(m3);
assert.deepEqual(seedIslands(202608),seedIslands(202608),'node seeds are independent of loot RNG');
assert.notDeepEqual(seedIslands(202608),seedIslands(202609),'different seeds change geography');
assert.deepEqual(nav0.islands.map(n=>n.tier),[1,1,2,2]);
assert.ok(nav0.islands.some(n=>n.discovered&&n.distance<DISCOVERY_RADIUS));
assert.ok(nav0.islands.some(n=>!n.discovered&&n.tier===2));
assert.equal(m3.ark.buoyancyUsed,50,'helm does not change hull mass');
assert.equal(nearHelm(m3),false);
assert.match(toggleCruise(m3)!,/靠近舵轮/);
assert.match(setDestination(m3,'unknown_signal')!,/没有/);
go(m3,helmPoint(m3).x,helmPoint(m3).y);
assert.equal(nearHelm(m3),true);
assert.equal(toggleCruise(m3),null);
assert.ok(m3.sky.cruising);
assert.equal(navigationPanel(m3).targetId,'shallows_lantern');
stepWorld(m3,30);
assert.ok(m3.sky.x>.8&&m3.sky.x<1);
assert.ok(m3.sky.headingX>.99);
assert.equal(toggleCruise(m3),null,'E at helm pauses real movement');
const paused=[m3.sky.x,m3.sky.y];
stepWorld(m3,30);
assert.deepEqual([m3.sky.x,m3.sky.y],paused);
assert.equal(toggleCruise(m3),null);
for(let n=0;n<250&&m3.sky.cruising;n++)stepWorld(m3);
assert.equal(m3.ark.anchoredIslandId,'shallows_lantern','reaches first island by sailing');
assert.equal(m3.sky.cruising,false);
assert.equal(m3.sky.x,m3.sky.islands[0].skyX);
assert.match(toggleGangway(m3)!,/走到右舷/);
const berth=gangwayGeometry(m3)!;
assert.deepEqual(berth,{x:28,y:24,width:3,height:1,deployed:false});
const map=dockedIsland(m3)!;
assert.equal(map.size,64);
assert.equal(map.tiles.length,64*64);
assert.ok(new Set(map.tiles).size>=4);
assert.equal(m3.activeIsland,null);
go(m3,berth.x-.5,berth.y+.5);
assert.equal(nearGangway(m3),true);
stepWorld(m3,45,{x:1,y:0});
assert.ok(m3.player.x<berth.x,'folded gangway does not permit jumping into open sky');
assert.equal(toggleGangway(m3),null);
assert.equal(gangwayGeometry(m3)?.deployed,true);
const startX=m3.player.x;
stepWorld(m3,18,{x:1,y:0});
assert.equal(areaAt(m3,m3.player.x,m3.player.y),'gangway');
assert.ok(m3.player.x-startX<2,'boarding crosses physically without teleport');
assert.equal(m3.activeIsland,null);
assert.equal(startCharge(m3,{x:25,y:23}),false,'cannot grapple while crossing');
const bridgeReload=deserializeWorld(serializeWorld(m3));
assert.equal(areaAt(bridgeReload,bridgeReload.player.x,bridgeReload.player.y),'gangway');
const railY=m3.player.y;
stepWorld(m3,24,{x:0,y:1});
assert.ok(m3.player.y<berth.y+.82&&m3.player.y>=railY,'gangway protects both edges');
stepWorld(m3,28,{x:1,y:0});
assert.equal(areaAt(m3,m3.player.x,m3.player.y),'island');
const activeIslandNode=(w:typeof m3)=>w.activeIsland?.nodeId;
assert.equal(activeIslandNode(m3),'shallows_lantern');
assert.equal(heatAt(m3,m3.player.x,m3.player.y),m3.ambientTemp-2);
const warmBefore=m3.player.warmth;
stepWorld(m3,90);
assert.ok(m3.player.warmth<warmBefore,'shore cold uses authoritative player survival');
assert.match(buildIssue(m3,'wood_deck',28,27)!,/返回方舟/);
const tree=islandNodes(m3).find(n=>n.kind==='tree')!;
assert.ok(tree&&islandNodes(m3).some(n=>n.kind==='ore')&&islandNodes(m3).some(n=>n.kind==='chest'));
assert.equal(consumeIslandNode(m3,tree),false,'resources cannot change remotely');
while(m3.player.x<tree.x-.7)stepWorld(m3,1,{x:1,y:0});
const target=nearestIslandNode(m3);
assert.equal(target?.id,tree.id);
assert.equal(consumeIslandNode(m3,tree,tree.count),true);
assert.equal(islandNodeRemaining(m3,tree),0);
assert.equal(consumeIslandNode(m3,tree),false);
const chest=islandNodes(m3).find(n=>n.kind==='chest')!;
assert.equal(chest.loot.length,3,'ruin chest has fixed seed loot entries');
m3.player.y=berth.y+.5;
const onLand=serializeWorld(m3);
assert.equal(Object.hasOwn(JSON.parse(onLand).activeIsland,'tiles'),false,'save stores a generated map reference, not 4096 tiles');
const islandReload=deserializeWorld(onLand);
assert.deepEqual(islandReload.activeIsland,m3.activeIsland,'reconstructed onshore island preserves terrain');
assert.equal(islandNodeRemaining(islandReload,tree),0);
for(let i=0;i<180&&areaAt(m3,m3.player.x,m3.player.y)!=='ark';i++)stepWorld(m3,1,{x:-1,y:0});
assert.equal(areaAt(m3,m3.player.x,m3.player.y),'ark');
assert.equal(m3.activeIsland,null);
assert.equal(toggleGangway(m3),null,'folds gangway after returning to berth');
const sparse=JSON.parse(serializeWorld(m3));
assert.equal(sparse.activeIsland,null);
assert.deepEqual(sparse.sky.islands[0].deltas,{[tree.key]:tree.count});
go(m3,helmPoint(m3).x,helmPoint(m3).y);
assert.equal(setDestination(m3,'frostpine_cove'),null);
assert.equal(toggleCruise(m3),null);
for(let n=0;n<800&&m3.sky.cruising;n++)stepWorld(m3);
assert.equal(m3.ark.anchoredIslandId,'frostpine_cove');
assert.equal(m3.sky.islands.find(n=>n.id==='frostpine_cove')?.discovered,true);
const north=dockedIsland(m3)!;
assert.equal(north.biomeId,'frostpine_isles');
assert.notDeepEqual(north.tiles,map.tiles);
go(m3,helmPoint(m3).x,helmPoint(m3).y);
assert.equal(setDestination(m3,'shallows_lantern'),null);
assert.equal(toggleCruise(m3),null);
for(let n=0;n<800&&m3.sky.cruising;n++)stepWorld(m3);
assert.equal(m3.ark.anchoredIslandId,'shallows_lantern');
assert.deepEqual(dockedIsland(m3)?.tiles,map.tiles,'revisiting returns to same seeded island');
assert.equal(islandNodeRemaining(m3,tree),0,'harvested resource stays depleted after departure and return');

const m2Import=JSON.parse(serializeWorld(createInitialWorld()));
delete m2Import.navigationM3;m2Import.sky.islands=[];
const migrated=deserializeWorld(JSON.stringify(m2Import));
assert.equal(migrated.sky.islands.length,4);
assert.equal(getNavigation(migrated)?.dock,null);
const tampered=JSON.parse(onLand);
tampered.sky.islands[0].deltas[tree.key]=tree.count+1;
assert.throws(()=>deserializeWorld(JSON.stringify(tampered)),/航图/);
console.log('[sim-smoke:M3] OK: cruising, discovery, deployment, border-safe boarding, cold, seeded terrain, sparse depletion and pre-M3 archive migration');

import { damagePlayer, rescueShield, RESCUE_SHIELD_TICKS, RESCUE_TICKS } from '../src/sim/rescue';
import { harvestIslandResource } from '../src/sim/tools';
import { SAVE_VERSION } from '../src/sim/types';

// P2-01: start from an ordinary on-island save with full health and exhaust
// warmth through the same per-tick cold solver used in the actual game.
const rescueTrip=deserializeWorld(onLand);
rescueTrip.player.hp=rescueTrip.player.maxHp;
rescueTrip.player.warmth=rescueTrip.player.maxWarmth;
rescueTrip.player.inventory[6]={itemId:'wood_axe',count:1,durability:5};
for(let i=0;i<6000&&rescueTrip.player.hp>0;i++)stepWorld(rescueTrip);
assert.equal(rescueTrip.player.hp,0,'standing in island cold naturally reaches zero life');
assert.equal(rescueTrip.player.rescue.startedAt,rescueTrip.tick);
assert.equal(rescueTrip.player.grapple.active,false);
const lyingAt={x:rescueTrip.player.x,y:rescueTrip.player.y}, inventoryAtFall=JSON.stringify(rescueTrip.player.inventory);
stepWorld(rescueTrip,30,{x:1,y:0});
assert.deepEqual({x:rescueTrip.player.x,y:rescueTrip.player.y},lyingAt,'movement keys do not move an unconscious player');
assert.equal(harvestIslandResource(rescueTrip,tree).ok,false);
assert.equal(JSON.stringify(rescueTrip.player.inventory),inventoryAtFall,'cannot gather or spend supplies before rescue');
const carried=deserializeWorld(serializeWorld(rescueTrip));
assert.deepEqual(carried.player.rescue,rescueTrip.player.rescue,'mid-rescue save keeps timer');
stepWorld(carried,RESCUE_TICKS-30);
assert.equal(carried.activeIsland,null);
assert.equal(areaAt(carried,carried.player.x,carried.player.y),'ark');
assert.ok(carried.player.hp>0&&carried.player.warmth>0);
assert.equal(carried.player.inventory[6]?.durability,4);
assert.equal(rescueShield(carried),RESCUE_SHIELD_TICKS);
assert.equal(damagePlayer(carried,100),false,'recovery guard prevents all damage');
stepWorld(carried,RESCUE_SHIELD_TICKS-1);
assert.equal(damagePlayer(carried,100),false);
stepWorld(carried,1);
assert.equal(damagePlayer(carried,10),true,'protection ends after exactly ten seconds');
const preP2=JSON.parse(serializeWorld(createInitialWorld()));
preP2.saveVersion=1;delete preP2.player.rescue;
const migratedP2=deserializeWorld(JSON.stringify(preP2));
assert.equal(migratedP2.saveVersion,SAVE_VERSION);
assert.deepEqual(migratedP2.player.rescue,{startedAt:null,shieldUntil:0});
migratedP2.player.hp=0;migratedP2.ark.buildings[0].fuel=0;
stepWorld(migratedP2,RESCUE_TICKS+1);
assert.ok(migratedP2.player.hp>0&&migratedP2.ark.buildings[0].fuel===14,'old zero-HP save recovers even with an empty stove');
console.log('[sim-smoke:P2-01] OK: natural cold unconsciousness, input lock, archive migration, rescue penalty and 10s shield');

import { cookedMeals, eatMeal, mealRemaining, quickMeal, stepHunger, type MealId } from '../src/sim/food';

// P2-02: every cooked dish is food as well as bait; use must consume exactly
// one item and apply immediate recovery on the same authoritative state.
for(const id of Object.keys(cookedMeals) as MealId[]){
  const diner=createInitialWorld();
  Object.assign(diner.player,{hunger:31,warmth:39,hp:37});
  diner.player.inventory[3]={itemId:id,count:2};
  assert.equal(eatMeal(diner,id),null);
  assert.equal(countItem(diner,id),1);
  assert.ok(diner.player.hunger>31&&diner.player.warmth>39&&diner.player.hp>37);
  assert.equal(diner.player.diet.last,id);
  assert.equal(mealRemaining(diner),cookedMeals[id].seconds*30);
}
const feast=deserializeWorld(onLand), coldControl=deserializeWorld(onLand);
for(const trip of [feast,coldControl])Object.assign(trip.player,{hunger:42,warmth:43,hp:40});
feast.player.inventory[4]={itemId:'warm_berry_soup',count:1};
feast.player.diet.quick='warm_berry_soup';
assert.equal(quickMeal(feast),'warm_berry_soup');
assert.equal(eatMeal(feast,'warm_berry_soup'),null);
assert.equal(countItem(feast,'warm_berry_soup'),0);
assert.match(eatMeal(feast,'warm_berry_soup')!,/没有/);
const protectedStart=feast.player.warmth,unprotectedStart=coldControl.player.warmth;
stepWorld(feast,90);stepWorld(coldControl,90);
assert.ok(protectedStart-feast.player.warmth<(unprotectedStart-coldControl.player.warmth)*.6);
assert.deepEqual(deserializeWorld(serializeWorld(feast)).player.diet,feast.player.diet);
const sated=createInitialWorld(), hungry=createInitialWorld();
hungry.player.hunger=0;
stepWorld(sated,10,{x:1,y:0});stepWorld(hungry,10,{x:1,y:0});
assert.ok(sated.player.x-hungry.player.x>.2,'starvation slows movement');
stepWorld(hungry,20);
assert.ok(hungry.player.hp<100,'starvation damages the player');
const safeMeal=createInitialWorld(), coldMeal=deserializeWorld(onLand), battleMeal=deserializeWorld(onLand);
for(const z of [safeMeal,coldMeal,battleMeal]){z.tick=30;z.player.hunger=100;}
battleMeal.wildEntities.push({id:'test-battle',defId:'frost_wolf',kind:'raider',x:battleMeal.player.x,y:battleMeal.player.y,
  hp:30,maxHp:30,stunnedTicks:0,tameProgress:0,hostile:true});
for(const z of [safeMeal,coldMeal,battleMeal])stepHunger(z);
assert.ok(safeMeal.player.hunger>coldMeal.player.hunger&&coldMeal.player.hunger>battleMeal.player.hunger);
const beforeFood=JSON.parse(serializeWorld(createInitialWorld()));
beforeFood.saveVersion=2;delete beforeFood.player.diet;
assert.deepEqual(deserializeWorld(JSON.stringify(beforeFood)).player.diet,{warmUntil:0,last:null,quick:null});
console.log('[sim-smoke:P2-02] OK: seven edible meals, no free food, real warmth resistance, hunger drain and v2 migration');

import { BASIC_GRAPPLE, craftGrapple, FROST_GRAPPLE } from '../src/sim/grapple-tools';
import { aimEnd,grappleRange,stepCloud } from '../src/sim/cloud';

// P2-03: a hookless legacy archive has a playable route back to its tool.
const hitch=createInitialWorld();hitch.player.inventory[0]=null;
hitch.player.inventory[3]={itemId:'frost_iron_scrap',count:2};
hitch.player.inventory[4]={itemId:'rope',count:7};
hitch.player.inventory[5]={itemId:'frost_iron_ingot',count:2};
assert.equal(craftGrapple(hitch,1),null);
assert.equal(countItem(hitch,BASIC_GRAPPLE),1);
assert.equal(countItem(hitch,'frost_iron_scrap'),0);
const starterLine=deserializeWorld(serializeWorld(hitch));
assert.equal(craftGrapple(hitch,2),null);
assert.equal(countItem(hitch,BASIC_GRAPPLE),0);
assert.equal(countItem(hitch,FROST_GRAPPLE),1);
assert.equal(countItem(hitch,'frost_iron_ingot'),0);
assert.match(craftGrapple(hitch,1)!,/已有/);
assert.equal(grappleRange(1,true)/grappleRange(1),1.35);
for(const line of [hitch,starterLine]){
  const p=line.player, x=p.x-10.3,y=p.y;
  line.tick=1;line.sky.debris=[{id:'heavy_test',x,y,vx:0,vy:0,heavy:true,loot:[{itemId:'frost_iron_scrap',count:5}]}];
  assert.ok(startCharge(line,{x:p.x-14,y}));
  for(let n=0;n<18;n++)stepCloud(line);
  const boosted=line===hitch;
  assert.ok(boosted?p.grapple.charge===1:p.grapple.charge<1);
  for(let n=0;n<7;n++)stepCloud(line);
  const aimed=aimEnd(line,{x:p.x-14,y});
  assert.ok(Math.abs((p.x-aimed.x)-(boosted?12.15:9))<1e-7);
  fire(line);
  for(let n=0;n<85;n++)stepCloud(line);
  assert.equal(countItem(line,'frost_iron_scrap'),boosted?5:0);
  assert.equal(line.sky.debris.length,boosted?0:1);
}
assert.equal(countItem(deserializeWorld(serializeWorld(hitch)),FROST_GRAPPLE),1);
const closeHeavy=deserializeWorld(serializeWorld(starterLine));
closeHeavy.sky.debris[0].x=closeHeavy.player.x-5;
assert.ok(startCharge(closeHeavy,{x:closeHeavy.player.x-8,y:closeHeavy.player.y}));
for(let n=0;n<25;n++)stepCloud(closeHeavy);
fire(closeHeavy);for(let n=0;n<50;n++)stepCloud(closeHeavy);
assert.equal(closeHeavy.sky.debris.length,1,'plain hook cannot snag a heavy crate even when in range');
const v3Hook=JSON.parse(serializeWorld(createInitialWorld()));v3Hook.saveVersion=3;
assert.equal(deserializeWorld(JSON.stringify(v3Hook)).saveVersion,SAVE_VERSION);
console.log('[sim-smoke:P2-03] OK: basic recovery, reinforced recipe, 35% longer aim, faster charging, heavy cargo gate and archive migration');

import { contourHull, HULL_EAST, HULL_NORTH, HULL_SOUTH, HULL_WEST } from '../src/sim/hull';

// P2-04: outer fittings come from the entire deck footprint, not the visible
// camera crop. Side tips and inner notches never receive splashy icicles.
const hullMap=createInitialWorld().ark;
const idx=(x:number,y:number)=>y*hullMap.size+x;
const originalHull=contourHull(hullMap);
assert.equal(originalHull.cones.reduce((n,x)=>n+x,0),7);
const lend=(tiles:number[][])=>{for(const [x,y] of tiles)hullMap.decks[idx(x,y)]=1;return contourHull(hullMap);};
const sideStep=lend([[20,24]]);
assert.equal(sideStep.edges[idx(20,24)],HULL_NORTH|HULL_SOUTH|HULL_WEST);
assert.equal(sideStep.edges[idx(21,24)]&HULL_WEST,0);
assert.equal(sideStep.cones[idx(20,24)],0);
assert.equal(sideStep.corners.filter(a=>a.inside).length,2);
assert.equal(sideStep.cones.reduce((n,x)=>n+x,0),7);
const arms=lend([[19,24],[28,24],[29,24],[24,20],[24,28],[24,29],[25,28],[23,29]]);
assert.equal(arms.edges[idx(29,24)],HULL_EAST|HULL_NORTH|HULL_SOUTH);
assert.equal(arms.cones[idx(29,24)],0);
assert.equal(arms.cones[idx(24,29)],1,'a supported southern extension gets the full floating edge');
assert.equal(arms.cones[idx(25,28)],1);
assert.equal(arms.cones[idx(23,27)],0,'a mouth with deck below is not the southern profile');
assert.equal(arms.cones[idx(23,29)],0,'the unsupported tip beside a deep arm remains thin');
assert.ok(arms.corners.filter(x=>x.inside).length>=7);
hullMap.decks[idx(22,22)]=0;
const hole=contourHull(hullMap);
assert.equal(hole.edges[idx(22,21)]&HULL_SOUTH,HULL_SOUTH);
assert.equal(hole.cones[idx(22,21)],0);
assert.ok(hole.corners.filter(x=>x.inside&&x.x>=22&&x.x<=23&&x.y>=22&&x.y<=23).length===4);
console.log('[sim-smoke:P2-04] OK: exposed edge masks, side tips, stepped south profile, concave corners and holes');

import { advanceClimate, emitters } from '../src/sim/heatField';
import { repairTool } from '../src/sim/tools';

// P2-05: two separate powered hearth upgrades, +24 flotation, stronger
// warmth emission and reduced fuel demand during the exact same whiteout.
const pressure=createInitialWorld();
Object.assign(pressure.player,{x:24.5,y:25.35});
pressure.player.inventory[3]={itemId:'frost_iron_scrap',count:2};
pressure.player.inventory[4]={itemId:'frost_iron_ingot',count:2};
pressure.player.inventory[5]={itemId:'sulfur_ore',count:2};
assert.equal(upgradeHearth(pressure),null);
assert.equal(primaryHearth(pressure)?.level,2);
const beforePressure=deserializeWorld(serializeWorld(pressure));
const warmRadius=emitters(beforePressure).find(q=>q.kind==='hearth_core')!.radius;
const priorCapacity=pressure.ark.buoyancyMax;
assert.equal(upgradeHearth(pressure),null);
assert.equal(primaryHearth(pressure)?.level,3);
assert.equal(pressure.ark.buoyancyMax,priorCapacity+24);
assert.equal(countItem(pressure,'frost_iron_ingot'),0);
assert.equal(countItem(pressure,'sulfur_ore'),0);
assert.ok(emitters(pressure).find(q=>q.kind==='hearth_core')!.radius>warmRadius);
for(const model of [pressure,beforePressure]){model.day=5;model.timeOfDay=.80;advanceClimate(model);assert.equal(model.weather,'whiteout');}
assert.ok(primaryHearth(pressure)!.fuel>primaryHearth(beforePressure)!.fuel);
const lastVersion=JSON.parse(serializeWorld(createInitialWorld()));
lastVersion.saveVersion=4;lastVersion.sky.islands[0].deltas.tree_1997=3;
const switchover=deserializeWorld(JSON.stringify(lastVersion));
assert.equal(switchover.sky.islands[0].deltas.tree_1997,4,'old fully-collected grove stays empty');
switchover.player.inventory[4]={itemId:'mining_pick',count:1,durability:0};
switchover.player.inventory[5]={itemId:'ice_shard',count:2};
assert.equal(repairTool(switchover,'mining_pick').ok,true,'shortage-safe starter pick sharpening');
assert.equal(countItem(switchover,'ice_shard'),0);
console.log('[sim-smoke:P2-05] OK: separate Lv.3, coal efficiency in whiteout, greater reach, +24 flotation and resource migration');

import { craftGear, equipGear, equipment, equipmentCost, gearModifiers } from '../src/sim/equipment';

// P2-06: exercise all six real recipes, ownership and each independent slot.
const tailor=createInitialWorld();
const materials=new Map<string,number>();
for(const d of equipment)for(const m of equipmentCost(d.id))materials.set(m.itemId,(materials.get(m.itemId)??0)+m.count);
let materialSlot=3;
for(const [itemId,count] of materials)tailor.player.inventory[materialSlot++]={itemId,count};
for(const d of equipment){
  assert.match(equipGear(tailor,d.id)!,/没有/);
  assert.equal(craftGear(tailor,d.id),null);
  assert.equal(countItem(tailor,d.id),1);
  assert.equal(equipGear(tailor,d.id),null);
  assert.equal(tailor.player.gear[d.slot],d.id);
}
assert.equal(tailor.player.gear.outer,'aurora_mithril_cloak');
assert.equal(tailor.player.gear.guard,'frost_scale_armor');
assert.equal(tailor.player.gear.charm,'magnetic_salvage_buckle');
assert.equal(gearModifiers(tailor).hookRadius,.17);
assert.deepEqual(deserializeWorld(serializeWorld(tailor)).player.gear,tailor.player.gear);
assert.equal(equipGear(tailor,'pocket_hand_warmer'),null);
assert.equal(gearModifiers(tailor).personalHeat,6);
assert.equal(equipGear(tailor,'pocket_hand_warmer'),null,'equipping the same piece takes it off');
assert.equal(gearModifiers(tailor).personalHeat,0);
const weatherTry=createInitialWorld(),jacketTry=createInitialWorld();
for(const g of [weatherTry,jacketTry]){
  g.timeOfDay=.80;g.player.x=27.5;g.player.y=27.5;g.ark.buildings[0].fuel=0;
}
jacketTry.player.inventory[4]={itemId:'warm_wind_coat',count:1};
equipGear(jacketTry,'warm_wind_coat');
stepWorld(weatherTry,125);stepWorld(jacketTry,125);
assert.equal(jacketTry.ambientTemp,-22);
assert.ok(jacketTry.player.warmth-weatherTry.player.warmth>7,'a warm coat buys time under the same -22°C conditions');
for(const g of [weatherTry,jacketTry])damagePlayer(g,20);
assert.ok(jacketTry.player.hp-weatherTry.player.hp>1,'guard modifier is applied to damage, not only on the card');
const v5Gear=JSON.parse(serializeWorld(createInitialWorld()));v5Gear.saveVersion=5;delete v5Gear.player.gear;
assert.deepEqual(deserializeWorld(JSON.stringify(v5Gear)).player.gear,{outer:null,guard:null,charm:null});
console.log('[sim-smoke:P2-06] OK: all six recipes/equips, three exclusive slots, physical reduction, cold and v5 archive');

import { chooseWeapon, craftWeapon, stepWeapons, triggerWeapon, weaponEffects, weaponRecipe, weaponShots, weaponSpecs } from '../src/sim/weapons';

// P2-07: the five hand recipes and real sim geometry produce different
// hit patterns; projectiles travel before they can deal damage.
const armory=createInitialWorld(),ammunition=new Map<string,number>();
for(const d of weaponSpecs)for(const m of weaponRecipe(d.id)!.inputs)ammunition.set(m.itemId,(ammunition.get(m.itemId)??0)+m.count);
let armorySlot=3;for(const [itemId,count] of ammunition)armory.player.inventory[armorySlot++]={itemId,count};
for(const d of weaponSpecs){
  assert.equal(craftWeapon(armory,d.id),null);assert.ok(countItem(armory,d.id)>0);
}
assert.equal(chooseWeapon(armory,'ice_repeater'),null);
assert.equal(deserializeWorld(serializeWorld(armory)).player.weapon,'ice_repeater');
for(const d of weaponSpecs){
  const trial=createInitialWorld(),p=trial.player;
  p.inventory[3]={itemId:d.id,count:d.style==='throw'?2:1};
  assert.equal(chooseWeapon(trial,d.id),null);
  // Isolated stationary lures distinguish single-target and area geometry.
  const away=d.style==='thrust'?2.3:d.style==='sweep'?1.45:d.style==='bolt'?6.25:d.style==='throw'?4.8:3.2;
  const target={id:'crafted-target',defId:'icebreaker_beast',kind:'raider' as const,x:p.x-away,y:p.y,
    hp:92,maxHp:92,stunnedTicks:0,tameProgress:0,hostile:true};
  const offset=d.style==='sweep'?.65:d.style==='throw'?1:d.style==='flame'?.66:.85;
  const neighbor={...target,id:'second-target',y:target.y+offset};
  trial.wildEntities.push(target,neighbor);
  assert.equal(triggerWeapon(trial,target),null);
  assert.match(triggerWeapon(trial,target)!,/回手/);
  if(d.speed>0){
    assert.equal(target.hp,92,'projectile requires time to travel');
    assert.equal(weaponShots(trial).length,1);
    for(let t=0;t<44;t++){trial.tick++;stepWeapons(trial);}
  }else assert.equal(weaponEffects(trial)[0].style,d.style);
  assert.equal(target.hp,92-(d.damage-Math.max(0,5-d.pierce)));
  assert.equal(neighbor.hp<92,d.style==='sweep'||d.style==='throw'||d.style==='flame');
  if(d.style==='throw')assert.equal(countItem(trial,d.id),1,'a throw consumes exactly one flask');
}
console.log('[sim-smoke:P2-07] OK: recipes, aim geometry, projectile travel, penetration, sweep and ammunition');
const unarmedLegacy=JSON.parse(serializeWorld(createInitialWorld()));unarmedLegacy.saveVersion=6;
delete unarmedLegacy.player.weapon;delete unarmedLegacy.player.weaponReadyTick;
assert.equal(deserializeWorld(JSON.stringify(unarmedLegacy)).player.weapon,null);
assert.equal(deserializeWorld(JSON.stringify(unarmedLegacy)).player.weaponReadyTick,0);
const downCombat=createInitialWorld();downCombat.player.hp=0;
assert.match(triggerWeapon(downCombat,{x:27,y:25})!,/昏迷/);

import { startRoll, rolling, rollGuard, ROLL_COST, ROLL_IFRAME_TICKS, ROLL_TICKS } from '../src/sim/roll';
import { rollArena } from './p2-roll-fixture';

// P2-08: identical in-circle position, only the actual roll changes whether
// a whale hit lands. Evasive inertia remains on the original heading.
const bareRoll=rollArena(4),safeRoll=rollArena(4),rollStartX=safeRoll.player.x;
assert.equal(startRoll(safeRoll,{x:1,y:0}),null);
assert.equal(safeRoll.player.roll.stamina,100-ROLL_COST);
assert.equal(rollGuard(safeRoll),true);
assert.ok(rolling(safeRoll));
stepWorld(bareRoll,4);stepWorld(safeRoll,4,{x:-1,y:0});
assert.ok(safeRoll.player.x>rollStartX&&safeRoll.player.x-rollStartX<1.75,'inertia inside the actual impact radius');
assert.equal(bareRoll.player.hp,85);
assert.equal(safeRoll.player.hp,100,'real warning-circle hit is negated by the i-frame');
assert.equal(safeRoll.player.warmth,100);
stepWorld(safeRoll,ROLL_IFRAME_TICKS-4);
assert.equal(rollGuard(safeRoll),false);
assert.equal(damagePlayer(safeRoll,8),true,'recovery frames are not invulnerable');
stepWorld(safeRoll,ROLL_TICKS-ROLL_IFRAME_TICKS);
assert.equal(rolling(safeRoll),false);
const rollEdge=createInitialWorld();
Object.assign(rollEdge.player,{x:27.5,y:27.5});
assert.equal(startRoll(rollEdge,{x:1,y:1}),null);
const earlyRollSave=deserializeWorld(serializeWorld(rollEdge));
assert.ok(rolling(earlyRollSave));
stepWorld(earlyRollSave,ROLL_TICKS);
assert.equal(areaAt(earlyRollSave,earlyRollSave.player.x,earlyRollSave.player.y),'ark');
assert.ok(fitsOnDeck(earlyRollSave,earlyRollSave.player.x,earlyRollSave.player.y));
assert.ok(earlyRollSave.player.x<27.80&&earlyRollSave.player.y<27.80);
earlyRollSave.player.roll.stamina=ROLL_COST-1;
assert.match(startRoll(earlyRollSave,{x:1,y:0})!,/体力/);
stepWorld(earlyRollSave,95);
assert.ok(earlyRollSave.player.roll.stamina>=ROLL_COST);
const r7=JSON.parse(serializeWorld(createInitialWorld()));r7.saveVersion=7;delete r7.player.roll;
assert.equal(deserializeWorld(JSON.stringify(r7)).player.roll.stamina,100);
console.log('[sim-smoke:P2-08] OK: in-circle i-frames, directional inertia, bounded diagonal edge, stamina, active-roll archive');

import { emitJuice,takeJuice } from '../src/sim/juice';
import { JuiceView } from '../src/render/juice-view';

// P2-09: the feedback measures actual applied deltas, not nominal bonuses.
const feedbackWorld=createInitialWorld();
Object.assign(feedbackWorld.player,{hp:98,warmth:91});
feedbackWorld.player.inventory[6]={itemId:'baked_root',count:1};
assert.equal(eatMeal(feedbackWorld,'baked_root'),null);
assert.deepEqual(takeJuice(feedbackWorld).map(e=>[e.type,e.amount]),[['warmth',9],['heal',2]]);
assert.deepEqual(takeJuice(feedbackWorld),[]);
assert.ok(build(feedbackWorld,'wood_deck',28,25));
assert.equal(takeJuice(feedbackWorld)[0].type,'build');
assert.equal(build(feedbackWorld,'wood_deck',28,25),false);
assert.deepEqual(takeJuice(feedbackWorld),[],'failed action must not generate feedback');
assert.equal(damagePlayer(feedbackWorld,7),true);
assert.deepEqual(takeJuice(feedbackWorld).map(e=>[e.type,e.amount]),[['hurt',7]]);
emitJuice(feedbackWorld,'hit',feedbackWorld.player,13,{target:'whale',critical:true});
const cue=takeJuice(feedbackWorld),visible=new JuiceView();
visible.push(cue,80,true);
assert.equal(visible.freezeUntil,120,'clock pauses for precisely 40 ms');
assert.equal(visible.flash('whale',115),true);
assert.equal(visible.flash('whale',191),false);
assert.notDeepEqual(visible.shake(91),{x:0,y:0});
visible.reset();visible.push(cue,80,false);
assert.deepEqual(visible.shake(91),{x:0,y:0},'shake preference does not suppress combat numbers');
assert.equal(visible.freezeUntil,120);
assert.deepEqual(takeJuice(deserializeWorld(serializeWorld(feedbackWorld))),[],'transient screen cues are never saved');
console.log('[sim-smoke:P2-09] OK: actual deltas, no failed action cue, capped 40 ms hitstop and optional critical shake');

import { armorBroken,burnDamage,elementalSpeed,frozen,resolveElement,status,thawedDeck } from '../src/sim/elements';
import { stepM5,strikeHostileWithWeapon } from '../src/sim/m5';
const reaction=createInitialWorld();
const foe={kind:'raider' as const,id:'test_froststalker',defId:'froststalker',x:25.5,y:26.5,hp:50,maxHp:50,stunnedTicks:0,tameProgress:0,hostile:true};
reaction.wildEntities.push(foe);
assert.equal(strikeHostileWithWeapon(reaction,foe,10,0,'break'),true);
const afterBreak=foe.hp;
assert.ok(armorBroken(reaction,foe.id));
assert.equal(strikeHostileWithWeapon(reaction,foe,10,0),true);
assert.equal(foe.hp,afterBreak-10,'armor is actually bypassed while shattered');
assert.equal(resolveElement(reaction,foe.id,19,'ice').damage,19);
assert.equal(elementalSpeed(reaction,foe.id),.62);
reaction.tick++;
resolveElement(reaction,foe.id,19,'ice');
assert.ok(frozen(reaction,foe.id));
assert.equal(elementalSpeed(reaction,foe.id),0);
assert.deepEqual(resolveElement(reaction,foe.id,29,'fire'),{damage:29*1.6,critical:true});
assert.equal(frozen(reaction,foe.id),false);
assert.ok(thawedDeck(reaction)?.has(26*reaction.ark.size+25));
assert.equal(burnDamage(reaction,foe.id),false);
reaction.tick+=30;assert.equal(burnDamage(reaction,foe.id),true);
assert.equal(burnDamage(reaction,foe.id),false,'same tick cannot deal damage twice');
const statusArchive=createInitialWorld();
resolveElement(statusArchive,'test_ice',7,'ice');resolveElement(statusArchive,'test_ice',7,'ice');
assert.deepEqual(status(deserializeWorld(serializeWorld(statusArchive)),'test_ice'),status(statusArchive,'test_ice'));
console.log('[sim-smoke:P2-10] OK: slow, freeze, actual armor loss, 1.6× melt+area thaw, burn cadence and archive');

import { bindShortcut,heldTool,holdTool,shortcuts,switchShortcuts } from '../src/sim/hotbar';
import { weaponHover } from '../src/sim/weapons';
const bindings=createInitialWorld();
assert.deepEqual(shortcuts(bindings),['wood_deck','torch_post','wind_wall','@weapon','@meal','@hook','wood_axe','mining_pick',null]);
assert.equal(bindShortcut(bindings,8,'fire_oil_flask'),true);
assert.equal(bindShortcut(bindings,1,'missing_item'),false);
assert.equal(switchShortcuts(bindings,0,8),true);
bindings.player.inventory[5]={itemId:'wood_axe',count:1,durability:8};
assert.equal(holdTool(bindings,'frost_axe'),false);
assert.equal(holdTool(bindings,'wood_axe'),true);
const oldEight=JSON.parse(serializeWorld(createInitialWorld()));oldEight.saveVersion=8;
assert.equal(shortcuts(deserializeWorld(JSON.stringify(oldEight)))[0],'wood_deck');
const afterBinding=deserializeWorld(serializeWorld(bindings));
assert.equal(shortcuts(afterBinding)[0],'fire_oil_flask');
assert.equal(shortcuts(afterBinding)[8],'wood_deck');
assert.equal(heldTool(afterBinding),'wood_axe');
assert.equal(weaponHover(afterBinding,{x:5,y:2}),null);
const badHotbar=JSON.parse(serializeWorld(afterBinding));badHotbar.hotbarP2.slots=['wood_deck'];
assert.throws(()=>deserializeWorld(JSON.stringify(badHotbar)),/快捷栏/);
console.log('[sim-smoke:P2-11] OK: 1–9 defaults, selectable drag assignments, tool choice and save validation');

import { warmRoom } from './p2-room-fixture';
import { doorOpen,indoor,indoorsAt,invalidateRoomTopology,operateWindDoor,stepAirlocks } from '../src/sim/rooms';
import { solveHeat } from '../src/sim/heatField';
const {w:seal,door:manualDoor}=warmRoom();
assert.equal(indoor(seal).tiles,20);
assert.ok(indoorsAt(seal,seal.player));assert.ok(!indoorsAt(seal,{x:24.5,y:27.45}));
const roomSample=seal.ark.size*25+24,warmTemperature=seal.ark.heatGrid[roomSample];
stepWorld(seal,20,{x:0,y:1});
assert.ok(seal.player.y<26.30,'closed door must block its threshold');
assert.equal(operateWindDoor(seal,manualDoor.id),null);
assert.equal(indoor(seal).tiles,0);
for(let i=0;i<42;i++)solveHeat(seal);
assert.ok(seal.ark.heatGrid[roomSample]<warmTemperature-6,'with identical heat input unsealing must cool the same tile');
Object.assign(seal.player,{x:24.5,y:26.50});
assert.match(operateWindDoor(seal,manualDoor.id)!,/先让开/);
assert.equal(doorOpen(manualDoor),true);
assert.equal(startRoll(seal,{x:.06,y:1}),null);
stepWorld(seal,12);
assert.ok(seal.player.y>27&&fitsOnDeck(seal,seal.player.x,seal.player.y),'an open threshold is passable in a real diagonal roll');
assert.equal(operateWindDoor(seal,manualDoor.id),null);
assert.equal(indoor(seal).tiles,20);
const roomArchive=deserializeWorld(serializeWorld(seal));
assert.equal(indoor(roomArchive).tiles,20);
roomArchive.ark.decks[22*roomArchive.ark.size+22]=0;invalidateRoomTopology(roomArchive);
assert.equal(indoor(roomArchive).tiles,0,'sky notch inside hull exposes the room');
const {w:autoRoom,door:autoDoor}=warmRoom('frost_airlock');
stepAirlocks(autoRoom);assert.equal(doorOpen(autoDoor),true);
Object.assign(autoRoom.player,{x:24.52,y:23.5});autoRoom.tick+=40;
stepAirlocks(autoRoom);assert.equal(doorOpen(autoDoor),false);
assert.equal(indoor(autoRoom).tiles,20);
const activeSeal=deserializeWorld(serializeWorld(autoRoom));
assert.equal(indoor(activeSeal).tiles,20);
const defended=warmRoom('frost_airlock').w;
Object.assign(defended.player,{x:24.5,y:25.62});
stepM5(defended);
const aggressor={kind:'raider' as const,id:'test_raid_at_door',defId:'froststalker',x:24.5,y:27.4,hp:50,maxHp:50,stunnedTicks:0,tameProgress:0,hostile:true};
defended.wildEntities=[aggressor];stepWorld(defended,90);
assert.ok(aggressor.y>=27,'raider cannot follow the player through an open friendly airlock');
console.log('[sim-smoke:P2-12] OK: airtight topology, exposed hole, matched heat, open/close collision, diagonal roll, automatic door and archive');

import { logisticsArk } from './p2-logistics-fixture';
import { logisticsStats, networkStation, setLogisticsRoute, transportEvents } from '../src/sim/logistics';
const supplyNet=logisticsArk();
assert.equal(setLogisticsRoute(supplyNet.w,supplyNet.sorter,'auto'),null);
stepWorld(supplyNet.w,5400);
const trials=logisticsStats(supplyNet.w)!;
assert.ok(trials.hearthRefills>0&&trials.furnaceRefills>0&&trials.storage>0&&trials.feed>0,'both burners, storage and feed all received actual packets');
assert.ok(supplyNet.h.fuel>0&&supplyNet.furnace.fuel>0);
assert.equal(networkStation(supplyNet.w,supplyNet.furnace).output.find(s=>s.itemId==='frost_iron_ingot')?.count,3);
const fromFull=logisticsArk(true);
assert.equal(setLogisticsRoute(fromFull.w,fromFull.sorter,'storage_main'),null);
const retained=(world:typeof fromFull.w)=>{
 const station=getIndustrySave(world)?.stations??{};
 return world.sky.debris.reduce((n,d)=>n+d.loot.filter(p=>p.itemId==='rope').reduce((sum,p)=>sum+p.count,0),0)+
  Object.values(station).flatMap(s=>[...s.intake,...s.output]).filter(p=>p.itemId==='rope').reduce((n,p)=>n+p.count,0);
};
for(let i=0;i<360;i++){fromFull.w.tick++;stepIndustry(fromFull.w);}
assert.equal(retained(fromFull.w),7,'a full explicit destination deposits zero and does not consume one unit');
assert.ok(!transportEvents(fromFull.w).length);
const nextNetwork=deserializeWorld(serializeWorld(supplyNet.w));
assert.equal(networkStation(nextNetwork,nextNetwork.ark.buildings.find(b=>b.defId==='sorter_arm')!).route,'auto');
console.log('[sim-smoke:P2-13] OK: 5,400 ticks self-burning, live iron smelting, feed, multi-hop storage, full-chest stock conservation and archive');

import { rigTrial } from './p2-rig-fixture';
import { rigDrive } from '../src/sim/rigging';
const bareSail=rigTrial(),riggedSail=rigTrial(true);
const against=(w:typeof bareSail)=>rigDrive(w,1,0).multiplier;
const withWind=(w:typeof bareSail)=>rigDrive(w,-1,0).multiplier;
assert.ok(against(bareSail)<withWind(bareSail));
assert.ok(against(riggedSail)>against(bareSail)*1.24);
assert.ok(rigDrive(riggedSail,1,0).resistance>.75);
const timings=[bareSail,riggedSail].map(trip=>{
 assert.equal(setDestination(trip,'shallows_lantern'),null);
 assert.equal(toggleCruise(trip),null);
 while(trip.sky.cruising&&trip.tick<1500)stepWorld(trip);
 assert.equal(trip.ark.anchoredIslandId,'shallows_lantern');return trip.tick;
});
assert.ok(timings[1]<timings[0]*.83,'same in-world route, actual shorter sailing time');
assert.equal(deserializeWorld(serializeWorld(riggedSail)).ark.buildings.filter(b=>['wind_sail','steam_thruster','wind_vane'].includes(b.defId)).length,3);
console.log('[sim-smoke:P2-14] OK: counterwind resistance, rigid-mode sailing, timetabled speed and old/archive rig validation');

import { utilityArk } from './p2-utilities-fixture';
import { heatedPipes,repairAt,repairQuote,utilityAt } from '../src/sim/utilities';
const noPipes=utilityArk(false),withPipes=utilityArk();
const glass=(w:typeof withPipes)=>w.ark.buildings.find(b=>b.defId==='greenhouse')!;
assert.equal(efficiencyAt(noPipes,glass(noPipes)),0);
assert.ok(efficiencyAt(withPipes,glass(withPipes))>0,'a connected trunk heats distant glass, without relay');
assert.ok(heatedPipes(withPipes).has(utilityAt(withPipes,31,25,'heat_pipe')!.id));
assert.ok(!withPipes.ark.buildings.some(b=>b.defId==='heat_relay'));
const brokenTrunk=deserializeWorld(serializeWorld(withPipes));
brokenTrunk.ark.buildings=brokenTrunk.ark.buildings.filter(b=>b.id!=='heat_pipe_27_24');
for(let i=0;i<70;i++)solveHeat(brokenTrunk);
assert.equal(efficiencyAt(brokenTrunk,glass(brokenTrunk)),0);
assert.equal(heatedPipes(brokenTrunk).has('heat_pipe_31_25'),false);
assert.ok(fitsOnDeck(withPipes,29.5,24.5));
assert.ok(!hasBuildingContact(withPipes,29.5,24.5),'utility overlay never becomes an air wall');
const repairDesk=withPipes.ark.buildings.find(s=>s.defId==='repair_station')!;
Object.assign(withPipes.player,{x:25.54,y:26.15});
assert.match(repairAt(withPipes,repairDesk)!,/修理锤/);
assert.ok(inventoryChange(withPipes,[],[{itemId:'repair_hammer',count:1}]));
const [firstDefect,secondDefect]=repairQuote(withPipes).damaged;
assert.equal(repairAt(withPipes,repairDesk,firstDefect.id),null);
assert.equal(firstDefect.hp,firstDefect.maxHp);
assert.notEqual(secondDefect.hp,secondDefect.maxHp);
assert.equal(repairAt(withPipes,repairDesk),null);
assert.equal(secondDefect.hp,secondDefect.maxHp);
assert.ok(utilityAt(deserializeWorld(serializeWorld(withPipes)),31,25,'insulated_floor'));
console.log('[sim-smoke:P2-15] OK: physical connected trunk, cut-line freeze, no overlay collision and atomic single+ship repair');

import { cozyHome } from './p2-home-fixture';
import { brewTea,catPerch,restIssue,roomComfort,sleepToDawn } from '../src/sim/home';
const emptyHome=cozyHome(false),furnished=cozyHome();
assert.ok(roomComfort(emptyHome)>0&&roomComfort(furnished)>roomComfort(emptyHome));
assert.equal(roomComfort(furnished),5);
assert.equal(roomComfort(furnished,{...furnished.player,x:25,y:27.45}),0);
assert.ok(catPerch(furnished));
const cot=furnished.ark.buildings.find(b=>b.defId==='warm_cot')!;
assert.equal(restIssue(furnished,cot),null);
const dayBeforeRest=furnished.day;
assert.equal(sleepToDawn(furnished,cot),null);
assert.equal(furnished.day,dayBeforeRest+1);
assert.equal(furnished.player.roll.stamina,100);
assert.equal(furnished.weather,'clear');
assert.match(sleepToDawn(furnished,cot)!,/傍晚/);
const stormBed=cozyHome(true,true),stormCot=stormBed.ark.buildings.find(b=>b.defId==='warm_cot')!;
assert.match(sleepToDawn(stormBed,stormCot)!,/大寒潮/);
assert.equal(stormBed.day,5);
const teaTable=furnished.ark.buildings.find(b=>b.defId==='tea_table')!;
Object.assign(furnished.player,{x:25.35,y:22.25,warmth:44});furnished.player.roll.stamina=50;
assert.ok(inventoryChange(furnished,[],[{itemId:'fresh_water',count:1}]));
assert.equal(brewTea(furnished,teaTable),null);
assert.equal(furnished.player.warmth,54);
assert.equal(furnished.player.roll.stamina,64);
assert.equal(countItem(furnished,'fresh_water'),0);
assert.equal(roomComfort(deserializeWorld(serializeWorld(furnished))),5);
console.log('[sim-smoke:P2-16] OK: furnished warm room reaches Lv.5, tea spends water, rest to dawn and refuses first whiteout');

import { largeRadarArk,sideTrial,westOnlyTravel } from './p2-dock-fixture';
import { docks,downDock } from '../src/sim/dock-direction';
const alternate=westOnlyTravel();
assert.equal(setDestination(alternate,'shallows_lantern'),null);
assert.equal(toggleCruise(alternate),null);
while(alternate.sky.cruising&&alternate.tick<1000)stepWorld(alternate);
assert.equal(gangwayGeometry(alternate)?.side,'west','pick another reachable berth after the starboard side is blocked');
for(const side of ['east','west','north','south'] as const){
 const rig=sideTrial(side),d=docks[side],g=gangwayGeometry(rig)!;
 assert.equal(toggleGangway(rig),null);assert.equal(areaAt(rig,g.landing.x,g.landing.y),'island');
 assert.equal(startRoll(rig,d),null);stepWorld(rig,60,d);
 assert.equal(areaAt(rig,rig.player.x,rig.player.y),'island');
 const loaded=deserializeWorld(serializeWorld(rig));
 assert.equal(gangwayGeometry(loaded)?.side,side);assert.equal(loaded.activeIsland?.nodeId,'shallows_lantern');
 const seam=sideTrial(side);assert.equal(toggleGangway(seam),null);
 Object.assign(seam.player,downDock(g.deck,side,.47));
 assert.equal(toggleGangway(seam),null);
 assert.ok(fitsOnDeck(seam,seam.player.x,seam.player.y));
 assert.ok(!hasBuildingContact(seam,seam.player.x,seam.player.y));
}
const giant=largeRadarArk();
assert.equal(giant.ark.decks.filter(Boolean).length,21*21);
assert.ok(giant.ark.heatGrid.filter((v,i)=>giant.ark.decks[i]&&v>=15).length>0);
assert.ok(giant.ark.heatGrid.filter((v,i)=>giant.ark.decks[i]&&v<=-16).length>300);
console.log('[sim-smoke:P2-17] OK: real 21×21 construction, mixed heat, alternate dock, every launch direction and safe 4-way retraction');

import { coastFixture,terrainZones } from './p2-coast-fixture';
import artManifest from '../src/assets/art/manifest.json';
for(const [i,id] of terrainZones.entries()){
 const coast=coastFixture(id),map=coast.activeIsland!,direction={x:1,y:1};
 assert.equal(map.size,64);
 assert.equal(map.tiles.length,4096);
 assert.ok(new Set(map.tiles).size>=4);
 const from={...coast.player};
 assert.equal(startRoll(coast,direction),null);
 stepWorld(coast,44,direction);
 assert.equal(areaAt(coast,coast.player.x,coast.player.y),'island',id+' walkable coast');
 assert.ok(Math.hypot(from.x-coast.player.x,from.y-coast.player.y)>.75,id+' diagonal progress');
 const loaded=deserializeWorld(serializeWorld(coast));
 assert.deepEqual(loaded.activeIsland,map);
 const suffixes=['terrain-0','terrain-1','terrain-2','terrain-3','ground-decal-0','ground-decal-1','cliff-natural'];
 for(const suffix of suffixes)assert.ok(Object.hasOwn(artManifest.assets,'island-t'+(i+1)+'-'+suffix));
}
const portA=sideTrial('west'),portB=sideTrial('west');
portB.sky.islands.find(n=>n.id==='shallows_lantern')!.seed+=100;
assert.notDeepEqual(dockedIsland(portA)!.tiles,dockedIsland(portB)!.tiles,'a different seed at the same rotated dock must not reuse the old island');
console.log('[sim-smoke:P2-18] OK: four deterministic 64×64 terrain masks, diagonal traversal, exact reload and approved paint manifest');
