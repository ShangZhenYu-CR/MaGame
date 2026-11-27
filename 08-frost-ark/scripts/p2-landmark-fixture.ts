import assert from 'node:assert/strict';
import { inventoryChange } from '../src/sim/ark';
import { areaAt } from '../src/sim/island';
import { islandLandmarks,VENT_RADIUS,ventState,type LandmarkKind } from '../src/sim/landmarks';
import { TICK_RATE } from '../src/sim/types';
import { coastFixture,terrainZones } from './p2-coast-fixture';

export function landmarkFixture(index:number,kind:LandmarkKind,warning=false){
  const w=coastFixture(terrainZones[index]);
  const mark=islandLandmarks(w).find(m=>m.kind===kind);
  assert.ok(mark,index+' '+kind);
  const positions=[
   {at:{x:mark.x,y:mark.y+2.25},take:'w'},
   {at:{x:mark.x,y:mark.y-2.25},take:'s'},
   {at:{x:mark.x+2.25,y:mark.y},take:'a'},
   {at:{x:mark.x-2.25,y:mark.y},take:'d'},
  ];
  const approach=positions.find(n=>areaAt(w,n.at.x,n.at.y)==='island')!;
  Object.assign(w.player,warning?{x:mark.x,y:mark.y+VENT_RADIUS+.29}:approach.at);
  w.player.warmth=29;
  assert.equal(areaAt(w,w.player.x,w.player.y),'island');
  if(kind==='obelisk')assert.ok(inventoryChange(w,[],[{itemId:'ice_shard',count:2}]));
  if(warning){w.tick=14*TICK_RATE*2-mark.phase-68;assert.equal(ventState(w,mark),'quiet');}
  return {w,mark,approach};
}
