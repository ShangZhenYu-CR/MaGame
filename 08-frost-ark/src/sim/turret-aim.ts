import type { Vec2,WorldState } from './types';
const aiming=new WeakMap<WorldState,Map<string,Vec2&{until:number}>>();
export function trackTurret(w:WorldState,id:string,target:Vec2){
 let group=aiming.get(w);
 if(!group){group=new Map();aiming.set(w,group);}
 const current=group.get(id);
 if(current){current.x=target.x;current.y=target.y;current.until=w.tick+24;}
 else group.set(id,{x:target.x,y:target.y,until:w.tick+24});
}
export function turretAim(w:WorldState,id:string){
 const m=aiming.get(w),a=m?.get(id);
 if(a&&a.until>w.tick)return a;
 if(a)m!.delete(id);
 return null;
}
