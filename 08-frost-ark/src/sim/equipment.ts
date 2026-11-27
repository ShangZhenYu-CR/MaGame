import items from '../data/equipment.json';
import recipes from '../data/recipes.json';
import { countItem,inventoryChange } from './ark';
import { incapacitated } from './rescue';
import type { GearSlot,WorldState } from './types';

export const gearSlots=['outer','guard','charm'] as const;
export const gearLabel:Record<GearSlot,string>={outer:'外衣',guard:'护具',charm:'饰品'};
export const equipment=items.map(x=>({...x,slot:x.slot as GearSlot}));
export const equipmentById=new Map(equipment.map(x=>[x.id,x]));
const gearRecipes=new Map(recipes.filter(x=>equipmentById.has(x.output.itemId)).map(x=>[x.output.itemId,x]));
export const equipmentCost=(id:string)=>gearRecipes.get(id)?.inputs??[];

export function equippedItem(w:WorldState,id:string):boolean{
  return gearSlots.some(slot=>w.player.gear[slot]===id);
}

export function gearModifiers(w:WorldState){
  let cold=0,guard=0,personalHeat=0,hookRadius=0;
  for(const slot of gearSlots){
    const id=w.player.gear[slot];
    if(!id)continue;
    const d=equipmentById.get(id);
    if(!d)continue;
    cold+=d.cold;guard+=d.guard;personalHeat+=d.personalHeat;hookRadius+=d.hookRadius;
  }
  return {cold:Math.min(.78,cold),guard:Math.min(.62,guard),personalHeat,hookRadius};
}

export function equipGear(w:WorldState,id:string):string|null{
  if(incapacitated(w))return '昏迷时不能更换装备。';
  const d=equipmentById.get(id);
  if(!d||!countItem(w,id))return '背包里没有这件装备。';
  const wearing=w.player.gear[d.slot]===id;
  w.player.gear[d.slot]=wearing?null:id;return null;
}

export function craftGear(w:WorldState,id:string):string|null{
  if(incapacitated(w))return '昏迷时不能制作。';
  const r=gearRecipes.get(id);
  if(!r)return '没有这个装备配方。';
  if(countItem(w,id))return '背包已有这件装备。';
  return inventoryChange(w,r.inputs,[r.output])?null:'材料不足，或背包没有空位。';
}
