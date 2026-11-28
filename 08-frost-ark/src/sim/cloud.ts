import { recordLife } from './life';
import { markChapter } from './journal';
import { gearModifiers } from './equipment';
import { incapacitated } from './rescue';
import { inventoryChange, isDeck } from './ark';
import { equippedGrapple, hasFrostGrapple } from './grapple-tools';
import { dropOnDeck, isDeckDrop } from './latte';
import { areaAt } from './island';
import { nextRng } from './rng';
import { TICK_RATE, type CloudDebris, type Vec2, type WorldState } from './types';

export const grappleRange = (charge:number,reinforced=false):number =>
  (3.5 + 5.5 * Math.min(1, Math.max(0, charge)))*(reinforced?1.35:1);
const lootIds = ['driftwood','frost_iron_scrap','rope'] as const;
const travel = 0.065;

function debris(w: WorldState, index: number, first: boolean): CloudDebris {
  const c = w.ark.size / 2;
  const random = nextRng(w.rngState);
  w.rngState = random.state;
  const jitter = (random.value - .5) * .38;
  const id = lootIds[index % lootIds.length];
  // Secondary salvage retains the three float silhouettes from M0.
  const extras = first ? [null,'coal_chunk','ice_shard'] :
    ['coal_chunk','ice_shard','raw_root','warm_fur','raw_meat','cloud_fish',
      'coal_chunk','ice_shard','warm_berry','frost_grass','warm_fur','coal_chunk'];
  const extra=extras[index%extras.length];
  const heavy=!first&&index>4&&index%19===11;

  return {
    id: `drift_${w.tick}_${index}`,
    x: c - (first ? [5.9, 7.2, 8.9][index] : 15),
    y: c + (first ? [2.5, -3.45, 4.05][index] : [-5.5, 5.3, 2.9, -2.7, -7.0, 7.1][index % 6]) + jitter,
    vx: .45 + w.sky.windX * .27 + jitter * .18,
    vy: w.sky.windY * .24,
    ...(heavy?{heavy:true}:{}),
    loot: heavy?[{itemId:'frost_iron_scrap',count:5},{itemId:'coal_chunk',count:3}]:
      [{ itemId:id, count: id === 'driftwood' ? 3 : 2 },...(extra?[{itemId:extra,count:2}]:[])],
  };
}

export function seedDrift(w: WorldState): void {
  w.sky.debris.push(...[0,1,2].map(i => debris(w,i,true)));
}

export function aimEnd(w: WorldState, target: Vec2): Vec2 {
  const p = w.player;
  const dx = target.x - p.x, dy = target.y - p.y;
  const r = Math.min(1, grappleRange(p.grapple.charge,hasFrostGrapple(w)) / Math.max(.0001, Math.hypot(dx,dy)));
  return { x: p.x + dx * r, y: p.y + dy * r };
}

export function startCharge(w: WorldState, target: Vec2): boolean {
  const g = w.player.grapple;
  if (incapacitated(w) || g.active || g.charging || !equippedGrapple(w) || areaAt(w,w.player.x,w.player.y)!=='ark') return false;
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
    if (d.id === g.caughtDebrisId || isDeckDrop(d)) continue;
    d.x += d.vx / TICK_RATE;
    d.y += d.vy / TICK_RATE;
    if (isDeck(w,Math.floor(d.x),Math.floor(d.y))) d.y += .07;
  }
  w.sky.debris = w.sky.debris.filter(d => d.id === g.caughtDebrisId || isDeckDrop(d) || d.x < w.ark.size / 2 + 17);
  if(!g.active&&!g.charging)return;
  const reinforced=hasFrostGrapple(w);
  if (g.charging) { g.charge = Math.min(1,g.charge + 1/(TICK_RATE*(reinforced?.58:.8))); return; }
  if (!g.active) return;
  const held = w.sky.debris.find(d=>d.id === g.caughtDebrisId);
  if (held) {
    const dist = Math.hypot(p.x-held.x,p.y-held.y);
    if (dist <= .34) {
      if (!inventoryChange(w,[],held.loot)) dropOnDeck(w,held.loot);
      markChapter(w,'hook');recordLife(w,'catches');
      w.sky.debris = w.sky.debris.filter(d=>d!==held);
      g.caughtDebrisId = null; g.active = false; g.charge = 0;
    } else {
      const k = Math.min(reinforced?.31:.205,dist)/dist;
      held.x += (p.x-held.x)*k; held.y += (p.y-held.y)*k;
    }
    return;
  }
  const a = hookTip(w), outbound = g.charge < 1;
  g.charge = outbound ? Math.min(1,g.charge+travel) : g.charge+(reinforced?.17:.12);
  const b = hookTip(w);
  if (outbound) {
    const pickupRadius=.45+gearModifiers(w).hookRadius;
    const dx = b.x-a.x, dy = b.y-a.y;
    const hits = w.sky.debris.filter(d=>!isDeckDrop(d)&&(reinforced||!d.heavy)).flatMap(d => {
      const k = Math.max(0,Math.min(1,((d.x-a.x)*dx+(d.y-a.y)*dy)/Math.max(.00001,dx*dx+dy*dy)));
      return Math.hypot(d.x-a.x-dx*k,d.y-a.y-dy*k) <= pickupRadius ? [{d,k}] : [];
    }).sort((x,y)=>x.k-y.k);
    if (hits[0]) g.caughtDebrisId = hits[0].d.id;
  }
  if (g.charge >= 2) { g.active = false; g.charge = 0; }
}
