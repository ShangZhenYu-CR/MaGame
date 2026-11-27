import buildings from '../data/buildings.json';
import recipes from '../data/recipes.json';
import items from '../data/items.json';
import type { BuildingInstance, ItemStack, Vec2, WorldState } from './types';

export type BuildKind = 'wood_deck' | 'torch_post' | 'wind_wall';
export const itemNames = new Map(items.map(({ id, name }) => [id, name]));
const limits = new Map(items.map(i => [i.id, i.stack]));
const defs = new Map(buildings.map(d => [d.id, d]));
const torch = recipes.find(r => r.id === 'craft_torch')!;
export const buildCosts = { wood_deck: defs.get('wood_deck')!.cost, torch_post: defs.get('torch_post')!.cost, wind_wall: defs.get('wind_wall')!.cost };
export const torchInputs = torch.inputs;

export function isDeck(w: WorldState, x: number, y: number): boolean {
  const { size, decks } = w.ark;
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < size && y < size && decks[y * size + x] !== 0;
}

export function buildingAt(w: WorldState, x: number, y: number): BuildingInstance | undefined {
  return w.ark.buildings.find(b => {
    const [sx, sy] = defs.get(b.defId)?.size ?? [1, 1];
    return x >= b.gx && y >= b.gy && x < b.gx + sx && y < b.gy + sy;
  });
}

export function makeBuilding(defId: string, gx: number, gy: number, id: string): BuildingInstance {
  const { maxHp } = defs.get(defId)!;
  return { id, defId, gx, gy, hp: maxHp, maxHp, fuel: 0, level: 1, frozen: false };
}

export function countItem(w: WorldState, id: string): number {
  return w.player.inventory.reduce((n, s) => n + (s?.itemId === id ? s.count : 0), 0);
}

function hasCost(w: WorldState, cost: ItemStack[]): boolean {
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
  for (const { itemId, count } of gains) {
    let remaining = count;
    const max = limits.get(itemId) ?? 1;
    for (const stack of slots) {
      if (!stack || stack.itemId !== itemId || !remaining) continue;
      const n = Math.min(max - stack.count, remaining);
      stack.count += n;
      remaining -= n;
    }
    for (const [i, stack] of slots.entries()) {
      if (stack || !remaining) continue;
      const n = Math.min(max, remaining);
      slots[i] = { itemId, count: n };
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

export function buildIssue(w: WorldState, kind: BuildKind, x: number, y: number): string | null {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= w.ark.size || y >= w.ark.size) return '超出方舟范围';
  if (kind === 'wood_deck') {
    if (isDeck(w, x, y)) return '这里已有甲板';
    if (![[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy]) => isDeck(w,x+dx,y+dy))) return '须吸附到甲板直边';
    if (w.ark.buoyancyUsed >= w.ark.buoyancyMax) return '浮力已满';
  } else {
    if (!isDeck(w, x, y)) return kind==='wind_wall'?'挡风墙须放在甲板上':'火把须放在甲板上';
    if (kind==='wind_wall'&&w.ark.buoyancyUsed>=w.ark.buoyancyMax) return '浮力已满';
    if (buildingAt(w, x, y) || (Math.floor(w.player.x) === x && Math.floor(w.player.y) === y)) return '这里被占用';
  }
  if (!hasCost(w, buildCosts[kind])) return '材料不足';
  return null;
}

export function build(w: WorldState, kind: BuildKind, x: number, y: number): boolean {
  if (buildIssue(w, kind, x, y) || !inventoryChange(w, buildCosts[kind], [])) return false;
  if (kind === 'wood_deck') {
    w.ark.decks[y * w.ark.size + x] = 1;
    w.ark.buoyancyUsed++;
  } else {
    w.ark.buildings.push(makeBuilding(kind, x, y, `${kind}_${x}_${y}`));
    if(kind==='wind_wall')w.ark.buoyancyUsed++;
  }
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
