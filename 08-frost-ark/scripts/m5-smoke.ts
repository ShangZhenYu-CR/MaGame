import assert from 'node:assert/strict';
import { build } from '../src/sim/ark';
import { DAY_TICKS } from '../src/sim/heatField';
import { dockedIsland, islandNodes } from '../src/sim/island';
import { ensureNavigationState } from '../src/sim/m3-state';
import { attackM5, m5CombatEffects, m5Status, m5Telegraph, stepM5, verifyM5 } from '../src/sim/m5';
import { serializeWorld, deserializeWorld } from '../src/sim/save';
import { harvestIslandResource } from '../src/sim/tools';
import { createInitialWorld, stepWorld } from '../src/sim/world';
import type { WorldState } from '../src/sim/types';

const w = createInitialWorld();
const original = w.sky.islands.slice();
stepWorld(w);
assert.deepEqual(w.sky.islands.slice(0,4),original);
assert.deepEqual(w.sky.islands.map(n=>n.tier),[1,1,2,2,3,3,4,4]);
assert.equal(w.sky.islands.find(n=>n.id==='aurora_vault')?.biomeId,'aurora_zenith');
assert.equal(w.sky.islands.find(n=>n.id==='sulfur_reach')?.biomeId,'sulfur_rift');
w.day=5;w.timeOfDay=.73;stepWorld(w);
assert.equal(m5Status(w).warning,true);
assert.ok(m5Status(w).untilTicks > 0);
assert.equal(m5Status(w).raidsRemaining,0);
w.timeOfDay=.74-1/DAY_TICKS/2;stepWorld(w);
assert.equal(w.weather,'whiteout');
assert.equal(w.ambientTemp,-55);
assert.equal(m5Status(w).wave,1);
assert.equal(m5Status(w).raidsRemaining,2);
assert.equal(verifyM5(w),true);
assert.deepEqual(m5Status(deserializeWorld(serializeWorld(w))),m5Status(w));
stepWorld(w,450);
assert.ok(w.wildEntities.some(e=>e.defId==='icebreaker_beast'));
assert.ok(w.ark.buildings.some(b=>b.hp<b.maxHp),'unopposed mobs hurt the Ark');
w.day=6;w.timeOfDay=.15;stepWorld(w);
assert.equal(w.weather,'clear');
assert.equal(m5Status(w).raidsRemaining,0);
w.day=10;w.timeOfDay=.74;stepWorld(w);
assert.equal(m5Status(w).wave,1);

const defended = createInitialWorld();
defended.unlockedTech.push('tier3_fortress');
defended.player.inventory[7]={itemId:'frost_iron_ingot',count:6};
defended.player.inventory[8]={itemId:'sulfur_ore',count:2};
assert.equal(build(defended,'frost_turret',24,21),true);
assert.equal(build(defended,'fire_oil_turret',25,21),true);
defended.day=5;defended.timeOfDay=.74;stepWorld(defended);
assert.ok(m5CombatEffects(defended).some(e=>e.kind==='arrow'));
assert.ok(defended.wildEntities.some(e=>e.hp<e.maxHp));
// A separate close target keeps the fire-oil assertion independent of raid placement logic.
defended.wildEntities.push({id:'close_turret_target',defId:'froststalker',kind:'raider',x:25.5,y:22.3,
  hp:47,maxHp:47,stunnedTicks:0,tameProgress:0,hostile:true});
defended.ark.heatGrid.fill(15);
defended.tick++;
stepM5(defended);
assert.ok(m5CombatEffects(defended).some(e=>e.kind==='fire'));

function dock(w:WorldState,id:string) {
  w.ark.anchoredIslandId=id;
  ensureNavigationState(w).dock={nodeId:id,gx:27,gy:24,deployed:true};
  w.activeIsland=dockedIsland(w)!;
}
const trip=createInitialWorld();
stepWorld(trip);
for(const [node,enemy] of [['frostpine_gate','frostmane_lord'],['sulfur_reach','rift_carapace']]){
  dock(trip,node);
  trip.player.x=trip.activeIsland!.offsetX+24.45;
  trip.player.y=trip.activeIsland!.offsetY+32.5;
  stepM5(trip);
  assert.ok(trip.wildEntities.some(e=>e.kind==='boss'&&e.defId===enemy));
  const target=trip.wildEntities.find(e=>e.defId===enemy)!;
  assert.equal(m5Telegraph(trip,target.id),true);
  const before=trip.skyheartCores;
  trip.player.hp=100;
  for(let i=0;i<20&&target.hp>0;i++){
    assert.equal(attackM5(trip),null);
    assert.notEqual(attackM5(trip),null);
    trip.tick+=15;
    stepM5(trip);
  }
  assert.equal(target.hp,0);
  assert.equal(trip.skyheartCores,before+1);
  assert.ok(trip.sky.islands.find(n=>n.id===node)?.bossDefeated);
  trip.activeIsland=null; stepM5(trip);
  dock(trip,node); stepM5(trip);
  assert.ok(!trip.wildEntities.some(e=>e.defId===enemy));
}
for(const node of ['sulfur_furnace','permafrost_ruins']){
  dock(trip,node);
  assert.ok(islandNodes(trip).some(n=>n.kind==='ore'&&n.itemId===(node==='sulfur_furnace'?'sulfur_ore':'sky_mithril')));
  const chest=islandNodes(trip).find(n=>n.key==='chest_2068')!;
  trip.player.x=chest.x;
  trip.player.y=chest.y;
  const before=trip.skyheartCores;
  const bag=trip.player.inventory;
  trip.player.inventory=bag.map(s=>s??{itemId:'rope',count:99});
  assert.equal(harvestIslandResource(trip,chest).ok,false);
  assert.equal(trip.skyheartCores,before);
  trip.player.inventory=bag;
  assert.equal(harvestIslandResource(trip,chest).ok,true);
  assert.equal(harvestIslandResource(trip,chest).ok,false);
  assert.equal(trip.skyheartCores,before+1);
}
assert.equal(trip.skyheartCores,4);
assert.equal(deserializeWorld(serializeWorld(trip)).skyheartCores,4);
const dirty=JSON.parse(serializeWorld(trip));dirty.combatM5.seeds.push(dirty.combatM5.seeds[0]);
assert.throws(()=>deserializeWorld(JSON.stringify(dirty)),/寒潮/);
console.log('[m5] 4 zones, raid recurrence, building pressure, both defenses, both boss fights, 4 unique cores and save verification OK');
