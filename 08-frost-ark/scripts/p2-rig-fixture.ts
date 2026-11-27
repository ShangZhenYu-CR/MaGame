import assert from 'node:assert/strict';
import { build,inventoryChange } from '../src/sim/ark';
import { helmPoint } from '../src/sim/sky-map';
import { createInitialWorld } from '../src/sim/world';
export function rigTrial(upgraded=false){
 const w=createInitialWorld(202608);
 w.sky.windX=-.78;w.sky.windY=.03;
 if(upgraded){
  w.unlockedTech.push('tier2_automation','tier3_fortress');
  const stock={driftwood:18,rope:8,warm_fur:5,frost_iron_ingot:6,coal_chunk:4,ice_shard:4,frost_iron_scrap:6};
  assert.ok(inventoryChange(w,[],Object.entries(stock).map(([itemId,count])=>({itemId,count}))));
  assert.ok(build(w,'wind_sail',22,26));
  assert.ok(build(w,'steam_thruster',24,27));
  assert.ok(build(w,'wind_vane',25,26));
 }
 Object.assign(w.player,helmPoint(w));return w;
}
