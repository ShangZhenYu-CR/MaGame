import { nearHelm } from './sky-map';
import { getNavigation } from './m3-state';
import { nextRng } from './rng';
import { incapacitated } from './rescue';
import { TICK_RATE,type IslandNode,type WorldState } from './types';

export const PROCEDURAL_SIGNAL=24;
export const CHART_VISIBLE=18;
const SCAN_COOLDOWN=14*TICK_RATE;
const regionKeys=['cloud_shallows','frostpine_isles','sulfur_rift','aurora_zenith'] as const;
export type WindZone=(typeof regionKeys)[number];
export type ExpeditionTier=1|2|3|4;
interface Survey { serial:number;next:number;visited:string[] }
type Saved=WorldState&{surveysP2?:Survey};
const archive=(w:WorldState)=>(w as Saved).surveysP2;
const log=(w:WorldState)=>((w as Saved).surveysP2??={serial:0,next:0,visited:[]});
const isExpedition=(id:string)=>/^exp[1-4]_\d+$/.test(id);
export const proceduralIsland=(n:IslandNode)=>isExpedition(n.id);
export const generatedDistance=(w:WorldState,n:IslandNode)=>Math.hypot(n.skyX-w.sky.x,n.skyY-w.sky.y);

export function voyageBiome(w:WorldState):WindZone{
 const fixed=w.sky.islands.find(v=>v.id===w.ark.anchoredIslandId);
 if(fixed&&regionKeys.includes(fixed.biomeId as WindZone))return fixed.biomeId as WindZone;
 const x=w.sky.x;
 return regionKeys[x>=36?3:x>=24?2:x>=12?1:0];
}
const prefixes=[['薄帆','白露','遗风','轻木','眠云','北舟'],['铁杉','冻芽','千针','松塔','冰羽','潜冬'],
 ['沉炉','铜脊','黑岩','烟囱','硫星','灼砂'],['蓝镜','照夜','静星','孤辉','寂环','雪轮']];
const endings=['礁','浮脊','台地','岬','碎屿','雾湾'];
export const scanWait=(w:WorldState)=>Math.max(0,(archive(w)?.next??0)-w.tick);
export function scanIssue(w:WorldState):string|null{
 if(incapacitated(w))return '恢复行动后再扫描。';
 if(w.sky.cruising)return '停船后再扫浮岛信号。';
 if(!nearHelm(w))return '走到方舟舵轮旁使用信号雷达。';
 const wait=scanWait(w);
 return wait?'雷达冷却中 · '+Math.ceil(wait/TICK_RATE)+' 秒':null;
}
interface CollisionBounds {min?:number;max?:number}
const lanes:Readonly<Record<ExpeditionTier,CollisionBounds>>={1:{max:11.8},2:{min:12.1,max:23.8},3:{min:24.1,max:35.8},4:{min:36.1}};
export function scanExpeditions(w:WorldState):{issue:string|null;found:IslandNode[]}{
 const blocked=scanIssue(w);
 if(blocked)return {issue:blocked,found:[]};
 const a=log(w),zone=voyageBiome(w),rank=regionKeys.indexOf(zone),tier=(rank+1) as ExpeditionTier,band=lanes[tier];
 const found:IslandNode[]=[];
 for(let i=0;i<2;i++){
   const serial=++a.serial;
   const rb=nextRng((w.seed^Math.imul(serial,0x6d2b79f5))|0);
   let rng=rb.state,spot:{x:number;y:number}|undefined;
   const clamp=(x:number)=>Math.max(band.min??-Infinity,Math.min(band.max??Infinity,x));
   for(let k=0;k<72;k++){
      const r=nextRng(rng),q=nextRng(r.state);rng=q.state;
      const angle=r.value*Math.PI*2,d=3.7+q.value*2.75;
      const x=clamp(w.sky.x+Math.cos(angle)*d),y=w.sky.y+Math.sin(angle)*d;
      if(Math.hypot(x-w.sky.x,y-w.sky.y)<2.8||w.sky.islands.some(n=>Math.hypot(n.skyX-x,n.skyY-y)<1.4))continue;
      spot={x,y};break;
   }
   // Saturated radar rings still keep finding islands farther along the same
   // wind belt; an occupied ring is never an artificial end to exploration.
   if(!spot){
     const x=clamp(w.sky.x),north=(serial%2===0?1:-1);
     let y=w.sky.y+north*7.2;
     while(w.sky.islands.some(n=>Math.hypot(n.skyX-x,n.skyY-y)<1.4))y+=north*1.7;
     spot={x,y};
   }
   const name=prefixes[rank][Math.floor(rb.value*6)]+endings[serial%6]+' · '+serial;
   const node={id:'exp'+tier+'_'+serial,name,biomeId:zone,tier,seed:rng|0,skyX:spot.x,skyY:spot.y,
       discovered:true,bossDefeated:false,deltas:{}};
   found.push(node);w.sky.islands.push(node);
 }
 a.next=w.tick+SCAN_COOLDOWN;
 const protectedIds=new Set([w.ark.anchoredIslandId,getNavigation(w)?.targetId,...a.visited,...found.map(n=>n.id)]);
 const extras=w.sky.islands.filter(proceduralIsland);
 if(extras.length>PROCEDURAL_SIGNAL){
   let remaining=extras.length-PROCEDURAL_SIGNAL;
   for(const x of extras){
     if(remaining<=0)break;
     if(protectedIds.has(x.id)||Object.keys(x.deltas).length>0)continue;
     w.sky.islands=w.sky.islands.filter(n=>n!==x);remaining--;
   }
 }
 return {issue:null,found};
}
export function noteIslandVisit(w:WorldState,id:string):void{
 if(!isExpedition(id))return;
 const a=log(w);if(!a.visited.includes(id))a.visited.push(id);
}
export function displayChartIslands(w:WorldState):IslandNode[]{
 const fixed=w.sky.islands.filter(n=>!proceduralIsland(n)),extras=w.sky.islands.filter(proceduralIsland);
 const must=new Set([w.ark.anchoredIslandId,getNavigation(w)?.targetId]);
 const ranked=extras.map(n=>({n,d:generatedDistance(w,n)})).sort((a,b)=>Number(must.has(b.n.id))-Number(must.has(a.n.id))||a.d-b.d);
 return [...fixed,...ranked.slice(0,CHART_VISIBLE).map(v=>v.n)];
}
export function validSurveyArchive(w:WorldState):boolean{
 const data=archive(w);if(!data)return data===undefined&&!w.sky.islands.some(proceduralIsland);
 if(!Number.isSafeInteger(data.serial)||data.serial<0||!Number.isSafeInteger(data.next)||data.next<0||
    data.next>w.tick+SCAN_COOLDOWN||!Array.isArray(data.visited)||new Set(data.visited).size!==data.visited.length)return false;
 const nodes=new Map(w.sky.islands.map(n=>[n.id,n]));
 return w.sky.islands.filter(proceduralIsland).every(n=>{
  const m=/^exp([1-4])_(\d+)$/.exec(n.id)!;
  return m[1]===String(n.tier)&&Number(m[2])>0&&Number(m[2])<=data.serial;
 })&&data.visited.every(id=>isExpedition(id)&&nodes.has(id));
}
