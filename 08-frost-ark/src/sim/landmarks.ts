import { inventoryChange,itemNames } from './ark';
import { downDock } from './dock-direction';
import { dockedIsland,gangwayGeometry,islandNodes } from './island';
import { damagePlayer,incapacitated } from './rescue';
import { TICK_RATE,type IslandState,type ItemStack,type Vec2,type WorldState } from './types';

export const LANDMARK_DURATION=45*TICK_RATE;
export const landmarkZones={
  cloud_shallows:['camp','spring','wreck'],
  frostpine_isles:['camp','spring','obelisk'],
  sulfur_rift:['spring','vent','wreck'],
  aurora_zenith:['camp','obelisk','wreck'],
} as const;
type Biome=keyof typeof landmarkZones;
export type LandmarkKind=(typeof landmarkZones[Biome])[number];
const titles={camp:'冰封前哨营地',spring:'地热温泉池',obelisk:'古代暖能方尖碑',vent:'硫磺喷气口',wreck:'失事飞艇残骸'};
const pages:Partial<Record<Biome,string>>={
  cloud_shallows:'航海残页·拾荒者：把缺口留在背风的一面，下一艘方舟也能在这里靠岸。',
  frostpine_isles:'航海残页·守火人：石碑的冰色凹槽是一只炉口，碎冰晶是它认得的燃料。',
  aurora_zenith:'航海残页·末班船：越过永冻线之后，追着曙色走，莫跟着鲸影转舵。',
};
export interface Landmark extends Vec2 {kind:LandmarkKind;id:string;biome:Biome;phase:number}
interface LandmarkMemory {picked?:true;litUntil?:number}
type Archive=WorldState&{landmarksP2?:Record<string,LandmarkMemory>};
const records=(w:WorldState)=>(w as Archive).landmarksP2;
const memory=(w:WorldState)=>((w as Archive).landmarksP2??={});
const layout=new WeakMap<IslandState,readonly Landmark[]>();
const near=(a:Vec2,b:Vec2)=>Math.hypot(a.x-b.x,a.y-b.y);

const mix=(a:number,b:number,c:number)=>{
 let h=Math.imul(a^Math.imul(b,0x27d4eb2d)^Math.imul(c,0x1b873593),0x85ebca6b);
 h=Math.imul(h^(h>>>13),0xc2b2ae35);return ((h^(h>>>16))>>>0)/4294967296;
};
export function islandLandmarks(w:WorldState):readonly Landmark[]{
 const island=dockedIsland(w),bridge=gangwayGeometry(w);
 if(!island||!bridge)return [];
 const old=layout.get(island);if(old)return old;
 const node=w.sky.islands.find(n=>n.id===island.nodeId);
 if(!node||!(node.biomeId in landmarkZones))return [];
 const biome=node.biomeId as Biome,types=landmarkZones[biome],resources=islandNodes(w);
 const pos=(p:Vec2)=>island.tiles[(Math.floor(p.y)-island.offsetY)*island.size+Math.floor(p.x)-island.offsetX]??0;
 const list:Landmark[]=[];
 for(const [i,kind] of types.entries()){
   const favored=kind==='spring'?8:kind==='camp'?11:kind==='vent'?16:kind==='obelisk'?17:19;
   const bend=(i%2===0?1:-1)*(4+Math.floor(mix(node.seed,i,102)*5));
   let best:Vec2|undefined, bestScore=Infinity;
   for(let fore=6;fore<=33;fore++)for(let across=-18;across<=18;across++){
    const p=downDock(bridge.landing,bridge.side,fore,across);
    if(!pos(p)||![[1,0],[-1,0],[0,1],[0,-1]].every(([x,y])=>pos({x:p.x+x,y:p.y+y})))continue;
    if(list.some(a=>near(a,p)<6.2)||resources.some(a=>near(a,p)<2.3))continue;
    if(biome==='aurora_zenith'&&[[4,-3],[9,4],[11,-3]].some(([x,y])=>Math.hypot(x-fore,y-across)<2.2))continue;
    const score=Math.abs(fore-favored)+Math.abs(across-bend)*.68+mix(node.seed,fore,across)*3.1;
    if(score<bestScore){best=p;bestScore=score;}
   }
   if(best)list.push({...best,kind,id:node.id+':'+kind,biome,phase:Math.floor(mix(node.seed,i,214)*VENT_PERIOD)});
 }
 layout.set(island,list);return list;
}
export function nearLandmark(w:WorldState,max=1.9):Landmark|undefined{
 if(!w.activeIsland)return;
 return islandLandmarks(w).filter(p=>near(p,w.player)<=max).sort((a,b)=>near(a,w.player)-near(b,w.player))[0];
}
export function landmarkLit(w:WorldState,l:Landmark):number{
 return l.kind==='obelisk'?Math.max(0,(records(w)?.[l.id]?.litUntil??0)-w.tick):0;
}
const VENT_PERIOD=14*TICK_RATE,VENT_WARNING=44,VENT_ACTIVE=22;
export const VENT_RADIUS=2;
export function ventState(w:WorldState,l:Landmark):'quiet'|'warning'|'active'{
 const phase=(w.tick+l.phase)%VENT_PERIOD;
 return phase>=VENT_PERIOD-VENT_ACTIVE?'active':phase>=VENT_PERIOD-VENT_ACTIVE-VENT_WARNING?'warning':'quiet';
}
export function fieldLandmarks(w:WorldState,x:number,y:number,ambient:number):number{
 if(!w.activeIsland)return 0;
 let boost=0;
 for(const mark of islandLandmarks(w)){
   const spring=mark.kind==='spring',lit=landmarkLit(w,mark);
   if(!spring&&!lit)continue;
   const radius=spring?3.15:5.2, d=near(mark,{x,y});
   if(d>=radius)continue;
   const strength=Math.min(1,(radius-d)/(radius-(spring?1.15:1.6)));
   boost=Math.max(boost,Math.max(0,(spring?39:42)-ambient)*strength);
 }
 return boost;
}
function haul(l:Landmark):ItemStack[]{
 if(l.kind==='camp')return [{itemId:'driftwood',count:5},{itemId:'warm_berry',count:2},{itemId:'frost_grass',count:3}];
 return [{itemId:'rope',count:3},{itemId:l.biome==='sulfur_rift'?'sulfur_ore':l.biome==='aurora_zenith'?'sky_mithril':'frost_iron_scrap',count:2}];
}
const haulText=(l:Landmark)=>haul(l).map(s=>(itemNames.get(s.itemId)??s.itemId)+' ×'+s.count).join(' · ');
export function landmarkPrompt(w:WorldState,l:Landmark){
 const title=titles[l.kind],old=records(w)?.[l.id],lit=landmarkLit(w,l);
 switch(l.kind){
  case 'camp':return {title,detail:old?.picked?pages[l.biome]??'航海残页已收录。':'发掘航海残页，并收取密封补给。',label:old?.picked?'读残页':'搜营地'};
  case 'spring':return {title,detail:'贴近水面可持续回温，无需消耗物资。',label:''};
  case 'obelisk':return {title,detail:lit?'暖圈剩 '+Math.ceil(lit/TICK_RATE)+' 秒 · 站在圈内回温':'投入冰晶碎块 ×1，点亮 45 秒暖圈。',label:lit?'':'投冰晶'};
  case 'vent':{const v=ventState(w,l);return {title,detail:v==='warning'?'地面岩圈发亮，立即离开！':v==='active'?'正在喷发，远离喷口。':'蒸气渐浓时会预警，留出撤离空间。',label:''};}
  case 'wreck':return {title,detail:old?.picked?'木骨和铜肋已经露出，没剩下可搬走的补给。':'还能回收：'+haulText(l),label:old?.picked?'':'搜残骸'};
 }
}
export function actionLandmark(w:WorldState,l:Landmark):{issue:string|null;message:string}{
 const bad=(issue:string)=>({issue,message:''}),ok=(message:string)=>({issue:null,message});
 if(incapacitated(w)||!w.activeIsland)return bad('先恢复意识，或登岛后再进行探索。');
 const point=islandLandmarks(w).find(m=>m.id===l.id);
 if(!point||near(w.player,point)>1.9)return bad('请靠近地标。');
 const old=records(w)?.[point.id];
 switch(point.kind){
  case 'camp':
  case 'wreck':
   if(old?.picked)return ok(point.kind==='camp'?(pages[point.biome]??'航海残页已收录。'):'残骸已经搜空。');
   if(!inventoryChange(w,[],haul(point)))return bad('背包空间不足，补给仍留在原处。');
   memory(w)[point.id]={picked:true};
   return ok(point.kind==='camp'?'已取得航海残页与补给。':'已回收残骸中的补给。');
  case 'obelisk':
   if(landmarkLit(w,point))return ok('方尖碑仍亮着。');
   if(!inventoryChange(w,[{itemId:'ice_shard',count:1}],[]))return bad('需要冰晶碎块 ×1。');
   memory(w)[point.id]={litUntil:w.tick+LANDMARK_DURATION};
   return ok('冰晶点亮方尖碑，暖圈持续 45 秒。');
  default:return ok(landmarkPrompt(w,point).detail);
 }
}
export function stepLandmarks(w:WorldState):void{
 if(!w.activeIsland||w.tick%6!==0)return;
 for(const l of islandLandmarks(w))
  if(l.kind==='vent'&&near(l,w.player)<=VENT_RADIUS&&ventState(w,l)==='active')damagePlayer(w,5);
}
export function validLandmarkArchive(w:WorldState):boolean{
 const data=records(w);
 if(data===undefined)return true;
 if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).length>8192)return false;
 const islands=new Map(w.sky.islands.map(n=>[n.id,n]));
 return Object.entries(data).every(([id,value])=>{
  const last=id.lastIndexOf(':'),node=islands.get(id.slice(0,last)),kind=id.slice(last+1);
  const types=node&&landmarkZones[node.biomeId as Biome] as readonly string[]|undefined;
  if(!types?.includes(kind)||!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==1)return false;
  if(kind==='camp'||kind==='wreck')return value.picked===true;
  return kind==='obelisk'&&Number.isSafeInteger(value.litUntil)&&value.litUntil!>=0&&value.litUntil!<=w.tick+LANDMARK_DURATION;
 });
}

const solidBase:Partial<Record<LandmarkKind,Vec2>>={camp:{x:.70,y:.43},obelisk:{x:.37,y:.28},wreck:{x:.94,y:.40}};
export function landmarkFootClear(w:WorldState,previous:Vec2,next:Vec2,radius:number):boolean{
  if(!w.activeIsland)return true;
  for(const l of islandLandmarks(w)){
    const base=solidBase[l.kind];
    if(!base)continue;
    const level=(p:Vec2)=>((p.x-l.x)/(base.x+radius))**2+((p.y-l.y)/(base.y+radius))**2;
    const n=level(next);
    // Old positions or a rescue loaded inside a new prop can still walk out.
    if(n<1&&n<=level(previous))return false;
  }
  return true;
}
