import assert from 'node:assert/strict';
import { activeSkyEvent,seededSkyEncounter,stepSkyEvents,type SkyEventKind } from '../src/sim/sky-events';
import { helmPoint,setDestination,toggleCruise } from '../src/sim/sky-map';
import { createInitialWorld } from '../src/sim/world';

export function eventFixture(kind:SkyEventKind){
 const w=createInitialWorld(202608);Object.assign(w.player,helmPoint(w));
 assert.equal(setDestination(w,'shallows_lantern'),null);
 assert.equal(toggleCruise(w),null);
 const stop=Array.from({length:18},(_,k)=>k).find(k=>seededSkyEncounter(w.seed,k)===kind);
 assert.notEqual(stop,undefined);
 let count=0;
 while(w.tick<30000){
   const old=activeSkyEvent(w)?.id;
   w.tick++;stepSkyEvents(w);
   const e=activeSkyEvent(w);
   if(e&&e.id!==old){if(count++===stop){assert.equal(e.kind,kind);return {w,event:e};}}
 }
 throw Error('Sailing-clock fixture did not produce '+kind);
}
