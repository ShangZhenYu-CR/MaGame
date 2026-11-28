import assert from 'node:assert/strict';
import { enclosedHelmTravel } from './p2-dock-fixture';
import { setDestination,stepNavigation,toggleCruise } from '../src/sim/sky-map';
import { gangwayGeometry } from '../src/sim/island';
import { operateWindDoor } from '../src/sim/rooms';
for(const opened of [false,true]){
 const w=enclosedHelmTravel();
 const door=w.ark.buildings.find(b=>b.defId==='wind_door')!;
 const p={...w.player};
 if(opened){
  Object.assign(w.player,{x:door.gx+.5,y:door.gy-.22});
  assert.equal(operateWindDoor(w,door.id),null);
  Object.assign(w.player,p);
 }
 assert.equal(setDestination(w,'shallows_lantern'),null);
 assert.equal(toggleCruise(w),null);
 stepNavigation(w);
 assert.equal(w.ark.anchoredIslandId,'shallows_lantern','Warm room helm must not cancel a valid berth');
 assert.ok(gangwayGeometry(w));
}
console.log('[final-QA:helm] dock remains reachable through operable wind door');
