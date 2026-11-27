import assert from 'node:assert/strict';
import { makeBuilding,refreshBuoyancy } from '../src/sim/ark';
import { beastProfile,traitWorkRate } from '../src/sim/beast-traits';
import { beastDefinitions } from '../src/sim/beasts';
import { initializeHeat } from '../src/sim/heatField';
import { ensureFauna } from '../src/sim/m4-state';
import { createInitialWorld } from '../src/sim/world';
import type { BeastEntity } from '../src/sim/types';

export function traitsFixture(seed=202608){
 const w=createInitialWorld(seed),def=beastDefinitions.get('frostyak')!;
 w.ark.buildings.push(makeBuilding('beast_den',23,26,'warm_yak_barn'));
 const work=(id:string):BeastEntity=>({id,defId:def.id,name:def.name,x:23.65,y:26.65,hp:def.maxHp,maxHp:def.maxHp,
  warmth:82,hunger:90,role:'work',denBuildingId:'warm_yak_barn',workCooldown:0});
 const candidates=Array.from({length:60},(_,i)=>work('roster_yak_'+i));
 const rapid=candidates.find(b=>beastProfile(w,b).traits.includes('diligent_digger'))!;
 const normal=candidates.find(b=>traitWorkRate(w,b)===1)!;
 assert.ok(rapid&&normal);
 normal.x=24.55;w.beasts.push(rapid,normal);
 ensureFauna(w);refreshBuoyancy(w);initializeHeat(w);return {w,rapid,normal};
}
