import type { WorldState } from '../sim/types';
import { deserializeWorld, serializeWorld } from '../sim/save';
import { difficultyOf,type Difficulty } from '../sim/challenge';
import { voyageBiome } from '../sim/expansion';

export const slots=[1,2,3] as const;
export type Slot=typeof slots[number];
const key=(slot:Slot)=>slot===1?'world-M0':'world-P2-S'+slot;
export type SlotInfo={slot:Slot;day:number;region:string;cores:number;seed:number;difficulty:Difficulty;modified:number;provisional?:boolean};
const selectedKey='frost-ark-active-save-slot';
export function previousSlot():Slot{
 try{const s=Number(localStorage.getItem(selectedKey)) as Slot;return slots.includes(s)?s:1;}catch{return 1;}
}
export function rememberSlot(slot:Slot):void{
 try{localStorage.setItem(selectedKey,String(slot));}catch{}
}
export async function openArchive():Promise<IDBDatabase>{
 return new Promise((yes,no)=>{
  const r=indexedDB.open('manan-frost-ark',1);
  r.onupgradeneeded=()=>r.result.createObjectStore('saves');
  r.onsuccess=()=>yes(r.result);
  r.onerror=()=>no(r.error);
  r.onblocked=()=>no(new Error('存档正在被其他页面占用'));
 });
}
function read(db:IDBDatabase,id:string):Promise<unknown>{
 return new Promise((yes,no)=>{
  const r=db.transaction('saves').objectStore('saves').get(id);
  r.onerror=()=>no(r.error);r.onsuccess=()=>yes(r.result);
 });
}
export async function savedWorld(db:IDBDatabase,slot:Slot=1):Promise<WorldState|null>{
 const raw=await read(db,key(slot));return typeof raw==='string'?deserializeWorld(raw):null;
}
function stamp(w:WorldState,slot:Slot,modified:number):SlotInfo{
 return {slot,day:w.day,region:voyageBiome(w),cores:w.skyheartCores,seed:w.seed,difficulty:difficultyOf(w),modified};
}
export async function slotOverview(db:IDBDatabase):Promise<(SlotInfo|null)[]>{
 return Promise.all(slots.map(async slot=>{
  const meta=await read(db,key(slot)+':info') as SlotInfo|undefined;
  if(meta&&Number.isFinite(meta.modified)&&meta.slot===slot)return meta;
  try{const initial=await savedWorld(db,slot);return initial?stamp(initial,slot,0):null;}
  catch{return null;}
 }));
}
export async function storeWorld(db:IDBDatabase,w:WorldState,slot:Slot=1,provisional=false):Promise<void>{
 return new Promise((yes,no)=>{
  const t=db.transaction('saves','readwrite');
  t.oncomplete=()=>yes();t.onabort=()=>no(t.error??new Error('存档事务已取消'));
  const store=t.objectStore('saves');
  store.put(serializeWorld(w),key(slot));store.put({...stamp(w,slot,Date.now()),provisional},key(slot)+':info');
 });
}
