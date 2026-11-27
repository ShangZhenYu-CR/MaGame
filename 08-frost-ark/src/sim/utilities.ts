import type { BuildingInstance,WorldState } from './types';
import { buildingDefs,countItem,inventoryChange } from './ark';

export const overlayKind=(defId:string)=>defId==='heat_pipe'||defId==='insulated_floor';
export const utilityAt=(w:WorldState,x:number,y:number,id?:string)=>
  w.ark.buildings.find(b=>overlayKind(b.defId)&&b.gx===x&&b.gy===y&&(!id||b.defId===id));
const cardinal=[[-1,0],[1,0],[0,-1],[0,1]] as const;
const key=(x:number,y:number)=>x+':'+y;
export function heatedPipes(w:WorldState):Map<string,number>{
 const all=w.ark.buildings.filter(b=>b.defId==='heat_pipe'&&b.hp>1);
 const hearth=w.ark.buildings.find(b=>b.defId==='hearth_core'&&b.fuel>0);
 const result=new Map<string,number>();
 if(!all.length||!hearth)return result;
 const byCell=new Map(all.map(b=>[key(b.gx,b.gy),b]));
 const touches=(x:number,y:number)=>x>=hearth.gx&&x<hearth.gx+2&&y>=hearth.gy&&y<hearth.gy+2;
 const todo=all.filter(b=>touches(b.gx,b.gy)||cardinal.some(([x,y])=>touches(b.gx+x,b.gy+y)));
 for(const b of todo)result.set(b.id,0);
 for(let i=0;i<todo.length;i++){
  const b=todo[i],range=result.get(b.id)!;
  if(range>=26)continue;
  for(const [dx,dy] of cardinal){
   const next=byCell.get(key(b.gx+dx,b.gy+dy));
   if(next&&!result.has(next.id)){result.set(next.id,range+1);todo.push(next);}
  }
 }
 return result;
}
export function pipeHeat(w:WorldState){
 const ranges=heatedPipes(w);
 return w.ark.buildings.flatMap(b=>{
   const n=ranges.get(b.id);
   return n===undefined?[]:[{x:b.gx+.5,y:b.gy+.5,radius:2.35,power:Math.max(9,47-n*2.8),kind:'heat_pipe'}];
 });
}
function hasHammer(w:WorldState){return countItem(w,'repair_hammer')>0;}
export function needsRepair(w:WorldState,id?:string){
 return w.ark.buildings.filter(b=>b.hp<b.maxHp&&(!id||b.id===id)&&!overlayKind(b.defId));
}
export function repairQuote(w:WorldState,id?:string){
 const damaged=needsRepair(w,id),missing=damaged.reduce((n,b)=>n+b.maxHp-b.hp,0);
 return {damaged,inputs:missing>0?[
   {itemId:'driftwood',count:Math.ceil(missing/36)},{itemId:'frost_iron_scrap',count:Math.ceil(missing/105)},
 ]:[],hammer:hasHammer(w)};
}
export function repairPanel(w:WorldState){
 const {damaged,inputs,hammer}=repairQuote(w);
 return {hammer,inputs,targets:damaged.map(b=>({id:b.id,gx:b.gx,gy:b.gy,missing:Math.ceil(b.maxHp-b.hp),
   name:buildingDefs.get(b.defId)?.name??b.id,inputs:repairQuote(w,b.id).inputs}))};
}
export function repairAt(w:WorldState,table:BuildingInstance,id?:string):string|null{
 if(table.defId!=='repair_station'||Math.hypot(w.player.x-table.gx-.5,w.player.y-table.gy-.5)>2.05)
  return '走近修理台后再动手';
 const q=repairQuote(w,id);
 if(!q.hammer)return '先在木工台制作修理锤';
 if(!q.damaged.length)return '没有要修的建筑';
 if(!inventoryChange(w,q.inputs,[]))return '材料不足，没有扣料';
 for(const b of q.damaged)b.hp=b.maxHp;
 return null;
}
