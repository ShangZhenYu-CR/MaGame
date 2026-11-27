import assert from 'node:assert/strict';
import { build,inventoryChange } from '../src/sim/ark';
import { solveHeat } from '../src/sim/heatField';
import { warmRoom } from './p2-room-fixture';

export function cozyHome(complete=true,storm=false){
 const {w}=warmRoom();
 if(complete){
  const stock={driftwood:20,warm_fur:6,rope:8,frost_iron_ingot:9,frost_iron_scrap:12,torch_item:2,ice_shard:10};
  assert.ok(inventoryChange(w,[],Object.entries(stock).map(([itemId,count])=>({itemId,count}))));
  for(const [kind,gx,gy] of [
   ['warm_cot',22,22],['tea_table',25,22],['latte_climber',26,22],['water_purifier',26,23],
   ['wall_lamp',21,23],
  ] as const)assert.ok(build(w,kind,gx,gy),kind);
 }
 if(!storm){w.day=2;w.timeOfDay=.83;w.weather='snow';w.ambientTemp=-22;}
 for(let i=0;i<36;i++)solveHeat(w);
 Object.assign(w.player,{x:23.32,y:22.76});w.player.roll.stamina=36;w.player.warmth=56;
 return w;
}
