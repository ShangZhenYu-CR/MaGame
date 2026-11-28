import assert from 'node:assert/strict';
import { build,inventoryChange,type BuildKind } from '../src/sim/ark';
import { defenseBuildingIds } from '../src/sim/defenses-p2';
import { stepM5 } from '../src/sim/m5';
import { addNetworkStorage } from '../src/sim/storage-box';
import { createInitialWorld } from '../src/sim/world';
import type { WorldState } from '../src/sim/types';

export const defenseSites=[
 ['ice_barricade',21,25],['ward_searchlight',22,26],['oil_mortar',24,27],['auto_repairer',25,26],
] as const satisfies readonly [BuildKind,number,number][];
export function defenseFixture(){
 const w=createInitialWorld(202608);
 w.unlockedTech.push('tier2_automation','tier3_fortress');
 assert.ok(inventoryChange(w,[],[{itemId:'driftwood',count:24},{itemId:'frost_iron_ingot',count:18},
  {itemId:'sulfur_ore',count:6},{itemId:'rope',count:7},{itemId:'ice_shard',count:8}]));
 assert.ok(build(w,'wind_wall',25,27));
 return w;
}
export function defenseWave(w:WorldState){
 w.day=5;w.timeOfDay=.81;w.weather='whiteout';w.ambientTemp=-55;
 Object.assign(w.player,{x:25.75,y:23.8});
 const defenses:ReadonlySet<string>=new Set(defenseBuildingIds);
 const built=w.ark.buildings;
 w.ark.buildings=built.filter(b=>!defenses.has(b.defId));
 try{stepM5(w);}finally{w.ark.buildings=built;}
 w.tick++;
 const raiders=w.wildEntities.filter(e=>e.kind==='raider');
 assert.equal(raiders.length,2);
 Object.assign(raiders[0],{x:21.56,y:25.48});
 Object.assign(raiders[1],{x:22.5,y:25.17});
 const damaged=w.ark.buildings.find(b=>b.id==='wind_wall_25_27')!;
 damaged.hp=damaged.maxHp-46;
 assert.ok(addNetworkStorage(w,'storage_main',{itemId:'driftwood',count:3}));
 // The enemy positions isolate the effects, not the mechanics or their state.
 for(const b of w.ark.buildings.filter(b=>b.defId==='oil_mortar'))w.ark.heatGrid[b.gy*w.ark.size+b.gx]=9;
 return {damaged,raiders};
}
