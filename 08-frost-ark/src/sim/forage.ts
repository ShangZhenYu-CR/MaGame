import sources from '../data/forage.json';
import { inventoryChange,itemNames,isDeck,isEdgeDeck } from './ark';
import { downDock } from './dock-direction';
import { dockedIsland,gangwayGeometry,islandNodes } from './island';
import { islandLandmarks } from './landmarks';
import { incapacitated } from './rescue';
import { TICK_RATE,type BuildingInstance,type IslandState,type ItemStack,type Vec2,type WildEntity,type WorldState } from './types';

export const forageBiomes=Object.keys(sources) as (keyof typeof sources)[];
type Biome=(typeof forageBiomes)[number];
const patchKinds=['berries','grass','tubers','crystal'] as const;
export type PatchKind=(typeof patchKinds)[number];
export const patchTitles={berries:'野生暖绒浆果丛',grass:'寒原干草簇',tubers:'冻薯地',crystal:'水晶矿脉'};
export const foodSources=sources;
interface ForageLedger{picked:Record<string,number>;fishing:Partial<Record<Biome,number>>;hunted?:Record<string,true>}
type Save=WorldState&{forageP2?:ForageLedger};
const get=(w:WorldState)=>(w as Save).forageP2;
const ensure=(w:WorldState)=>((w as Save).forageP2??={picked:{},fishing:{}});
export interface Patch extends Vec2 {kind:PatchKind;id:string;items:readonly string[]}
const cache=new WeakMap<IslandState,readonly Patch[]>();
const distance=(a:Vec2,b:Vec2)=>Math.hypot(a.x-b.x,a.y-b.y);
function drawSeed(seed:number,a:number,b:number){
 let h=Math.imul(seed^Math.imul(a+11,0x62b79305)^Math.imul(b+19,0x27d4eb2d),0x85ebca6b);
 h=Math.imul(h^(h>>>13),0xc2b2ae35);return ((h^(h>>>16))>>>0)/4294967296;
}
export function islandForage(w:WorldState):readonly Patch[]{
 const map=dockedIsland(w),g=gangwayGeometry(w);
 if(!map||!g)return [];
 const old=cache.get(map);if(old)return old;
 const node=w.sky.islands.find(n=>n.id===map.nodeId);
 if(!node||!Object.hasOwn(sources,node.biomeId))return [];
 const category=sources[node.biomeId as Biome],resources=islandNodes(w),landmarks=islandLandmarks(w),placed:Patch[]=[];
 // Guaranteed, memorable sites near each island's shore; offsets are local
 // to its actual dock, so gathering still works from any berth direction.
 for(const [i,kind] of patchKinds.entries()){
  const forward=[7,10,13,16][i],slope=[-2,2,-4,4][i]+(drawSeed(node.seed,i,177)>.7?1:0);
  let best:Vec2|undefined,cost=Infinity;
  for(let along=4;along<=28;along++)for(let across=-17;across<=17;across++){
   const p=downDock(g.landing,g.side,along,across),x=Math.floor(p.x)-map.offsetX,y=Math.floor(p.y)-map.offsetY;
   if(x<0||y<0||x>=map.size||y>=map.size||!map.tiles[y*map.size+x])continue;
   if(resources.some(n=>distance(n,p)<2.1)||landmarks.some(n=>distance(n,p)<2.6)||placed.some(n=>distance(n,p)<3.25))continue;
   const score=Math.abs(along-forward)*1.1+Math.abs(across-slope)*.8+drawSeed(node.seed,along,across)*2.6;
   if(score<cost){cost=score;best=p;}
  }
  if(best)placed.push({...best,kind,id:node.id+':'+kind,items:category[kind]});
 }
 cache.set(map,placed);return placed;
}

export function patchReady(w:WorldState,p:Patch):boolean{
 return w.day>(get(w)?.picked?.[p.id]??0);
}
export function nearForage(w:WorldState,range=1.72):Patch|undefined{
 if(!w.activeIsland)return;
 return islandForage(w).filter(p=>distance(p,w.player)<=range)
  .sort((a,b)=>distance(a,w.player)-distance(b,w.player))[0];
}
export const patchContents=(p:Patch)=>p.items.map(id=>itemNames.get(id)??id).join('、');
export function harvestForage(w:WorldState,p:Patch):string|null{
 if(incapacitated(w)||!w.activeIsland)return '恢复行动后再采集。';
 const place=islandForage(w).find(n=>n.id===p.id);
 if(!place||distance(place,w.player)>1.72)return '再靠近一点。';
 if(!patchReady(w,place))return '这里已经采过，明天会重新长出。';
 const loot=place.items.map((itemId,i)=>({itemId,count:i===0?2:1}));
 if(!inventoryChange(w,[],loot))return '背包空间不足，原料仍留在这里。';
 ensure(w).picked[p.id]=w.day;
 return null;
}

export function quarryDrops(w:WorldState):readonly WildEntity[]{
 const node=w.activeIsland?.nodeId;if(!node)return [];
 return w.wildEntities.filter(e=>e.kind==='beast'&&e.hp===0&&e.homeIslandId===node&&!get(w)?.hunted?.[e.id]);
}
export function nearQuarry(w:WorldState,range=1.7):WildEntity|undefined{
 return quarryDrops(w).filter(e=>distance(e,w.player)<=range).sort((a,b)=>distance(a,w.player)-distance(b,w.player))[0];
}
export function collectQuarry(w:WorldState,id:string):string|null{
 if(incapacitated(w))return '恢复行动后再拾取。';
 const prey=quarryDrops(w).find(e=>e.id===id&&distance(e,w.player)<=1.7);
 if(!prey)return '没有可拾取的云兽肉。';
 if(!inventoryChange(w,[],[{itemId:'raw_meat',count:2}]))return '背包空间不足，肉仍留在原处。';
 (ensure(w).hunted??={})[id]=true;
 return null;
}

export const FISH_CHEST='drift_treasure';
const FISH_TIME=Math.round(3.5*TICK_RATE);
type Cast={station:string;start:number;center:number;half:number;biome:Biome};
const active=new WeakMap<WorldState,Cast>();
const center=(b:BuildingInstance)=>({x:b.gx+.50,y:b.gy+.72});
export function nearFishing(w:WorldState):BuildingInstance|undefined{
 if(!isDeck(w,Math.floor(w.player.x),Math.floor(w.player.y))||w.activeIsland)return;
 return w.ark.buildings.filter(b=>b.defId==='fishing_spot'&&b.hp>0&&distance(center(b),w.player)<=1.64)
  .sort((a,b)=>distance(center(a),w.player)-distance(center(b),w.player))[0];
}
function fishingBiome(w:WorldState):Biome{
 const dock=w.sky.islands.find(n=>n.id===w.ark.anchoredIslandId);
 if(dock&&Object.hasOwn(sources,dock.biomeId))return dock.biomeId as Biome;
 const nearest=w.sky.islands.filter(n=>Object.hasOwn(sources,n.biomeId))
  .map(n=>({n,d:Math.hypot(n.skyX-w.sky.x,n.skyY-w.sky.y)})).sort((a,b)=>a.d-b.d)[0];
 return nearest&&nearest.d<6.8?nearest.n.biomeId as Biome:'cloud_shallows';
}
export function fishingPanel(w:WorldState){
 const cast=active.get(w);
 if(!cast)return null;
 return {peek:Math.min(1,Math.max(0,(w.tick-cast.start)/FISH_TIME)),
   left:cast.center-cast.half,right:cast.center+cast.half,station:cast.station,biome:cast.biome};
}
export function cancelFishing(w:WorldState):void{active.delete(w);}
function fishingUnusable(w:WorldState,b:BuildingInstance):string|null{
 if(incapacitated(w))return '恢复意识后再下钩。';
 if(!isEdgeDeck(w,b.gx,b.gy))return '这里已不靠云海，请把垂钓位移回舷边。';
 if(w.sky.cruising)return '巡航中不能钓鱼，停船再试。';
 return null;
}
export function fishingAction(w:WorldState):{issue:string|null;message:string;caught?:string}{
 const bad=(issue:string)=>({issue,message:''});
 const b=nearFishing(w),cast=active.get(w);
 if(!b){cancelFishing(w);return bad('走到舷边垂钓位旁。');}
 const issue=fishingUnusable(w,b);if(issue){cancelFishing(w);return bad(issue);}
 if(!cast){
  const biome=fishingBiome(w),n=get(w)?.fishing[biome]??0;
  const u=drawSeed(w.seed,n,b.gx*61+b.gy);
  active.set(w,{station:b.id,start:w.tick,biome,center:.48+u*.24,half:.109});
  return {issue:null,message:'已抛线。游标进入亮区时按 E 或空格收线。'};
 }
 cancelFishing(w);
 if(cast.station!==b.id)return bad('离开了原来的钓位，鱼线已收回。');
 const p=(w.tick-cast.start)/FISH_TIME;
 if(Math.abs(p-cast.center)>cast.half)return bad(p<cast.center?'收线太早，鱼还没咬牢。':'收线太晚，鱼逃走了。');
 const n=get(w)?.fishing[cast.biome]??0,id=['cloud_fish',...sources[cast.biome].fish][n%3];
 const items:ItemStack[]=[{itemId:id,count:1}];
 const chest=(n+1)%5===0;
 if(chest)items.push({itemId:FISH_CHEST,count:1});
 if(!inventoryChange(w,[],items))return bad('背包空间不足，鱼未收起；垂钓进度保留。');
 ensure(w).fishing[cast.biome]=n+1;
 return {issue:null,message:'钓起：'+itemNames.get(id)+(chest?'，同时捞起稀有漂流宝匣。':'。'),caught:id};
}
export function stepFishing(w:WorldState):string|null{
 const cast=active.get(w);
 if(!cast)return null;
 const b=nearFishing(w);
 if(!b||b.id!==cast.station||fishingUnusable(w,b)){cancelFishing(w);return '已离开垂钓位，鱼线收回。';}
 if(w.tick-cast.start>FISH_TIME){cancelFishing(w);return '鱼没咬上，按 E 再抛一竿。';}
 return null;
}
export function openFishChest(w:WorldState):string|null{
 if(incapacitated(w))return '先恢复意识。';
 if(inventoryChange(w,[{itemId:FISH_CHEST,count:1}],[{itemId:'frost_iron_scrap',count:2},{itemId:'rope',count:1},{itemId:'ice_shard',count:1}]))return null;
 return '缺少宝匣或背包空间不足。';
}
export function validForageArchive(w:WorldState):boolean{
 const data=get(w);if(data===undefined)return true;
 const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
 if(!object(data)||!object(data.picked)||!object(data.fishing)||Object.keys(data.picked).length>32768||Object.keys(data.fishing).length>4)return false;
 const keys=new Set(w.sky.islands.map(n=>n.id));
 if(data.hunted!==undefined&&(!object(data.hunted)||Object.keys(data.hunted).length>8192||
    !Object.entries(data.hunted).every(([id,b])=>b===true&&id.length<=128&&id.startsWith('wild_'))))return false;
 return Object.entries(data.picked).every(([id,d])=>{
   const j=id.lastIndexOf(':');return keys.has(id.slice(0,j))&&patchKinds.includes(id.slice(j+1) as PatchKind)&&Number.isSafeInteger(d)&&d>0&&d<=w.day;
 })&&Object.entries(data.fishing).every(([id,n])=>Object.hasOwn(sources,id)&&Number.isSafeInteger(n)&&n>=0);
}
