import assert from 'node:assert/strict';
import { areaAt,dockedIsland } from '../src/sim/island';
import { ensureNavigationState } from '../src/sim/m3-state';
import { expandM5Chart } from '../src/sim/m5-zones';
import { inventoryChange } from '../src/sim/ark';
import { upgradeHearth } from '../src/sim/heatField';
import { forgeSolarArk } from '../src/sim/finale';
import { claimSunSeed } from '../src/sim/m5';
import { createInitialWorld } from '../src/sim/world';
export const terrainZones=['shallows_lantern','frostpine_cove','sulfur_reach','aurora_vault'] as const;
export function coastFixture(id:typeof terrainZones[number]){
  const w=createInitialWorld(202608);expandM5Chart(w);
  if(id==='aurora_vault'){
    for(const key of ['frostpine_gate','sulfur_reach','sulfur_furnace','permafrost_ruins'] as const){
      const n=w.sky.islands.find(v=>v.id===key)!;
      if(key==='sulfur_furnace'||key==='permafrost_ruins')n.deltas.chest_2068=1;
      else n.bossDefeated=true;
      assert.ok(claimSunSeed(w,key));
    }
    assert.ok(inventoryChange(w,[],[{itemId:'driftwood',count:80},{itemId:'frost_iron_ingot',count:24},
      {itemId:'ice_shard',count:20},{itemId:'frost_iron_scrap',count:12},{itemId:'sulfur_ore',count:12}]));
    Object.assign(w.player,{x:24.5,y:25.5});
    assert.equal(upgradeHearth(w),null);assert.equal(upgradeHearth(w),null);
    assert.equal(forgeSolarArk(w),null);
  }
  const node=w.sky.islands.find(n=>n.id===id)!;node.discovered=true;
  Object.assign(w.sky,{x:node.skyX,y:node.skyY});
  ensureNavigationState(w).dock={nodeId:id,gx:27,gy:24,side:'east',deployed:true};
  w.ark.anchoredIslandId=id;w.activeIsland=dockedIsland(w);
  assert.ok(w.activeIsland);
  const {offsetX,offsetY,size,tiles}=w.activeIsland;
  const x=28;
  let y=32;
  while(y+1<size&&tiles[(y+1)*size+x])y++;
  Object.assign(w.player,{x:x+.5+offsetX,y:y-3.35+offsetY});
  w.weather='clear';w.timeOfDay=.26;
  assert.equal(areaAt(w,w.player.x,w.player.y),'island');
  return w;
}
