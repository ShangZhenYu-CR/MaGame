import assert from 'node:assert/strict';
import { AURORA_ISLAND,forgeSolarArk,startWhale } from '../src/sim/finale';
import { primaryHearth } from '../src/sim/heatField';
import { areaAt,dockedIsland,gangwayGeometry } from '../src/sim/island';
import { claimSunSeed } from '../src/sim/m5';
import { expandM5Chart } from '../src/sim/m5-zones';
import { ensureNavigationState } from '../src/sim/m3-state';
import type { Vec2,WorldState } from '../src/sim/types';
import { createInitialWorld } from '../src/sim/world';

export function rollArena(until:number):WorldState{
 const w=createInitialWorld();expandM5Chart(w);
 Object.assign(w.player,{x:24.5,y:25.4});primaryHearth(w)!.level=3;
 for(const id of ['frostpine_gate','sulfur_reach','sulfur_furnace','permafrost_ruins'] as const){
  const node=w.sky.islands.find(n=>n.id===id)!;
  if(id==='frostpine_gate'||id==='sulfur_reach')node.bossDefeated=true;else node.deltas.chest_2068=1;
  assert.ok(claimSunSeed(w,id));
 }
 assert.equal(forgeSolarArk(w),null);
 w.ark.anchoredIslandId=AURORA_ISLAND;
 ensureNavigationState(w).dock={nodeId:AURORA_ISLAND,gx:27,gy:24,deployed:true};
 const bridge=gangwayGeometry(w)!;
 w.activeIsland=dockedIsland(w);
 Object.assign(w.player,{x:bridge.x+bridge.width+5.5,y:bridge.y+.5});
 assert.equal(areaAt(w,w.player.x,w.player.y),'island');
 assert.equal(startWhale(w),null);
 const test=w as WorldState&{finaleM6:{whale:{warning:Vec2&{until:number;echo:null}}}};
 test.finaleM6.whale.warning={x:w.player.x,y:w.player.y,until:w.tick+until,echo:null};
 return w;
}
