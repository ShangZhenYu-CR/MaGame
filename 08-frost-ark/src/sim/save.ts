import items from '../data/items.json';
import buildings from '../data/buildings.json';
import { ARK_SIZE, SAVE_VERSION, type WorldState } from './types';

export function serializeWorld(world: WorldState): string {
  return JSON.stringify(world);
}

const ids = new Map(items.map(i=>[i.id,i.stack]));
const buildIds = new Set(buildings.map(i=>i.id));
const record = (u:unknown):u is Record<string,unknown> => !!u&&typeof u==='object'&&!Array.isArray(u);
const num = (u:unknown):u is number => typeof u==='number'&&Number.isFinite(u);
const eachNumber = (u:Record<string,unknown>, keys:string[])=>keys.every(k=>num(u[k]));
const stack = (u:unknown)=>record(u)&&typeof u.itemId==='string'&&num(u.count)&&Number.isInteger(u.count)&&u.count>0&&u.count<=(ids.get(u.itemId)??0);

export function deserializeWorld(raw: string): WorldState {
  const p:unknown=JSON.parse(raw);
  if(!record(p)||p.saveVersion!==SAVE_VERSION)throw new Error('存档版本不受支持');
  const {ark, player, sky, latte}=p;
  if(!eachNumber(p,['seed','rngState','tick','day','timeOfDay','ambientTemp','skyheartCores'])||
     !num(p.tick)||!Number.isSafeInteger(p.tick)||p.tick<0||!['clear','snow','whiteout'].includes(String(p.weather))||
     !record(ark)||ark.size!==ARK_SIZE||!Array.isArray(ark.decks)||ark.decks.length!==ARK_SIZE**2||!ark.decks.every(n=>[0,1,2].includes(n))||
     !Array.isArray(ark.heatGrid)||ark.heatGrid.length!==ARK_SIZE**2||!ark.heatGrid.every(num)||
     !eachNumber(ark,['buoyancyUsed','buoyancyMax'])||!Array.isArray(ark.buildings)||
     !ark.buildings.every(b=>record(b)&&typeof b.id==='string'&&typeof b.defId==='string'&&buildIds.has(b.defId)&&eachNumber(b,['gx','gy','hp','maxHp','fuel','level'])&&typeof b.frozen==='boolean')||
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
  return p as unknown as WorldState;
}
