import { markChapter } from './journal';
import { challenge,daySpeed } from './challenge';
import { endlessTemperature,hasAncientWhiteout } from './endless';
import { seaWhale } from './whale-sea';
import { eventClimate } from './sky-events';
import { caveTemperature } from './cave';
import { fieldLandmarks } from './landmarks';
import { downDock } from './dock-direction';
import { roomComfort } from './home';
import { pipeHeat } from './utilities';
import { doorOpen,indoor } from './rooms';
import { damagePlayer, healPlayer } from './rescue';
import { gearModifiers } from './equipment';
import { mealRemaining } from './food';
import data from '../data/buildings.json';
import items from '../data/items.json';
import { getIndustrySave } from './m2-state';
import { countItem, inventoryChange, isDeck, refreshBuoyancy } from './ark';
import { expeditionTemperature, gangwayGeometry } from './island';
import { beastHeatEmitters } from './beasts';
import { TICK_RATE, type BuildingInstance, type Vec2, type WorldState } from './types';

export const DAY_TICKS=TICK_RATE*60*8;
export const HEAT_HZ=4;
export const FUEL_MAX=[0,120,180,260,360];
const definitions=new Map(data.map(d=>[d.id,d]));
const fuelValues=new Map(items.filter(i=>i.fuelValue).map(i=>[i.id,i.fuelValue!]));
const offsets:Vec2[]=[{x:-1,y:0},{x:1,y:0},{x:0,y:-1},{x:0,y:1}];
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
export const partOfDay=(t:number):'白昼'|'黄昏'|'暴雪夜'=>t>=.74?'暴雪夜':t>=.59?'黄昏':'白昼';
export const primaryHearth=(w:WorldState)=>w.ark.buildings.find(b=>b.defId==='hearth_core');
const middle=(b:BuildingInstance)=>{
  const [x,y]=definitions.get(b.defId)?.size??[1,1];
  return {x:b.gx+x/2,y:b.gy+y/2};
};
export function hearthNear(w:WorldState, range=2.4):boolean {
  const h=primaryHearth(w);
  if(!h)return false;
  const p=middle(h);
  return Math.hypot(w.player.x-p.x,w.player.y-p.y)<=range;
}
export function addFuel(w:WorldState):string|null {
  const h=primaryHearth(w);
  if(!h||!hearthNear(w))return '靠近主炉才能添柴。';
  const cap=FUEL_MAX[Math.min(4,h.level)]||120;
  if(h.fuel>=cap-3)return '主炉燃料已满。';
  for(const [id,v] of fuelValues)if(countItem(w,id)&&inventoryChange(w,[{itemId:id,count:1}],[])){
    h.fuel=Math.min(cap,h.fuel+v);markChapter(w,'fuel');
    return null;
  }
  return '背包里没有燃料。';
}
export const HEARTH_UPGRADE=[{itemId:'driftwood',count:4},{itemId:'frost_iron_scrap',count:2}];
export const PRESSURE_HEARTH_UPGRADE=[{itemId:'frost_iron_ingot',count:2},{itemId:'sulfur_ore',count:2}];
export const HEARTH_NAMES=['','余烬主炉','暖芯主炉','硫磺高压炉','太阳方舟'] as const;

export function upgradeHearth(w:WorldState):string|null {
  const h=primaryHearth(w);
  if(!h||!hearthNear(w))return '靠近主炉才能升级。';
  if(h.level>=4)return '主炉已升级为太阳方舟。';
  if(h.level===3)return '硫磺高压炉已就绪，收齐火种后可点燃太阳方舟。';
  if(h.level===2){
    if(!inventoryChange(w,PRESSURE_HEARTH_UPGRADE,[]))return '升 Lv.3 需要霜铁锭 ×2、地热硫磺 ×2。';
    h.level=3;h.maxHp=530;h.hp=Math.min(h.maxHp,h.hp+130);
    refreshBuoyancy(w);
    return null;
  }
  if(!inventoryChange(w,HEARTH_UPGRADE,[]))return '升 Lv.2 需要浮木板 ×4、冻铁废件 ×2。';
  h.level=2;w.latte.autoLootUnlocked=true;
  return null;
}
export function heatAt(w:WorldState,x:number,y:number):number{
  const depth=caveTemperature(w,x,y);if(depth!==null)return depth;
  const gx=Math.floor(x),gy=Math.floor(y);
  if(isDeck(w,gx,gy))return w.ark.heatGrid[gy*w.ark.size+gx];
  const ambient=expeditionTemperature(w,x,y)??w.ambientTemp;
  const hearth=primaryHearth(w),bridge=w.ark.anchoredIslandId==='aurora_vault'&&hearth&&hearth.level>=4&&hearth.fuel>0?gangwayGeometry(w):null;
  const shore=bridge?.deployed?downDock(bridge.landing,bridge.side,2.5):null;
  const solar=shore?Math.max(0,1-Math.hypot(x-shore.x,y-shore.y)/14)*60:0;
  return ambient+solar+fieldLandmarks(w,x,y,ambient+solar)+beastHeatEmitters(w).reduce((sum,source)=>sum+source.power*Math.max(0,1-Math.hypot(x-source.x,y-source.y)/source.radius),0);
}
export function emitters(w:WorldState){
  return [...w.ark.buildings.flatMap(b=>{
    const d=definitions.get(b.defId);
    if((b.defId==='ward_searchlight'&&b.hp<=1)||!d||!d.heatOutput||!d.heatRadius||(b.defId==='hearth_core'&&b.fuel<=0))return [];
    if(b.defId==='furnace'||b.defId==='stove'){
      const job=getIndustrySave(w)?.stations[b.id]?.job;
      if(!job||job.progress>=job.duration||b.frozen||(job.networkFuel&&b.fuel<=0))return [];
    }
    const gain=b.defId==='hearth_core'?(b.level>=4?1.82:b.level===3?1.55:b.level===2?1.28:1):1;
    return [{...middle(b),radius:d.heatRadius*gain,power:d.heatOutput*gain,kind:b.defId}];
  }),...beastHeatEmitters(w),...pipeHeat(w)];
}

export function advanceClimate(w:WorldState):void{
  const next=w.timeOfDay+daySpeed(w)/DAY_TICKS;
  if(next>=1){w.day++;w.timeOfDay=next-1;}
  else w.timeOfDay=next;
  const part=partOfDay(w.timeOfDay);
  const whiteout=(w.day%5===0&&part==='暴雪夜')||hasAncientWhiteout(w);
  w.weather=whiteout?'whiteout':part==='暴雪夜'?'snow':'clear';
  const t=w.timeOfDay;
  w.ambientTemp=whiteout?-55:part==='暴雪夜'?-22:part==='黄昏'?Math.round(-4-18*(t-.59)/.15):-4;
  w.ambientTemp+=eventClimate(w)+endlessTemperature(w)+challenge(w).ambient;
  const hearth=primaryHearth(w);
  if(hearth&&hearth.fuel>0)hearth.fuel=Math.max(0,hearth.fuel-(whiteout?(hearth.level>=3?.034:.05):part==='暴雪夜'?.023:.013));
}

const fixedRadial=new Map<number,ReadonlyArray<readonly[number,number,number]>>();
const stationaryOffsets=(radius:number)=>{
  let stencil=fixedRadial.get(radius);
  if(stencil)return stencil;
  const entries:[number,number,number][]=[],n=Math.ceil(radius),r=radius*radius;
  for(let dy=-n;dy<=n;dy++)for(let dx=-n;dx<=n;dx++){
    if(dx*dx+dy*dy<r)entries.push([dx,dy,Math.pow(1-Math.hypot(dx,dy)/radius,1.65)]);
  }
  if(fixedRadial.size>=32)fixedRadial.delete(fixedRadial.keys().next().value!);
  fixedRadial.set(radius,entries);return entries;
};
const heatScratch=new WeakMap<WorldState,{insulation:Float32Array;radiance:Float64Array}>();
export function solveHeat(w:WorldState):void{
  const {size,decks,heatGrid,buildings}=w.ark;
  const length=size*size;
  let buffers=heatScratch.get(w);
  if(!buffers||buffers.insulation.length!==length){
    buffers={insulation:new Float32Array(length),radiance:new Float64Array(length)};
    heatScratch.set(w,buffers);
  }
  const {insulation,radiance}=buffers,sealed=indoor(w).inside,ice=seaWhale(w)?.ice;
  insulation.fill(0);radiance.fill(0);
  for(const b of buildings){
    const d=definitions.get(b.defId);
    if(d?.insulation&&!doorOpen(b)){const i=b.gy*size+b.gx;insulation[i]=Math.max(insulation[i],d.insulation);}
  }
  const sources=emitters(w);
  const sinks=w.wildEntities.filter(e=>e.kind==='raider'&&e.defId==='heatwraith'&&e.hp>0&&isDeck(w,Math.floor(e.x),Math.floor(e.y)));
  // A wraith is a moving local heat sink, not a cosmetic global weather modifier.
  const warmed=sinks.length?sources.filter(e=>e.kind!=='beast'&&e.power>0):[];
  const siphons=sinks.filter(e=>warmed.some(source=>Math.hypot(e.x-source.x,e.y-source.y)<Math.min(source.radius,3.4)));

  // Splat each source only across the tiles it can influence. Per-tile
  // accumulation order and the exact radial falloff remain unchanged.
  for(const e of sources){
    const a=Math.max(0,Math.floor(e.x-e.radius)),b=Math.min(size-1,Math.ceil(e.x+e.radius));
    const c=Math.max(0,Math.floor(e.y-e.radius)),d=Math.min(size-1,Math.ceil(e.y+e.radius));
    const power=e.power*(e.kind==='hearth_core'?1.62:1),r=e.radius*e.radius;
    const mx=e.x-.5,my=e.y-.5;
    if(Number.isInteger(mx)&&Number.isInteger(my)){
      for(const [ox,oy,gain] of stationaryOffsets(e.radius)){
        const x=mx+ox,y=my+oy;
        if(x>=0&&x<size&&y>=0&&y<size&&decks[y*size+x])radiance[y*size+x]+=power*gain;
      }
      continue;
    }
    for(let y=c;y<=d;y++)for(let x=a;x<=b;x++){
      const i=y*size+x;if(!decks[i])continue;
      const dx=x+.5-e.x,dy=y+.5-e.y,k=dx*dx+dy*dy;
      if(k>=r)continue;
      radiance[i]+=power*Math.pow(1-Math.hypot(dx,dy)/e.radius,1.65);
    }
  }
  const next=new Array<number>(size*size).fill(w.ambientTemp);
  for(let i=0;i<decks.length;i++){
    if(!decks[i])continue;
    const x=i%size,y=Math.floor(i/size);
    let radiation=radiance[i],flow=0,shield=insulation[i];
    if((ice?.[i]??0)>w.tick)radiation-=60;
    for(const e of siphons){
      const dx=x+.5-e.x,dy=y+.5-e.y;
      if(Math.abs(dx)<3.2&&Math.abs(dy)<3.2)
        radiation-=24*Math.pow(Math.max(0,1-Math.hypot(dx,dy)/3.2),1.35);
    }
    for(const a of offsets){
      const xx=x+a.x,yy=y+a.y,at=xx>=0&&yy>=0&&xx<size&&yy<size?yy*size+xx:-1;
      const inside=at>=0&&!!decks[at], barrier=at>=0?insulation[at]:0;
      const other=inside?heatGrid[at]:w.ambientTemp;
      const resistance=Math.max(insulation[i],barrier);
      if(inside)shield=Math.max(shield,barrier*.72);
      flow+=(other-heatGrid[i])*(inside?.12:.058)*(1-resistance);
    }
    // Flux to neighbours and exposed air, then gradual convergence to radiant sources.
    next[i]=clamp(heatGrid[i]+flow+(radiation+(w.ambientTemp-heatGrid[i])*(sealed[i]?.45:1))*.19*(1-shield*.72)
      +radiation*.035*shield,w.ambientTemp,85);
  }
  w.ark.heatGrid=next;
  for(const b of buildings)b.frozen=(ice?.[b.gy*size+b.gx]??0)>w.tick||heatAt(w,b.gx+.5,b.gy+.5)<-20;
}

export function initializeHeat(w:WorldState):void{
  for(let n=0;n<14;n++)solveHeat(w);
}

export function stepHeat(w:WorldState):void{
  if(Math.floor(w.tick*HEAT_HZ/TICK_RATE)===Math.floor((w.tick-1)*HEAT_HZ/TICK_RATE))return;
  solveHeat(w);
  const p=w.player, gear=gearModifiers(w), t=heatAt(w,p.x,p.y)+gear.personalHeat, before=p.warmth;
  const trend=t>=15?Math.min(11,4+(t-15)*.28):t<0?Math.max(-18,-1.8+t*.34):0;
  const protectedTrend=trend<0?trend*(1-gear.cold)*(mealRemaining(w)?.52:1):trend;
  p.warmth=clamp(p.warmth+(protectedTrend+roomComfort(w)*.32)/HEAT_HZ,0,p.maxWarmth);
  if(p.warmth===0)damagePlayer(w,(t< -20?6:3)/HEAT_HZ,'cold');
  else if(t>=15&&p.warmth>50)healPlayer(w,.3/HEAT_HZ);
  const h=primaryHearth(w);
  p.portraitMood=p.warmth<=25||(h?h.fuel<12:false)?3:
    p.grapple.charging||p.grapple.active||w.weather==='whiteout'?2:
    p.warmth>before&&before<p.maxWarmth-.4?1:0;
}
