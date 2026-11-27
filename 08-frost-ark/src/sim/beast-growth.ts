import beastRows from '../data/beasts.json';
import { beastProfile } from './beast-traits';
import { incapacitated } from './rescue';
import { TICK_RATE,type BeastEntity,type WorldState } from './types';

const baseHp=new Map(beastRows.map(d=>[d.id,d.maxHp]));
const MAX_XP=1944;
type Entry={xp:number;readyAt:number};
type Growth={leader:string|null;byId:Record<string,Entry>};
type Save=WorldState&{beastGrowthP2?:Growth};
const get=(w:WorldState)=>(w as Save).beastGrowthP2;
const ensure=(w:WorldState)=>((w as Save).beastGrowthP2??={leader:null,byId:{}});
const cleanId=(id:string)=>/^[A-Za-z0-9_-]{1,120}$/.test(id)&&id!=='__proto__'&&id!=='constructor';
const existing=(w:WorldState,id:string):Entry|undefined=>get(w)?.byId?.[id];
const level=(xp:number)=>Math.min(10,1+Math.floor(Math.sqrt(Math.max(0,xp)/24)));
export function beastLevel(w:WorldState,b:{id:string}):number{
 const xp=existing(w,b.id)?.xp??0;
 return level(Number.isFinite(xp)?xp:0);
}
export function beastMaxHealth(w:WorldState,b:{id:string;defId:string}):number{
 const base=baseHp.get(b.defId)??0;
 return base+Math.floor(base*.061*(beastLevel(w,b)-1));
}
export const beastAttackScale=(w:WorldState,b:{id:string})=>1+(beastLevel(w,b)-1)*.093;
export const beastWorkScale=(w:WorldState,b:{id:string})=>1+(beastLevel(w,b)-1)*.055;
export function gainBeastXp(w:WorldState,b:BeastEntity,n:number):boolean{
 if(!cleanId(b.id)||!w.beasts.includes(b)||!Number.isFinite(n)||n<=0)return false;
 const before=beastLevel(w,b),entry=ensure(w).byId[b.id]??={xp:0,readyAt:0};
 const amount=Math.max(1,Math.round(n*(1+(beastProfile(w,b).stars-3)*.075)));
 entry.xp=Math.min(MAX_XP,entry.xp+amount);
 const after=beastLevel(w,b);
 if(after>before){
   const max=beastMaxHealth(w,b),extra=max-b.maxHp;
   b.maxHp=max;b.hp=Math.min(max,b.hp+Math.max(0,extra));
 }
 return after>before;
}
const canLead=(b:BeastEntity)=>b.role==='companion'&&b.hp>0&&b.hunger>10&&b.warmth>16;
export function currentLeader(w:WorldState):BeastEntity|undefined{
 const id=get(w)?.leader,chosen=w.beasts.find(b=>b.id===id&&canLead(b));
 return chosen??w.beasts.find(canLead);
}
export function chooseBeastLead(w:WorldState,id:string):string|null{
 if(incapacitated(w))return '先恢复意识。';
 if(!cleanId(id)||!w.beasts.some(b=>b.id===id&&canLead(b)))return '只能让状态良好的随行云兽带队。';
 ensure(w).leader=id;return null;
}
export function beastCooldown(w:WorldState,b:{id:string}):number{return Math.max(0,(existing(w,b.id)?.readyAt??0)-w.tick);}
export function startBeastCooldown(w:WorldState,b:BeastEntity,seconds:number):void{
 const entry=ensure(w).byId[b.id]??={xp:0,readyAt:0};
 entry.readyAt=w.tick+Math.round(seconds*TICK_RATE);
}
export function growthDetails(w:WorldState,b:BeastEntity){
 const xp=existing(w,b.id)?.xp??0,rank=beastLevel(w,b);
 return {xp,level:rank,next:rank===10?MAX_XP:rank**2*24,timer:beastCooldown(w,b),lead:currentLeader(w)?.id===b.id};
}
export function validGrowthArchive(w:WorldState):boolean{
 const saved=get(w);if(saved===undefined)return true;
 if(!saved||typeof saved!=='object'||Array.isArray(saved)||!saved.byId||typeof saved.byId!=='object'||Array.isArray(saved.byId)||
    (saved.leader!==null&&(typeof saved.leader!=='string'||!cleanId(saved.leader)||!w.beasts.some(b=>b.id===saved.leader))))return false;
 const valid=new Set(w.beasts.map(b=>b.id));
 return Object.keys(saved.byId).length<=18&&Object.entries(saved.byId).every(([id,e])=>
    cleanId(id)&&valid.has(id)&&!!e&&!Array.isArray(e)&&Number.isSafeInteger(e.xp)&&e.xp>=0&&e.xp<=MAX_XP&&
    Number.isSafeInteger(e.readyAt)&&e.readyAt>=0&&e.readyAt<=w.tick+60*TICK_RATE);
}
