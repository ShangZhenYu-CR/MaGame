import assert from 'node:assert/strict';
import { inventoryChange } from '../src/sim/ark';
import { equipGear } from '../src/sim/equipment';
import { areaAt,dockedIsland } from '../src/sim/island';
import { ensureNavigationState } from '../src/sim/m3-state';
import { m5Status,stepM5 } from '../src/sim/m5';
import { createInitialWorld,stepWorld } from '../src/sim/world';

export const guardians=[
 {node:'frostpine_gate',boss:'frostmane_lord',skills:['dash','howl'],blueprint:'frostmane_blueprint',gear:'frostmane_amulet'},
 {node:'sulfur_reach',boss:'rift_carapace',skills:['quake','shell'],blueprint:'riftcarapace_blueprint',gear:'riftcarapace_guard'},
] as const;
export function guardianFixture(spec:(typeof guardians)[number]){
 const w=createInitialWorld(202608);stepWorld(w);
 const n=w.sky.islands.find(x=>x.id===spec.node)!;n.discovered=true;
 Object.assign(w.sky,{x:n.skyX,y:n.skyY});
 w.ark.anchoredIslandId=spec.node;
 ensureNavigationState(w).dock={nodeId:spec.node,gx:27,gy:24,side:'east',deployed:true};
 w.activeIsland=dockedIsland(w)!;
 const land=w.activeIsland;
 Object.assign(w.player,{x:land.offsetX+24.12,y:land.offsetY+32.5});
 assert.equal(areaAt(w,w.player.x,w.player.y),'island');
 assert.ok(inventoryChange(w,[],[{itemId:'aurora_mithril_cloak',count:1},{itemId:'frost_scale_armor',count:1},
  {itemId:'fire_oil_flask',count:12},{itemId:'warm_fur',count:4},{itemId:'ice_shard',count:6},{itemId:'frost_iron_ingot',count:4},
  {itemId:'sulfur_ore',count:3},{itemId:'warm_berry_soup',count:4}]));
 for(const e of ['aurora_mithril_cloak','frost_scale_armor'])assert.equal(equipGear(w,e),null);
 stepM5(w);
 const boss=m5Status(w).bosses[0];assert.equal(boss?.defId,spec.boss);
 return {w,boss};
}
