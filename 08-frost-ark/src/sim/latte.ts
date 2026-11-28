import { awardLatte,stepLatteGrowth } from './latte-growth';
import { catPerch } from './home';
import { inventoryChange, isDeck } from './ark';
import { incapacitated, RESCUE_TICKS, rescuePoint } from './rescue';
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
  if(!hearth)return;
  const hx=hearth.gx+2.4, hy=hearth.gy+2.4;
  if(incapacitated(w)){
    const p=w.player, aboard=isDeck(w,Math.floor(p.x),Math.floor(p.y));
    const destination=rescuePoint(w);
    const target=aboard&&w.tick-(p.rescue.startedAt??w.tick)<RESCUE_TICKS*.50?
      {x:p.x+.3,y:p.y+.1}:destination;
    const dx=target.x-cat.x,dy=target.y-cat.y,gap=Math.hypot(dx,dy);
    if(gap>.13){const step=Math.min(.13,gap)/gap;cat.x+=dx*step;cat.y+=dy*step;}
    cat.mood='alert';return;
  }
  if(w.tick%30===0)stepLatteGrowth(w);
  const d=cat.autoLootUnlocked&&hearth.fuel>0
    ?w.sky.debris.find(v=>isDeckDrop(v)&&isDeck(w,Math.floor(v.x),Math.floor(v.y))&&
      Math.hypot(v.x-hearth.gx-1,v.y-hearth.gy-1)<=6&&heatAt(w,v.x,v.y)>=15)
    :undefined;
  const perch=!d&&cat.mood==='cozy'?catPerch(w):undefined;
  const x=d?.x??(perch?perch.gx+.52:hx),y=d?.y??(perch?perch.gy+.59:hy), gap=Math.hypot(x-cat.x,y-cat.y);
  if(gap>.19){
    const k=Math.min(.08,gap)/gap;
    cat.x+=(x-cat.x)*k;cat.y+=(y-cat.y)*k;
  }else if(d&&w.tick%30===0&&inventoryChange(w,[],d.loot)){
    w.sky.debris=w.sky.debris.filter(v=>v!==d);awardLatte(w,2);
  }
}
