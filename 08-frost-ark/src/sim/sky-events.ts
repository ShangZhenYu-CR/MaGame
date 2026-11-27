import { inventoryChange,itemNames } from './ark';
import { damagePlayer,incapacitated } from './rescue';
import { nearHelm } from './sky-map';
import { beginSkyRaid,endSkyRaid } from './m5';
import { TICK_RATE,type ItemStack,type WorldState } from './types';

export const eventTypes=['merchant','salvage','warm','thunder','pirates'] as const;
export type SkyEventKind=(typeof eventTypes)[number];
export type SkyEvent={kind:SkyEventKind;id:string;x:number;y:number;started:number;expires:number;moored:boolean;trades:readonly string[]};
type State={cursor:number;sailed:number;event:SkyEvent|null};
type Save=WorldState&{routeEventsP2?:State};
const rec=(w:WorldState)=>(w as Save).routeEventsP2;
const state=(w:WorldState)=>((w as Save).routeEventsP2??={cursor:0,sailed:0,event:null});
const duration:Record<SkyEventKind,number>={merchant:39,salvage:25,warm:23,thunder:22,pirates:31};
const nameMap:Record<SkyEventKind,string>={merchant:'云海游商热气球',salvage:'漂流补给残骸群',warm:'极光暖流窗口',thunder:'高空雷暴风眼',pirates:'冰翼空贼突袭'};
const details:Record<SkyEventKind,string>={
 merchant:'靠近气球后在舵轮停船，再按 E 系缆交易。',
 salvage:'残骸会散入云海。暂缓航行，趁它们漂远前用抓钩打捞。',
 warm:'暖流穿过航线，暂时抬高外部温度。',
 thunder:'雷暴拖慢船速并压低温度；金色风眼预警时离开舷侧。',
 pirates:'敌艇贴近船舷，守住甲板，拦住登船者。',
};
const distance=(w:WorldState,e:SkyEvent)=>Math.hypot(w.sky.x-e.x,w.sky.y-e.y);
const div=(seed:number,n:number)=>((Math.imul(seed^(n+7),0x85ebca6b)>>>0)%31)/30;
const ring=(n:number,d:number)=>((n%d)+d)%d;
export function seededSkyEncounter(seed:number,ordinal:number):SkyEventKind{
 // A seeded offset over the calm early table, followed by a reshuffled full
 // circuit. Because progress meters sailing time, short routes still contribute.
 const early=ring(seed,3);
 if(ordinal<3)return eventTypes[ring(early+ordinal,3)];
 return eventTypes[ring(Math.imul(seed>>>7,17)+ordinal-3,5)];
}
export const nextEncounterTicks=(seed:number,ordinal:number)=>ordinal===0?72+Math.floor(div(seed,ordinal)*18):118+Math.floor(div(seed,ordinal)*108);
export const EVENT_BLUEPRINT='merchant_route_blueprint';
export const EVENT_TECH='merchant_route_craft';
export const trades:readonly {id:string;cost:ItemStack[];give:ItemStack[]}[]=[
 {id:'bait',cost:[{itemId:'driftwood',count:3}],give:[{itemId:'warm_berry_soup',count:1}]},
 {id:'chart',cost:[{itemId:'rope',count:2},{itemId:'ice_shard',count:1}],give:[{itemId:EVENT_BLUEPRINT,count:1}]},
 {id:'charm',cost:[{itemId:'frost_iron_ingot',count:2},{itemId:'warm_fur',count:1}],give:[{itemId:'magnetic_salvage_buckle',count:1}]},
];
export const activeSkyEvent=(w:WorldState):SkyEvent|null=>{
 const e=rec(w)?.event;
 return e&&e.expires>w.tick?e:null;
};
export const eventName=(kind:SkyEventKind)=>nameMap[kind];
export const eventDescription=(kind:SkyEventKind)=>details[kind];
export const skyEventDistance=(w:WorldState,e:SkyEvent)=>distance(w,e);
export const tradeSummary=(items:ItemStack[])=>items.map(i=>(itemNames.get(i.itemId)??i.itemId)+' ×'+i.count).join(' · ');
export function couldMoorTrader(w:WorldState):boolean{
 const e=activeSkyEvent(w);
 return !!e&&e.kind==='merchant'&&!w.sky.cruising&&!w.ark.anchoredIslandId&&!w.activeIsland&&!incapacitated(w)&&nearHelm(w)&&distance(w,e)<=1.53;
}
export function moorTrader(w:WorldState):string|null{
 if(!couldMoorTrader(w))return '靠近游商气球并停船，再在舵轮处系缆。';
 activeSkyEvent(w)!.moored=true;
 return null;
}
export function tradeSky(w:WorldState,id:string):string|null{
 const e=activeSkyEvent(w);
 if(!e?.moored||!couldMoorTrader(w))return '先靠泊游商热气球。';
 const offer=trades.find(t=>t.id===id);
 if(!offer)return '游商没开这个价。';
 if(e.trades.includes(id))return '本次会面该货已换完。';
 if(!inventoryChange(w,offer.cost,offer.give))return '交换品不足，或背包没有空间。';
 e.trades=[...e.trades,id];if(id==='chart'&&!w.unlockedTech.includes(EVENT_TECH))w.unlockedTech.push(EVENT_TECH);
 return null;
}
export function eventClimate(w:WorldState):number{
 const e=activeSkyEvent(w);
 if(!e||distance(w,e)>2.55)return 0;
 return e.kind==='warm'?19:e.kind==='thunder'?-14:0;
}
export const eventWindDrag=(w:WorldState)=>eventClimate(w)<0?.72:1;
export function stormTell(w:WorldState,e:SkyEvent):'calm'|'warning'|'burst'{
 const phase=(w.tick-e.started)%(4*TICK_RATE);
 return phase>92&&phase<115?'warning':phase>=115?'burst':'calm';
}

function startEvent(w:WorldState,s:State){
 const kind=seededSkyEncounter(w.seed,s.cursor),id='sky_'+s.cursor+'_'+w.tick;
 const e:SkyEvent={kind,id,x:w.sky.x+w.sky.headingX*.62,y:w.sky.y+w.sky.headingY*.62,
   started:w.tick,expires:w.tick+duration[kind]*TICK_RATE,moored:false,trades:[]};
 s.event=e;s.sailed=0;s.cursor++;
 if(kind==='salvage'){
   const c=w.ark.size*.5;
   for(let i=0;i<3;i++)w.sky.debris.push({id:id+'_cache_'+i,x:c-6.1-i*.49,y:c-2.8+i*2.45,
     vx:.46+i*.09,vy:i%2?.12:-.09,loot:i===0?[{itemId:'driftwood',count:5},{itemId:'rope',count:2}]:
      i===1?[{itemId:'frost_iron_scrap',count:4},{itemId:'ice_shard',count:2}]:[{itemId:'rope',count:5},{itemId:'warm_berry',count:2}]});
 }
 if(kind==='pirates')beginSkyRaid(w,id);
}
export function stepSkyEvents(w:WorldState):void{
 const old=rec(w);
 if(!old&&!w.sky.cruising)return;
 const s=state(w),e=s.event;
 if(e){
   if(e.expires<=w.tick){
     if(e.kind==='salvage')w.sky.debris=w.sky.debris.filter(d=>!d.id.startsWith(e.id+'_cache_')||d.id===w.player.grapple.caughtDebrisId);
     if(e.kind==='pirates')endSkyRaid(w,e.id);
     s.event=null;
   }else if(e.kind==='thunder'&&distance(w,e)<2.55&&(w.tick-e.started)%(4*TICK_RATE)===115&&!w.activeIsland&&
        w.player.x>=w.ark.size*.5+1.4)damagePlayer(w,6);
   return;
 }
 if(!w.sky.cruising||w.activeIsland||incapacitated(w))return;
 if(++s.sailed>=nextEncounterTicks(w.seed,s.cursor))startEvent(w,s);
}
export function validSkyEvents(w:WorldState):boolean{
 const s=rec(w);if(s===undefined)return true;
 const int=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>=0;
 if(!s||typeof s!=='object'||!int(s.cursor)||!int(s.sailed)||s.sailed>nextEncounterTicks(w.seed,s.cursor)||
   s.cursor>w.tick)return false;
 const e=s.event;if(e===null)return true;
 if(!e||!eventTypes.includes(e.kind)||typeof e.id!=='string'||!/^sky_\d+_\d+$/.test(e.id)||!Number.isFinite(e.x)||!Number.isFinite(e.y)||
    !int(e.started)||e.started>w.tick||e.expires!==e.started+duration[e.kind]*TICK_RATE||e.expires<=w.tick||
    typeof e.moored!=='boolean'||!Array.isArray(e.trades)||new Set(e.trades).size!==e.trades.length||
    e.trades.some(t=>!trades.some(a=>a.id===t))||(e.kind!=='merchant'&&(e.moored||e.trades.length>0)))return false;
 return !!s.cursor&&e.kind===seededSkyEncounter(w.seed,s.cursor-1)&&e.id===('sky_'+(s.cursor-1)+'_'+e.started);
}
