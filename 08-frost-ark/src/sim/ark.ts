import { doorBlocksFeet,invalidateRoomTopology,isDoor } from './rooms';
import { emitJuice } from './juice';
import { incapacitated } from './rescue';
import { feetSupported, GROUND_FOOTPRINTS, PLAYER_FOOT_RADIUS } from './ground-footprint';
import buildings from '../data/buildings.json';
import recipes from '../data/recipes.json';
import items from '../data/items.json';
import tech from '../data/tech.json';
import { getIndustrySave } from './m2-state';
import { getNavigation } from './m3-state';
import { crewBuoyancyBonus } from './beasts';
import type { BuildingInstance, ItemStack, Vec2, WorldState } from './types';

export const buildKinds = [
  'wood_deck','torch_post','wind_wall','workbench','furnace','stove','heat_relay',
  'catch_net','sorter_arm','greenhouse','warm_wall','buoyancy_core','iron_deck','beast_den','feed_trough',
  'frost_turret','fire_oil_turret','wind_door','frost_airlock','fuel_hopper','steam_chute',
] as const;
export type BuildKind = typeof buildKinds[number];
export const itemNames = new Map(items.map(({ id, name }) => [id, name]));
export const itemStackLimits = new Map(items.map(i => [i.id, i.stack]));
export const buildingDefs = new Map(buildings.map(d => [d.id, d]));
const torch = recipes.find(r => r.id === 'craft_torch')!;
type BuildingDef = typeof buildings[number];
export const buildDefinitions = Object.fromEntries(buildKinds.map(id => [id, buildingDefs.get(id)!])) as Record<BuildKind, BuildingDef>;
export const buildCosts = Object.fromEntries(buildKinds.map(id => [id, buildDefinitions[id].cost])) as Record<BuildKind, ItemStack[]>;
export const torchInputs = torch.inputs;

export function isDeck(w: WorldState, x: number, y: number): boolean {
  const { size, decks } = w.ark;
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < size && y < size && decks[y * size + x] !== 0;
}

export function buildingAt(w: WorldState, x: number, y: number): BuildingInstance | undefined {
  return w.ark.buildings.find(b => {
    const [sx, sy] = buildingDefs.get(b.defId)?.size ?? [1, 1];
    return x >= b.gx && y >= b.gy && x < b.gx + sx && y < b.gy + sy;
  });
}

/** Rectangle overlap for the player's feet, independent of tile-based placement/UI. */
export function hasBuildingContact(w: WorldState, px: number, py: number): boolean {
  const r = PLAYER_FOOT_RADIUS;
  return w.ark.buildings.some(b => {
    const [sx, sy] = buildingDefs.get(b.defId)?.size ?? [1, 1];
    const [left, top, right, bottom] = GROUND_FOOTPRINTS[b.defId]?.bounds ?? [0, 0, sx, sy];
    if(isDoor(b.defId))return doorBlocksFeet(b,{x:px,y:py},r);
    return px + r > b.gx + left && px - r < b.gx + right &&
           py + r > b.gy + top && py - r < b.gy + bottom;
  });
}

export function makeBuilding(defId: string, gx: number, gy: number, id: string): BuildingInstance {
  const { maxHp } = buildingDefs.get(defId)!;
  return { id, defId, gx, gy, hp: maxHp, maxHp, fuel: 0, level: 1, frozen: false,
    ...(isDoor(defId)?{door:{open:false,nearbyUntil:0}}:{}) };
}

export function countItem(w: WorldState, id: string): number {
  return w.player.inventory.reduce((n, s) => n + (s?.itemId === id ? s.count : 0), 0);
}

export function hasCost(w: WorldState, cost: ItemStack[]): boolean {
  return cost.every(s => countItem(w, s.itemId) >= s.count);
}

export function inventoryChange(w: WorldState, cost: ItemStack[], gains: ItemStack[]): boolean {
  if (!hasCost(w, cost)) return false;
  const slots = w.player.inventory.map(s => s && { ...s });
  for (const { itemId, count } of cost) {
    let remaining = count;
    for (const [i, s] of slots.entries()) {
      if (s?.itemId !== itemId || !remaining) continue;
      const n = Math.min(s.count, remaining);
      s.count -= n;
      remaining -= n;
      if (!s.count) slots[i] = null;
    }
    if (remaining) return false;
  }
  for (const { itemId, count, durability } of gains) {
    let remaining = count;
    const max = itemStackLimits.get(itemId) ?? 1;
    for (const stack of slots) {
      if (!stack || stack.itemId !== itemId || !remaining) continue;
      const n = Math.min(max - stack.count, remaining);
      stack.count += n;
      remaining -= n;
    }
    for (const [i, stack] of slots.entries()) {
      if (stack || !remaining) continue;
      const n = Math.min(max, remaining);
      slots[i] = durability===undefined ? { itemId, count: n } : { itemId, count: n, durability };
      remaining -= n;
    }
    if (remaining) return false;
  }
  w.player.inventory = slots;
  return true;
}

export function craftTorch(w: WorldState): boolean {
  return inventoryChange(w, torch.inputs, [torch.output]);
}

const cardinal = [[1,0],[-1,0],[0,1],[0,-1]];
export const isEdgeDeck = (w: WorldState, x: number, y: number) =>
  isDeck(w,x,y) && cardinal.some(([dx,dy]) => !isDeck(w,x+dx,y+dy));

export function refreshBuoyancy(w: WorldState): void {
  let used=0, capacity=0;
  for (const deck of w.ark.decks) {
    if (deck===1) used-=buildDefinitions.wood_deck.buoyancyDelta;
    if (deck===2) used-=buildDefinitions.iron_deck.buoyancyDelta;
  }
  for (const building of w.ark.buildings) {
    const n=buildingDefs.get(building.defId)?.buoyancyDelta ?? 0;
    if (n>0) capacity+=n+(building.defId==='hearth_core'?(building.level>=4?40:building.level===3?24:0):0); else used-=n;
  }
  w.ark.buoyancyUsed=used;
  w.ark.buoyancyMax=Math.floor(capacity*(1+crewBuoyancyBonus(w)));
}

export function playerOverTile(w: WorldState, x: number, y: number): boolean {
  const r=PLAYER_FOOT_RADIUS;
  return w.player.x + r > x && w.player.x - r < x+1 &&
         w.player.y + r > y && w.player.y - r < y+1;
}

export function buildIssue(w: WorldState, kind: BuildKind, x: number, y: number): string | null {
  if(incapacitated(w))return '昏迷中，等待救援。';
  const def=buildDefinitions[kind];
  if(!def)return '未知建筑';
  const [sw,sh]=def.size;
  if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x+sw>w.ark.size||y+sh>w.ark.size)return '超出方舟范围';
  const dock=getNavigation(w)?.dock;
  if(dock && ((x<=dock.gx&&x+sw>dock.gx&&y<=dock.gy&&y+sh>dock.gy&&kind!=='wood_deck'&&kind!=='iron_deck') ||
    (x>dock.gx&&y<=dock.gy&&y+sh>dock.gy)))return '给登岛跳板留出右舷航道';
  if(w.activeIsland)return '返回方舟后才能建造';

  const node=tech.nodes.find(n=>n.unlocksBuildings.includes(kind));
  if(!node||!w.unlockedTech.includes(node.id))return '先在木工台研究「'+(node?.name??'该项工艺')+'」';
  const pending=getIndustrySave(w)?.removal;
  if(pending){
    const [dw,dh]=buildingDefs.get(pending.building?.defId??'')?.size??[1,1];
    if(x<pending.gx+dw&&y<pending.gy+dh&&x+sw>pending.gx&&y+sh>pending.gy)return '这里留给拆除撤销';
  }
  let delta=-def.buoyancyDelta;
  if(kind==='wood_deck'||kind==='iron_deck'){
    if(isDeck(w,x,y)){
      if(kind!=='iron_deck'||w.ark.decks[y*w.ark.size+x]!==1)return '这里已有甲板';
      delta+=buildDefinitions.wood_deck.buoyancyDelta;
    }else if(!cardinal.some(([dx,dy])=>isDeck(w,x+dx,y+dy)))return '须吸附到甲板直边';
  }else{
    for(let dy=0;dy<sh;dy++)for(let dx=0;dx<sw;dx++){
      if(!isDeck(w,x+dx,y+dy))return '建筑须完整放在甲板上';
      if(buildingAt(w,x+dx,y+dy)||playerOverTile(w,x+dx,y+dy))return '这里被占用';
    }
    if(kind==='catch_net'&&!isEdgeDeck(w,x,y))return '捕捞网须靠开放的甲板外侧';
  }
  const reserve=pending?.building?Math.max(0,-(buildingDefs.get(pending.building.defId)?.buoyancyDelta??0)):pending?.deck??0;
  if(delta>0&&w.ark.buoyancyUsed+reserve+delta>w.ark.buoyancyMax)return '浮力不足，先建浮力核心或拆除负重';
  if(!hasCost(w,buildCosts[kind]))return '材料不足';
  return null;
}

export function build(w: WorldState, kind: BuildKind, x: number, y: number): boolean {
  if(buildIssue(w,kind,x,y)||!inventoryChange(w,buildCosts[kind],[]))return false;
  if(kind==='wood_deck'||kind==='iron_deck'){
    if(!isDeck(w,x,y))w.ark.heatGrid[y*w.ark.size+x]=w.ambientTemp;
    w.ark.decks[y*w.ark.size+x]=kind==='wood_deck'?1:2;
  }else w.ark.buildings.push(makeBuilding(kind,x,y,`${kind}_${x}_${y}`));
  const [span]=buildingDefs.get(kind)?.size??[1,1];
  invalidateRoomTopology(w);
  emitJuice(w,'build',{x:x+span*.5,y:y+.78},0,{target:`${kind}_${x}_${y}`});
  refreshBuoyancy(w);
  return true;
}

export function fitsOnDeck(w:WorldState,x:number,y:number):boolean {
  return feetSupported(x,y,(px,py)=>isDeck(w,Math.floor(px),Math.floor(py)));
}

/** Sweep each axis and use the free part of a blocked step, rather than losing
 * the last full frame of travel in short gaps and at inside corners. */
export function walkOnGround(w:WorldState,direction:Vec2,speed:number,supported:(x:number,y:number)=>boolean):void {
  if(w.player.hunger<=0)speed*=.65;
  const p=w.player, length=Math.hypot(direction.x,direction.y);
  p.vx=p.vy=0;
  if(!length||!Number.isFinite(length))return;
  p.facing={x:direction.x/length,y:direction.y/length};
  const clear=(x:number,y:number)=>supported(x,y)&&!hasBuildingContact(w,x,y);
  function advance(dx:number,dy:number):number {
    if(!dx&&!dy)return 0;
    if(clear(p.x+dx,p.y+dy))return 1;
    if(!clear(p.x,p.y))return 0;
    let lo=0,hi=1;
    for(let i=0;i<7;i++){
      const mid=(hi+lo)/2;
      if(clear(p.x+dx*mid,p.y+dy*mid))lo=mid;
      else hi=mid;
    }
    return lo;
  }
  const dx=p.facing.x*speed,dy=p.facing.y*speed;
  const slices=Math.max(1,Math.ceil(speed/.095)),x0=p.x,y0=p.y;
  for(let i=0;i<slices;i++){
    p.x+=dx/slices*advance(dx/slices,0);
    p.y+=dy/slices*advance(0,dy/slices);
  }
  p.vx=p.x-x0;p.vy=p.y-y0;
}

export function walk(w:WorldState,direction:Vec2,pace=1):void {
  walkOnGround(w,direction,.095*pace,(x,y)=>fitsOnDeck(w,x,y));
}
