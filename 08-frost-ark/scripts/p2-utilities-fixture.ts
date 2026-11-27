import assert from 'node:assert/strict';
import { build,inventoryChange } from '../src/sim/ark';
import { solveHeat } from '../src/sim/heatField';
import { createInitialWorld } from '../src/sim/world';

export function utilityArk(withPipes=true){
 const w=createInitialWorld(202608);
 Object.assign(w.player,{x:22.53,y:23.43});
 w.unlockedTech.push('tier2_automation','tier3_fortress');
 const supply={driftwood:95,rope:10,frost_iron_scrap:30,frost_iron_ingot:22,ice_shard:24,warm_fur:8,raw_root:6};
 assert.ok(inventoryChange(w,[],Object.entries(supply).map(([itemId,count])=>({itemId,count}))));
 assert.ok(build(w,'buoyancy_core',22,22));
 for(let y=22;y<=27;y++)for(let x=28;x<=32;x++)assert.ok(build(w,'wood_deck',x,y));
 for(const [kind,x,y] of [
  ['greenhouse',30,24],['workbench',24,26],['repair_station',26,26],['wind_wall',21,25],['warm_wall',21,26],
 ] as const)assert.ok(build(w,kind,x,y),kind);
 if(withPipes){
  for(let x=24;x<=31;x++)assert.ok(build(w,'heat_pipe',x,24));
  for(const x of [30,31])assert.ok(build(w,'heat_pipe',x,25));
  for(const y of [24,25])assert.ok(build(w,'insulated_floor',31,y));
 }
 w.ark.buildings.find(b=>b.defId==='wind_wall')!.hp-=75;
 w.ark.buildings.find(b=>b.defId==='warm_wall')!.hp-=60;
 w.day=2;w.timeOfDay=.81;w.weather='snow';w.ambientTemp=-22;
 w.ark.heatGrid.fill(-22);
 for(let i=0;i<54;i++)solveHeat(w);
 Object.assign(w.player,{x:31.48,y:26.44});
 return w;
}
