import { inventoryChange } from './ark';
import { hearthNear } from './heatField';
import { areaAt } from './island';
import { incapacitated } from './rescue';
import { whaleBattleActive } from './finale';
import { TICK_RATE,type Vec2,type WorldState } from './types';

export const outfits=['classic','scarf','goggles','cape'] as const;
export type LatteOutfit=(typeof outfits)[number];
export const outfitsAt={classic:1,scarf:2,goggles:3,cape:4} as const;
const bands=[0,12,32,54] as const;
const top=bands[3],restTicks=8*TICK_RATE,boonTicks=22*TICK_RATE;
interface Care { xp:number;outfit:LatteOutfit;petAt:number;feedAt:number;bolsterAt:number }
type Archive=WorldState&{latteGrowthP2?:Care};
const get=(w:WorldState)=>(w as Archive).latteGrowthP2;
const initial=():Care=>({xp:0,outfit:'classic',petAt:0,feedAt:0,bolsterAt:0});
const ensure=(w:WorldState)=>((w as Archive).latteGrowthP2??=initial());
const level=(xp:number)=>xp>=54?4:xp>=32?3:xp>=12?2:1;
export const latteNear=(w:WorldState)=>!incapacitated(w)&&areaAt(w,w.player.x,w.player.y)==='ark'&&
 hearthNear(w,2.8)&&Math.hypot(w.player.x-w.latte.x,w.player.y-w.latte.y)<=3.8;
export function latteProfile(w:WorldState){
 const care=get(w),xp=care?.xp??0,rank=level(xp);
 return {xp,level:rank,outfit:care?.outfit??'classic',next:rank===4?top:bands[rank],
  petWait:Math.max(0,(care?.petAt??0)-w.tick),feedWait:Math.max(0,(care?.feedAt??0)-w.tick)};
}
export function awardLatte(w:WorldState,xp:number):void{
 if(xp<1)return;
 const care=ensure(w);care.xp=Math.min(top,care.xp+xp);
}
export function careForLatte(w:WorldState,action:'pet'|'feed'):string|null{
 if(!latteNear(w))return '回到余烬炉旁、靠近拿铁再照料。';
 const old=get(w);
 if(((action==='pet'?old?.petAt:old?.feedAt)??0)>w.tick)return '让拿铁休息一会。';
 if(action==='feed'&&!inventoryChange(w,[{itemId:'cloud_fish',count:1}],[]))return '拿铁想吃一份云鳞鱼。';
 const care=ensure(w);
 if(action==='pet'){care.petAt=w.tick+restTicks;awardLatte(w,3);}
 else{care.feedAt=w.tick+restTicks;awardLatte(w,9);}
 return null;
}
export function outfitLatte(w:WorldState,style:LatteOutfit):string|null{
 if(!latteNear(w))return '要在炉边给拿铁换衣。';
 if(!outfits.includes(style)||outfitsAt[style]>latteProfile(w).level)return '拿铁还没解锁这套装扮。';
 ensure(w).outfit=style;return null;
}
export function latteTreasure(w:WorldState,position:Vec2):boolean{
 if((get(w)?.xp??0)<32||incapacitated(w))return false;
 const dist=Math.hypot(w.player.x-position.x,w.player.y-position.y);
 return dist>=2.8&&dist<=18;
}
export function stepLatteGrowth(w:WorldState):boolean{
 const p=w.player,care=get(w);
 if(!care||care.xp<top||care.bolsterAt>w.tick||incapacitated(w)||
    (p.hp>=p.maxHp&&p.warmth>=p.maxWarmth)||
    !(w.weather==='whiteout'||whaleBattleActive(w)||w.wildEntities.some(e=>e.kind==='boss'&&e.hp>0&&e.homeIslandId===w.activeIsland?.nodeId)))return false;
 p.hp=Math.min(p.maxHp,p.hp+8);p.warmth=Math.min(p.maxWarmth,p.warmth+12);care.bolsterAt=w.tick+boonTicks;
 return true;
}
export const latteBoon=(w:WorldState)=>{const t=get(w)?.bolsterAt??0;return t>w.tick&&t-w.tick>=boonTicks-80;};
export function validLatteGrowth(w:WorldState):boolean{
 const value=get(w);
 if(value===undefined)return true;
 if(!value||typeof value!=='object'||Array.isArray(value)||!Number.isSafeInteger(value.xp)||value.xp<0||value.xp>top||
   !outfits.includes(value.outfit)||outfitsAt[value.outfit]>level(value.xp))return false;
 return [value.petAt,value.feedAt,value.bolsterAt].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=w.tick+boonTicks);
}
