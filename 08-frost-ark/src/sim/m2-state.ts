import type { BuildingInstance, ItemStack, WorldState } from './types';
export interface IndustryJob {
  recipeId:string; progress:number; duration:number; cold:number;
}
export interface IndustryStation {
  intake:ItemStack[]; output:ItemStack[]; job:IndustryJob|null; cycle:number;
}
export interface RemovalSnapshot {
  gx:number; gy:number; deck:number; building:BuildingInstance|null; station:IndustryStation|null; expires:number;
}
export type IndustrySave=WorldState&{industryM2?:{stations:Record<string,IndustryStation>;removal:RemovalSnapshot|null}};
export const getIndustrySave=(w:WorldState)=>(w as IndustrySave).industryM2;
export function ensureIndustrySave(w:WorldState):NonNullable<IndustrySave['industryM2']>{
  return (w as IndustrySave).industryM2??={stations:{},removal:null};
}
