import assert from 'node:assert/strict';
import { build,inventoryChange } from '../src/sim/ark';
import { primaryHearth,solveHeat } from '../src/sim/heatField';
import { createInitialWorld } from '../src/sim/world';
import type { ItemStack } from '../src/sim/types';
import type { StorageSave } from '../src/sim/storage-box';

export function logisticsArk(full=false){
 const w=createInitialWorld(202608);
 const h=primaryHearth(w)!;h.fuel=16;
 w.unlockedTech.push('tier2_automation');
 const goods={driftwood:29,rope:9,frost_iron_scrap:24,coal_chunk:7,frost_iron_ingot:8,ice_shard:12};
 assert.ok(inventoryChange(w,[],Object.entries(goods).map(([itemId,count])=>({itemId,count}))));
 for(const [kind,gx,gy] of [
  ['catch_net',27,22],['sorter_arm',25,22],['steam_chute',25,23],['steam_chute',26,23],['steam_chute',27,23],
  ['steam_chute',27,24],['steam_chute',27,25],['fuel_hopper',25,24],['furnace',26,24],
  ['heat_relay',26,21],['feed_trough',27,26],
 ] as const)assert.ok(build(w,kind,gx,gy),'fixture placement: '+kind);
 const hopper=w.ark.buildings.find(b=>b.defId==='fuel_hopper')!,sorter=w.ark.buildings.find(b=>b.defId==='sorter_arm')!;
 const furnace=w.ark.buildings.find(b=>b.defId==='furnace')!;
 furnace.fuel=2;
 Object.assign(w.player,{x:25.72,y:22.24});
 w.timeOfDay=.1;w.weather='clear';w.ambientTemp=-4;
 for(let i=0;i<30;i++)solveHeat(w);
 const parcels:ItemStack[]=[
  {itemId:'rope',count:7},{itemId:'coal_chunk',count:5},{itemId:'frost_iron_scrap',count:6},
  {itemId:'driftwood',count:6},{itemId:'raw_root',count:3},{itemId:'ice_shard',count:4},
 ];
 w.sky.debris=parcels.map((p,i)=>({id:'network_qa_'+i,x:28.95,y:22.47+i*.045,vx:-.010,vy:0,loot:[p]}));
 if(full)(w as StorageSave).storageM0=[{itemId:'rope',count:99},{itemId:'coal_chunk',count:99},{itemId:'frost_iron_scrap',count:99},
  {itemId:'driftwood',count:99},{itemId:'raw_root',count:50},{itemId:'ice_shard',count:99},
  {itemId:'frost_iron_ingot',count:99},{itemId:'warm_fur',count:50}];
 return {w,h,hopper,sorter,furnace};
}
