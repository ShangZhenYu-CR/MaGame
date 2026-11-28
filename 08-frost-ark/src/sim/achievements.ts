import { activeCave } from './cave';
import { endlessView } from './endless';
import { hasChapter } from './journal';
import { latteProfile } from './latte-growth';
import { liveLife,metrics,readLife,type LifeMetric } from './life';
import type { WorldState } from './types';

const ids=['spark','hook','deck','refuge','flow','meal','coast','cave','winds','armor','arsenal','roll','partner','crew','alpha','egg','aurora','latte','storm','seeds','solar','whale','bounty','giant'] as const;
type Badge=typeof ids[number];
const name:Record<Badge,string>={spark:'炉火初燃',hook:'神钩手',deck:'踏实起家',refuge:'暴雪里的家',flow:'物资自己走',meal:'热汤暖胃',coast:'迈过跳板',cave:'冰窟访客',winds:'四风领航员',armor:'全副防寒',arsenal:'五路破冰',roll:'雪地闪步',partner:'第一位伙伴',crew:'全兽图鉴',alpha:'精英驯养师',egg:'暖巢新生',aurora:'极光繁育师',latte:'拿铁与阳光',storm:'零损寒潮',seeds:'四枚天穹火种',solar:'太阳方舟',whale:'霜鲸终结者',bounty:'深空猎人',giant:'星海巨舰'};
const detail:Record<Badge,string>={spark:'在炉边成功添一次柴',hook:'用抓钩回收 6 件漂流残骸',deck:'实际扩建 3 格新甲板',refuge:'走进关闭且不低于 15°C 的暖屋',flow:'让自动物流完成 3 次真实输送',meal:'亲口吃下 3 份热食',coast:'第一次走上浮岛',cave:'进入任意一座地下冰窟',winds:'走上四个风区的浮岛',armor:'实际穿过四款主要防寒外衣／护甲',arsenal:'实际握持五种武器',roll:'完成第一次翻滚',partner:'驯养第一只野生云兽',crew:'方舟一度拥有全部 7 种云兽',alpha:'驯养一只精英头领',egg:'孵出第一只幼兽',aurora:'孵出极光或余烬异色',latte:'拿铁升到 Lv.4 并穿上太阳披风',storm:'无损过完一场完整寒潮',seeds:'收齐四枚天穹火种',solar:'将余烬主炉铸成太阳方舟',whale:'击退永冬霜鲸',bounty:'结算第一份深空悬赏',giant:'方舟拥有至少 400 格连通甲板'};
const known=new Set<string>(ids);
const awards=new WeakMap<WorldState,Badge[]>();
const regions=['cloud_shallows','frostpine_isles','sulfur_rift','aurora_zenith'];
const count=(w:WorldState,id:LifeMetric)=>readLife(w)?.count[id]??0;
export function stepAchievements(w:WorldState){
 const s=liveLife(w);
 if(w.weather==='whiteout'&&s.stormDay!==w.day){s.stormDay=w.day;s.stormDamage=false;}
 if(s.stormDay>0&&w.day>s.stormDay&&w.weather!=='whiteout'){
  if(!s.stormDamage&&w.player.hp>0)s.cleanStorms++;
  s.stormDay=0;s.stormDamage=false;
 }
 const node=w.activeIsland&&w.sky.islands.find(n=>n.id===w.activeIsland?.nodeId);
 const zone=node?regions.indexOf(node.biomeId):-1;
 if(zone>=0)s.regions|=1<<zone;
 if(activeCave(w))s.cave=true;
 const cat=latteProfile(w);
 const unlocked:Record<Badge,boolean>={
  spark:hasChapter(w,'fuel'),hook:count(w,'catches')>=6,deck:count(w,'decks')>=3,refuge:hasChapter(w,'room'),
  flow:count(w,'deliveries')>=3,meal:count(w,'meals')>=3,coast:hasChapter(w,'island'),cave:s.cave,winds:s.regions===15,
  armor:s.suits===15,arsenal:s.arms===31,roll:count(w,'rolls')>0,partner:w.beasts.length>0,crew:new Set(w.beasts.map(b=>b.defId)).size===7,
  alpha:count(w,'alphas')>0,egg:count(w,'hatched')>0,aurora:count(w,'variants')>0,latte:cat.level>=4&&cat.outfit==='cape',
  storm:s.cleanStorms>0,seeds:hasChapter(w,'seeds'),solar:hasChapter(w,'solar'),whale:w.bossDefeated,
  bounty:(endlessView(w)?.cleared??0)>0,giant:w.ark.decks.filter(Boolean).length>=400,
 };
 for(const id of ids)if(unlocked[id]&&!s.shown.includes(id)){
  s.shown.push(id);
  let q=awards.get(w);if(!q){q=[];awards.set(w,q);}
  q.push(id);
 }
}
export const takeAchievement=(w:WorldState)=>{const id=awards.get(w)?.shift();return id?{id,title:name[id],art:'badge-'+id}:null;};
export function achievementView(w:WorldState){
 const s=readLife(w),c=s?.count??{};
 return {
  unlocked:s?.shown.length??0,
  rows:ids.map(id=>({id,name:name[id],detail:detail[id],art:'badge-'+id,unlocked:!!s?.shown.includes(id)})),
  stats:[['当前天数',w.day],['实际航行时间',Math.floor(w.tick/30)+' 秒'],['抓钩回收',c.catches??0],['新建甲板',c.decks??0],['建造次数',c.built??0],
    ['热食',c.meals??0],['翻滚',c.rolls??0],['真实物流',c.deliveries??0],['游商交换',c.trades??0],['击退敌袭',c.foes??0],['伙伴驯服',c.tamed??0],
    ['孵化',c.hatched??0],['异色',c.variants??0],['拿铁救援',c.rescues??0],['无损寒潮',s?.cleanStorms??0],
    ['持有火种',w.skyheartCores],['探索风区',(s?.regions??0).toString(2).split('1').length-1],['当前云兽',w.beasts.length]],
 };
}
export function validAchievements(w:WorldState):boolean{
 const a=readLife(w);if(a===undefined)return true;
 const int=(x:unknown,max:number)=>typeof x==='number'&&Number.isSafeInteger(x)&&x>=0&&x<=max;
 return !!a&&typeof a==='object'&&!Array.isArray(a)&&typeof a.cave==='boolean'&&typeof a.stormDamage==='boolean'&&
  int(a.suits,15)&&int(a.arms,31)&&int(a.regions,15)&&int(a.stormDay,w.day)&&int(a.cleanStorms,w.day)&&Array.isArray(a.shown)&&
  a.shown.every(id=>known.has(id))&&new Set(a.shown).size===a.shown.length&&!!a.count&&typeof a.count==='object'&&!Array.isArray(a.count)&&
  Object.entries(a.count).every(([id,v])=>metrics.includes(id as LifeMetric)&&int(v,1e9));
}
