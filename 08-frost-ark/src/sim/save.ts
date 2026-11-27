import items from '../data/items.json';
import buildings from '../data/buildings.json';
import recipes from '../data/recipes.json';
import { STORAGE_SLOTS } from './storage-box';
import { ARK_SIZE, SAVE_VERSION, TICK_RATE, type BuildingInstance, type WorldState } from './types';

export function serializeWorld(world: WorldState): string {
  return JSON.stringify(world);
}

const ids = new Map(items.map(i=>[i.id,i.stack]));
const buildDefs = new Map(buildings.map(i=>[i.id,i]));
const recipeDefs = new Map(recipes.map(r=>[r.id,r]));
const record = (u:unknown):u is Record<string,unknown> => !!u&&typeof u==='object'&&!Array.isArray(u);
const num = (u:unknown):u is number => typeof u==='number'&&Number.isFinite(u);
const eachNumber = (u:Record<string,unknown>, keys:string[])=>keys.every(k=>num(u[k]));
const stack = (u:unknown)=>record(u)&&typeof u.itemId==='string'&&num(u.count)&&Number.isInteger(u.count)&&u.count>0&&u.count<=(ids.get(u.itemId)??0);

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
  return j===null||(record(j)&&recipe?.station===defId&&!!recipe.seconds&&
    num(j.progress)&&num(j.duration)&&j.progress>=0&&j.duration===recipe.seconds*TICK_RATE&&j.progress<=j.duration&&
    num(j.cold)&&Number.isInteger(j.cold)&&j.cold>=0&&j.cold<30*TICK_RATE);
}

export function deserializeWorld(raw: string): WorldState {
  const p:unknown=JSON.parse(raw);
  if(!record(p)||p.saveVersion!==SAVE_VERSION)throw new Error('存档版本不受支持');
  const {ark, player, sky, latte}=p;
  if(!eachNumber(p,['seed','rngState','tick','day','timeOfDay','ambientTemp','skyheartCores'])||
     !num(p.tick)||!Number.isSafeInteger(p.tick)||p.tick<0||!['clear','snow','whiteout'].includes(String(p.weather))||
     !record(ark)||ark.size!==ARK_SIZE||!Array.isArray(ark.decks)||ark.decks.length!==ARK_SIZE**2||!ark.decks.every(n=>[0,1,2].includes(n))||
     !Array.isArray(ark.heatGrid)||ark.heatGrid.length!==ARK_SIZE**2||!ark.heatGrid.every(num)||
     !eachNumber(ark,['buoyancyUsed','buoyancyMax'])||!Array.isArray(ark.buildings)||
     !ark.buildings.every(validBuilding)||
     !record(player)||!eachNumber(player,['x','y','vx','vy','hp','maxHp','warmth','maxWarmth','hunger','maxHunger','portraitMood','selectedSlot'])||
     !num(player.x)||!num(player.y)||player.x<0||player.y<0||player.x>=ARK_SIZE||player.y>=ARK_SIZE||
     !ark.decks[Math.floor(player.y)*ARK_SIZE+Math.floor(player.x)]||
     !Array.isArray(player.inventory)||player.inventory.length!==18||!player.inventory.every(s=>s===null||stack(s))||
     !record(player.facing)||!eachNumber(player.facing,['x','y'])||
     !record(player.grapple)||!eachNumber(player.grapple,['charge','targetX','targetY'])||
     typeof player.grapple.active!=='boolean'||typeof player.grapple.charging!=='boolean'||
     (player.grapple.caughtDebrisId!==null&&typeof player.grapple.caughtDebrisId!=='string')||
     !record(sky)||!eachNumber(sky,['x','y','headingX','headingY','windX','windY'])||typeof sky.cruising!=='boolean'||
     !Array.isArray(sky.islands)||!Array.isArray(sky.debris)||
     !sky.debris.every(d=>record(d)&&typeof d.id==='string'&&eachNumber(d,['x','y','vx','vy'])&&Array.isArray(d.loot)&&d.loot.length>0&&d.loot.every(stack))||
     !record(latte)||!eachNumber(latte,['x','y'])||!Array.isArray(p.beasts)||!Array.isArray(p.wildEntities)||
     !Array.isArray(p.unlockedTech)||typeof p.bossDefeated!=='boolean')throw new Error('存档数据不完整或不符合方舟格式');
  if(p.storageM0!==undefined){
    if(!Array.isArray(p.storageM0)||p.storageM0.length>STORAGE_SLOTS||
       !p.storageM0.every(stack)||p.storageM0.some(s=>s.itemId==='grapple_hook')||
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
  return p as unknown as WorldState;
}
