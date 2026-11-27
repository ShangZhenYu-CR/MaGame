import type { WorldState } from './types';
import { buildDefinitions } from './ark';
import { isMeal } from './food';
import { weaponById } from './weapons';
import { toolDefinition } from './tools';

export type Shortcut=string|null;
export const DEFAULT_SHORTCUTS:readonly Shortcut[]=[
 'wood_deck','torch_post','wind_wall','@weapon','@meal','@hook','wood_axe','mining_pick',null,
];
export const dynamicShortcuts={'@weapon':'当前武器','@meal':'当前热食','@hook':'当前抓钩'} as const;
interface Hotbar{slots:Shortcut[];tool:string|null}
type WithHotbar=WorldState&{hotbarP2?:Hotbar};
const live=(w:WorldState)=>((w as WithHotbar).hotbarP2??={slots:[...DEFAULT_SHORTCUTS],tool:null});
export const shortcuts=(w:WorldState):readonly Shortcut[]=>(w as WithHotbar).hotbarP2?.slots??DEFAULT_SHORTCUTS;
export const heldTool=(w:WorldState)=>(w as WithHotbar).hotbarP2?.tool??null;
export const supportedShortcut=(s:unknown):s is Shortcut=>s===null||typeof s==='string'&&
 (Object.hasOwn(dynamicShortcuts,s)||Object.hasOwn(buildDefinitions,s)||weaponById.has(s)||isMeal(s)||!!toolDefinition(s));
export function bindShortcut(w:WorldState,i:number,id:Shortcut):boolean{
 if(!Number.isSafeInteger(i)||i<0||i>8||!supportedShortcut(id))return false;
 live(w).slots[i]=id;return true;
}
export function switchShortcuts(w:WorldState,from:number,to:number):boolean{
 if(!Number.isSafeInteger(from)||from<0||from>8||!Number.isSafeInteger(to)||to<0||to>8)return false;
 const {slots}=live(w);[slots[from],slots[to]]=[slots[to],slots[from]];return true;
}
export function holdTool(w:WorldState,id:string):boolean{
 if(!toolDefinition(id)||!w.player.inventory.some(x=>x?.itemId===id&&(x.durability??1)>0))return false;
 live(w).tool=id;return true;
}
export function validHotbar(w:WorldState):boolean{
 const h=(w as WithHotbar).hotbarP2;
 return h===undefined||!!h&&typeof h==='object'&&!Array.isArray(h)&&
  Array.isArray(h.slots)&&h.slots.length===9&&h.slots.every(supportedShortcut)&&
  (h.tool===null||typeof h.tool==='string'&&!!toolDefinition(h.tool));
}
