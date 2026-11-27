import { inventoryChange } from './ark';
import { downDock } from './dock-direction';
import { burnDamage,elementalSpeed,frozen,resolveElement,type Element } from './elements';
import { islandForage } from './forage';
import { feetSupported } from './ground-footprint';
import { dockedIsland,gangwayGeometry,islandNodes } from './island';
import { emitJuice } from './juice';
import { islandLandmarks } from './landmarks';
import { damagePlayer,incapacitated } from './rescue';
import { rolling } from './roll';
import { TICK_RATE,type IslandNode,type Vec2,type WorldState } from './types';

export const CAVE_SIZE={x:18,y:12};
export const CAVE_OFFSET={x:148,y:166};
export const CAVE_BLUEPRINT='ancient_cave_blueprint';
export const CAVE_TECH='ancient_cave_craft';
type Tier=2|3|4;
const MAX_GUARD={2:92,3:128,4:164};
const sq=(a:Vec2,b:Vec2)=>(a.x-b.x)**2+(a.y-b.y)**2;
const dist=(a:Vec2,b:Vec2)=>Math.sqrt(sq(a,b));
type Guard=Vec2&{hp:number;warning:number;cooldown:number;aim:Vec2};
type Visit={taken:boolean;guard:Guard;strikeAt:number};
type CaveData={pocket:string|null;visited:Record<string,Visit>};
type Save=WorldState&{cavesP2?:CaveData};
type Cave={node:string;tier:Tier;seed:number;tiles:readonly number[];exit:Vec2;chest:Vec2;guardHome:Vec2;traps:readonly (Vec2&{phase:number})[]};

const record=(w:WorldState)=>(w as Save).cavesP2;
const memory=(w:WorldState)=>((w as Save).cavesP2??={pocket:null,visited:{}});
const chambers=new Map<string,Cave>();
const gates=new WeakMap<object,Vec2>();
const pos=(x:number,y:number):Vec2=>({x:x+CAVE_OFFSET.x+.5,y:y+CAVE_OFFSET.y+.5});
const nodeOf=(w:WorldState)=>w.sky.islands.find(n=>n.id===w.ark.anchoredIslandId&&n.tier>=2&&n.tier<=4);
export const caveActive=(w:WorldState)=>record(w)?.pocket??null;
const seeded=(seed:number,k:number)=>((Math.imul(Math.imul(seed^Math.imul(k,0x2fae423b),0x27d4eb2d),0x85ebca6b)>>>0)/4294967296);
function chamber(n:IslandNode):Cave{
 const key=n.id+':'+n.seed+':'+n.tier,prior=chambers.get(key);if(prior)return prior;
 const tiles=Array<number>(CAVE_SIZE.x*CAVE_SIZE.y).fill(0);
 const tier=n.tier as Tier,branch=seeded(n.seed,9)<.5?-1:1;
 const room=(x:number,y:number,w:number,h:number,material:number)=>{
  for(let iy=y;iy<y+h;iy++)for(let ix=x;ix<x+w;ix++)tiles[iy*CAVE_SIZE.x+ix]=material;
 };
 room(1,4,4,4,1);room(4,5,6,2,2);room(8,3,6,6,2);room(13,5,4,3,tier===3?3:1);
 room(5,branch<0?2:7,5,3,tier===3?3:1);room(8,branch<0?4:6,2,3,tier===3?3:2);
 room(11,branch<0?7:2,3,3,1);
 const traps=[{...pos(6,5),phase:10},{...pos(9,7),phase:58},{...pos(12,5),phase:38}]
   .slice(0,tier===2?2:3);
 const next={node:n.id,tier,seed:n.seed,tiles,exit:pos(2,6),chest:pos(15,6),guardHome:pos(11,6),traps};
 if(chambers.size>=8)chambers.delete(chambers.keys().next().value!);
 chambers.set(key,next);return next;
}
export function activeCave(w:WorldState):Cave|null{
 const id=caveActive(w);
 if(!id||id!==w.ark.anchoredIslandId)return null;
 const node=nodeOf(w);return node?chamber(node):null;
}
export function caveFloor(c:Cave,x:number,y:number):boolean{
 const gx=Math.floor(x-CAVE_OFFSET.x),gy=Math.floor(y-CAVE_OFFSET.y);
 return gx>=0&&gy>=0&&gx<CAVE_SIZE.x&&gy<CAVE_SIZE.y&&!!c.tiles[gy*CAVE_SIZE.x+gx];
}
export function caveSight(c:Cave,a:Vec2,b:Vec2):boolean{
 const count=Math.max(1,Math.ceil(dist(a,b)*5));
 for(let i=0;i<=count;i++)if(!caveFloor(c,a.x+(b.x-a.x)*i/count,a.y+(b.y-a.y)*i/count))return false;
 return true;
}
export const caveGuardMax=(tier:Tier)=>MAX_GUARD[tier];
export function caveEntrance(w:WorldState):(Vec2&{tier:Tier})|null{
 const node=nodeOf(w),map=dockedIsland(w),g=gangwayGeometry(w);
 if(!node||!map||!g)return null;
 let spot=gates.get(map);
 if(!spot){
   const existing=[...islandNodes(w),...islandLandmarks(w),...islandForage(w)];
   let cost=Infinity;
   const flank=seeded(node.seed,8)<.5?-6:6;
   for(let fore=9;fore<=32;fore++)for(let across=-14;across<=14;across++){
    const p=downDock(g.landing,g.side,fore,across);
    const land=(a:number,b:number)=>{
      const x=Math.floor(a-map.offsetX),y=Math.floor(b-map.offsetY);
      return x>=0&&x<map.size&&y>=0&&y<map.size&&!!map.tiles[y*map.size+x];
    };
    if(!feetSupported(p.x,p.y,land)||existing.some(e=>sq(e,p)<9.3))continue;
    const q=Math.abs(fore-13)+Math.abs(across-flank)*.75+seeded(node.seed,fore*52+across)*2;
    if(q<cost){spot=p;cost=q;}
   }
   if(!spot)return null;
   gates.set(map,spot);
 }
 return {...spot,tier:node.tier as Tier};
}
export function nearCaveGate(w:WorldState):boolean{
 if(!w.activeIsland||caveActive(w))return false;
 const at=caveEntrance(w);return !!at&&dist(at,w.player)<=1.65;
}
export const caveEntranceArt=(tier:Tier)=>tier===2?'cave-gate-ice':tier===3?'cave-gate-basalt':'cave-gate-ruin';
export const caveEntranceTitle=(tier:Tier)=>tier===2?'地下冰窟裂口':tier===3?'余烬遗迹地穴':'永冻遗迹石门';
export function enterCave(w:WorldState):string|null{
 if(incapacitated(w)||rolling(w))return '站稳后再下去。';
 if(!nearCaveGate(w))return '走到冰窟入口旁。';
 const node=nodeOf(w)!;const c=chamber(node),s=memory(w);
 s.pocket=node.id;
 s.visited[node.id]??={taken:false,guard:{...c.guardHome,hp:MAX_GUARD[c.tier],warning:0,cooldown:0,aim:{...c.guardHome}},strikeAt:0};
 Object.assign(w.player,{...c.exit,vx:0,vy:0});
 w.player.grapple.charging=w.player.grapple.active=false;w.player.grapple.caughtDebrisId=null;
 return null;
}
export function abandonCave(w:WorldState):void{
 const s=record(w);if(!s?.pocket)return;
 const old=s.visited[s.pocket];if(old){old.guard.warning=0;old.guard.cooldown=w.tick+22;}
 s.pocket=null;
}
const liveVisit=(w:WorldState)=>{const id=caveActive(w);return id?record(w)?.visited[id]:undefined;};
export const caveGuard=(w:WorldState)=>liveVisit(w)?.guard;
export const caveChestTaken=(w:WorldState)=>liveVisit(w)?.taken??false;
export function caveContext(w:WorldState):'exit'|'chest'|'hunt'|'none'{
 const c=activeCave(w);if(!c)return 'none';
 if(dist(c.exit,w.player)<=1.30)return 'exit';
 if(dist(c.chest,w.player)<=1.58&&!caveChestTaken(w))return 'chest';
 return 'hunt';
}
export function useCave(w:WorldState):string|null{
 if(incapacitated(w)||rolling(w))return '站稳以后再操作。';
 const c=activeCave(w),visit=liveVisit(w);
 if(!c||!visit)return '先进入地下冰窟。';
 const type=caveContext(w);
 if(type==='exit'){
   const surface=caveEntrance(w);
   if(!surface)return '地表连接不可用。';
   abandonCave(w);
   Object.assign(w.player,{x:surface.x,y:surface.y,vx:0,vy:0});
   return null;
 }
 if(type!=='chest')return '靠近密室箱，或回到来时的石阶。';
 if(visit.guard.hp>0)return '精英守卫仍在巡逻，清掉守卫才能开箱。';
 const reward=c.tier===2?'frost_iron_ingot':c.tier===3?'sulfur_ore':'sky_mithril';
 if(!inventoryChange(w,[],[{itemId:CAVE_BLUEPRINT,count:1},{itemId:reward,count:3}]))return '背包空间不足，箱内物资不丢失。';
 visit.taken=true;
 if(!w.unlockedTech.includes(CAVE_TECH))w.unlockedTech.push(CAVE_TECH);
 return null;
}
export function caveTemperature(w:WorldState,x:number,y:number):number|null{
 const c=activeCave(w);if(!c||!caveFloor(c,x,y))return null;
 return (c.tier===2?-27:c.tier===3?-36:-45)+Math.max(0,1-dist(c.exit,{x,y})/3.5)*18;
}
export function caveHurt(w:WorldState,amount:number,element?:Element):boolean{
 const g=caveGuard(w),active=caveActive(w);
 if(!g||!active||g.hp<=0||amount<=0)return false;
 const target='cave_'+active,effect=element?resolveElement(w,target,amount,element):{damage:amount,critical:false};
 const before=g.hp;g.hp=Math.max(0,g.hp-effect.damage);
 emitJuice(w,'hit',g,before-g.hp,{target,critical:effect.critical,melt:effect.critical});return true;
}
export function caveMelee(w:WorldState):string|null{
 const v=liveVisit(w),g=v?.guard,c=activeCave(w);
 if(!v||!g||!c||g.hp<=0||dist(g,w.player)>1.95||!caveSight(c,g,w.player))return '贴近冰窟守卫，再按 F 反击。';
 if(incapacitated(w)||rolling(w))return '站稳后再反击。';
 if(w.tick<v.strikeAt)return '正在收招。';
 v.strikeAt=w.tick+17;caveHurt(w,19,'hammer');return null;
}
export function iceTrap(w:WorldState,phase:number):'quiet'|'warning'|'active'{
 const t=(w.tick+phase)%(6*TICK_RATE);
 return t<24?'active':t>6*TICK_RATE-33?'warning':'quiet';
}
export function stepCave(w:WorldState):void{
 const c=activeCave(w),g=caveGuard(w);
 if(!c||!g||incapacitated(w))return;
 const p=w.player,id='cave_'+c.node;
 if(w.tick%7===0)for(const t of c.traps)
    if(dist(t,p)<.53&&iceTrap(w,t.phase)==='active')damagePlayer(w,c.tier*2);
 if(g.hp<=0)return;
 if(burnDamage(w,id))caveHurt(w,3);
 if(g.hp<=0||frozen(w,id))return;
 const d=dist(g,p);
 if(g.warning){
   if(w.tick<g.warning)return;
   g.warning=0;g.cooldown=w.tick+31;
   if(dist(p,g.aim)<1.02&&dist(g,p)<2.1&&caveSight(c,g,p))damagePlayer(w,9+(c.tier-2)*4);
   return;
 }
 if(d<1.53&&caveSight(c,g,p)){
  if(w.tick>=g.cooldown){g.aim={x:p.x,y:p.y};g.warning=w.tick+26;}
  return;
 }
 const target=d<6?p:c.guardHome,length=dist(g,target);
 if(length>.27){
   const step=.047*elementalSpeed(w,id),nx=g.x+(target.x-g.x)/length*step,ny=g.y+(target.y-g.y)/length*step;
   if(caveFloor(c,nx,g.y))g.x=nx;
   if(caveFloor(c,g.x,ny))g.y=ny;
 }
}
export function validCaveArchive(w:WorldState):boolean{
 const state=record(w);if(state===undefined)return true;
 const obj=(v:unknown)=>!!v&&typeof v==='object'&&!Array.isArray(v);
 if(!obj(state)||!obj(state.visited)||(state.pocket!==null&&typeof state.pocket!=='string'))return false;
 const worlds=new Map(w.sky.islands.map(n=>[n.id,n]));
 const int=(v:number)=>Number.isSafeInteger(v)&&v>=0&&v<=w.tick+100;
 if(Object.keys(state.visited).length>8192||!Object.entries(state.visited).every(([key,v])=>{
  const n=worlds.get(key);
  if(!n||n.tier<2||n.tier>4||!obj(v)||!obj(v.guard)||!obj(v.guard.aim))return false;
  const c=chamber(n),g=v.guard;
  return typeof v.taken==='boolean'&&Number.isFinite(g.hp)&&g.hp>=0&&g.hp<=MAX_GUARD[c.tier]&&
    (!v.taken||g.hp===0)&&caveFloor(c,g.x,g.y)&&caveFloor(c,g.aim.x,g.aim.y)&&int(g.warning)&&int(g.cooldown)&&int(v.strikeAt);
 }))return false;
 if(state.pocket===null)return true;
 const c=activeCave(w),bridge=gangwayGeometry(w);
 return !!c&&!!bridge?.deployed&&!!state.visited[state.pocket]&&caveFloor(c,w.player.x,w.player.y);
}
