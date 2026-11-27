import { nextRng } from './rng';
import type { ItemStack, WorldState } from './types';

const locations = [
  {id:'sulfur_reach',name:'硫磺裂谷岛',biomeId:'sulfur_rift',tier:3,x:28.3,y:1.8},
  {id:'sulfur_furnace',name:'余烬熔窟',biomeId:'sulfur_rift',tier:3,x:32.1,y:-5.2},
  {id:'permafrost_ruins',name:'永冻遗迹群',biomeId:'aurora_zenith',tier:4,x:39.4,y:3.6},
  {id:'aurora_vault',name:'极光天穹',biomeId:'aurora_zenith',tier:4,x:47.5,y:-2.9},
] as const;
export const AURORA_VAULT = 'aurora_vault';

export function expandM5Chart(w:WorldState):void {
  if(locations.every(v=>w.sky.islands.some(n=>n.id===v.id)))return;
  let state=(w.seed|0)^0x5e8913c7;
  for(const loc of locations){
    const sx=nextRng(state),sy=nextRng(sx.state);state=sy.state;
    if(w.sky.islands.some(n=>n.id===loc.id))continue;
    const skyX=loc.x+(sx.value-.5)*1.35,skyY=loc.y+(sy.value-.5)*1.35;
    w.sky.islands.push({id:loc.id,name:loc.name,biomeId:loc.biomeId,tier:loc.tier,seed:state,skyX,skyY,
      discovered:Math.hypot(w.sky.x-skyX,w.sky.y-skyY)<=7,bossDefeated:false,deltas:{}});
  }
}
export function highTierOre(tier:number,vein:number,featured:boolean):string|undefined{
  if(tier===3)return featured||vein>.47?'sulfur_ore':vein>.22?'coal_chunk':'frost_iron_scrap';
  if(tier===4)return featured||vein>.53?'sky_mithril':vein>.29?'coal_chunk':'ice_shard';
  return undefined;
}
export function highTierCache(tier:number):ItemStack[]|undefined{
  if(tier===3)return [{itemId:'raw_meat',count:3},{itemId:'sulfur_ore',count:2},{itemId:'coal_chunk',count:2}];
  if(tier===4)return [{itemId:'raw_meat',count:3},{itemId:'sky_mithril',count:2},{itemId:'ice_shard',count:4}];
  return undefined;
}
