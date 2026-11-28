import assert from 'node:assert/strict';
import { inventoryChange } from '../src/sim/ark';
import { downDock } from '../src/sim/dock-direction';
import { endlessView } from '../src/sim/endless';
import { equipGear } from '../src/sim/equipment';
import { finaleStatus,strikeWhaleWithWeapon,volleyWhale } from '../src/sim/finale';
import { areaAt,dockedIsland,gangwayGeometry } from '../src/sim/island';
import { ensureNavigationState } from '../src/sim/m3-state';
import { toggleCruise } from '../src/sim/sky-map';
import { createInitialWorld,stepWorld } from '../src/sim/world';
import type { WorldState } from '../src/sim/types';
import { seaWhaleFixture } from './p2-sea-whale-fixture';

export function clearedVoyage(){
 const w=seaWhaleFixture();
 assert.equal(toggleCruise(w),null);
 for(let i=0;i<1600&&!w.bossDefeated;i++){
  stepWorld(w);
  const status=finaleStatus(w);
  if(!status.whale?.open)continue;
  volleyWhale(w);
  if(finaleStatus(w).whale?.open)strikeWhaleWithWeapon(w,55,'fire');
 }
 assert.equal(finaleStatus(w).mode,'cleared');
 return w;
}
export function reachHunt(w:WorldState){
 const job=endlessView(w)?.job;
 assert.ok(job&&job.phase==='active');
 const n=w.sky.islands.find(v=>v.id===job.island)!;
 const nav=ensureNavigationState(w);nav.dock={nodeId:n.id,gx:27,gy:24,side:'east',deployed:true};
 w.ark.anchoredIslandId=n.id;w.sky.cruising=false;Object.assign(w.sky,{x:n.skyX,y:n.skyY});
 w.activeIsland=dockedIsland(w)!;
 const bridge=gangwayGeometry(w)!;
 const p=[5,6,7,8].map(x=>downDock(bridge.landing,bridge.side,x,0)).find(q=>areaAt(w,q.x,q.y)==='island')!;
 assert.ok(p);
 Object.assign(w.player,{...p,hp:100,warmth:95});
 assert.ok(inventoryChange(w,[],[{itemId:'fire_oil_flask',count:12},{itemId:'aurora_mithril_cloak',count:1}]));
 assert.equal(equipGear(w,'aurora_mithril_cloak'),null);
 return job;
}
