import buildings from '../data/buildings.json';
import recipes from '../data/recipes.json';
import items from '../data/items.json';
import tech from '../data/tech.json';
import { getIndustrySave } from './m2-state';
import { getNavigation } from './m3-state';
import type { BuildingInstance, ItemStack, Vec2, WorldState } from './types';

export const buildKinds = [
  'wood_deck','torch_post','wind_wall','workbench','furnace','stove','heat_relay',
  'catch_net','sorter_arm','greenhouse','warm_wall','buoyancy_core','iron_deck',
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

export function makeBuilding(defId: string, gx: number, gy: number, id: string): BuildingInstance {
  const { maxHp } = buildingDefs.get(defId)!;
  return { id, defId, gx, gy, hp: maxHp, maxHp, fuel: 0, level: 1, frozen: false };
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
    if (n>0) capacity+=n; else used-=n;
  }
  w.ark.buoyancyUsed=used;
  w.ark.buoyancyMax=capacity;
}

export function playerOverTile(w: WorldState, x: number, y: number): boolean {
  return w.player.x + .21 > x && w.player.x - .21 < x+1 &&
         w.player.y + .21 > y && w.player.y - .21 < y+1;
}

export function buildIssue(w: WorldState, kind: BuildKind, x: number, y: number): string | null {
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
  refreshBuoyancy(w);
  return true;
}

export function walk(w: WorldState, direction: Vec2): void {
  const p = w.player;
  const length = Math.hypot(direction.x, direction.y);
  p.vx = p.vy = 0;
  if (!length || !Number.isFinite(length)) return;
  const dx = direction.x / length;
  const dy = direction.y / length;
  p.facing = { x: dx, y: dy };
  const clear = (px: number, py: number) => [-0.21,0.21].every(ox => [-0.21,0.21].every(oy => {
    const x = Math.floor(px + ox), y = Math.floor(py + oy);
    return isDeck(w, x, y) && !buildingAt(w, x, y);
  }));
  const speed = 0.095;
  if (clear(p.x + dx * speed, p.y)) { p.x += dx * speed; p.vx = dx * speed; }
  if (clear(p.x, p.y + dy * speed)) { p.y += dy * speed; p.vy = dy * speed; }
}
