import { recordLife,stormDamage } from './life';
import { daySpeed } from './challenge';
import { trackTurret } from './turret-aim';
import { ancientDue,ancientValid,defeatAncient,depthOf,hasAncientWhiteout,isBountyEnemy,syncAncient } from './endless';
import { awardGuardian,clearGuardianStage,guardianHitScale,guardianTell,stepGuardian } from './guardians-p2';
import { defenseSlow,raiderConcealed,stepDefenses } from './defenses-p2';
import { partnerCritical } from './beast-bond';
import { beastAttackScale,gainBeastXp } from './beast-growth';
import { traitStrike,traitWatchful } from './beast-traits';
import { gangwayGeometry } from './island';
import { rotateDockPoint } from './dock-direction';
import { envelope,indoorsAt } from './rooms';
import { armorBroken,burnDamage,elementalSpeed,frozen,resolveElement,type Element } from './elements';
import { emitJuice } from './juice';
import { damagePlayer } from './rescue';
import specs from '../data/combat_m5.json';
import beastSpecs from '../data/beasts.json';
import { isDeck } from './ark';
import { DAY_TICKS, heatAt } from './heatField';
import { areaAt } from './island';
import { expandM5Chart } from './m5-zones';
import { TICK_RATE, type Vec2, type WildEntity, type WorldState } from './types';

const seeds = ['frostpine_gate', 'sulfur_reach', 'sulfur_furnace', 'permafrost_ruins'] as const;
export type M5SeedId = typeof seeds[number];
type HostileId = keyof typeof specs.hostiles;
type EnemyClock = { cooldown: number; strike: number; target: string; summons?:number };
interface M5State {
  raidDay: number;
  wave: number;
  nextWave: number;
  playerStrike: number;
  seeds: M5SeedId[];
  clocks: Record<string, EnemyClock>;
  turretClocks: Record<string, number>;
  bossIsland: string | null;
}
type M5World = WorldState & { combatM5?: M5State };
const fresh = ():M5State => ({raidDay:0,wave:0,nextWave:0,playerStrike:0,seeds:[],clocks:{},turretClocks:{},bossIsland:null});
const get = (w:WorldState) => (w as M5World).combatM5;
const live = (w:WorldState) => (w as M5World).combatM5 ??= fresh();
const length = (a:Vec2,b:Vec2)=>Math.hypot(a.x-b.x,a.y-b.y);
const bossByIsland:Record<string,HostileId> = { frostpine_gate:'frostmane_lord', sulfur_reach:'rift_carapace' };
const beastAttack = new Map(beastSpecs.map(b=>[b.id,b.attack]));
const isOwned = (e:WildEntity) => !!e && (e.kind==='boss'||e.kind==='raider') && Object.hasOwn(specs.hostiles,e.defId);
const onDeck = (w:WorldState,p:Vec2)=>isDeck(w,Math.floor(p.x),Math.floor(p.y));
export interface M5Effect { from:Vec2;to:Vec2;kind:'arrow'|'fire'|'strike'|'iceBolt'|'siphon'|'summon';expires:number }
const effects = new WeakMap<WorldState,M5Effect[]>();
const flash = (w:WorldState,from:Vec2,to:Vec2,kind:M5Effect['kind'])=>{
  effects.set(w,[...m5CombatEffects(w),{from:{x:from.x,y:from.y},to:{x:to.x,y:to.y},kind,expires:w.tick+8}]);
};
export const m5CombatEffects=(w:WorldState):readonly M5Effect[]=>(effects.get(w)??[]).filter(e=>e.expires>w.tick);

const raidPlan=(w:WorldState)=>specs.waves.map((wave,index)=>ancientDue(w)&&index===0?['frostspike_bat','heatwraith','froststalker']:w.day>=10&&index===2?['mist_priest','heatwraith','frostspike_bat']:wave);
export function m5Status(w:WorldState){
  const s=get(w),active=w.weather==='whiteout', ancient=hasAncientWhiteout(w),warning=(w.day%5===0||ancientDue(w))&&!active&&w.timeOfDay>=.59;
  return { active, storm:active, warning,ancient,
    untilTicks:warning?Math.ceil((.74-w.timeOfDay)*DAY_TICKS/daySpeed(w)):0,
    wave:s?.raidDay===w.day?s.wave:0, plan:raidPlan(w).map(wave=>wave.map(id=>specs.hostiles[id as HostileId].name)),
    raidsRemaining:w.wildEntities.filter(e=>e.kind==='raider'&&isOwned(e)&&e.hp>0).length,
    seeds:w.skyheartCores,
    bosses:w.wildEntities.filter(e=>e.kind==='boss'&&e.defId!=='frostpack_wolf'&&isOwned(e)&&e.hp>0),
  };
}

export function claimSunSeed(w:WorldState,key:M5SeedId):boolean {
  if(!seeds.includes(key))return false;
  const s=live(w);
  if(s.seeds.includes(key))return false;
  s.seeds.push(key);
  w.skyheartCores=Math.min(4,w.skyheartCores+1);
  return true;
}
export function claimIslandCacheSeed(w:WorldState,nodeKey:string):boolean{
  const id=w.activeIsland?.nodeId;
  return (id==='sulfur_furnace'||id==='permafrost_ruins')&&nodeKey==='chest_2068'&&claimSunSeed(w,id);
}

function hurt(w:WorldState,e:WildEntity,damage:number,bypassArmor=false,penetration=0,element?:Element,dot=false,criticalOverride=false){
  const arm=armorBroken(w,e.id)?0:(specs.hostiles[e.defId as HostileId]?.armor??0);
  const intensity=damage*guardianHitScale(w,e);
  const effect=element?resolveElement(w,e.id,intensity,element):{damage:intensity,critical:false};
  const before=e.hp;
  e.hp=Math.max(0,e.hp-Math.max(1,effect.damage-(bypassArmor?0:Math.max(0,arm-penetration))));
  emitJuice(w,dot?'burn':'hit',e,before-e.hp,{target:e.id,melt:effect.critical,critical:criticalOverride||effect.critical||(!dot&&e.kind==='boss'&&!e.hp)});
  if(before>0&&e.hp===0)recordLife(w,'foes');
  if(e.hp||e.kind!=='boss'||!isOwned(e))return;
  if(defeatAncient(w,e))return;
  const island=w.sky.islands.find(n=>n.id===w.activeIsland?.nodeId);
  if(!island||bossByIsland[island.id]!==e.defId)return;
  island.bossDefeated=true;
  claimSunSeed(w,island.id as M5SeedId);awardGuardian(w,e);
}
export function strikeHostileWithWeapon(w:WorldState,e:WildEntity,damage:number,penetration:number,element?:Element):boolean {
  if(!isOwned(e)||e.hp<=0)return false;
  hurt(w,e,damage,false,penetration,element);return true;
}
function add(w:WorldState,defId:HostileId,id:string,kind:'boss'|'raider',p:Vec2){
  const d=specs.hostiles[defId];
  w.wildEntities.push({id,defId,kind,x:p.x,y:p.y,hp:d.hp,maxHp:d.hp,stunnedTicks:0,tameProgress:0,hostile:true});
}
export function beginSkyRaid(w:WorldState,id:string):void{
 const edge=w.ark.decks.flatMap((v,i)=>{
  if(!v)return [];
  const x=i%w.ark.size,y=Math.floor(i/w.ark.size);
  return !isDeck(w,x+1,y)&&!w.ark.buildings.some(b=>b.gx===x&&b.gy===y)?[{x:x+.5,y:y+.5}]:[];
 });
 const living=w.wildEntities.filter(e=>isOwned(e)).length;
 if(living>6||!edge.length)return;
 const use=[Math.floor(edge.length*.3),Math.floor(edge.length*.75)];
 for(let i=0;i<use.length;i++){
  const slot=edge[use[i]];
  if(i===0||slot!==edge[use[0]])add(w,'froststalker','skyraid_'+id+'_'+i,'raider',slot);
 }
 live(w);
}
function resetEntities(w:WorldState,drop:(e:WildEntity)=>boolean){
  const s=live(w);
  w.wildEntities=w.wildEntities.filter(e=>{
    if(!isOwned(e)||!drop(e))return true;
    delete s.clocks[e.id];
    return false;
  });
}

export function endSkyRaid(w:WorldState,id:string):void{
 resetEntities(w,e=>e.id.startsWith('skyraid_'+id+'_'));
}
function stepBoss(w:WorldState,s:M5State){
  const island=w.activeIsland,id=island?.nodeId??null;
  if(id!==s.bossIsland){clearGuardianStage(w,s.bossIsland);resetEntities(w,e=>e.kind==='boss');s.bossIsland=id;}
  const node=w.sky.islands.find(n=>n.id===id);
  const defId=id?bossByIsland[id]:undefined;
  if(!island||!node||!defId||node.bossDefeated||w.wildEntities.some(e=>e.kind==='boss'&&e.defId===defId))return;
  const p=rotateDockPoint(gangwayGeometry(w)?.side??'east',island.size,25.5,32.5);
  const x=island.offsetX+p.x,y=island.offsetY+p.y;
  if(Math.hypot(w.player.x-x,w.player.y-y)<=11)
    add(w,defId,'boss_'+node.id,'boss',{x,y});
}

function spawnWave(w:WorldState,s:M5State){
  if(!specs.waves[s.wave])return;
  const edge:Vec2[]=[];
  for(let i=0;i<w.ark.decks.length;i++){
    if(!w.ark.decks[i])continue;
    const x=i%w.ark.size,y=Math.floor(i/w.ark.size);
    if(!isDeck(w,x-1,y)||!isDeck(w,x,y+1))edge.push({x:x+.5,y:y+.5});
  }
  const batch=raidPlan(w)[s.wave];
  if(!edge.length)return;
  batch.forEach((id,i)=>{
    const p=edge[(w.day*5+s.wave*7+i*Math.max(1,Math.floor(edge.length/batch.length)))%edge.length];
    add(w,id as HostileId,`raid_${w.day}_${s.wave}_${i}`,'raider',p);
  });
  s.wave++;
  s.nextWave=w.tick+TICK_RATE*15;
}
function move(w:WorldState,e:WildEntity,p:Vec2,speed:number){
  const gap=length(e,p);
  if(gap<.08)return;
  const k=Math.min(gap,speed*defenseSlow(w,e)*elementalSpeed(w,e.id)/TICK_RATE)/gap;
  const xx=e.x+(p.x-e.x)*k,yy=e.y+(p.y-e.y)*k;
  const pass=(x:number,y:number)=>e.kind==='boss'?areaAt(w,x,y)==='island':onDeck(w,{x,y})&&(e.defId==='frostspike_bat'||!w.ark.buildings.some(b=>envelope(b.defId)&&b.gx===Math.floor(x)&&b.gy===Math.floor(y)));
  if(pass(xx,e.y))e.x=xx;
  if(pass(e.x,yy))e.y=yy;
}
const center=({gx,gy}:{gx:number,gy:number})=>({x:gx+.5,y:gy+.5});
function stepTurrets(w:WorldState,s:M5State){
  const enemies=w.wildEntities.filter(e=>e.kind==='raider'&&isOwned(e)&&e.hp>0);
  if(!enemies.length)return;
  for(const b of w.ark.buildings){
    const def=specs.turrets[b.defId as keyof typeof specs.turrets];
    if(!def||b.hp<=1||heatAt(w,b.gx+.5,b.gy+.5)<def.heatFloor)continue;
    const from=center(b);
    const target=enemies.filter(e=>e.hp>0&&!raiderConcealed(w,e)&&length(from,e)<=def.range).sort((a,c)=>length(from,a)-length(from,c))[0];
    if(!target)continue;
    trackTurret(w,b.id,target);
    if((s.turretClocks[b.id]??0)>w.tick)continue;
    const fire=b.defId==='fire_oil_turret';
    hurt(w,target,def.damage,fire,0,fire?'fire':'ice');
    if(fire)for(const nearby of enemies)if(nearby!==target&&nearby.hp>0&&length(target,nearby)<1.3)hurt(w,nearby,Math.floor(def.damage/2),true,0,'fire');
    flash(w,from,target,fire?'fire':'arrow');
    s.turretClocks[b.id]=w.tick+def.cadence;
  }
}
function stepEnemy(w:WorldState,e:WildEntity,s:M5State){
  const d=specs.hostiles[e.defId as HostileId];
  const clock=s.clocks[e.id]??={cooldown:0,strike:0,target:''};
  if(burnDamage(w,e.id))hurt(w,e,3,true,0,undefined,true);
  if(e.hp<=0)return;
  if(frozen(w,e.id)){if(clock.strike)clock.strike++;return;}
  if(e.kind==='boss'&&stepGuardian(w,e,(pos,n)=>{
    const mob='guardian_wolf_'+e.id+'_'+n;
    if(!w.wildEntities.some(v=>v.id===mob))add(w,'frostpack_wolf',mob,'boss',pos);
  })){clock.strike=0;return;}
  const building=(id:string)=>w.ark.buildings.find(b=>b.id===id&&b.hp>0);
  const heat=e.defId==='heatwraith'?w.ark.buildings.filter(b=>b.hp>1&&(b.defId==='hearth_core'||b.defId==='ward_searchlight'||b.defId==='heat_relay'||b.defId==='torch_post')&&
    (b.defId!=='hearth_core'||b.fuel>0)).sort((a,b)=>length(e,center(a))-length(e,center(b)))[0]:undefined;
  const belongsToPlayer=(e.defId==='frostspike_bat'||e.defId==='mist_priest')?d.range+.5:2.4;
  const candidate=heat?heat.id:e.kind==='boss'||(w.player.hp>0&&onDeck(w,w.player)&&!indoorsAt(w,w.player)&&length(e,w.player)<belongsToPlayer)?'player':
    w.ark.buildings.filter(b=>b.hp>0).sort((a,b)=>length(e,center(a))-length(e,center(b)))[0]?.id??'';
  const target=clock.strike?clock.target:candidate;
  const obj=target==='player'?null:building(target);
  const pos=target==='player'?w.player:obj?center(obj):null;
  if(clock.strike){
    if(w.tick<clock.strike)return;
    clock.strike=0;
    clock.cooldown=w.tick+d.cadence;
    if(pos&&length(e,pos)<=d.range+.17){
      if(e.defId==='mist_priest'&&(clock.summons??0)<2){
        const wide=w.wildEntities.filter(v=>v.kind==='raider'&&v.hp>0).length;
        const site=[{x:e.x+.63,y:e.y},{x:e.x-.63,y:e.y},{x:e.x,y:e.y+.65},{x:e.x,y:e.y-.65}]
          .find(p=>onDeck(w,p)&&w.wildEntities.every(v=>v.hp<=0||length(p,v)>.48));
        if(site&&wide<12){
          const n=clock.summons??0;clock.summons=n+1;
          add(w,'froststalker','raid_'+w.day+'_summon_'+e.id+'_'+n,'raider',site);
          flash(w,e,site,'summon');return;
        }
      }
      if(e.defId==='heatwraith'&&obj&&obj.fuel>0)obj.fuel=Math.max(0,obj.fuel-3);
      const power=isBountyEnemy(e)?Math.round(d.damage*(1.22+Math.min(.64,Math.sqrt(depthOf(w)-1)*.055))):d.damage;
      if(obj){if(obj.hp>1)stormDamage(w);obj.hp=Math.max(1,obj.hp-power);} // critical fixtures remain recoverable after a failed night
      else if((e.kind==='raider'&&indoorsAt(w,w.player))||!damagePlayer(w,power))return;
      flash(w,e,pos,e.defId==='frostspike_bat'?'iceBolt':e.defId==='heatwraith'?'siphon':'strike');
    }
    return;
  }
  if(!pos||(target==='player'&&w.player.hp<=0))return;
  if(length(e,pos)>d.range){move(w,e,pos,d.speed);return;}
  if(clock.cooldown<=w.tick){clock.target=target;clock.strike=w.tick+d.windup;}
}
export function m5Telegraph(w:WorldState,id:string):boolean {
  return (id.startsWith('boss_')&&guardianTell(w)?.warn!==null&&!!guardianTell(w)?.warn)||(get(w)?.clocks[id]?.strike??0)>w.tick;
}

export function attackM5(w:WorldState):string|null {
  if(w.player.hp<=0)return '当前无法战斗';
  const s=live(w);
  if(s.playerStrike>w.tick)return '正在收招';
  const target=w.wildEntities.filter(e=>isOwned(e)&&e.hp>0&&length(e,w.player)<=2.05&&
    (w.activeIsland?e.kind==='boss':e.kind==='raider'&&onDeck(w,w.player)))
    .sort((a,b)=>length(w.player,a)-length(w.player,b))[0];
  if(!target)return '靠近敌人再按 F 反击';
  s.playerStrike=w.tick+14;
  hurt(w,target,20);
  flash(w,w.player,target,'strike');
  return null;
}
function stepCompanions(w:WorldState){
  if(w.tick%36!==0&&w.tick%30!==0)return;
  for(const b of w.beasts.filter(e=>e.role==='companion'&&e.hp>0)){
    if(w.tick%(traitWatchful(w,b)?30:36)!==0)continue;
    const target=w.wildEntities.find(e=>isOwned(e)&&e.hp>0&&length(b,e)<=2.4&&
      (w.activeIsland?e.kind==='boss':e.kind==='raider'));
    if(!target)continue;
    const before=target.hp,crit=partnerCritical(w,b.id,target.id);
    hurt(w,target,(beastAttack.get(b.defId)??10)*traitStrike(w,b)*beastAttackScale(w,b)*(crit?1.45:1),b.defId==='burrowback'||b.defId==='magmalisk',0,b.defId==='magmalisk'?'fire':undefined,false,crit);
    if(target.hp<before){
      gainBeastXp(w,b,target.hp<=0?14:6);
    }
    flash(w,b,target,b.defId==='magmalisk'?'fire':'strike');
  }
}
export function stepM5(w:WorldState):void{
  expandM5Chart(w);
  if(w.weather!=='whiteout'&&!w.activeIsland&&!get(w))return;
  const s=live(w);
  if(w.weather==='whiteout'){
    if(s.raidDay!==w.day){resetEntities(w,e=>e.kind==='raider'&&!e.id.startsWith('skyraid_'));s.raidDay=w.day;s.wave=0;s.nextWave=w.tick;}
    if(w.tick>=s.nextWave&&s.wave<specs.waves.length)spawnWave(w,s);
  }else resetEntities(w,e=>e.kind==='raider'&&!e.id.startsWith('skyraid_'));
  stepBoss(w,s);syncAncient(w);
  const raiders=w.wildEntities.filter(e=>e.kind==='raider'&&isOwned(e)&&e.hp>0);
  stepDefenses(w,s.turretClocks,raiders,(e,amount,element)=>hurt(w,e,amount,element==='fire',0,element));
  stepTurrets(w,s);
  stepCompanions(w);
  for(const e of w.wildEntities)
    if(isOwned(e)&&e.hp>0)stepEnemy(w,e,s);
  if(w.wildEntities.some(e=>isOwned(e)&&e.hp<=0))resetEntities(w,e=>e.hp<=0);
  if(w.tick%300===0)for(const id of Object.keys(s.turretClocks))
    if(!w.ark.buildings.some(b=>b.id===id))delete s.turretClocks[id];
}

export function verifyM5(w:WorldState):boolean{
  const s=get(w);
  if(s===undefined)return w.skyheartCores===0&&!w.wildEntities.some(isOwned);
  const num=(x:unknown):x is number=>Number.isSafeInteger(x)&&Number(x)>=0;
  const record=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
  if(!record(s)||!num(w.skyheartCores)||w.skyheartCores>4||!num(s.raidDay)||s.raidDay>w.day||!num(s.wave)||s.wave>specs.waves.length||
    !num(s.nextWave)||!num(s.playerStrike)||!Array.isArray(s.seeds)||s.seeds.length!==w.skyheartCores||
    new Set(s.seeds).size!==s.seeds.length||s.seeds.some(id=>!seeds.includes(id))||
    (s.bossIsland!==null&&!w.sky.islands.some(n=>n.id===s.bossIsland))||
    !record(s.clocks)||Object.keys(s.clocks).length>48||!record(s.turretClocks)||
    Object.keys(s.turretClocks).length>2304||!Object.values(s.turretClocks).every(num))return false;
  if(s.seeds.some(id=>{
    const node=w.sky.islands.find(n=>n.id===id);
    return !node||(id==='sulfur_furnace'||id==='permafrost_ruins'?!node.deltas.chest_2068:!node.bossDefeated);
  }))return false;
  if(!Object.values(s.clocks).every(c=>record(c)&&num(c.cooldown)&&num(c.strike)&&typeof c.target==='string'&&c.target.length<=96&&(c.summons===undefined||num(c.summons)&&c.summons<=2)))return false;
  const enemies=w.wildEntities.filter(isOwned);
  return enemies.length<=16&&new Set(enemies.map(e=>e.id)).size===enemies.length&&enemies.every(e=>
    typeof e.id==='string'&&e.id.length<=96&&Number.isFinite(e.x)&&Number.isFinite(e.y)&&
    Number.isFinite(e.hp)&&e.hp>=0&&e.hp<=e.maxHp&&(isBountyEnemy(e)?ancientValid(w,e):e.maxHp===specs.hostiles[e.defId as HostileId].hp));
}
