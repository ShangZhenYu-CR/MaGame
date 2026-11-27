import { verifyM5 } from './m5';
import { RESCUE_SHIELD_TICKS } from './rescue';
import { isMeal, MAX_MEAL_TICKS } from './food';
import { isGrappleItem } from './grapple-tools';
import items from '../data/items.json';
import buildings from '../data/buildings.json';
import recipes from '../data/recipes.json';
import { STORAGE_SLOTS } from './storage-box';
import { areaAt, dockedIsland, validIslandDeltas } from './island';
import { ensureNavigation } from './sky-map';
import { validFinale, canReachAurora } from './finale';
import { toolDefinition } from './tools';
import biomes from '../data/biomes.json';
import { beastDefinitions, MAX_COMPANIONS } from './beasts';
import { ARK_SIZE, SAVE_VERSION, TICK_RATE, type BuildingInstance, type IslandNode, type ItemStack, type WorldState } from './types';

export function serializeWorld(world: WorldState): string {
  // The active map only persists its reference; topology is reconstructed
  // from the same seed and the island's sparse resource deltas.
  const activeIsland=world.activeIsland;
  if(!activeIsland)return JSON.stringify(world);
  const {tiles:_,...location}=activeIsland;
  return JSON.stringify({...world,activeIsland:location});
}

const ids = new Map(items.map(i=>[i.id,i.stack]));
const buildDefs = new Map(buildings.map(i=>[i.id,i]));
const recipeDefs = new Map(recipes.map(r=>[r.id,r]));
const record = (u:unknown):u is Record<string,unknown> => !!u&&typeof u==='object'&&!Array.isArray(u);
const num = (u:unknown):u is number => typeof u==='number'&&Number.isFinite(u);
const eachNumber = (u:Record<string,unknown>, keys:string[])=>keys.every(k=>num(u[k]));
const stack = (u:unknown)=>record(u)&&typeof u.itemId==='string'&&num(u.count)&&Number.isInteger(u.count)&&u.count>0&&u.count<=(ids.get(u.itemId)??0)&&
  (u.durability===undefined||
    (num(u.durability)&&Number.isSafeInteger(u.durability)&&u.durability>=0&&u.durability<=(toolDefinition(u.itemId)?.maxDurability??-1)));

function grid(n:unknown):n is number {
  return num(n)&&Number.isInteger(n)&&n>=0&&n<ARK_SIZE;
}
function validBuilding(b:unknown):b is BuildingInstance {
  if(!record(b)||typeof b.id!=='string'||typeof b.defId!=='string'||!grid(b.gx)||!grid(b.gy))return false;
  const def=buildDefs.get(b.defId);
  return !!def&&b.gx+def.size[0]<=ARK_SIZE&&b.gy+def.size[1]<=ARK_SIZE&&
    eachNumber(b,['hp','maxHp','fuel','level'])&&typeof b.frozen==='boolean';
}
function validStation(value:unknown,defId:string):boolean {
  if(!record(value)||!num(value.cycle)||value.cycle<0||value.cycle>=TICK_RATE)return false;
  for(const bin of [value.output,value.intake])
    if(!Array.isArray(bin)||bin.length>8||!bin.every(stack)||new Set(bin.map(s=>s.itemId)).size!==bin.length)return false;
  const j=value.job;
  const recipe=record(j)&&typeof j.recipeId==='string'?recipeDefs.get(j.recipeId):undefined;
  if(j===null)return true;
  if(!record(j)||recipe?.station!==defId||!recipe.seconds||
    !num(j.progress)||!num(j.duration)||j.progress<0||j.duration!==recipe.seconds*TICK_RATE||j.progress>j.duration||
    !num(j.cold)||!Number.isInteger(j.cold)||j.cold<0||j.cold>=30*TICK_RATE)return false;
  const paid=j.paid;
  if(paid===undefined)return true;
  const exact=(cost:ItemStack[])=>Array.isArray(paid)&&paid.length===cost.length&&paid.every((s,i)=>
    stack(s)&&s.itemId===cost[i].itemId&&s.count===cost[i].count);
  return exact(recipe.inputs)||(defId==='furnace'&&exact(recipe.inputs.filter(s=>s.itemId!=='coal_chunk')));
}

function isWildEntity(e:unknown):e is import('./types').WildEntity{
  if(!record(e)||typeof e.id!=='string'||typeof e.defId!=='string'||
    !['beast','raider','boss'].includes(String(e.kind))||typeof e.hostile!=='boolean'||
    !num(e.x)||!num(e.y)||!num(e.hp)||!num(e.maxHp)||e.maxHp<=0||e.hp<0||e.hp>e.maxHp||
    !num(e.stunnedTicks)||!Number.isSafeInteger(e.stunnedTicks)||e.stunnedTicks<0||
    !num(e.tameProgress)||!Number.isSafeInteger(e.tameProgress)||e.tameProgress<0)return false;
  const d=beastDefinitions.get(e.defId);
  return e.kind==='beast'?!!d&&typeof e.homeIslandId==='string'&&e.maxHp===d.maxHp&&
    e.tameProgress<d.tameFeedsRequired:e.homeIslandId===undefined||typeof e.homeIslandId==='string';
}
function isBeast(b:unknown):b is import('./types').BeastEntity{
  if(!record(b)||typeof b.id!=='string'||typeof b.name!=='string'||typeof b.defId!=='string'||
     !num(b.hp)||!num(b.maxHp)||b.maxHp<=0||b.hp<0||b.hp>b.maxHp||
     !num(b.warmth)||b.warmth<0||b.warmth>100||!num(b.hunger)||b.hunger<0||b.hunger>100||
     !num(b.workCooldown)||!Number.isSafeInteger(b.workCooldown)||b.workCooldown<0||
     !eachNumber(b,['x','y'])||!(b.denBuildingId===null||typeof b.denBuildingId==='string')||
     !['work','rest','companion'].includes(String(b.role)))return false;
  return beastDefinitions.get(b.defId)?.maxHp===b.maxHp;
}
function validateFauna(p:Record<string,unknown>,ids:Set<string>):void{
  const invalid=()=>new Error('云兽或饲料存档不符合方舟格式');
  const {beastM4, beasts, wildEntities}=p;
  if(!Array.isArray(beasts)||!Array.isArray(wildEntities)||beasts.length>18||!beasts.every(isBeast)||
     !wildEntities.every(isWildEntity)||wildEntities.some(e=>e.kind==='beast'&&!ids.has(e.homeIslandId!))||
     new Set([...wildEntities,...beasts].map(e=>e.id)).size!==wildEntities.length+beasts.length||
     beasts.filter(b=>b.role==='companion').length>MAX_COMPANIONS)throw invalid();
  if(beastM4===undefined){if(wildEntities.some(e=>e.kind==='beast')||beasts.length)throw invalid();return;}
  if(!record(beastM4)||!record(beastM4.fauna)||!num(beastM4.feed)||!Number.isSafeInteger(beastM4.feed)||
    beastM4.feed<0||beastM4.feed>50||!num(beastM4.lastStrike)||!Number.isSafeInteger(beastM4.lastStrike)||
    !num(beastM4.offsetX)||!num(beastM4.offsetY)||!Number.isSafeInteger(beastM4.offsetX)||!Number.isSafeInteger(beastM4.offsetY)||
    (beastM4.islandId!==null&&(typeof beastM4.islandId!=='string'||!ids.has(beastM4.islandId)))||
    !Array.isArray(beastM4.pack)||beastM4.pack.length>12||!beastM4.pack.every(s=>stack(s)&&!isGrappleItem(s.itemId)&&!toolDefinition(s.itemId))||
    new Set(beastM4.pack.map(s=>s.itemId)).size!==beastM4.pack.length)throw invalid();
  for(const [id,population] of Object.entries(beastM4.fauna)){
    if(!ids.has(id)||id===beastM4.islandId||!Array.isArray(population)||population.length>20||
      !population.every(e=>isWildEntity(e)&&e.kind==='beast'&&e.homeIslandId===id&&e.x>=0&&e.x<64&&e.y>=0&&e.y<64)||
      new Set(population.map(e=>e.id)).size!==population.length)throw invalid();
  }
}

export function deserializeWorld(raw: string): WorldState {
  const p:unknown=JSON.parse(raw);
  if(!record(p)||![1,2,3,SAVE_VERSION].includes(Number(p.saveVersion))||typeof p.saveVersion!=='number')
    throw new Error('存档版本不受支持');
  if(p.saveVersion===1){
    if(record(p.player))p.player.rescue={startedAt:null,shieldUntil:0};
  }
  if(p.saveVersion===1||p.saveVersion===2){
    if(record(p.player))p.player.diet={warmUntil:0,last:null,quick:null};
  }
  p.saveVersion=SAVE_VERSION;
  const {ark, player, sky, latte}=p;
  if(!eachNumber(p,['seed','rngState','tick','day','timeOfDay','ambientTemp','skyheartCores'])||
     !num(p.tick)||!Number.isSafeInteger(p.tick)||p.tick<0||!['clear','snow','whiteout'].includes(String(p.weather))||
     !record(ark)||ark.size!==ARK_SIZE||!Array.isArray(ark.decks)||ark.decks.length!==ARK_SIZE**2||!ark.decks.every(n=>[0,1,2].includes(n))||
     !Array.isArray(ark.heatGrid)||ark.heatGrid.length!==ARK_SIZE**2||!ark.heatGrid.every(num)||
     !eachNumber(ark,['buoyancyUsed','buoyancyMax'])||!Array.isArray(ark.buildings)||
     !ark.buildings.every(validBuilding)||
     !record(player)||!eachNumber(player,['x','y','vx','vy','hp','maxHp','warmth','maxWarmth','hunger','maxHunger','portraitMood','selectedSlot'])||
     !Array.isArray(player.inventory)||player.inventory.length!==18||!player.inventory.every(s=>s===null||stack(s))||
     !record(player.facing)||!eachNumber(player.facing,['x','y'])||
     !record(player.grapple)||!eachNumber(player.grapple,['charge','targetX','targetY'])||
     typeof player.grapple.active!=='boolean'||typeof player.grapple.charging!=='boolean'||
     (player.grapple.caughtDebrisId!==null&&typeof player.grapple.caughtDebrisId!=='string')||
     !record(sky)||!eachNumber(sky,['x','y','headingX','headingY','windX','windY'])||typeof sky.cruising!=='boolean'||
     !Array.isArray(sky.islands)||!Array.isArray(sky.debris)||
     !sky.debris.every(d=>record(d)&&typeof d.id==='string'&&eachNumber(d,['x','y','vx','vy'])&&Array.isArray(d.loot)&&d.loot.length>0&&d.loot.every(stack)&&(d.heavy===undefined||typeof d.heavy==='boolean'))||
     !record(latte)||!eachNumber(latte,['x','y'])||!Array.isArray(p.beasts)||!Array.isArray(p.wildEntities)||
     !Array.isArray(p.unlockedTech)||typeof p.bossDefeated!=='boolean')throw new Error('存档数据不完整或不符合方舟格式');
  if(p.storageM0!==undefined){
    if(!Array.isArray(p.storageM0)||p.storageM0.length>STORAGE_SLOTS||
       !p.storageM0.every(stack)||p.storageM0.some(s=>isGrappleItem(s.itemId))||
       new Set(p.storageM0.map(s=>s.itemId)).size!==p.storageM0.length)
      throw new Error('储物箱数据不符合方舟格式');
  }
  if(p.industryM2!==undefined){
    const industry=p.industryM2;
    const invalid=()=>new Error('M2 设备或拆除存档不符合方舟格式');
    if(!record(industry)||!record(industry.stations))throw invalid();
    for(const [id,value] of Object.entries(industry.stations)){
      const target=ark.buildings.find(b=>b.id===id);
      if(!target||!validStation(value,target.defId))throw invalid();
    }
    const r=industry.removal;
    if(r!==null){
      if(!record(r)||!grid(r.gx)||!grid(r.gy)||!num(r.expires)||!Number.isSafeInteger(r.expires)
        ||r.expires<=p.tick||r.expires>p.tick+4*TICK_RATE)throw invalid();
      if(r.building===null){
        if(![1,2].includes(Number(r.deck))||typeof r.deck!=='number'||r.station!==null||ark.decks[r.gy*ARK_SIZE+r.gx])throw invalid();
      }else{
        if(!validBuilding(r.building)||r.deck!==0||r.building.gx!==r.gx||r.building.gy!==r.gy||
          r.building.defId==='hearth_core'||r.building.id==='storage_main'||
          ark.buildings.some(b=>b.id===(r.building as {id:string}).id)||
          (r.station!==null&&!validStation(r.station,r.building.defId)))throw invalid();
      }
    }
  }
  const invalidNavigation=()=>new Error('航图、跳板或浮岛存档不符合方舟格式');
  const ids=new Set<string>();
  for(const v of sky.islands){
    if(!record(v)||typeof v.id!=='string'||!/^[a-z0-9_]{1,64}$/.test(v.id)||ids.has(v.id)||
      typeof v.name!=='string'||v.name.length>64||!biomes.some(b=>b.id===v.biomeId&&b.tier===v.tier)||
      !eachNumber(v,['seed','skyX','skyY'])||!Number.isSafeInteger(v.seed)||
      typeof v.discovered!=='boolean'||typeof v.bossDefeated!=='boolean'||
      !record(v.deltas)||Object.keys(v.deltas).length>64||
      !validIslandDeltas(v as unknown as IslandNode))throw invalidNavigation();
    ids.add(v.id);
  }
  validateFauna(p,ids);
  const nav=p.navigationM3;
  if(nav!==undefined){
    if(!record(nav)||(nav.targetId!==null&&(typeof nav.targetId!=='string'||!ids.has(nav.targetId))))
      throw invalidNavigation();
    const dock=nav.dock;
    if(dock!==null){
      if(!record(dock)||typeof dock.nodeId!=='string'||dock.nodeId!==ark.anchoredIslandId||!ids.has(dock.nodeId)
        ||!grid(dock.gx)||!grid(dock.gy)||!ark.decks[dock.gy*ARK_SIZE+dock.gx]
        ||(dock.gx<ARK_SIZE-1&&ark.decks[dock.gy*ARK_SIZE+dock.gx+1])
        ||typeof dock.deployed!=='boolean'||sky.cruising)throw invalidNavigation();
    }else if(ark.anchoredIslandId!==null)throw invalidNavigation();
  }else if(ark.anchoredIslandId!==null)throw invalidNavigation();

  if(!record(player.rescue)||
    (player.rescue.startedAt!==null&&(!num(player.rescue.startedAt)||!Number.isSafeInteger(player.rescue.startedAt)||
      player.rescue.startedAt<0||player.rescue.startedAt>p.tick||player.hp!==0))||
    !num(player.rescue.shieldUntil)||!Number.isSafeInteger(player.rescue.shieldUntil)||
    player.rescue.shieldUntil<0||player.rescue.shieldUntil>p.tick+RESCUE_SHIELD_TICKS)
    throw new Error('救援存档不符合方舟格式');
  if(!record(player.diet)||!num(player.diet.warmUntil)||!Number.isSafeInteger(player.diet.warmUntil)||
    player.diet.warmUntil<0||player.diet.warmUntil>p.tick+MAX_MEAL_TICKS||
    !(player.diet.last===null||isMeal(player.diet.last))||!(player.diet.quick===null||isMeal(player.diet.quick))||
    !num(player.hunger)||!num(player.maxHunger)||player.maxHunger<=0||player.hunger<0||player.hunger>player.maxHunger)
    throw new Error('食物或饱食度存档不符合方舟格式');
  const world=p as unknown as WorldState;
  if(!validFinale(world)||
    (world.ark.anchoredIslandId&&!canReachAurora(world,world.ark.anchoredIslandId))||
    (nav&&record(nav)&&typeof nav.targetId==='string'&&!canReachAurora(world,nav.targetId)))
    throw new Error('太阳方舟或终局存档不符合方舟格式');
  const active=p.activeIsland;
  world.activeIsland=null;
  ensureNavigation(world);
  const area=areaAt(world,world.player.x,world.player.y);
  if(area==='island'){
    const island=dockedIsland(world);
    if(!island||!record(active)||active.nodeId!==island.nodeId||active.biomeId!==island.biomeId||
      active.size!==island.size||active.offsetX!==island.offsetX||active.offsetY!==island.offsetY)throw invalidNavigation();
    world.activeIsland=island;
  }else if(area==='void'||active!==null)throw invalidNavigation();
  if(!verifyM5(world))throw new Error('寒潮、首领或火种存档不符合方舟格式');
  return world;
}
