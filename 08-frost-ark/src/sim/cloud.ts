import { countItem, inventoryChange, isDeck } from './ark';
import { nextRng } from './rng';
import { TICK_RATE, type CloudDebris, type Vec2, type WorldState } from './types';

export const grappleRange = (charge: number): number => 3.5 + 5.5 * Math.min(1, Math.max(0, charge));
const lootIds = ['driftwood','frost_iron_scrap','rope'] as const;
const travel = 0.065;

function debris(w: WorldState, index: number, first: boolean): CloudDebris {
  const c = w.ark.size / 2;
  const random = nextRng(w.rngState);
  w.rngState = random.state;
  const jitter = (random.value - .5) * .38;
  const id = lootIds[index % lootIds.length];
  return {
    id: `drift_${w.tick}_${index}`,
    x: c - (first ? [5.9, 7.2, 8.9][index] : 15),
    y: c + (first ? [2.5, -3.45, 4.05][index] : [-5.5, 5.3, 2.9, -2.7, -7.0, 7.1][index % 6]) + jitter,
    vx: .45 + w.sky.windX * .27 + jitter * .18,
    vy: w.sky.windY * .24,
    loot: [{ itemId:id, count: id === 'driftwood' ? 3 : 2 }],
  };
}

export function seedDrift(w: WorldState): void {
  w.sky.debris.push(...[0,1,2].map(i => debris(w,i,true)));
}

export function aimEnd(w: WorldState, target: Vec2): Vec2 {
  const p = w.player;
  const dx = target.x - p.x, dy = target.y - p.y;
  const r = Math.min(1, grappleRange(p.grapple.charge) / Math.max(.0001, Math.hypot(dx,dy)));
  return { x: p.x + dx * r, y: p.y + dy * r };
}

export function startCharge(w: WorldState, target: Vec2): boolean {
  const g = w.player.grapple;
  if (g.active || g.charging || !countItem(w,'grapple_hook')) return false;
  g.charging = true; g.charge = 0;
  aim(w,target);
  return true;
}

export function aim(w: WorldState, target: Vec2): void {
  const g = w.player.grapple;
  if (g.charging && Number.isFinite(target.x) && Number.isFinite(target.y)) {
    g.targetX = target.x; g.targetY = target.y;
  }
}

export function fire(w: WorldState): void {
  const g = w.player.grapple;
  if (!g.charging) return;
  const t = aimEnd(w,{x:g.targetX,y:g.targetY});
  g.targetX = t.x; g.targetY = t.y;
  g.charging = false; g.active = true; g.charge = 0;
}

export function cancelCharge(w: WorldState): void {
  if (!w.player.grapple.charging) return;
  w.player.grapple.charging = false;
  w.player.grapple.charge = 0;
}

export function hookTip(w: WorldState): Vec2 {
  const p = w.player, g = p.grapple;
  const held = w.sky.debris.find(d => d.id === g.caughtDebrisId);
  if (held) return held;
  const k = Math.max(0,1 - Math.abs(1 - g.charge));
  return { x:p.x+(g.targetX-p.x)*k, y:p.y+(g.targetY-p.y)*k };
}

export function stepCloud(w: WorldState): void {
  const p = w.player, g = p.grapple;
  if (w.tick % (TICK_RATE * 3) === 0) w.sky.debris.push(debris(w,w.tick / (TICK_RATE * 3) - 1,false));
  for (const d of w.sky.debris) {
    if (d.id === g.caughtDebrisId) continue;
    d.x += d.vx / TICK_RATE;
    d.y += d.vy / TICK_RATE;
    if (isDeck(w,Math.floor(d.x),Math.floor(d.y))) d.y += .07;
  }
  w.sky.debris = w.sky.debris.filter(d => d.id === g.caughtDebrisId || d.x < w.ark.size / 2 + 17);
  if (g.charging) { g.charge = Math.min(1,g.charge + 1/(TICK_RATE*.8)); return; }
  if (!g.active) return;
  const held = w.sky.debris.find(d=>d.id === g.caughtDebrisId);
  if (held) {
    const dist = Math.hypot(p.x-held.x,p.y-held.y);
    if (dist <= .34) {
      if (inventoryChange(w,[],held.loot)) w.sky.debris = w.sky.debris.filter(d=>d!==held);
      else { held.x = p.x - 1.3; held.y = p.y + 1.15; }
      g.caughtDebrisId = null; g.active = false; g.charge = 0;
    } else {
      const k = Math.min(.205,dist)/dist;
      held.x += (p.x-held.x)*k; held.y += (p.y-held.y)*k;
    }
    return;
  }
  const a = hookTip(w), outbound = g.charge < 1;
  g.charge = outbound ? Math.min(1,g.charge+travel) : g.charge+.12;
  const b = hookTip(w);
  if (outbound) {
    const dx = b.x-a.x, dy = b.y-a.y;
    const hits = w.sky.debris.flatMap(d => {
      const k = Math.max(0,Math.min(1,((d.x-a.x)*dx+(d.y-a.y)*dy)/Math.max(.00001,dx*dx+dy*dy)));
      return Math.hypot(d.x-a.x-dx*k,d.y-a.y-dy*k) <= .45 ? [{d,k}] : [];
    }).sort((x,y)=>x.k-y.k);
    if (hits[0]) g.caughtDebrisId = hits[0].d.id;
  }
  if (g.charge >= 2) { g.active = false; g.charge = 0; }
}
