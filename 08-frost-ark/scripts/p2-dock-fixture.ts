import assert from 'node:assert/strict';
import { build,inventoryChange,isDeck,makeBuilding } from '../src/sim/ark';
import { solveHeat,upgradeHearth } from '../src/sim/heatField';
import { ensureNavigationState } from '../src/sim/m3-state';
import { helmPoint } from '../src/sim/sky-map';
import type { DockSide } from '../src/sim/dock-direction';
import { createInitialWorld,stepWorld } from '../src/sim/world';

const berth={east:[27,24],west:[21,24],south:[24,27],north:[24,21]} as const;
export function sideTrial(side:DockSide){
 const w=createInitialWorld(),[gx,gy]=berth[side];
 const nodeId='shallows_lantern';w.ark.anchoredIslandId=nodeId;
 ensureNavigationState(w).dock={nodeId,gx,gy,side,deployed:false};
 Object.assign(w.player,{x:gx+.5,y:gy+.5});return w;
}

export function westOnlyTravel(){
 const w=createInitialWorld();
 for(let y=21;y<=27;y++)for(let x=25;x<=27;x++){
  if(w.ark.buildings.some(b=>b.gx===x&&b.gy===y))continue;
  w.ark.buildings.push(makeBuilding('wind_wall',x,y,'starboard_guard_'+x+'_'+y));
 }
 Object.assign(w.player,helmPoint(w));return w;
}

export function largeRadarArk(){
 const w=createInitialWorld(202608);
 w.unlockedTech.push('tier2_automation','tier3_fortress');
 const goods={driftwood:850,frost_iron_ingot:65,ice_shard:96,rope:8,frost_iron_scrap:8,sulfur_ore:4};
 assert.ok(inventoryChange(w,[],Object.entries(goods).map(([itemId,count])=>({itemId,count}))));
 Object.assign(w.player,{x:24.5,y:25.5});
 assert.equal(upgradeHearth(w),null);assert.equal(upgradeHearth(w),null);
 for(let x=21;x<=27;x++){
  assert.ok(build(w,'buoyancy_core',x,21));
  assert.ok(build(w,'buoyancy_core',x,27));
 }
 for(let r=4;r<=10;r++){
  for(let i=24-r+1;i<24+r;i++){
   for(const [x,y] of [[i,24-r],[i,24+r],[24-r,i],[24+r,i]])if(!isDeck(w,x,y))assert.ok(build(w,'wood_deck',x,y),x+','+y);
  }
  for(const [x,y] of [[24-r,24-r],[24-r,24+r],[24+r,24-r],[24+r,24+r]])assert.ok(build(w,'wood_deck',x,y));
 }
 w.day=5;w.timeOfDay=.79;w.weather='whiteout';w.ambientTemp=-55;
 for(let i=0;i<32;i++)solveHeat(w);
 stepWorld(w,8);
 assert.equal(w.ark.decks.filter(Boolean).length,441);
 assert.ok(w.wildEntities.some(e=>e.kind==='raider'&&e.hp>0));
 return w;
}
