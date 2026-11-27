import { inventoryChange, isDeck } from './ark';
import { heatAt, primaryHearth } from './heatField';
import type { CloudDebris, ItemStack, WorldState } from './types';

export const isDeckDrop=(d:CloudDebris)=>d.id.startsWith('deckdrop_');
export function dropOnDeck(w:WorldState, loot:ItemStack[]):void{
  const {x,y}=w.player;
  let n=0;
  while(w.sky.debris.some(d=>d.id===`deckdrop_${w.tick}_${n}`))n++;
  w.sky.debris.push({id:`deckdrop_${w.tick}_${n}`,x,y,vx:0,vy:0,loot});
}
export function dropSupply(w:WorldState):boolean {
  const itemId='driftwood';
  if(!inventoryChange(w,[{itemId,count:1}],[]))return false;
  dropOnDeck(w,[{itemId,count:1}]);return true;
}
export function manuallyRecover(w:WorldState):boolean {
  const d=w.sky.debris.find(v=>isDeckDrop(v)&&Math.hypot(v.x-w.player.x,v.y-w.player.y)<1.25);
  if(!d||!inventoryChange(w,[],d.loot))return false;
  w.sky.debris=w.sky.debris.filter(v=>v!==d);return true;
}
export function updateLatte(w:WorldState):void{
  const cat=w.latte, hearth=primaryHearth(w);
  cat.mood=!hearth||hearth.fuel<22?'hungry_hearth':w.weather!=='clear'?'alert':'cozy';
  cat.autoLootUnlocked=!!hearth&&hearth.level>=2;
  if(w.tick%30!==0||!cat.autoLootUnlocked||!hearth||hearth.fuel<=0)return;
  const d=w.sky.debris.find(v=>isDeckDrop(v)&&isDeck(w,Math.floor(v.x),Math.floor(v.y))&&
    Math.hypot(v.x-hearth.gx-1,v.y-hearth.gy-1)<=6&&heatAt(w,v.x,v.y)>=15);
  if(d&&inventoryChange(w,[],d.loot))w.sky.debris=w.sky.debris.filter(v=>v!==d);
}
