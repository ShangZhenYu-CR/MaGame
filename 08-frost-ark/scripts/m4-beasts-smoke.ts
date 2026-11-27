import assert from 'node:assert/strict';
import { build, countItem, inventoryChange } from '../src/sim/ark';
import { beastCompanions, beastHeatEmitters, beastPanel, crewIndustryMultiplier, crewSmeltBonus,
  loadBeastFeed, nearestWildBeast, setBeastRole, strikeWildBeast, tameBeast, transferBeastPack, useRestraint } from '../src/sim/beasts';
import { emitters, heatAt, primaryHearth } from '../src/sim/heatField';
import { areaAt, gangwayGeometry, toggleGangway } from '../src/sim/island';
import { getFauna } from '../src/sim/m4-state';
import { deserializeWorld, serializeWorld } from '../src/sim/save';
import { helmPoint, setDestination, toggleCruise } from '../src/sim/sky-map';
import { TICK_RATE, type WorldState } from '../src/sim/types';
import { createInitialWorld, stepWorld } from '../src/sim/world';

function grant(w:WorldState,itemId:string,count:number){assert.ok(inventoryChange(w,[],[{itemId,count}]));}
function go(w:WorldState,x:number,y:number){w.player.x=x;w.player.y=y;}
function sail(w:WorldState,id:string){
  const h=helmPoint(w);go(w,h.x,h.y);
  assert.equal(setDestination(w,id),null);
  assert.equal(toggleCruise(w),null);
  for(let i=0;i<900&&w.sky.cruising;i++)stepWorld(w);
  assert.equal(w.ark.anchoredIslandId,id);
}
function board(w:WorldState){
  const g=gangwayGeometry(w)!;go(w,g.x-.5,g.y+.5);
  assert.equal(toggleGangway(w),null);
  for(let i=0;i<90&&!w.activeIsland;i++)stepWorld(w,1,{x:1,y:0});
  assert.equal(areaAt(w,w.player.x,w.player.y),'island');
}
function reach(w:WorldState,id:string){
  const e=w.wildEntities.find(e=>e.defId===id&&e.kind==='beast')!;
  assert.ok(e, `expected fauna: ${id}`);
  go(w,e.x-.55,e.y);
  assert.equal(nearestWildBeast(w)?.id,e.id);
  return e;
}
function leave(w:WorldState){
  const g=gangwayGeometry(w)!;
  go(w,g.x+g.width+.5,g.y+.5);
  for(let i=0;i<90&&areaAt(w,w.player.x,w.player.y)!=='ark';i++)stepWorld(w,1,{x:-1,y:0});
  assert.equal(areaAt(w,w.player.x,w.player.y),'ark');
  assert.equal(toggleGangway(w),null);
}
const w=createInitialWorld();
const old=deserializeWorld(serializeWorld(w));
assert.equal(getFauna(old),undefined,'pre-M4 saves need no new field');
sail(w,'shallows_lantern');
assert.deepEqual(w.wildEntities.map(e=>e.defId),['burrowback','emberfox','galehawk']);
assert.equal(nearestWildBeast(w),undefined,'cannot interact from the ship');
board(w);
const mole=reach(w,'burrowback');
grant(w,'baked_root',2);grant(w,'paralysis_net',1);
assert.match(tameBeast(w,mole.id)!,/35%/);
assert.equal(countItem(w,'baked_root'),2);
assert.equal(useRestraint(w,mole.id,'paralysis_net'),null);
assert.equal(countItem(w,'paralysis_net'),0);
assert.equal(mole.stunnedTicks,8*TICK_RATE);
assert.equal(tameBeast(w,mole.id),null);
assert.equal(mole.tameProgress,1);
assert.equal(beastPanel(w).wild.find(e=>e.id===mole.id)?.feedsRequired,2);
assert.deepEqual(deserializeWorld(serializeWorld(w)),w,'taming progress persists while on shore');
assert.equal(tameBeast(w,mole.id),null);
assert.ok(w.beasts.some(b=>b.id===mole.id&&b.role==='companion'));
assert.ok(!w.wildEntities.some(e=>e.id===mole.id));
assert.equal(countItem(w,'baked_root'),0);

const fox=reach(w,'emberfox');
grant(w,'warm_jerky',2);grant(w,'beast_trap',1);
assert.equal(useRestraint(w,fox.id,'beast_trap'),null);
assert.equal(fox.stunnedTicks,16*TICK_RATE);
assert.equal(tameBeast(w,fox.id),null);
assert.equal(tameBeast(w,fox.id),null);
const warm=beastHeatEmitters(w).find(e=>e.kind==='emberfox')!;
assert.ok(warm&&warm.radius===3);
assert.ok(emitters(w).some(e=>e.kind==='emberfox'));
assert.ok(heatAt(w,w.player.x,w.player.y)>w.ambientTemp+8,'fox actively warms player on shore');
const gull=reach(w,'galehawk');
for(let i=0;i<4;i++){
  assert.equal(strikeWildBeast(w,gull.id),null);
  if(i===0)assert.match(strikeWildBeast(w,gull.id)!,/再出手/);
  stepWorld(w,12);
}
assert.ok(gull.hp>0&&gull.hp<=gull.maxHp*.35);
grant(w,'cured_cloud_fish',2);
assert.equal(tameBeast(w,gull.id),null);
assert.equal(tameBeast(w,gull.id),null);
assert.equal(beastPanel(w).companions,3);
leave(w);
sail(w,'frostpine_cove');
assert.deepEqual(w.wildEntities.map(e=>e.defId),['frostyak','glacierstag','galehawk']);
board(w);
const yak=reach(w,'frostyak');
grant(w,'beast_trap',2);grant(w,'warm_hay_ball',3);grant(w,'warm_berry_soup',3);
assert.equal(useRestraint(w,yak.id,'beast_trap'),null);
for(let feed=0;feed<3;feed++)assert.equal(tameBeast(w,yak.id),null);
assert.match(setBeastRole(w,yak.id,'companion')!,/3 只/);
const deer=reach(w,'glacierstag');
assert.equal(useRestraint(w,deer.id,'beast_trap'),null);
for(let feed=0;feed<3;feed++)assert.equal(tameBeast(w,deer.id),null);
leave(w);

w.unlockedTech.push('tier2_automation','tier3_fortress');
go(w,24.5,25.5);
grant(w,'driftwood',30);grant(w,'rope',10);grant(w,'ice_shard',10);
assert.ok(build(w,'beast_den',22,25));
assert.ok(build(w,'beast_den',25,22));
assert.ok(build(w,'feed_trough',25,25));
assert.ok(build(w,'greenhouse',26,26));
const [d1,d2]=w.ark.buildings.filter(b=>b.defId==='beast_den');
const forceWarm=(d:typeof d1)=>{w.ark.heatGrid[(d.gy+1)*w.ark.size+d.gx+1]=50;};
forceWarm(d1);forceWarm(d2);
assert.equal(setBeastRole(w,mole.id,'work'),null);
assert.equal(crewSmeltBonus(w),1,'mole increases real smelting yield');
assert.equal(setBeastRole(w,fox.id,'work'),null);
assert.equal(setBeastRole(w,deer.id,'work'),null);
assert.equal(crewIndustryMultiplier(w,w.ark.buildings.find(b=>b.defId==='greenhouse')!),1.6);
assert.equal(setBeastRole(w,yak.id,'companion'),null);
const tamedYak=w.beasts.find(b=>b.id===yak.id)!;
tamedYak.x=w.player.x;tamedYak.y=w.player.y;tamedYak.warmth=80;
assert.ok(beastCompanions(w).some(b=>b.id===tamedYak.id));
const wood=countItem(w,'driftwood');
assert.equal(transferBeastPack(w,'driftwood','deposit'),null);
assert.equal(countItem(w,'driftwood'),wood-1);
assert.equal(beastPanel(w).pack[0]?.itemId,'driftwood');
assert.equal(transferBeastPack(w,'driftwood','withdraw'),null);
assert.equal(countItem(w,'driftwood'),wood);

const workingFox=w.beasts.find(b=>b.id===fox.id)!;
workingFox.hunger=38;workingFox.workCooldown=0;
grant(w,'beast_feed',2);
assert.equal(loadBeastFeed(w,2),null);
assert.equal(countItem(w,'beast_feed'),0);
assert.equal(beastPanel(w).feed,2);
const hearth=primaryHearth(w)!;hearth.fuel=21;
w.tick=29;
stepWorld(w);
assert.ok(workingFox.hunger>60,'trough automatically feeds hungry worker');
assert.equal(beastPanel(w).feed,1);
assert.ok(hearth.fuel>40,'wood stoked by assigned fox uses 125% fuel value');
forceWarm(d1);forceWarm(d2);
assert.equal(setBeastRole(w,fox.id,'rest'),null);

sail(w,'shallows_lantern');
assert.equal(w.wildEntities.filter(e=>e.kind==='beast').length,0,'all tamed wild animals remain removed on return');
assert.equal(w.beasts.length,5);
const restored=deserializeWorld(serializeWorld(w));
assert.deepEqual(restored,w,'role, rations, pack and fauna migration survive a save');
const malformed=JSON.parse(serializeWorld(w));malformed.beastM4.feed=999;
assert.throws(()=>deserializeWorld(JSON.stringify(malformed)),/云兽/);
console.log('[m4-beasts] OK: real sailing/spawns, nets/traps/weakening, 2–3 bait feeds, five species, three-companion cap, worker jobs, mobile heat/pack, trough upkeep, sparse fauna and save validation');
