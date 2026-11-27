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
    h.fuel=Math.min(cap,h.fuel+v);
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
  const gx=Math.floor(x),gy=Math.floor(y);
  if(isDeck(w,gx,gy))return w.ark.heatGrid[gy*w.ark.size+gx];
  const ambient=expeditionTemperature(w,x,y)??w.ambientTemp;
  const hearth=primaryHearth(w),bridge=w.ark.anchoredIslandId==='aurora_vault'&&hearth&&hearth.level>=4&&hearth.fuel>0?gangwayGeometry(w):null;
  const shore=bridge?.deployed?downDock(bridge.landing,bridge.side,2.5):null;
  const solar=shore?Math.max(0,1-Math.hypot(x-shore.x,y-shore.y)/14)*60:0;
  return ambient+solar+beastHeatEmitters(w).reduce((sum,source)=>sum+source.power*Math.max(0,1-Math.hypot(x-source.x,y-source.y)/source.radius),0);
}
export function emitters(w:WorldState){
  return [...w.ark.buildings.flatMap(b=>{
    const d=definitions.get(b.defId);
    if(!d||!d.heatOutput||!d.heatRadius||(b.defId==='hearth_core'&&b.fuel<=0))return [];
    if(b.defId==='furnace'||b.defId==='stove'){
      const job=getIndustrySave(w)?.stations[b.id]?.job;
      if(!job||job.progress>=job.duration||b.frozen||(job.networkFuel&&b.fuel<=0))return [];
    }
    const gain=b.defId==='hearth_core'?(b.level>=4?1.82:b.level===3?1.55:b.level===2?1.28:1):1;
    return [{...middle(b),radius:d.heatRadius*gain,power:d.heatOutput*gain,kind:b.defId}];
  }),...beastHeatEmitters(w),...pipeHeat(w)];
}

export function advanceClimate(w:WorldState):void{
  const next=w.timeOfDay+1/DAY_TICKS;
  if(next>=1){w.day++;w.timeOfDay=next-1;}
  else w.timeOfDay=next;
  const part=partOfDay(w.timeOfDay);
  const whiteout=w.day%5===0&&part==='暴雪夜';
  w.weather=whiteout?'whiteout':part==='暴雪夜'?'snow':'clear';
  const t=w.timeOfDay;
  w.ambientTemp=whiteout?-55:part==='暴雪夜'?-22:part==='黄昏'?Math.round(-4-18*(t-.59)/.15):-4;
  const hearth=primaryHearth(w);
  if(hearth&&hearth.fuel>0)hearth.fuel=Math.max(0,hearth.fuel-(whiteout?(hearth.level>=3?.034:.05):part==='暴雪夜'?.023:.013));
}

export function solveHeat(w:WorldState):void{
  const {size,decks,heatGrid,buildings}=w.ark;
  const insulation=new Float32Array(size*size),sealed=indoor(w).inside;
  for(const b of buildings){
    const d=definitions.get(b.defId);
    if(d?.insulation&&!doorOpen(b)){const i=b.gy*size+b.gx;insulation[i]=Math.max(insulation[i],d.insulation);}
  }
  const sources=emitters(w);
  const next=new Array<number>(size*size).fill(w.ambientTemp);
  const wallAt=(x:number,y:number)=>x>=0&&y>=0&&x<size&&y<size?insulation[y*size+x]:0;
  for(let i=0;i<decks.length;i++){
    if(!decks[i])continue;
    const x=i%size,y=Math.floor(i/size);
    let radiation=0,flow=0,shield=insulation[i];
    for(const e of sources){
      const d=Math.hypot(x+.5-e.x,y+.5-e.y);
      radiation+=e.power*(e.kind==='hearth_core'?1.62:1)*Math.pow(Math.max(0,1-d/e.radius),1.65);
    }
    for(const a of offsets){
      const xx=x+a.x, yy=y+a.y;
      const inside=isDeck(w,xx,yy);
      const other=inside?heatGrid[yy*size+xx]:w.ambientTemp;
      const resistance=Math.max(insulation[i],wallAt(xx,yy));
      if(inside)shield=Math.max(shield,wallAt(xx,yy)*.72);
      flow+=(other-heatGrid[i])*(inside?.12:.058)*(1-resistance);
    }
    // Flux to neighbours and exposed air, then gradual convergence to radiant sources.
    next[i]=clamp(heatGrid[i]+flow+(radiation+(w.ambientTemp-heatGrid[i])*(sealed[i]?.45:1))*.19*(1-shield*.72)
      +radiation*.035*shield,w.ambientTemp,85);
  }
  w.ark.heatGrid=next;
  for(const b of buildings)b.frozen=heatAt(w,b.gx+.5,b.gy+.5)<-20;
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
