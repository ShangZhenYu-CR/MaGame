import { recordLife } from './life';
import { roomComfort } from './home';
import { TICK_RATE,type Vec2,type WorldState } from './types';

export const ROLL_TICKS=12;
export const ROLL_IFRAME_TICKS=Math.ceil(.32*TICK_RATE);
export const ROLL_COST=27;
const REST_DELAY=24;

interface TrailPoint extends Vec2 { tick:number }
const trails=new WeakMap<WorldState,TrailPoint[]>();

export const rollAge=(w:WorldState):number=>w.player.roll.startedAt===null?Infinity:w.tick-w.player.roll.startedAt;
export const rolling=(w:WorldState)=>rollAge(w)<=ROLL_TICKS;
export const rollGuard=(w:WorldState)=>rollAge(w)<ROLL_IFRAME_TICKS;
export const rollTrail=(w:WorldState):readonly TrailPoint[]=>(trails.get(w)??[]).filter(t=>t.tick>w.tick-12);

export function startRoll(w:WorldState,dir:Vec2):string|null{
 const p=w.player,r=p.roll;
 if(p.hp<=0||p.rescue.startedAt!==null)return '昏迷中，等待救援。';
 if(rolling(w))return '翻滚尚未结束。';
 if(r.stamina<ROLL_COST)return '体力不足，稍等再翻滚。';
 const heading=Math.hypot(dir.x,dir.y)>.1?dir:p.facing;
 const n=Math.hypot(heading.x,heading.y);
 r.dx=n>0&&Number.isFinite(n)?heading.x/n:0;
 r.dy=n>0&&Number.isFinite(n)?heading.y/n:1;
 r.startedAt=w.tick;r.stamina-=ROLL_COST;r.restUntil=w.tick+ROLL_TICKS+REST_DELAY;
 p.grapple.charging=false;p.grapple.active=false;p.grapple.charge=0;p.grapple.caughtDebrisId=null;
 trails.set(w,[{x:p.x,y:p.y,tick:w.tick}]);
 recordLife(w,'rolls');return null;
}

export function rollMotion(w:WorldState,command:Vec2){
 const r=w.player.roll,age=rollAge(w);
 return rolling(w)?{direction:{x:r.dx,y:r.dy},scale:3.10-1.68*age/ROLL_TICKS}:{direction:command,scale:1};
}

export function stepRoll(w:WorldState):void{
 const p=w.player,r=p.roll;
 if(r.startedAt!==null){
  const recent=trails.get(w)??[];
  const last=recent.at(-1);
  if(w.tick%2===0&&(!last||Math.hypot(p.x-last.x,p.y-last.y)>.065)){
   recent.push({x:p.x,y:p.y,tick:w.tick});
   if(recent.length>8)recent.shift();
   trails.set(w,recent);
  }
  if(rollAge(w)>=ROLL_TICKS)r.startedAt=null;
 }
 if(p.hp>0&&r.startedAt===null&&w.tick>=r.restUntil)r.stamina=Math.min(100,r.stamina+.58+roomComfort(w)*.10);
}
