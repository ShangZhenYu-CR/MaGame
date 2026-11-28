import { stepEndless } from './endless';
import { applySeaStrike,fireSeaCannons,orbitWhale,prepareSeaStrike,thawWhaleIce,validSeaWhale,type SeaWarning,type SeaWhale } from './whale-sea';
import { caveActive } from './cave';
import { burnDamage,frozen,resolveElement,type Element } from './elements';
import { emitJuice } from './juice';
import { damagePlayer } from './rescue';
import phases from '../data/whale.json';
import { inventoryChange,refreshBuoyancy } from './ark';
import { hearthNear, primaryHearth } from './heatField';
import { downDock } from './dock-direction';
import { areaAt, gangwayGeometry } from './island';
import { toolStatus } from './tools';
import { TICK_RATE, type Vec2, type WorldState } from './types';

export const AURORA_ISLAND='aurora_vault';
export const SOLAR_CORE_COST=4;
export const SOLAR_HEARTH_FUEL=360;
export type FinaleMode='ready'|'battle'|'cleared'|'endless';
interface Whale extends Vec2 {
  phase:number; hp:number; next:number; recovery:number;
  warning: SeaWarning|null;
}
interface FinaleState {
  mode:FinaleMode; whale:Whale|null; strikeAt:number; clearTick:number|null; sea?:SeaWhale;
}
type Save=WorldState&{finaleM6?:FinaleState};
const get=(w:WorldState)=>(w as Save).finaleM6;
const ensure=(w:WorldState)=>(w as Save).finaleM6??={mode:'ready',whale:null,strikeAt:0,clearTick:null};
const gap=(a:Vec2,b:Vec2)=>Math.hypot(a.x-b.x,a.y-b.y);
const coast=(w:WorldState)=>!caveActive(w)&&w.activeIsland?.nodeId===AURORA_ISLAND;
const engaged=(w:WorldState,f:FinaleState)=>f.sea?!w.activeIsland:coast(w);
export const whaleBattleActive=(w:WorldState)=>{const f=get(w);return !!f&&f.mode==='battle'&&engaged(w,f);};
const canStartSea=(w:WorldState)=>!w.ark.anchoredIslandId&&!w.activeIsland&&solarReady(w)&&w.sky.cruising&&w.sky.x>=36;
export const solarReady=(w:WorldState)=> (primaryHearth(w)?.level??0)>=4;
export const canReachAurora=(w:WorldState,id:string)=>(id!==AURORA_ISLAND&&!id.startsWith('exp4_'))||solarReady(w);

export function forgeSolarArk(w:WorldState):string|null{
  const hearth=primaryHearth(w);
  if(!hearth||!hearthNear(w,2.8)||w.activeIsland)return '靠近方舟主炉才能升阶。';
  if(solarReady(w))return '太阳方舟已经升起。';
  if(hearth.level<2)return '先把余烬主炉升到 Lv.2。';
  if(w.skyheartCores<SOLAR_CORE_COST)return '收齐 4 枚天穹火种才能点燃太阳方舟。';
  if(hearth.level<3)return '先把主炉升到 Lv.3 硫磺高压炉。';
  hearth.level=4;hearth.maxHp=Math.max(hearth.maxHp,680);hearth.hp=hearth.maxHp;hearth.fuel=SOLAR_HEARTH_FUEL;
  if(!w.unlockedTech.includes('solar_ark'))w.unlockedTech.push('solar_ark');
  ensure(w);refreshBuoyancy(w);
  return null;
}

function encounterPoint(w:WorldState):Vec2|null{
  const bridge=gangwayGeometry(w);
  if(!bridge)return null;
  for(let dx=5;dx<=11;dx++)for(const dy of [0,-1,1,-2,2,-3,3]){
    const {x,y}=downDock(bridge.landing,bridge.side,dx,dy);
    if(areaAt(w,x,y)==='island')return {x,y};
  }
  return null;
}

export function startWhale(w:WorldState):string|null{
  if(!coast(w)||!solarReady(w))return '驾驶太阳方舟抵达极光天穹后才能挑战。';
  const f=ensure(w);
  if(f.mode!=='ready'||w.bossDefeated)return '永冬霜鲸的战斗已经开启或结束。';
  const spot=encounterPoint(w);
  if(!spot||gap(w.player,spot)>8)return '走近极光天穹的登陆岸。';
  f.mode='battle';
  f.whale={...spot,phase:0,hp:phases[0].hp,next:w.tick+70,recovery:0,warning:null};
  return null;
}

function startSea(w:WorldState,f:FinaleState){
 const p=w.player;
 f.sea={angle:4.28,openedAt:w.tick,volleyAt:0,repairAt:0,ice:{}};
 f.mode='battle';f.whale={x:p.x,y:p.y-6,phase:0,hp:phases[0].hp,next:w.tick+74,recovery:0,warning:null};
 w.sky.cruising=false;orbitWhale(w,f.whale,f.sea);
}
function win(w:WorldState,f:FinaleState):void{
  f.mode='cleared';f.whale=null;delete f.sea;f.clearTick=w.tick;w.bossDefeated=true;
  const node=w.sky.islands.find(i=>i.id===AURORA_ISLAND);
  if(node)node.bossDefeated=true;
  w.player.portraitMood=1;
}

export function attackWhale(w:WorldState):string|null{
  const f=get(w),b=f?.whale,p=w.player;
  if(!f||!b||f.mode!=='battle'||!engaged(w,f)||p.hp<=0)return '附近没有可攻击的永冬霜鲸。';
  if(gap(p,b)>(f.sea?7.4:5.5))return f.sea?'向有裂口的船舷靠近，或用炮台齐射。':'靠近霜鲸到 5.5 格内。';
  if(w.tick<f.strikeAt)return '攻击正在恢复。';
  if(w.tick>=b.recovery)return '冰甲挡住了攻击。躲开落点，等招式结束再反击。';
  const axe=toolStatus(w,'wood_axe');
  const tier=axe&&axe.durability>0?axe.tier:0;
  const companions=w.beasts.filter(x=>x.role==='companion'&&x.hp>0&&x.warmth>12&&x.hunger>5&&gap(x,p)<=5.5);
  const escort=companions.reduce((n,x)=>n+(x.defId==='tempest_wyvern'?14:6),0);
  f.strikeAt=w.tick+18;damageWhale(w,f,b,18+tier*5+escort);
  return null;
}

export function strikeWhaleWithWeapon(w:WorldState,damage:number,element?:Element):boolean{
  const f=get(w),b=f?.whale;
  if(!f||!b||f.mode!=='battle'||!engaged(w,f)||w.tick>=b.recovery||w.player.hp<=0)return false;
  const direct=element?resolveElement(w,'whale',damage,element):{damage,critical:false};
  damageWhale(w,f,b,direct.damage,false,direct.critical);return true;
}

export function volleyWhale(w:WorldState):string|null{
 const f=get(w),b=f?.whale;
 if(!f||!b||!f.sea||f.mode!=='battle'||!engaged(w,f))return '当前不是海空炮战。';
 const shot=fireSeaCannons(w,b,f.sea);
 if(shot.issue)return shot.issue;
 damageWhale(w,f,b,shot.damage);return null;
}
export function repairSeaHearth(w:WorldState):string|null{
 const f=get(w),h=primaryHearth(w);
 if(!f?.sea||!h||f.mode!=='battle'||!engaged(w,f)||!hearthNear(w,2.8)||w.player.hp<=0)return '走近受损主炉再抢修。';
 if(f.sea.repairAt>w.tick)return '抢修工具正在恢复。';
 if(h.hp>=h.maxHp)return '主炉完好，不消耗材料。';
 if(!inventoryChange(w,[{itemId:'driftwood',count:2},{itemId:'frost_iron_scrap',count:1}],[]))return '抢修需要浮木板 ×2 和冻铁废件 ×1。';
 h.hp=Math.min(h.maxHp,h.hp+60);f.sea.repairAt=w.tick+108;
 for(let y=0;y<2;y++)for(let x=0;x<2;x++)delete f.sea.ice[(h.gy+y)*w.ark.size+h.gx+x];
 return null;
}
function damageWhale(w:WorldState,f:FinaleState,b:Whale,damage:number,dot=false,melt=false):void{
  const before=b.hp;b.hp=Math.max(0,b.hp-damage);
  emitJuice(w,dot?'burn':'hit',b,before-b.hp,{target:'whale',critical:!dot,melt});
  if(b.hp>0)return;
  if(b.phase===phases.length-1){win(w,f);return;}
  b.phase++;b.hp=phases[b.phase].hp;b.warning=null;b.recovery=0;b.next=w.tick+56;
}

export function stepFinale(w:WorldState):void{
  const f=get(w);
  if(f?.mode==='ready'&&canStartSea(w))startSea(w,f);
  const b=f?.whale;
  if(!f||!b||f.mode!=='battle')return;
  const p=w.player,d=phases[b.phase],sea=f.sea;
  if(sea){w.sky.cruising=false;orbitWhale(w,b,sea);thawWhaleIce(w,sea);}
  if(!engaged(w,f)||p.hp<=0){
    b.warning=null;b.recovery=0;b.next=w.tick+35;
    return;
  }
  if(burnDamage(w,'whale')){const phase=b.phase;damageWhale(w,f,b,3,true);if(!f.whale||b.phase!==phase)return;}
  if(frozen(w,'whale'))return;
  if(b.warning){
    if(w.tick<b.warning.until)return;
    const target=b.warning;
    if(sea)applySeaStrike(w,b,sea,d.radius,d.damage,d.chill);
    else if(gap(p,target)<=d.radius||(target.echo&&gap(p,target.echo)<=d.radius*.87)){
      if(damagePlayer(w,d.damage))p.warmth=Math.max(0,p.warmth-d.chill);
    }
    b.warning=null;b.recovery=w.tick+(sea?102:76)-b.phase*6;b.next=b.recovery+d.delay;
  }else if(w.tick>=b.next&&(sea||gap(p,b)<9)){
    const echo=b.phase===0?null:b.phase===1?{x:p.x+2.7,y:p.y+1.4}:
      {x:p.x+Math.max(-2.8,Math.min(2.8,p.vx*.7)),y:p.y-2.6};
    b.warning=sea?prepareSeaStrike(w,b,d.windup+15):{x:p.x,y:p.y,until:w.tick+d.windup,echo};
    b.recovery=0;
  }
}

export function continueEndless(w:WorldState):string|null{
  const f=get(w);
  if(!f||f.mode!=='cleared'||!w.bossDefeated)return '击败永冬霜鲸后开启。';
  f.mode='endless';stepEndless(w);
  return null;
}

export function finaleStatus(w:WorldState){
  const f=get(w),b=f?.whale,d=b?phases[b.phase]:null;
  return {mode:f?.mode??'ready',solar:solarReady(w),atAurora:coast(w)||!!f?.sea,sea:!!f?.sea,clearTick:f?.clearTick??null,
    seedCount:w.skyheartCores,nearHearth:hearthNear(w,2.8)&&!w.activeIsland,
    whale:b&&d?{...b,art:d.art,maxHp:d.hp,attackName:d.name,radius:d.radius,bossName:'永冬霜鲸',
      open:w.tick<b.recovery,inRange:gap(w.player,b)<=(f?.sea?7.4:5.5)}:null,
    days:w.day,beasts:w.beasts.length,decks:w.ark.decks.filter(Boolean).length,seconds:Math.floor(w.tick/TICK_RATE)};
}

export function validFinale(w:WorldState):boolean{
  const f=get(w);
  if(f===undefined)return !w.bossDefeated;
  const int=(n:unknown):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0;
  const point=(p:Vec2)=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<256&&Math.abs(p.y)<256;
  if(!f||!['ready','battle','cleared','endless'].includes(f.mode)||!int(f.strikeAt))return false;
  const done=f.mode==='cleared'||f.mode==='endless';
  if(w.bossDefeated!==done||(f.mode!=='ready'&&!solarReady(w))||
    (done?(!int(f.clearTick)||f.clearTick>w.tick):f.clearTick!==null))return false;
  const b=f.whale;
  if(f.mode!=='battle')return b===null&&f.sea===undefined;
  if(f.sea!==undefined&&!validSeaWhale(f.sea,w))return false;
  return !!b&&point(b)&&int(b.phase)&&b.phase<phases.length&&Number.isFinite(b.hp)&&b.hp>0&&
    b.hp<=phases[b.phase].hp&&int(b.next)&&int(b.recovery)&&
    (b.warning===null||!!b.warning&&point(b.warning)&&int(b.warning.until)&&
      (b.warning.echo===null||point(b.warning.echo))&&(b.warning.style===undefined||['ram','breath','meteors'].includes(b.warning.style)));
}
