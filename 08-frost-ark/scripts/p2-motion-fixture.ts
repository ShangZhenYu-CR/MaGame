import assert from 'node:assert/strict';
import { build,inventoryChange } from '../src/sim/ark';
import { initializeHeat,primaryHearth } from '../src/sim/heatField';
import { startIndustry } from '../src/sim/industry';
import { createInitialWorld } from '../src/sim/world';
import { defenseWave } from './p2-defense-fixture';
import { alphaFixture } from './p2-alpha-fixture';
import { skillCompanion } from './p2-skills-fixture';
import { areaAt } from '../src/sim/island';

export function motionWorkshop(run=false){
 const w=createInitialWorld(202608);
 w.unlockedTech.push('tier2_automation','tier3_fortress');
 assert.ok(inventoryChange(w,[],[{itemId:'driftwood',count:32},{itemId:'frost_iron_scrap',count:22},
   {itemId:'frost_iron_ingot',count:19},{itemId:'rope',count:12},{itemId:'coal_chunk',count:5},
   {itemId:'raw_root',count:12},{itemId:'sulfur_ore',count:4},{itemId:'ice_shard',count:8}]));
 Object.assign(primaryHearth(w)!,{level:3,fuel:240});
 for(const [kind,x,y] of [['greenhouse',21,24],['heat_relay',22,23],['furnace',23,26],['stove',25,24],['frost_turret',24,21],
 ['fire_oil_turret',25,21],['oil_mortar',23,21],['ward_searchlight',22,26],['wind_wall',25,27]] as const)assert.ok(build(w,kind,x,y),kind);
 initializeHeat(w);
 if(run){
  for(const [station,id,x,y] of [
   ['greenhouse_21_24','grow_roots',23.14,25.0],
   ['furnace_23_26','smelt_frost_iron',24.31,26.3],
   ['stove_25_24','cook_baked_root',26.1,24.32],
  ] as const){Object.assign(w.player,{x,y});assert.equal(startIndustry(w,station,id),null,station);}
 }
 Object.assign(w.player,{x:25.61,y:23.2});
 return w;
}
export function motionRaid(){
 const w=motionWorkshop();defenseWave(w);
 Object.assign(w.wildEntities.find(e=>e.kind==='raider')!,{x:22.22,y:22.18});
 return w;
}
export function snowWalk(){
 const {w}=alphaFixture();skillCompanion(w,'frostyak');
 const dirs=[['d',1,0],['a',-1,0],['w',0,-1],['s',0,1]] as const;
 const walk=dirs.find(([,x,y])=>[.3,.9,1.5,2.2].every(n=>areaAt(w,w.player.x+x*n,w.player.y+y*n)==='island'));
 assert.ok(walk);return {w,key:walk[0]};
}
