import { trackTurret } from './turret-aim';
import { heatAt } from './heatField';
import { envelope } from './rooms';
import { takeNetworkStorage } from './storage-box';
import type { BuildingInstance,Vec2,WildEntity,WorldState } from './types';

export const defenseBuildingIds=['ice_barricade','ward_searchlight','oil_mortar','auto_repairer'] as const;
const IDs:ReadonlySet<string>=new Set(defenseBuildingIds);
const center=(b:BuildingInstance)=>({x:b.gx+.5,y:b.gy+.5});
const gap=(a:Vec2,b:Vec2)=>Math.hypot(a.x-b.x,a.y-b.y);
const LAMP_RANGE=5.3,BARRIER_RANGE=.80,MORTAR_RANGE=8.5,BLAST=2.1;
const HANG=21;
export interface Flight { from:Vec2;to:Vec2;launched:number;land:number;source:string }
interface DefenseEvent { kind:'spike'|'reveal'|'launch'|'blast'|'repair'; at:Vec2; until:number }
type Archive=WorldState&{defensesP2?:Flight[]};
const flights=(w:WorldState)=>(w as Archive).defensesP2??[];
const viewed=new WeakMap<WorldState,{tick:number;list:BuildingInstance[]}>();
const cache=(w:WorldState)=>{
 const old=viewed.get(w);if(old?.tick===w.tick)return old.list;
 const list=w.ark.buildings.filter(b=>b.hp>1&&IDs.has(b.defId));viewed.set(w,{tick:w.tick,list});return list;
};
const transient=new WeakMap<WorldState,DefenseEvent[]>();
const seen=new WeakMap<WorldState,Set<string>>();
function flash(w:WorldState,kind:DefenseEvent['kind'],at:Vec2,ttl:number){
 const a=defenseEvents(w);a.push({kind,at:{...at},until:w.tick+ttl});transient.set(w,a.slice(-36));
}
export const defenseEvents=(w:WorldState)=>(transient.get(w)??[]).filter(f=>f.until>w.tick);
export const mortarFlights=flights;
export const defenseLights=(w:WorldState)=>cache(w).filter(b=>b.defId==='ward_searchlight').map(center);
const closeToLight=(w:WorldState,e:Vec2)=>cache(w).some(b=>b.defId==='ward_searchlight'&&gap(e,center(b))<=LAMP_RANGE);
const closeToSpikes=(w:WorldState,e:Vec2)=>cache(w).some(b=>b.defId==='ice_barricade'&&gap(e,center(b))<=BARRIER_RANGE);
export const defenseSlow=(w:WorldState,e:WildEntity)=>e.kind==='raider'&&closeToSpikes(w,e)?.53:1;
function naturallyStealthy(w:WorldState,e:WildEntity):boolean{
 return e.kind==='raider'&&e.defId==='froststalker'&&/^raid_\d+_\d+_0$/.test(e.id)&&w.weather==='whiteout'&&gap(e,w.player)>2.2;
}
export const raiderConcealed=(w:WorldState,e:WildEntity)=>naturallyStealthy(w,e)&&!closeToLight(w,e);
function fireRepairer(w:WorldState,b:BuildingInstance):BuildingInstance|undefined{
 const here=center(b);
 const box=w.ark.buildings.find(x=>x.defId==='storage_box'&&x.hp>1&&gap(here,center(x))<=4);
 if(!box)return;
 const target=w.ark.buildings.filter(c=>c!==b&&c.maxHp-c.hp>=4&&
   (envelope(c.defId)||c.defId==='hearth_core'||IDs.has(c.defId)||c.defId==='frost_turret'||c.defId==='fire_oil_turret')&&gap(here,center(c))<=3.1)
   .sort((a,z)=>a.hp/a.maxHp-z.hp/z.maxHp||gap(here,center(a))-gap(here,center(z)))[0];
 if(!target)return;
 const points=takeNetworkStorage(w,box.id,'driftwood',1)?16:takeNetworkStorage(w,box.id,'frost_iron_scrap',1)?25:0;
 if(!points)return;
 target.hp=Math.min(target.maxHp,target.hp+points);
 return target;
}
export function stepDefenses(w:WorldState,clock:Record<string,number>,enemies:WildEntity[],
 attack:(enemy:WildEntity,damage:number,element:'ice'|'fire')=>void):void{
 const held=flights(w);
 if(held.length){
  for(const f of held)if(f.land<=w.tick){
    flash(w,'blast',f.to,27);
    for(const e of enemies)if(e.hp>0&&gap(e,f.to)<=BLAST)attack(e,gap(e,f.to)<.92?44:32,'fire');
  }
  if(held.some(f=>f.land<=w.tick))(w as Archive).defensesP2=held.filter(f=>f.land>w.tick);
 }
 const buildings=cache(w);
 if(!buildings.length)return;
 const marked=seen.get(w)??new Set<string>();seen.set(w,marked);
 if(w.tick%15===0){
  for(const e of enemies){
   const spotted=naturallyStealthy(w,e)&&closeToLight(w,e);
   if(spotted&&!marked.has(e.id)){flash(w,'reveal',e,40);marked.add(e.id);}
   if(!spotted)marked.delete(e.id);
  }
  for(const id of marked)if(!enemies.some(e=>e.id===id))marked.delete(id);
 }
 for(const b of buildings){
  if(((clock[b.id]??0)>w.tick&&b.defId!=='oil_mortar')||b.defId==='ward_searchlight')continue;
  const from=center(b);
  if(b.defId==='ice_barricade'){
   const nearby=enemies.filter(e=>e.hp>0&&gap(from,e)<=BARRIER_RANGE);
   if(!nearby.length)continue;
   for(const e of nearby)attack(e,9,'ice');
   flash(w,'spike',from,22);clock[b.id]=w.tick+58;
  }else if(b.defId==='oil_mortar'){
   if(heatAt(w,from.x,from.y)<-45)continue;
   const target=enemies.filter(e=>e.hp>0&&!raiderConcealed(w,e)&&gap(from,e)>=1.2&&gap(from,e)<=MORTAR_RANGE)
    .sort((a,z)=>enemies.filter(e=>e.hp>0&&gap(z,e)<=BLAST).length-enemies.filter(e=>e.hp>0&&gap(a,e)<=BLAST).length||gap(from,a)-gap(from,z))[0];
   if(!target)continue;
   trackTurret(w,b.id,target);if((clock[b.id]??0)>w.tick)continue;
   const to={x:target.x,y:target.y};
   ((w as Archive).defensesP2??=[]).push({from,to,launched:w.tick,land:w.tick+HANG,source:b.id});
   flash(w,'launch',from,17);clock[b.id]=w.tick+103;
  }else if(b.defId==='auto_repairer'){
   const fixed=fireRepairer(w,b);clock[b.id]=w.tick+(fixed?89:12);
   if(fixed)flash(w,'repair',center(fixed),44);
  }
 }
}
export function validDefenses(w:WorldState):boolean{
 const value=(w as Archive).defensesP2;if(value===undefined)return true;
 const inside=(p:Vec2)=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.y>=0&&p.x<w.ark.size&&p.y<w.ark.size;
 return Array.isArray(value)&&value.length<=w.ark.size**2&&value.every(f=>!!f&&inside(f.from)&&inside(f.to)&&
  typeof f.source==='string'&&f.source.length<=96&&Number.isSafeInteger(f.launched)&&f.launched<=w.tick&&
  Number.isSafeInteger(f.land)&&f.land===f.launched+HANG&&f.land>=w.tick);
}
