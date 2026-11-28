import { challenge } from './challenge';
import { emitJuice } from './juice';
import items from '../data/items.json';
import { countItem, inventoryChange } from './ark';
import { whaleBattleActive } from './finale';
import { heatAt } from './heatField';
import { damagePlayer, healPlayer, incapacitated } from './rescue';
import { TICK_RATE, type WorldState } from './types';

export const cookedMeals={
  baked_root:{recover:6,seconds:34},warm_jerky:{recover:9,seconds:42},cured_cloud_fish:{recover:7,seconds:36},
  warm_hay_ball:{recover:5,seconds:34},warm_berry_soup:{recover:13,seconds:60},
  magma_steak:{recover:22,seconds:78},mithril_roast:{recover:28,seconds:96},
} as const;
export type MealId=keyof typeof cookedMeals;
export const MAX_MEAL_TICKS=96*TICK_RATE;
export const isMeal=(id:unknown):id is MealId=>typeof id==='string'&&Object.hasOwn(cookedMeals,id);
export const mealRemaining=(w:WorldState)=>Math.max(0,w.player.diet.warmUntil-w.tick);
export function quickMeal(w:WorldState):MealId|null{
  const pinned=w.player.diet.quick;
  if(pinned&&countItem(w,pinned))return pinned;
  for(const s of w.player.inventory)if(isMeal(s?.itemId))return s.itemId;
  return null;
}
export function eatMeal(w:WorldState,id:MealId):string|null{
  if(incapacitated(w))return '昏迷时不能进食。';
  const meal=cookedMeals[id],food=items.find(x=>x.id===id);
  if(!meal||!food||typeof food.hunger!=='number'||typeof food.warmth!=='number'||!inventoryChange(w,[{itemId:id,count:1}],[]))
    return '背包里没有这份熟食。';
  const p=w.player;
  p.hunger=Math.min(p.maxHunger,p.hunger+food.hunger);
  const before=p.warmth;p.warmth=Math.min(p.maxWarmth,p.warmth+food.warmth);
  if(p.warmth>before)emitJuice(w,'warmth',p,p.warmth-before,{target:'player'});
  healPlayer(w,meal.recover);
  if(w.tick+meal.seconds*TICK_RATE>=p.diet.warmUntil){
    p.diet.warmUntil=w.tick+meal.seconds*TICK_RATE;p.diet.last=id;
  }
  return null;
}

export function stepHunger(w:WorldState):void{
  if(w.tick%TICK_RATE!==0||incapacitated(w))return;
  const p=w.player, t=heatAt(w,p.x,p.y);
  const threatened=w.wildEntities.some(e=>e.hostile&&e.hp>0&&Math.hypot(e.x-p.x,e.y-p.y)<=4)||
    whaleBattleActive(w);
  const cost=.042+(t<0?.05+Math.min(40,-t)*.0018:0)+(threatened?.085:0);
  p.hunger=Math.max(0,p.hunger-cost*challenge(w).hunger);
  if(p.hunger===0)damagePlayer(w,1.2,'hunger');
}
