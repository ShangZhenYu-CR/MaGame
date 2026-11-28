import assert from 'node:assert/strict';
import { inventoryChange } from '../src/sim/ark';
import { beastDefinitions } from '../src/sim/beasts';
import { areaAt } from '../src/sim/island';
import { stepWorld } from '../src/sim/world';
import { coastFixture } from './p2-coast-fixture';

export function alphaFixture(){
 for(let seed=202608;seed<202680;seed++){
  const w=coastFixture('frostpine_cove',seed);stepWorld(w,1);
  const elite=w.wildEntities.find(e=>e.kind==='beast'&&e.alpha&&e.hp>0);if(!elite||w.wildEntities.filter(e=>e.alpha).length!==1)continue;
  const approach=[{x:elite.x-1.25,y:elite.y},{x:elite.x+1.25,y:elite.y},{x:elite.x,y:elite.y+1.25}]
   .find(p=>areaAt(w,p.x,p.y)==='island');
  if(!approach)continue;
  Object.assign(w.player,{...approach,vx:0,vy:0,warmth:84});
  const def=beastDefinitions.get(elite.defId)!;
  assert.ok(inventoryChange(w,[],[{itemId:'paralysis_net',count:2},{itemId:def.preferredBait,count:def.tameFeedsRequired+1}]));
  return {w,elite,def};
 }
 throw Error('No eligible naturally seeded elite in the search');
}
