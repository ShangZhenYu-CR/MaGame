import rows from '../data/weapons.json';
import recipes from '../data/recipes.json';
import { countItem,inventoryChange } from './ark';
import { strikeWildWithWeapon } from './beasts';
import { finaleStatus,strikeWhaleWithWeapon } from './finale';
import { areaAt } from './island';
import { strikeHostileWithWeapon } from './m5';
import type { Element } from './elements';
import { rolling } from './roll';
import { incapacitated } from './rescue';
import type { Vec2,WildEntity,WorldState } from './types';

export type WeaponStyle='thrust'|'sweep'|'bolt'|'throw'|'flame';
export const weaponSpecs=rows.map(x=>({...x,style:x.style as WeaponStyle}));
export const weaponById=new Map(weaponSpecs.map(x=>[x.id,x]));
const costs=new Map(recipes.filter(x=>weaponById.has(x.output.itemId)).map(x=>[x.output.itemId,x]));
type Spec=typeof weaponSpecs[number];
export const weaponRecipe=(id:string)=>costs.get(id);
export const selectedWeapon=(w:WorldState)=>w.player.weapon?weaponById.get(w.player.weapon)??null:null;
export const weaponCooldown=(w:WorldState)=>Math.max(0,w.player.weaponReadyTick-w.tick);

interface Shot extends Vec2 { spec:Spec;vx:number;vy:number;remaining:number;zone:string;started:number;origin:Vec2 }
export interface WeaponFx { style:WeaponStyle;from:Vec2;to:Vec2;at:number;until:number;radius:number;hit:boolean }
interface Combat { shots:Shot[];fx:WeaponFx[] }
const tracked=new WeakMap<WorldState,Combat>();
function combat(w:WorldState){
  let state=tracked.get(w);
  if(!state){state={shots:[],fx:[]};tracked.set(w,state);}
  return state;
}
export const weaponEffects=(w:WorldState):readonly WeaponFx[]=>tracked.get(w)?.fx??[];
export const weaponShots=(w:WorldState):readonly Shot[]=>tracked.get(w)?.shots??[];
const gap=(a:Vec2,b:Vec2)=>Math.hypot(a.x-b.x,a.y-b.y);
const zone=(w:WorldState)=>w.activeIsland?.nodeId??'ark';
const point=(p:Vec2):Vec2=>({x:p.x,y:p.y});
function flash(w:WorldState,style:WeaponStyle,from:Vec2,to:Vec2,radius=0,hit=false,ttl=12){
  const fx=combat(w).fx;
  fx.push({style,from:point(from),to:point(to),at:w.tick,until:w.tick+ttl,radius,hit});
  if(fx.length>24)fx.shift();
}

export function craftWeapon(w:WorldState,id:string):string|null{
  if(incapacitated(w))return '昏迷时不能制作。';
  const row=weaponRecipe(id);
  if(!row)return '没有这个武器配方。';
  if(id!=='fire_oil_flask'&&countItem(w,id))return '背包已有这把武器。';
  return inventoryChange(w,row.inputs,[row.output])?null:'材料不足，或背包没有空位。';
}

export function chooseWeapon(w:WorldState,id:string|null):string|null{
  if(incapacitated(w))return '昏迷时不能装备武器。';
  if(id!==null&&(!weaponById.has(id)||!countItem(w,id)))return '背包里没有这把武器。';
  w.player.weapon=id;return null;
}

interface Target extends Vec2 { enemy:WildEntity|null }
function targets(w:WorldState):Target[]{
  const isle=w.activeIsland?.nodeId, t=w.wildEntities
    .filter(e=>e.hp>0&&(isle?e.kind==='boss'||e.kind==='beast'&&e.homeIslandId===isle:e.kind==='raider'))
    .map(e=>({x:e.x,y:e.y,enemy:e} as Target));
  const f=finaleStatus(w);
  if(f.atAurora&&f.mode==='battle'&&f.whale)t.push({x:f.whale.x,y:f.whale.y,enemy:null});
  return t;
}
const elementFor:Record<WeaponStyle,Element>={bolt:'ice',thrust:'break',sweep:'hammer',throw:'fire',flame:'fire'};
function hit(w:WorldState,s:Spec,target:Target):boolean {
  const element=elementFor[s.style];
  if(!target.enemy)return strikeWhaleWithWeapon(w,s.damage,element);
  const e=target.enemy;
  return e.kind==='beast'?strikeWildWithWeapon(w,e,s.damage,element):
    strikeHostileWithWeapon(w,e,s.damage,s.pierce,element);
}

export function triggerWeapon(w:WorldState,at:Vec2):string|null{
  if(incapacitated(w))return '昏迷中，等待救援。';
  if(rolling(w))return '翻滚时不能攻击。';
  const s=selectedWeapon(w),p=w.player;
  if(!s||!countItem(w,s.id))return '先在背包装备武器。';
  if(weaponCooldown(w))return '武器正在回手。';
  const here=areaAt(w,p.x,p.y);
  if(here!=='ark'&&here!=='island')return '站稳甲板或岛面才能出招。';
  const d=gap(p,at);
  if(!Number.isFinite(d)||d<.10)return '把准星移到人物身外再出招。';
  const dx=(at.x-p.x)/d,dy=(at.y-p.y)/d;
  p.facing={x:dx,y:dy};
  if(s.style==='throw'){
    if(!inventoryChange(w,[{itemId:s.id,count:1}],[]))return '火油瓶已经用完。';
    if(!countItem(w,s.id))p.weapon=null;
  }
  p.weaponReadyTick=w.tick+s.cooldown;
  if(s.speed){
    const shots=combat(w).shots;
    shots.push({spec:s,x:p.x,y:p.y,vx:dx*s.speed,vy:dy*s.speed,remaining:s.style==='throw'?Math.min(s.range,d):s.range,
      zone:zone(w),started:w.tick,origin:point(p)});
    if(shots.length>12)shots.shift();
  }else{
    const enemies=targets(w).filter(e=>{
      const range=gap(p,e);
      return range>0&&range<=s.range&&((e.x-p.x)*dx+(e.y-p.y)*dy)/range>=Math.cos(s.halfAngle);
    }).sort((a,b)=>gap(p,a)-gap(p,b));
    let landed=false;
    for(const t of s.style==='thrust'?enemies.slice(0,1):enemies)landed=hit(w,s,t)||landed;
    flash(w,s.style,p,{x:p.x+dx*s.range,y:p.y+dy*s.range},s.halfAngle,landed,s.style==='flame'?11:13);
  }
  return null;
}

export function stepWeapons(w:WorldState):void {
  const state=tracked.get(w);
  if(!state)return;
  state.fx=state.fx.filter(e=>e.until>w.tick);
  const current=zone(w);
  state.shots=state.shots.filter(shot=>{
    if(shot.zone!==current||incapacitated(w))return false;
    const {spec}=shot, length=Math.hypot(shot.vx,shot.vy),step=Math.min(shot.remaining,length),k=step/length;
    const from=point(shot),dx=shot.vx*k,dy=shot.vy*k;
    shot.x+=dx;shot.y+=dy;shot.remaining-=step;
    if(spec.style==='bolt'){
      const found=targets(w).flatMap(t=>{
        const dot=Math.max(0,Math.min(1,((t.x-from.x)*dx+(t.y-from.y)*dy)/Math.max(.0001,step*step)));
        return Math.hypot(t.x-from.x-dx*dot,t.y-from.y-dy*dot)<=spec.radius?[{t,dot}]:[];
      }).sort((a,b)=>a.dot-b.dot)[0];
      if(found){flash(w,'bolt',from,found.t,spec.radius,hit(w,spec,found.t),15);return false;}
      if(shot.remaining<=.0001){flash(w,'bolt',from,shot,0,false,6);return false;}
      return true;
    }
    if(shot.remaining>.0001)return true;
    let landed=false;
    for(const t of targets(w).filter(t=>gap(shot,t)<=spec.radius))landed=hit(w,spec,t)||landed;
    flash(w,'throw',shot,shot,spec.radius,landed,24);return false;
  });
}
