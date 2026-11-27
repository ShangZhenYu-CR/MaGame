import { abandonCave } from './cave';
import { emitJuice } from './juice';
import { rollGuard } from './roll';
import { gearModifiers } from './equipment';
import { fitsOnDeck, hasBuildingContact, inventoryChange } from './ark';
import { TICK_RATE, type Vec2, type WorldState } from './types';

export const RESCUE_TICKS = 4 * TICK_RATE;
export const RESCUE_SHIELD_TICKS = 10 * TICK_RATE;
export const incapacitated = (w: WorldState): boolean => w.player.hp <= 0 || w.player.rescue.startedAt !== null;
export const rescueShield = (w: WorldState): number => Math.max(0,w.player.rescue.shieldUntil - w.tick);

export function damagePlayer(w: WorldState, amount: number, kind:'physical'|'cold'|'hunger'='physical'): boolean {
  if (incapacitated(w) || rescueShield(w) || (kind==='physical'&&rollGuard(w)) || amount <= 0) return false;
  const p=w.player;
  const gear=gearModifiers(w);
  const reduction=kind==='physical'?gear.guard:kind==='cold'?gear.cold*.5:0;
  const before=p.hp;p.hp=Math.max(0,p.hp-amount*(1-reduction));
  if(kind==='physical'&&before-p.hp>=.5)emitJuice(w,'hurt',p,before-p.hp,{target:'player'});
  if (p.hp===0) begin(w);
  return true;
}

export function healPlayer(w: WorldState, amount: number): void {
  if(incapacitated(w))return;
  const p=w.player,before=p.hp;p.hp=Math.min(p.maxHp,p.hp+amount);
  if(p.hp-before>=.5)emitJuice(w,'heal',p,p.hp-before,{target:'player'});
}

function begin(w: WorldState): void {
  const p=w.player;
  p.hp=0;p.vx=0;p.vy=0;p.portraitMood=3;
  p.rescue.startedAt=w.tick;p.rescue.shieldUntil=0;p.roll.startedAt=null;
  p.grapple.active=false;p.grapple.charging=false;p.grapple.charge=0;p.grapple.caughtDebrisId=null;
  w.sky.cruising=false;
}

export function rescuePoint(w:WorldState):Vec2 {
  const h=w.ark.buildings.find(b=>b.defId==='hearth_core');
  const near=h?{x:h.gx+1.5,y:h.gy+2.25}:{x:w.ark.size/2+.5,y:w.ark.size/2+2.2};
  const safe=(x:number,y:number)=>fitsOnDeck(w,x,y)&&!hasBuildingContact(w,x,y);
  if(safe(near.x,near.y))return near;
  let best:Vec2=near,gap=Infinity;
  w.ark.decks.forEach((tile,i)=>{
    if(!tile)return;
    const x=i%w.ark.size+.5,y=Math.floor(i/w.ark.size)+.5,d=Math.hypot(x-near.x,y-near.y);
    if(d<gap&&safe(x,y)){best={x,y};gap=d;}
  });
  return best;
}

export function stepRescue(w: WorldState): void {
  const p=w.player;
  if(p.hp<=0&&p.rescue.startedAt===null)begin(w);
  if(p.rescue.startedAt===null)return;
  if(w.tick-p.rescue.startedAt<RESCUE_TICKS)return;
  const tool=p.inventory.find(s=>s?.durability!==undefined&&s.durability>1);
  if(tool)tool.durability!--;
  else {
    const supply=['ice_shard','raw_root','warm_fur','driftwood','rope'].find(id=>p.inventory.some(s=>s?.itemId===id&&s.count>=3));
    if(supply)inventoryChange(w,[{itemId:supply,count:1}],[]);
  }
  const spot=rescuePoint(w);
  p.x=spot.x;p.y=spot.y;p.facing={x:0,y:1};
  w.latte.x=spot.x+.36;w.latte.y=spot.y+.14;
  abandonCave(w);
  w.activeIsland=null;
  const hearth=w.ark.buildings.find(b=>b.defId==='hearth_core');
  if(hearth&&hearth.fuel===0)hearth.fuel=14;
  p.hunger=Math.max(p.hunger,p.maxHunger*.08);
  p.hp=Math.max(1,p.maxHp*.35);p.warmth=Math.max(p.warmth,p.maxWarmth*.60);
  p.rescue.startedAt=null;p.rescue.shieldUntil=w.tick+RESCUE_SHIELD_TICKS;
}
