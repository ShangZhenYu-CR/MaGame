import { stormDamage } from './life';
import { trackTurret } from './turret-aim';
import { buildingDefs,inventoryChange,isDeck } from './ark';
import { damagePlayer,incapacitated } from './rescue';
import type { Vec2,WorldState } from './types';

export type SeaStrike='ram'|'breath'|'meteors';
export interface SeaWarning extends Vec2{until:number;echo:Vec2|null;style?:SeaStrike}
export interface Wake extends Vec2{phase:number;warning:SeaWarning|null;next:number;recovery:number}
export interface SeaWhale {
 angle:number;openedAt:number;volleyAt:number;repairAt:number;
 ice:Record<string,number>;
}
type WhaleArchive=WorldState&{finaleM6?:{sea?:SeaWhale;mode:string}};
const record=(w:WorldState)=>(w as WhaleArchive).finaleM6;
export const seaWhale=(w:WorldState)=>{const s=record(w);return s?.mode==='battle'?s.sea:undefined;};
const defense=new Set(['frost_turret','fire_oil_turret','oil_mortar']);
const ext=new WeakMap<WorldState,{t:number;x0:number;x1:number;y0:number;y1:number}>();
const at=(p:Vec2)=>({x:p.x,y:p.y});
const gap=(a:Vec2,b:Vec2)=>Math.hypot(a.x-b.x,a.y-b.y);
export function whaleBounds(w:WorldState){
 const old=ext.get(w);if(old&&w.tick-old.t<=30)return old;
 let x0=w.ark.size,y0=x0,x1=0,y1=0;
 for(let i=0;i<w.ark.decks.length;i++)if(w.ark.decks[i]){
  const x=i%w.ark.size,y=Math.floor(i/w.ark.size);
  x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+1);y1=Math.max(y1,y+1);
 }
 const bounds={t:w.tick,x0,x1,y0,y1};
 ext.set(w,bounds);return bounds;
}
export function orbitWhale(w:WorldState,b:Wake,sea:SeaWhale){
 const {x0,x1,y0,y1}=whaleBounds(w),exposed=b.recovery>w.tick;
 const rx=(x1-x0)/2,ry=(y1-y0)/2;
 const ram=b.warning?.style==='ram'?b.warning:null,tau=2*Math.PI;
 if(ram){
  const desired=Math.atan2((ram.y-(y0+y1)*.5)/Math.max(1,ry),(ram.x-(x0+x1)*.5)/Math.max(1,rx));
  const d=((desired-sea.angle+3*tau)%tau+Math.PI)%tau-Math.PI;
  sea.angle=(sea.angle+Math.max(-.08,Math.min(.08,d*.16))+tau)%tau;
 }else sea.angle=(sea.angle+(exposed?.010:.017)+b.phase*.0028)%tau;
 const nx=Math.cos(sea.angle),ny=Math.sin(sea.angle);
 // Rounded rectangular circuit, never within the deck footprint, even at corners.
 const scale=1/Math.max(Math.abs(nx),Math.abs(ny),.7);
 const edgeX=nx*scale*rx,edgeY=ny*scale*ry;
 const lift=exposed?1.21:b.warning?.style==='ram'?.88:2.18+Math.sin(w.tick*.042)*.66;
 b.x=(x0+x1)/2+edgeX+nx*lift;b.y=(y0+y1)/2+edgeY+ny*lift;
}
export function prepareSeaStrike(w:WorldState,b:Wake,windup:number):SeaWarning{
 const p=w.player,style=(['ram','breath','meteors'] as const)[b.phase];
 const bounds=whaleBounds(w);
 let target=at(p),echo:Vec2|null=null;
 if(style==='ram'){
  // Mark the ward nearest the visible whale, not the full deck.
  const dx=b.x-(bounds.x0+bounds.x1)*.5,dy=b.y-(bounds.y0+bounds.y1)*.5;
  const across=Math.abs(dx/Math.max(1,bounds.x1-bounds.x0))>=Math.abs(dy/Math.max(1,bounds.y1-bounds.y0));
  target=across?{x:dx<0?bounds.x0+.65:bounds.x1-.65,y:Math.min(bounds.y1-.65,Math.max(bounds.y0+.65,p.y))}:
    {y:dy<0?bounds.y0+.65:bounds.y1-.65,x:Math.min(bounds.x1-.65,Math.max(bounds.x0+.65,p.x))};
 }else{
  const proposed=[{x:p.x+2.7,y:p.y+1.2},{x:p.x-2.7,y:p.y+1.2},{x:p.x+1.4,y:p.y-2.7}];
  echo=proposed.find(q=>isDeck(w,Math.floor(q.x),Math.floor(q.y)))??null;
 }
 return {...target,echo,until:w.tick+windup,style};
}
export function applySeaStrike(w:WorldState,b:Wake,sea:SeaWhale,radius:number,damage:number,chill:number){
 const v=b.warning!,p=w.player;
 const targets=[v,...(v.echo?[v.echo]:[])];
 const inZone=(q:Vec2)=>targets.some((a,i)=>gap(q,a)<=radius*(i?.87:1));
 if(inZone(p)&&damagePlayer(w,damage))p.warmth=Math.max(0,p.warmth-chill);
 for(const building of w.ark.buildings){
  const [sx,sy]=buildingDefs.get(building.defId)?.size??[1,1];
  const q={x:building.gx+sx/2,y:building.gy+sy/2};
  if(!inZone(q))continue;
  const amount=v.style==='ram'?26:v.style==='breath'?13:31;
  if(building.hp>1)stormDamage(w);building.hp=Math.max(1,building.hp-amount);
  if(v.style==='breath'||v.style==='meteors'){
   const sh=sea.ice;
   for(let dy=0;dy<sy;dy++)for(let dx=0;dx<sx;dx++)sh[(building.gy+dy)*w.ark.size+building.gx+dx]=w.tick+(v.style==='breath'?245:150);
   building.frozen=true;
  }
  if(building.defId==='hearth_core')building.fuel=Math.max(0,building.fuel-(v.style==='breath'?19:8));
 }
}
export const whaleIced=(w:WorldState,x:number,y:number)=>(seaWhale(w)?.ice[y*w.ark.size+x]??0)>w.tick;
export function thawWhaleIce(w:WorldState,sea:SeaWhale){
 if(w.tick%30===0)for(const [i,t] of Object.entries(sea.ice))if(t<=w.tick)delete sea.ice[i];
}
type Shot={from:Vec2;to:Vec2;until:number};
const salvos=new WeakMap<WorldState,Shot[]>();
export const cannonEffects=(w:WorldState)=>(salvos.get(w)??[]).filter(f=>f.until>w.tick);
export function fireSeaCannons(w:WorldState,b:Wake,sea:SeaWhale):{issue:string|null;damage:number}{
 const fail=(issue:string)=>({issue,damage:0});
 if(incapacitated(w))return fail('恢复行动后再发令。');
 if(w.tick<sea.volleyAt)return fail('炮台仍在装填。');
 if(w.tick>=b.recovery)return fail('冰甲正完整，等出招后再齐射。');
 const cannons=w.ark.buildings.filter(c=>defense.has(c.defId)&&c.hp>1&&!whaleIced(w,c.gx,c.gy)&&
  gap(b,{x:c.gx+.5,y:c.gy+.5})<=13).sort((a,z)=>gap(b,{x:a.gx,y:a.gy})-gap(b,{x:z.gx,y:z.gy})).slice(0,3);
 if(!cannons.length)return fail('需要射程 13 格内未冰封的防御炮台。');
 let damage=0;const shots:Shot[]=[];
 for(const c of cannons){
  if(!inventoryChange(w,[{itemId:'frost_iron_scrap',count:1}],[]))break;
  trackTurret(w,c.id,b);
  shots.push({from:{x:c.gx+.5,y:c.gy+.70},to:at(b),until:w.tick+27});
  damage+=c.defId==='oil_mortar'?43:c.defId==='fire_oil_turret'?35:27;
 }
 if(!shots.length)return fail('齐射需要背包里的冻铁废件。');
 sea.volleyAt=w.tick+54;salvos.set(w,shots);
 return {issue:null,damage};
}
export function validSeaWhale(value:SeaWhale,w:WorldState):boolean{
 const time=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
 return !!value&&Number.isFinite(value.angle)&&value.angle>=0&&value.angle<=Math.PI*2&&
   time(value.openedAt)&&value.openedAt<=w.tick&&time(value.volleyAt)&&value.volleyAt<=w.tick+54&&time(value.repairAt)&&value.repairAt<=w.tick+108&&
   !!value.ice&&typeof value.ice==='object'&&!Array.isArray(value.ice)&&Object.entries(value.ice).every(([id,t])=>
     /^\d+$/.test(id)&&Number(id)<w.ark.size*w.ark.size&&time(t)&&t<=w.tick+245);
}
