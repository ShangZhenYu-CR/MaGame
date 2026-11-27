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
 e.fedAt=w.tick+38;changeBond(w,id,11);b.hunger=Math.min(100,b.hunger+22);return null;
}
export function validBond(w:WorldState):boolean{
 const d=get(w);if(d===undefined)return true;
 if(!d||typeof d!=='object'||Array.isArray(d)||Object.keys(d).length>18)return false;
 const ids=new Set(w.beasts.map(b=>b.id));
 return Object.entries(d).every(([id,b])=>ids.has(id)&&!!b&&typeof b==='object'&&!Array.isArray(b)&&
   Number.isFinite(b.value)&&b.value>=0&&b.value<=100&&Number.isSafeInteger(b.fedAt)&&b.fedAt>=0&&b.fedAt<=w.tick+120&&
   (b.petAt===undefined||Number.isSafeInteger(b.petAt)&&b.petAt>=0&&b.petAt<=w.tick+120));
}
