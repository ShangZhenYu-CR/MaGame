import { inventoryChange,itemNames } from './ark';
import { areaAt } from './island';
import { heatAt,primaryHearth } from './heatField';
import { indoorsAt } from './rooms';
import { incapacitated } from './rescue';
import type { WorldState } from './types';

export const chapters=[
 {id:'fuel',name:'点亮余烬',guide:'炉边按 R 添一次柴。炉火让马楠回温；燃料满了就等它烧掉一点。',reward:[{itemId:'driftwood',count:2}]},
 {id:'hook',name:'初试抛钩',guide:'换抓钩 Q，长按左键看射程，松开对准飘过的残骸。收线后看背包。',reward:[{itemId:'rope',count:2}]},
 {id:'room',name:'建起暖屋',guide:'用墙和防风门围住几格甲板。关门、走进 ≥15°C 的暖房验证。',reward:[{itemId:'coal_chunk',count:2}]},
 {id:'island',name:'首次登岛',guide:'到舵轮按 N 选浮岛，E 出航。靠泊后到舷边按 E 搭跳板，走上岛。',reward:[{itemId:'ice_shard',count:2}]},
 {id:'partner',name:'收服伙伴',guide:'上岛带麻痹网和它爱吃的食物。压制后靠近投喂到进度条填满，按 V 分配工作。',reward:[{itemId:'beast_feed',count:2}]},
 {id:'storm',name:'扛过寒潮',guide:'第 5 天前存燃料和暖食，关好门并备好防线。熬到寒潮后的白昼。',reward:[{itemId:'frost_iron_ingot',count:2}]},
 {id:'seeds',name:'四火种齐聚',guide:'击退冻林门与裂谷守卫，再打开硫磺熔炉、永冻遗迹群的火种箱。',reward:[{itemId:'warm_fur',count:2}]},
 {id:'solar',name:'太阳方舟',guide:'把主炉升至 Lv.3，带齐四火种后回到炉边铸成太阳方舟。',reward:[{itemId:'sky_mithril',count:1}]},
] as const;
export type Chapter=typeof chapters[number]['id'];
type Journal={done:number;paid:number;weatherDay:number};
type Save=WorldState&{journalP2?:Journal};
const flags=new Map<Chapter,number>(chapters.map(({id},index)=>[id,1<<index]));
const get=(w:WorldState)=>(w as Save).journalP2;
const prepare=(w:WorldState)=>((w as Save).journalP2??={done:0,paid:0,weatherDay:0});
export function markChapter(w:WorldState,id:Chapter):void{prepare(w).done|=flags.get(id)??0;}
export function hasChapter(w:WorldState,id:Chapter){return !!((get(w)?.done??0)&(flags.get(id)??0));}
export function stepJournal(w:WorldState):void{
 const j=prepare(w),p=w.player;
 if(!hasChapter(w,'room')&&indoorsAt(w,p)&&heatAt(w,p.x,p.y)>=15)markChapter(w,'room');
 if(!hasChapter(w,'island')&&areaAt(w,p.x,p.y)==='island')markChapter(w,'island');
 if(w.beasts.length)markChapter(w,'partner');
 if(w.weather==='whiteout')j.weatherDay=w.day;
 else if(j.weatherDay&&w.day>j.weatherDay&&!incapacitated(w)){markChapter(w,'storm');j.weatherDay=0;}
 if(w.skyheartCores>=4)markChapter(w,'seeds');
 if((primaryHearth(w)?.level??0)>=4)markChapter(w,'solar');
}
export function journalView(w:WorldState){
 const j=get(w),done=j?.done??0,paid=j?.paid??0;
 const rows=chapters.map((v,i)=>({...v,complete:!!(done&(1<<i)),claimed:!!(paid&(1<<i)),rewardLabel:v.reward.map(a=>(itemNames.get(a.itemId)??a.itemId)+' ×'+a.count).join('、')}));
 const first=rows.find(e=>!e.complete);
 return {rows,first,done,paid};
}
export function claimChapter(w:WorldState,id:Chapter):string|null{
 const flag=flags.get(id),j=get(w),data=chapters.find(e=>e.id===id);
 if(incapacitated(w)||!j||!flag||!data||!(j.done&flag))return '完成这一章后再领补给。';
 if(j.paid&flag)return '本章补给已经领过。';
 if(!inventoryChange(w,[],[...data.reward]))return '背包已满，补给会保留。';
 j.paid|=flag;return null;
}
export function validJournal(w:WorldState):boolean{
 const j=get(w),int=(n:unknown)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0;
 return j===undefined||!!j&&int(j.done)&&j.done<=255&&int(j.paid)&&!(j.paid&~j.done)&&int(j.weatherDay)&&j.weatherDay<=w.day;
}
