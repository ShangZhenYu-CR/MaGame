import type { WorldState } from './types';
import { TICK_RATE } from './types';

export type Element='ice'|'fire'|'hammer'|'break';
export interface Status {
  chill:number;frozen:number;burn:number;broken:number;
  melt:number;lastBurn:number;
}
export type ElementState=Record<string,Status>;
type WithElements=WorldState&{elementsP2?:ElementState};
const empty=():Status=>({chill:0,frozen:0,burn:0,broken:0,melt:0,lastBurn:0});
const field=(w:WorldState)=>(w as WithElements).elementsP2;
function live(w:WorldState,id:string){
 const state=(w as WithElements).elementsP2??=Object.create(null) as ElementState;
 return Object.hasOwn(state,id)?state[id]:(state[id]=empty());
}
export function status(w:WorldState,id:string):Readonly<Status>{
 const entries=field(w);
 return entries&&Object.hasOwn(entries,id)?entries[id]:inactive;
}
const inactive=Object.freeze(empty());
export const frozen=(w:WorldState,id:string)=>status(w,id).frozen>w.tick;
export const armorBroken=(w:WorldState,id:string)=>status(w,id).broken>w.tick;
export const elementalSpeed=(w:WorldState,id:string)=>frozen(w,id)?0:status(w,id).chill>w.tick?.62:1;
export function resolveElement(w:WorldState,id:string,damage:number,element:Element):{damage:number;critical:boolean}{
 const s=live(w,id),tick=w.tick;
 const boss=id==='whale'||id.startsWith('boss_');
 const critical=(element==='fire'||element==='hammer')&&s.frozen>tick;
 if(critical){s.frozen=0;s.chill=0;s.melt=tick+TICK_RATE;damage=damage*1.6;}
 if(element==='ice'){
  if(s.chill>tick&&s.frozen<=tick)s.frozen=tick+(boss?39:84);
  s.chill=tick+4*TICK_RATE;
 }else{
  if(element==='fire'||element==='hammer'){
   if(s.burn<=tick)s.lastBurn=tick;
   s.burn=tick+4*TICK_RATE;
  }
  if(element==='break'||element==='hammer')s.broken=tick+4*TICK_RATE;
 }
 return {damage,critical};
}
export function burnDamage(w:WorldState,id:string):boolean{
 const current=field(w);
 if(!current||!Object.hasOwn(current,id))return false;
 const s=current[id];
 if(s.burn<=w.tick||w.tick-s.lastBurn<TICK_RATE)return false;
 s.lastBurn=w.tick;return true;
}
export function thawedDeck(w:WorldState):Set<number>|null{
 const entries=field(w);
 if(!entries)return null;
 const size=w.ark.size,indices=new Set<number>();
 for(const e of w.wildEntities){
  if(e.hp<=0||status(w,e.id).burn<=w.tick)continue;
  for(let y=Math.floor(e.y)-1;y<=Math.floor(e.y)+1;y++)for(let x=Math.floor(e.x)-1;x<=Math.floor(e.x)+1;x++)
   if(x>=0&&y>=0&&x<size&&y<size&&Math.hypot(x+.5-e.x,y+.5-e.y)<1.45)indices.add(y*size+x);
 }
 return indices;
}
export function cleanElements(w:WorldState):void{
 const entries=field(w);
 if(!entries||w.tick%TICK_RATE!==0)return;
 const alive=new Set(w.wildEntities.filter(e=>e.hp>0).map(e=>e.id));
 for(const [id,s] of Object.entries(entries)){
  if((id!=='whale'&&!alive.has(id))||Math.max(s.chill,s.frozen,s.burn,s.broken,s.melt)<=w.tick)delete entries[id];
 }
}
export function validElements(w:WorldState):boolean{
 const entries=field(w);
 if(entries===undefined)return true;
 const keys=['chill','frozen','burn','broken','melt','lastBurn'] as const;
 if(!entries||typeof entries!=='object'||Array.isArray(entries)||Object.keys(entries).length>64)return false;
 return Object.entries(entries).every(([id,s])=>/^(whale|wild_[a-z0-9_]+|boss_[a-z0-9_]+|[a-z0-9_-]{1,78})$/.test(id)&&
   id!=='__proto__'&&id!=='constructor'&&s&&typeof s==='object'&&!Array.isArray(s)&&Object.keys(s).length===keys.length&&
   keys.every(k=>typeof s[k]==='number'&&Number.isSafeInteger(s[k])&&s[k]>=0&&s[k]<=w.tick+4*TICK_RATE));
}
