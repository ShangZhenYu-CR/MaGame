import type { Vec2,WorldState } from './types';

export type JuiceType='hit'|'burn'|'hurt'|'heal'|'warmth'|'wood'|'ore'|'build';
export interface JuiceEvent extends Vec2 { type:JuiceType; tick:number; amount:number; critical:boolean; melt:boolean; target?:string }
const byWorld=new WeakMap<WorldState,JuiceEvent[]>();
const MAX_EVENTS=32;
export function emitJuice(w:WorldState,type:JuiceType,pos:Vec2,amount=0,options?:{critical?:boolean;melt?:boolean;target?:string}):void{
  const list=byWorld.get(w)??[];
  if(list.length>=MAX_EVENTS)list.splice(0,list.length-MAX_EVENTS+1);
  list.push({type,x:pos.x,y:pos.y,tick:w.tick,amount,critical:!!options?.critical,melt:!!options?.melt,target:options?.target});
  byWorld.set(w,list);
}
export function takeJuice(w:WorldState):JuiceEvent[]{
  const list=byWorld.get(w);
  if(!list?.length)return [];
  byWorld.delete(w);return list;
}
