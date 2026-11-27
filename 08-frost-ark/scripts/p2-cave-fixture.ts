import assert from 'node:assert/strict';
import { inventoryChange } from '../src/sim/ark';
import { craftGear,equipGear } from '../src/sim/equipment';
import { caveEntrance } from '../src/sim/cave';
import { areaAt } from '../src/sim/island';
import { coastFixture,terrainZones } from './p2-coast-fixture';

export function outsideCave(index=1){
 const w=coastFixture(terrainZones[index]),gate=caveEntrance(w);
 assert.ok(gate);
 const approach=[{x:gate.x,y:gate.y+1.0},{x:gate.x+.95,y:gate.y},{x:gate.x,y:gate.y-1.0}].find(p=>areaAt(w,p.x,p.y)==='island');
 assert.ok(approach);Object.assign(w.player,approach);
 assert.ok(inventoryChange(w,[],[{itemId:'warm_fur',count:5},{itemId:'frost_iron_ingot',count:6},{itemId:'sulfur_ore',count:4},{itemId:'frost_iron_scrap',count:4},{itemId:'coal_chunk',count:3},{itemId:'warm_berry_soup',count:2}]));
 for(const id of ['magma_insulated_coat','pocket_hand_warmer']){
   assert.equal(craftGear(w,id),null);assert.equal(equipGear(w,id),null);
 }
 return {w,gate};
}
