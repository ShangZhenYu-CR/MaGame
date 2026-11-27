import recipes from '../data/recipes.json';
import { countItem,inventoryChange } from './ark';
import { incapacitated } from './rescue';
import type { WorldState } from './types';

export const BASIC_GRAPPLE='grapple_hook';
export const FROST_GRAPPLE='frost_grapple_hook';
export const isGrappleItem=(id:string)=>id===BASIC_GRAPPLE||id===FROST_GRAPPLE;
export const hasFrostGrapple=(w:WorldState)=>countItem(w,FROST_GRAPPLE)>0;
export const equippedGrapple=(w:WorldState)=>hasFrostGrapple(w)?FROST_GRAPPLE:countItem(w,BASIC_GRAPPLE)?BASIC_GRAPPLE:null;
export const grappleRecipes=[recipes.find(r=>r.id==='craft_grapple')!,recipes.find(r=>r.id==='craft_frost_grapple_hook')!] as const;

export function craftGrapple(w:WorldState,tier:1|2):string|null{
  if(incapacitated(w))return '昏迷中，等待救援。';
  if(w.player.grapple.active||w.player.grapple.charging)return '先收回手上的抓钩。';
  const equipped=equippedGrapple(w);
  if(equipped===FROST_GRAPPLE||tier===1&&equipped)return '背包里已有抓钩。';
  if(tier===2&&equipped!==BASIC_GRAPPLE)return '先制作云海抓钩。';
  const r=grappleRecipes[tier-1];
  return inventoryChange(w,r.inputs,[r.output])?null:'材料不足，或背包没有空位。';
}
