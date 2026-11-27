import { buildingDefs,countItem,inventoryChange,itemStackLimits } from './ark';
import { FUEL_MAX } from './heatField';
import { ensureIndustrySave,getIndustrySave,type IndustryStation } from './m2-state';
import { transferFeedFromNetwork } from './beasts';
import { addNetworkStorage } from './storage-box';
import { TICK_RATE,type BuildingInstance,type ItemStack,type Vec2,type WorldState } from './types';

const BINS=8;
const materials=new Map([['driftwood',18],['coal_chunk',48]]);
const intermediates=new Set(['sorter_arm','steam_chute']);
const allowedTargets=new Set(['storage_box','fuel_hopper','hearth_core','furnace','feed_trough']);
export const NETWORK_FURNACE_MAX=150;
export const networkFuel=(id:string)=>materials.get(id)??0;
export const networkStation=(w:WorldState,b:BuildingInstance):IndustryStation=>
  ensureIndustrySave(w).stations[b.id]??={intake:[],output:[],job:null,cycle:0};
export function addLogisticsItem(bin:ItemStack[],item:ItemStack):boolean{
 const entry=bin.find(s=>s.itemId===item.itemId),cap=itemStackLimits.get(item.itemId)??0;
 if((entry?.count??0)+item.count>cap||(!entry&&bin.length>=BINS))return false;
 if(entry)entry.count+=item.count;else bin.push({...item});
 return true;
}
function takeOne(bin:ItemStack[],itemId:string){
 const idx=bin.findIndex(x=>x.itemId===itemId);
 if(idx>=0&&!--bin[idx].count)bin.splice(idx,1);
}
const center=(b:BuildingInstance):Vec2=>{
 const [bw,bh]=buildingDefs.get(b.defId)?.size??[1,1];return {x:b.gx+bw*.5,y:b.gy+bh*.5};
};
function adjacent(a:BuildingInstance,b:BuildingInstance){
 const [ax,ay]=buildingDefs.get(a.defId)?.size??[1,1],[bx,by]=buildingDefs.get(b.defId)?.size??[1,1];
 const dx=Math.max(a.gx-b.gx-bx+1,b.gx-a.gx-ax+1,0);
 const dy=Math.max(a.gy-b.gy-by+1,b.gy-a.gy-ay+1,0);
 return dx+dy===1;
}
type Route={end:BuildingInstance;path:BuildingInstance[]};
function routes(w:WorldState,start:BuildingInstance):Route[]{
 const pending:Array<[BuildingInstance,BuildingInstance[]]>=[[start,[start]]];
 const seen=new Set([start.id]),destinations:Route[]=[];
 for(let i=0;i<pending.length;i++){
  const [node,path]=pending[i];
  for(const next of w.ark.buildings){
   if(seen.has(next.id)||!adjacent(node,next))continue;
   if(next.defId==='steam_chute'){
    seen.add(next.id);pending.push([next,[...path,next]]);
   }else if(allowedTargets.has(next.defId)){
    seen.add(next.id);destinations.push({end:next,path:[...path,next]});
   }
  }
 }
 return destinations;
}

export function routePanel(w:WorldState,b:BuildingInstance){
 const enabled=intermediates.has(b.defId),discovered=enabled?routes(w,b):[];
 return {mode:getIndustrySave(w)?.stations[b.id]?.route??'buffer',
  options:discovered.map(({end,path})=>({id:end.id,kind:end.defId,name:buildingDefs.get(end.defId)?.name??end.id,
    gx:end.gx,gy:end.gy,hops:path.length-1})),
  fuel:b.defId==='fuel_hopper'?getIndustrySave(w)?.stations[b.id]?.intake??[]:null,
  stats:marks.get(w)?.stats??null};
}
export function setLogisticsRoute(w:WorldState,b:BuildingInstance,dest:string):string|null{
 if(!intermediates.has(b.defId))return '这不是可分拣设备';
 if(!['auto','buffer'].includes(dest)&&!routes(w,b).some(r=>r.end.id===dest))return '该目标断开或不在相邻传输线路上';
 networkStation(w,b).route=dest;return null;
}
export function loadHopper(w:WorldState,b:BuildingInstance,itemId:string):string|null{
 if(b.defId!=='fuel_hopper'||!materials.has(itemId))return '料斗只接受浮木和浮煤';
 if(!countItem(w,itemId))return '背包没有这种燃料';
 const station=networkStation(w,b),bins=station.intake.map(s=>({...s}));
 const item={itemId,count:1};
 if(!addLogisticsItem(bins,item))return '料斗装不下了';
 if(!inventoryChange(w,[item],[]))return '燃料未取出';
 station.intake=bins;return null;
}
export interface TransportEvent{
 path:Vec2[];item:string;tick:number;
}
interface Trace{
 events:TransportEvent[];stats:{delivered:number;hearthRefills:number;furnaceRefills:number;feed:number;storage:number};
}
const marks=new WeakMap<WorldState,Trace>();
const trace=(w:WorldState)=>{
 let t=marks.get(w);
 if(!t){t={events:[],stats:{delivered:0,hearthRefills:0,furnaceRefills:0,feed:0,storage:0}};marks.set(w,t);}
 return t;
};
function moved(w:WorldState,path:BuildingInstance[],item:string){
 const t=trace(w);t.stats.delivered++;
 t.events.push({path:path.map(center),item,tick:w.tick});
 if(t.events.length>28)t.events.shift();
}
export const transportEvents=(w:WorldState)=>marks.get(w)?.events.filter(x=>w.tick-x.tick<22)??[];
export const logisticsStats=(w:WorldState)=>marks.get(w)?.stats;

function burnToBuffer(w:WorldState,b:BuildingInstance,id:string):boolean{
 const value=networkFuel(id),cap=b.defId==='hearth_core'?(FUEL_MAX[b.level]??120):NETWORK_FURNACE_MAX;
 if(!value||b.fuel>cap*.57||b.fuel+value>cap+1e-8)return false;
 b.fuel+=value;
 const t=trace(w);
 if(b.defId==='hearth_core')t.stats.hearthRefills++;else t.stats.furnaceRefills++;
 return true;
}
function receive(w:WorldState,b:BuildingInstance,item:ItemStack){
 const id=item.itemId;
 if(b.defId==='storage_box')return addNetworkStorage(w,b.id,item);
 if(b.defId==='feed_trough')return transferFeedFromNetwork(w,b,id,item.count);
 if(b.defId==='hearth_core')return burnToBuffer(w,b,id);
 if(b.defId==='furnace'){
  if(networkFuel(id))return burnToBuffer(w,b,id);
  return id==='frost_iron_scrap'&&addLogisticsItem(networkStation(w,b).intake,item);
 }
 return b.defId==='fuel_hopper'&&materials.has(id)&&addLogisticsItem(networkStation(w,b).intake,item);
}
function rank(target:BuildingInstance,id:string){
 if(networkFuel(id))return target.defId==='fuel_hopper'?0:target.defId==='hearth_core'||target.defId==='furnace'?1:2;
 if(id==='beast_feed'||id==='raw_root'||id==='raw_meat'||id==='cloud_fish')return target.defId==='feed_trough'?0:2;
 if(id==='frost_iron_scrap')return target.defId==='furnace'?0:2;
 return 2;
}
export function runNetworkPass(w:WorldState):void{
 if(w.tick%TICK_RATE!==0)return;
 const live=getIndustrySave(w);
 if(!live)return;
 for(const b of w.ark.buildings){
  const s=live.stations[b.id];
  if(!s||b.frozen)continue;
  if(b.defId==='fuel_hopper'&&s.intake.length){
   const destinations=w.ark.buildings.filter(x=>['hearth_core','furnace'].includes(x.defId)&&adjacent(b,x))
    .sort((a,c)=>a.fuel-c.fuel);
   for(const target of destinations){
    const item=s.intake.find(q=>materials.has(q.itemId));
    if(item&&burnToBuffer(w,target,item.itemId)){takeOne(s.intake,item.itemId);moved(w,[b,target],item.itemId);}
   }
  }
  if(!intermediates.has(b.defId)||!s.route||s.route==='buffer'||!s.output.length)continue;
  const graph=routes(w,b).filter(r=>s.route==='auto'||r.end.id===s.route);
  for(const stock of s.output){
   const packet:ItemStack={...stock,count:1};
   const choices=[...graph].sort((a,c)=>rank(a.end,stock.itemId)-rank(c.end,stock.itemId)||a.path.length-c.path.length);
   const route=choices.find(r=>receive(w,r.end,packet));
   if(route){
    takeOne(s.output,packet.itemId);moved(w,route.path,packet.itemId);
    if(route.end.defId==='storage_box')trace(w).stats.storage++;
    if(route.end.defId==='feed_trough')trace(w).stats.feed++;
    break;
   }
  }
 }
}
