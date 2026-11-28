import type { WorldState } from './types';
export const metrics=['catches','decks','built','meals','rolls','trades','rescues','tamed','alphas','hatched','variants','deliveries','foes'] as const;
export type LifeMetric=typeof metrics[number];
export const suitIds=['warm_wind_coat','frost_scale_armor','magma_insulated_coat','aurora_mithril_cloak'] as const;
export const weaponIds=['frost_iron_spear','ember_hammer','ice_repeater','fire_oil_flask','magma_sprayer'] as const;
type Life={count:Partial<Record<LifeMetric,number>>;suits:number;arms:number;regions:number;
 cave:boolean;stormDay:number;stormDamage:boolean;cleanStorms:number;shown:string[]};
type Archive=WorldState&{lifeP2?:Life};
export const readLife=(w:WorldState)=>(w as Archive).lifeP2;
export function liveLife(w:WorldState):Life{
 return (w as Archive).lifeP2??={count:{},suits:0,arms:0,regions:0,cave:false,stormDay:0,stormDamage:false,cleanStorms:0,shown:[]};
}
export function recordLife(w:WorldState,id:LifeMetric):void{
 const t=liveLife(w);t.count[id]=Math.min(1e9,(t.count[id]??0)+1);
}
export function recordEquipment(w:WorldState,id:string):void{
 const suit=suitIds.findIndex(x=>x===id),arm=weaponIds.findIndex(x=>x===id);
 if(suit<0&&arm<0)return;
 const s=liveLife(w);
 if(suit>=0)s.suits|=1<<suit;
 if(arm>=0)s.arms|=1<<arm;
}
export function stormDamage(w:WorldState):void{
 if(w.weather!=='whiteout')return;
 const s=liveLife(w);s.stormDay=w.day;s.stormDamage=true;
}
