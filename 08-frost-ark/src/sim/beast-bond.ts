import { inventoryChange } from './ark';
import { areaAt } from './island';
import { incapacitated } from './rescue';
import type { WorldState } from './types';
type Entry={value:number;fedAt:number;petAt?:number};
type Archive=WorldState&{beastBondP2?:Record<string,Entry>};
const get=(w:WorldState)=>(w as Archive).beastBondP2;
const ensure=(w:WorldState)=>((w as Archive).beastBondP2??={});
export const beastBond=(w:WorldState,id:string)=>get(w)?.[id]?.value??48;
export function changeBond(w:WorldState,id:string,amount:number):void{
 if(!w.beasts.some(b=>b.id===id)||!Number.isFinite(amount))return;
 const item=ensure(w)[id]??={value:48,fedAt:0};
 item.value=Math.min(100,Math.max(0,item.value+amount));
}
export function feedBond(w:WorldState,id:string):string|null{
 if(incapacitated(w)||areaAt(w,w.player.x,w.player.y)!=='ark')return '回到方舟再照料伙伴。';
 const b=w.beasts.find(v=>v.id===id&&Math.hypot(v.x-w.player.x,v.y-w.player.y)<=2.5);
 if(!b)return '走近这只伙伴再投喂。';
 if(beastBond(w,id)>=100)return '羁绊已满，不消耗饲料。';
 if((get(w)?.[id]?.fedAt??0)>w.tick)return '让伙伴把这份零食吃完。';
 if(!inventoryChange(w,[{itemId:'beast_feed',count:1}],[]))return '背包里需要 1 份暖粮饲料。';
 const e=ensure(w)[id]??={value:48,fedAt:0};
 e.fedAt=w.tick+38;changeBond(w,id,11);emitBeastMood(w,id,'heart',78);b.hunger=Math.min(100,b.hunger+22);return null;
}
export function validBond(w:WorldState):boolean{
 const d=get(w);if(d===undefined)return true;
 if(!d||typeof d!=='object'||Array.isArray(d)||Object.keys(d).length>18)return false;
 const ids=new Set(w.beasts.map(b=>b.id));
 return Object.entries(d).every(([id,b])=>ids.has(id)&&!!b&&typeof b==='object'&&!Array.isArray(b)&&
   Number.isFinite(b.value)&&b.value>=0&&b.value<=100&&Number.isSafeInteger(b.fedAt)&&b.fedAt>=0&&b.fedAt<=w.tick+120&&
   (b.petAt===undefined||Number.isSafeInteger(b.petAt)&&b.petAt>=0&&b.petAt<=w.tick+120));
}

export const BOND_BONUS_AT=85;
export type BeastMoodKind='heart'|'drive'|'hungry'|'cold'|'salvage';
const feeling={heart:'暖心',drive:'干劲',hungry:'饿了',cold:'太冷',salvage:'发现残骸'} as const;
const cues=new WeakMap<WorldState,Map<string,{kind:BeastMoodKind;until:number}>>();
export function emitBeastMood(w:WorldState,id:string,kind:BeastMoodKind,ttl=66):void{
 let a=cues.get(w);if(!a){a=new Map();cues.set(w,a);}
 const old=a.get(id);
 if(old&&(old.kind==='heart'||old.kind==='salvage')&&kind==='drive'&&old.until>w.tick)return;
 a.set(id,{kind,until:w.tick+ttl});
}
export function beastMood(w:WorldState,b:{id:string;hunger:number;warmth:number;hp:number}){
 if(b.hp<=0)return null;
 const moment=cues.get(w)?.get(b.id);
 if(moment&&moment.until>w.tick)return {...moment,label:feeling[moment.kind]};
 const kind=b.warmth<=16?'cold':b.hunger<=12?'hungry':null;
 return kind?{kind,label:feeling[kind],until:w.tick+60}:null;
}
export function nearBondBeast(w:WorldState,radius=1.33){
 if(incapacitated(w)||areaAt(w,w.player.x,w.player.y)!=='ark')return undefined;
 return w.beasts.filter(b=>b.hp>0&&Math.hypot(b.x-w.player.x,b.y-w.player.y)<=radius)
   .sort((a,b)=>Math.hypot(a.x-w.player.x,a.y-w.player.y)-Math.hypot(b.x-w.player.x,b.y-w.player.y))[0];
}
export function petBond(w:WorldState,id:string):string|null{
 if(incapacitated(w)||areaAt(w,w.player.x,w.player.y)!=='ark')return '回到方舟后再抚摸。';
 const b=w.beasts.find(v=>v.id===id&&v.hp>0&&Math.hypot(v.x-w.player.x,v.y-w.player.y)<=1.42);
 if(!b)return '走近自己的云兽。';
 const d=ensure(w)[id]??={value:48,fedAt:0};
 if((d.petAt??0)>w.tick)return '等它缓一缓再摸。';
 d.petAt=w.tick+54;changeBond(w,id,4);emitBeastMood(w,id,'heart',80);return null;
}
export function bondWorkScale(w:WorldState,id:string):number{return beastBond(w,id)>=BOND_BONUS_AT?1.2:1;}
export function partnerCritical(w:WorldState,id:string,other:string):boolean{
 let h=Math.imul(w.seed^w.tick,0x85ebca6b);
 for(const c of id+'|'+other)h=Math.imul(h^c.codePointAt(0)!,16777619);
 h=Math.imul(h^(h>>>13),0xc2b2ae35);
 const chance=beastBond(w,id)>=BOND_BONUS_AT?21:5;
 return ((h^(h>>>16))>>>0)%100<chance;
}
