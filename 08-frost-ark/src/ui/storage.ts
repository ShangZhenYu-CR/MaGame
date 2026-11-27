import type { WorldState } from '../sim/types';
import { deserializeWorld, serializeWorld } from '../sim/save';

const key = 'world-M0';
export async function openArchive(): Promise<IDBDatabase> {
  return new Promise((yes,no)=>{
    const r=indexedDB.open('manan-frost-ark',1);
    r.onupgradeneeded=()=>r.result.createObjectStore('saves');
    r.onsuccess=()=>yes(r.result);
    r.onerror=()=>no(r.error);
    r.onblocked=()=>no(new Error('存档正在被其他页面占用'));
  });
}

export async function savedWorld(db: IDBDatabase): Promise<WorldState | null> {
  return new Promise((yes,no)=>{
    const r=db.transaction('saves').objectStore('saves').get(key);
    r.onerror=()=>no(r.error);
    r.onsuccess=()=>{
      if (typeof r.result!=='string') { yes(null); return; }
      try { yes(deserializeWorld(r.result)); } catch (error) { no(error); }
    };
  });
}

export async function storeWorld(db: IDBDatabase, w: WorldState): Promise<void> {
  return new Promise((yes,no)=>{
    const t=db.transaction('saves','readwrite');
    t.oncomplete=()=>yes();
    t.onabort=()=>no(t.error ?? new Error('存档事务已取消'));
    t.objectStore('saves').put(serializeWorld(w),key);
  });
}
