import type { ItemStack, WildEntity, WorldState } from './types';

export interface FaunaSave {
  islandId:string|null;
  offsetX:number;
  offsetY:number;
  fauna:Record<string,WildEntity[]>;
  feed:number;
  pack:ItemStack[];
  lastStrike:number;
}
type BeastSave=WorldState&{beastM4?:FaunaSave};
export const getFauna=(w:WorldState)=>(w as BeastSave).beastM4;
export function ensureFauna(w:WorldState):FaunaSave{
  return (w as BeastSave).beastM4??={islandId:null,offsetX:0,offsetY:0,fauna:{},feed:0,pack:[],lastStrike:-100};
}
