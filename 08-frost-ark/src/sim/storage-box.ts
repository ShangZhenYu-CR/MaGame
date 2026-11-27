import { equippedItem } from './equipment';
import { isGrappleItem } from './grapple-tools';
import { countItem, inventoryChange } from './ark';
import items from '../data/items.json';
import type { BuildingInstance, ItemStack, WorldState } from './types';

// A backwards-compatible save extension for M0, not a change to the locked world contract.
export type StorageSave = WorldState & { storageM0?: ItemStack[] };
export const STORAGE_SLOTS=8;
const limits=new Map(items.map(i=>[i.id,i.stack]));

export function nearestStorage(w: WorldState): BuildingInstance | undefined {
  return w.ark.buildings.find(b=>b.id==='storage_main'&&b.defId==='storage_box'&&
    Math.hypot(w.player.x-b.gx-.5,w.player.y-b.gy-.5)<=1.7);
}

export function storageContents(w: WorldState): readonly ItemStack[] {
  return (w as StorageSave).storageM0 ?? [];
}

export function transferStorage(w: WorldState, itemId:string, direction:'deposit'|'withdraw'): string | null {
  if(!nearestStorage(w))return '走近储物箱后再操作。';
  if(direction==='deposit'&&(equippedItem(w,itemId)||w.player.weapon===itemId))return '请先卸下装备。';
  if(isGrappleItem(itemId))return '抓钩留在身上，用来回收残骸。';
  const current=storageContents(w);
  const idx=current.findIndex(s=>s.itemId===itemId);
  const stack=current[idx];
  const newStacks=current.map(s=>({...s}));
  if(direction==='deposit'){
    const carried=w.player.inventory.find(s=>s?.itemId===itemId);
    if(!carried||countItem(w,itemId)<1)return '背包里没有这件物品。';
    if((stack&&stack.count>=(limits.get(itemId)??0))||(!stack&&current.length>=STORAGE_SLOTS))return '储物箱放不下了。';
    if(!inventoryChange(w,[{itemId,count:1}],[]))return '无法存入。';
    if(stack)newStacks[idx].count++;
    else newStacks.push({...carried,count:1});
  } else {
    if(!stack)return '箱里没有这件物品。';
    if(!inventoryChange(w,[],[{...stack,count:1}]))return '背包没有空位。';
    if(!--newStacks[idx].count)newStacks.splice(idx,1);
  }
  (w as StorageSave).storageM0=newStacks;
  return null;
}

/** A machine may feed the existing locker without touching the player's bag. */
export function addNetworkStorage(w:WorldState,buildingId:string,packet:ItemStack):boolean{
  if(buildingId!=='storage_main'||isGrappleItem(packet.itemId))return false;
  const contents=storageContents(w).map(s=>({...s}));
  const current=contents.find(x=>x.itemId===packet.itemId),cap=limits.get(packet.itemId)??0;
  if((current?.count??0)+packet.count>cap||(!current&&contents.length>=STORAGE_SLOTS))return false;
  if(current)current.count+=packet.count;else contents.push({...packet});
  (w as StorageSave).storageM0=contents;return true;
}
