import { inverseDock,rotateDockPoint } from './dock-direction';
import { areaAt,gangwayGeometry } from './island';
import { damagePlayer,incapacitated } from './rescue';
import { inventoryChange } from './ark';
import type { Vec2,WildEntity,WorldState } from './types';

const rewards={
 frostpine_gate:{blueprint:'frostmane_blueprint',gear:'frostmane_amulet',name:'霜鬃骨牙图纸',art:'icon-frostmane-blueprint'},
 sulfur_reach:{blueprint:'riftcarapace_blueprint',gear:'riftcarapace_guard',name:'炎甲护臂图纸',art:'icon-riftcarapace-blueprint'},
} as const;
type Island=keyof typeof rewards;
type Skill='dash'|'howl'|'quake'|'shell';
interface Tell {skill:Skill;at:Vec2;aim:Vec2;until:number}
interface Guard {cycle:number;next:number;tell:Tell|null;exposed:number;trail?:{a:Vec2;b:Vec2;until:number}}
interface Archive {guards:Partial<Record<Island,Guard>>;loot:Partial<Record<Island,Vec2|true>>}
type Save=WorldState&{guardiansP2?:Archive};
const get=(w:WorldState)=>(w as Save).guardiansP2;
const ready=(w:WorldState)=>((w as Save).guardiansP2??={guards:{},loot:{}});
const recognized=(s:unknown):s is Island=>typeof s==='string'&&Object.hasOwn(rewards,s);
const id=(w:WorldState):Island|null=>recognized(w.activeIsland?.nodeId)?w.activeIsland!.nodeId as Island:null;
const actual=(w:WorldState,e:WildEntity)=>{const at=id(w);return at&&e.id==='boss_'+at?at:null;};
const gap=(a:Vec2,b:Vec2)=>Math.hypot(a.x-b.x,a.y-b.y);
const point=(p:Vec2):Vec2=>({x:p.x,y:p.y});
const cycles={frostpine_gate:['dash','howl'],sulfur_reach:['quake','shell']} as const;
const label={dash:'寒冰冲锋',howl:'霜狼号令',quake:'熔岩震地波',shell:'硬壳蓄能'} as const;
const duration={dash:32,howl:43,quake:45,shell:58};
const events=new WeakMap<WorldState,{skill:Skill;at:Vec2;until:number}>();
const local=(w:WorldState,p:Vec2)=>{
 const map=w.activeIsland!,side=gangwayGeometry(w)?.side??'east';
 return rotateDockPoint(inverseDock(side),map.size,p.x-map.offsetX,p.y-map.offsetY);
};
const project=(w:WorldState,p:Vec2)=>{
 const map=w.activeIsland!,side=gangwayGeometry(w)?.side??'east';
 const q=rotateDockPoint(side,map.size,p.x,p.y);
 return {x:q.x+map.offsetX,y:q.y+map.offsetY};
};
export function guardianTell(w:WorldState){
 const key=id(w),g=key?get(w)?.guards[key]:undefined;
 if(!g)return null;
 return {warn:g.tell?{...g.tell,label:label[g.tell.skill]}:null,trail:g.trail&&g.trail.until>w.tick?g.trail:null,
   exposed:g.exposed>w.tick,last:events.get(w)??null};
}
function segment(at:Vec2,a:Vec2,b:Vec2){
 const x=b.x-a.x,y=b.y-a.y,t=Math.max(0,Math.min(1,((at.x-a.x)*x+(at.y-a.y)*y)/Math.max(.01,x*x+y*y)));
 return gap(at,{x:a.x+x*t,y:a.y+y*t});
}
export function guardianWalkScale(w:WorldState):number{
 const view=guardianTell(w),p=w.player,t=view?.trail;
 return t&&areaAt(w,p.x,p.y)==='island'&&segment(p,t.a,t.b)<.72?.58:1;
}
export function guardianHitScale(w:WorldState,e:WildEntity):number{
 const k=actual(w,e),g=k?get(w)?.guards[k]:undefined;
 return g?.tell?.skill==='shell' ? .5 : g&&g.exposed>w.tick ? 1.4 : 1;
}
export function clearGuardianStage(w:WorldState,island:string|null):void{
 if(recognized(island)){const a=get(w);if(a)delete a.guards[island];}
 events.delete(w);
}
export function awardGuardian(w:WorldState,e:WildEntity):void{
 const k=actual(w,e);if(!k)return;
 const a=ready(w);
 if(a.loot[k]===undefined)a.loot[k]=local(w,e);
 delete a.guards[k];
}
export function guardianLoot(w:WorldState){
 const key=id(w),map=w.activeIsland;if(!key||!map||!w.sky.islands.find(n=>n.id===key)?.bossDefeated)return null;
 const state=get(w)?.loot[key];if(state===true)return null;
 const where=project(w,state??{x:25.5,y:32.5});
 return {...where,...rewards[key],canTake:areaAt(w,w.player.x,w.player.y)==='island'&&gap(w.player,where)<=1.77};
}
export function takeGuardianLoot(w:WorldState):{issue:string|null;name:string}{
 const a=guardianLoot(w),key=id(w);
 if(!key||!a?.canTake||incapacitated(w))return {issue:'走近守卫留下的图纸。',name:''};
 if(!inventoryChange(w,[],[{itemId:a.blueprint,count:1}]))return {issue:'先腾出背包空间，图纸会留在原地。',name:a.name};
 ready(w).loot[key]=true;
 return {issue:null,name:a.name};
}
export function guardianBlueprint(w:WorldState,gear:string):string|null{
 for(const [key,row] of Object.entries(rewards))if(row.gear===gear)
   return get(w)?.loot[key as Island]===true?null:row.name;
 return null;
}

export function stepGuardian(w:WorldState,e:WildEntity,summon:(p:Vec2,n:number)=>void):boolean{
 const k=actual(w,e);if(!k||areaAt(w,w.player.x,w.player.y)!=='island')return false;
 const p=w.player,archive=ready(w),g=archive.guards[k]??={cycle:0,next:w.tick+67,tell:null,exposed:0};
 const a=g.tell;
 if(!a){
  if(g.exposed>w.tick)return true;
  if(g.next>w.tick||gap(e,p)>5.9||incapacitated(w))return false;
  const skill=cycles[k][g.cycle%2];
  const dist=gap(e,p),cap=Math.min(4.5,dist);
  const dir=dist>.01?cap/dist:0;
  g.tell={skill,at:point(e),aim:skill==='dash'?{x:e.x+(p.x-e.x)*dir,y:e.y+(p.y-e.y)*dir}:point(p),until:w.tick+duration[skill]};
  return true;
 }
 if(w.tick<a.until)return true;
 g.tell=null;g.cycle++;g.next=w.tick+(a.skill==='shell'?165:103);
 events.set(w,{skill:a.skill,at:point(e),until:w.tick+42});
 if(a.skill==='dash'){
  const end=point(a.at);
  const length=gap(a.at,a.aim),max=Math.ceil(length/.18);
  for(let j=1;j<=max;j++){
   const t=j/max,q={x:a.at.x+(a.aim.x-a.at.x)*t,y:a.at.y+(a.aim.y-a.at.y)*t};
   if(areaAt(w,q.x,q.y)!=='island')break;
   Object.assign(end,q);
  }
  if(gap(a.at,end)>.08){
   Object.assign(e,end);g.trail={a:a.at,b:end,until:w.tick+112};
   if(segment(p,a.at,end)<.72)damagePlayer(w,17,'physical');
  }
 }else if(a.skill==='howl'){
  const sites=[{x:e.x-.2,y:e.y-2.2},{x:e.x+1.9,y:e.y+1.75},{x:e.x-2,y:e.y+1.55}]
   .filter(q=>areaAt(w,q.x,q.y)==='island'&&gap(q,p)>1.35);
  for(const [n,q] of sites.slice(0,2).entries())summon(q,n);
 }else if(a.skill==='quake'){
  if(gap(a.at,p)<3.27)damagePlayer(w,21,'physical');
 }else{
  if(gap(a.at,p)<2.18)damagePlayer(w,20,'physical');
  g.exposed=w.tick+88;
 }
 return true;
}
export function validGuardians(w:WorldState):boolean{
 const data=get(w);if(data===undefined)return true;
 const record=(r:unknown):r is Record<string,unknown>=>!!r&&typeof r==='object'&&!Array.isArray(r);
 const tick=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>=0&&Number(n)<=w.tick+250;
 const coords=(p:unknown,bound:number)=>record(p)&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(Number(p.x))<bound&&Math.abs(Number(p.y))<bound;
 if(!record(data)||!record(data.guards)||!record(data.loot))return false;
 return Object.entries(data.guards).every(([k,g])=>recognized(k)&&record(g)&&Number.isSafeInteger(g.cycle)&&Number(g.cycle)>=0&&tick(g.next)&&tick(g.exposed)&&
   (g.tell===null||record(g.tell)&&Object.hasOwn(duration,String(g.tell.skill))&&tick(g.tell.until)&&coords(g.tell.at,220)&&coords(g.tell.aim,220))&&
   (g.trail===undefined||record(g.trail)&&tick(g.trail.until)&&coords(g.trail.a,220)&&coords(g.trail.b,220)))&&
 Object.entries(data.loot).every(([k,x])=>recognized(k)&&w.sky.islands.some(n=>n.id===k&&n.bossDefeated)&&(x===true||coords(x,81)));
}
