import assert from 'node:assert/strict';
import { initializeHeat } from '../src/sim/heatField';
import { stepM5 } from '../src/sim/m5';
import { createInitialWorld } from '../src/sim/world';
import { TICK_RATE } from '../src/sim/types';

export function raiderWarning(day:number){
 const w=createInitialWorld(202608);w.day=day;w.timeOfDay=.619;w.weather='clear';return w;
}
export function raiderArrival(day:number){
 const w=raiderWarning(day);
 w.timeOfDay=.801;w.weather='whiteout';w.ambientTemp=-55;
 Object.assign(w.player,{x:25.69,y:23.87,hp:100,warmth:93});
 initializeHeat(w);
 stepM5(w);w.tick+=15*TICK_RATE;stepM5(w);
 const bat=w.wildEntities.find(e=>e.defId==='frostspike_bat'),wraith=w.wildEntities.find(e=>e.defId==='heatwraith');
 assert.ok(bat&&wraith);
 Object.assign(wraith,{x:24.74,y:24.41});
 Object.assign(bat,{x:22.86,y:23.93});
 w.tick+=15*TICK_RATE-8;
 return {w,wraith,bat};
}
