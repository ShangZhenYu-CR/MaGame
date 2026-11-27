import assert from 'node:assert/strict';
import { build,inventoryChange,refreshBuoyancy } from '../src/sim/ark';
import { primaryHearth,solveHeat } from '../src/sim/heatField';
import { createInitialWorld } from '../src/sim/world';

export function warmRoom(doorKind:'wind_door'|'frost_airlock'='wind_door'){
 const w=createInitialWorld();
 w.unlockedTech.push('tier2_automation','tier3_fortress');
 const h=primaryHearth(w)!;h.level=3;h.maxHp=530;h.hp=530;h.fuel=260;refreshBuoyancy(w);
 const goods={driftwood:72,rope:4,frost_iron_ingot:6,ice_shard:4};
 assert.ok(inventoryChange(w,[],Object.entries(goods).map(([itemId,count])=>({itemId,count}))));
 Object.assign(w.player,{x:24.50,y:25.52});
 for(let y=21;y<=26;y++)for(let x=21;x<=27;x++){
  if(x!==21&&x!==27&&y!==21&&y!==26)continue;
  assert.ok(build(w,x===24&&y===26?doorKind:'wind_wall',x,y),'room fixture building at '+x+','+y);
 }
 w.day=5;w.timeOfDay=.81;w.ambientTemp=-55;w.weather='whiteout';
 w.ark.heatGrid.fill(w.ambientTemp);
 for(let i=0;i<48;i++)solveHeat(w);
 return {w,door:w.ark.buildings.find(b=>b.defId===doorKind)!};
}
