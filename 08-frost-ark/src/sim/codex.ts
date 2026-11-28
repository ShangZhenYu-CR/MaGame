import beasts from '../data/beasts.json';
import buildings from '../data/buildings.json';
import items from '../data/items.json';
import recipes from '../data/recipes.json';
import combat from '../data/combat_m5.json';
import { caveGuard } from './cave';
import { finaleStatus } from './finale';
import type { WorldState } from './types';

export const tabs=['beasts','buildings','gear','supplies','enemies'] as const;
export type CodexTab=(typeof tabs)[number];
type Entry={id:string;name:string;art:string;detail:string;note:string;tab:CodexTab};
type Archive=WorldState&{codexP2?:string[]};
const names=new Map(items.map(x=>[x.id,x.name]));
const key=(s:string)=>s.replaceAll('_','-');
const skills:Record<string,string>={
 mine_crush:'提高熔炼产量',auto_mine:'协助凿矿',stoke_hearth:'维持炉火',mobile_warmth:'移动暖圈',
 fetch_debris:'自动拾荒',scout_dive:'扩大侦察范围',produce_fur_repair:'产绒与修墙',pack_charge:'扩容与冲撞',
 boost_greenhouse:'加速温室',warm_heal_aura:'回温与疗愈',power_furnace_deice:'熔炉供能',flame_cone:'扇形火线',
 boost_buoyancy_speed:'提高浮力和航速',gale_blade:'释放疾风刃',
};
const regions=['','碎云浅海','霜松群岛','硫磺裂谷','极光天穹'];
const materials=(s:readonly {itemId:string;count:number}[])=>s.map(x=>(names.get(x.itemId)??x.itemId)+' ×'+x.count).join(' · ');
const bldArt:Record<string,string>={hearth_core:'hearth-1',wood_deck:'deck-1',wind_wall:'wall',warm_wall:'building-insulated-wall',
 torch_post:'icon-torch',furnace:'building-smelter',storage_box:'storage',catch_net:'building-net',sorter_arm:'building-sorter',
 frost_turret:'building-frost-arrow-turret',frost_airlock:'building-airlock',insulated_floor:'floor-insulated'};
const itemArt:Record<string,string>={frost_iron_scrap:'iron',grapple_hook:'hook',torch_item:'torch',wood_axe:'hand-axe',
 frost_axe:'hand-axe-upgraded',frost_pick:'mining-pick-upgraded'};
const enemy:Record<string,[art:string,weakness:string,note:string]>={
 froststalker:['enemy-frost-stalker','寒潮·借风潜形，暖灯显形后再集火。','别只盯见亮光的地方。'],
 icebreaker_beast:['enemy-ice-breaker','寒潮·重甲怕长矛、重锤或范围火油。','甲板在它脚下会响两遍。'],
 frostspike_bat:['enemy-frostspike-bat','寒潮后两波·远射距离长，绕开冰刺再还击。','别把第一道尖啸当成风声。'],
 heatwraith:['enemy-heatwraith','寒潮·靠近暖源就抽走热力，优先打它。','炉火还跟平时一样亮，不代表暖。'],
 mist_priest:['enemy-mist-priest','寒潮后段·等召唤预警时远射，阻止它叫来增援。','我宁愿面对风，不愿让它数到第二声。'],
 frostpack_wolf:['enemy-frost-wolf','冻林门·霜鬃领主号令时出现，群攻有利。','小的也别放过去。'],
 frostmane_lord:['boss-frost-mane','冻林门·从直线预警翻出，霜径会拖慢脚步。','地上那层薄霜比它的牙还凶。'],
 rift_carapace:['boss-rift-armor','硫磺裂谷·硬壳期间别浪费火油，等过热。','像炉子一样蓄热，也像炉子一样怕失控。'],
 cave_guardian:['cave-guardian','地下冰窟·别追进尖刺走廊，等攻击结束再还手。','回到石阶的路要记牢。'],
 frost_whale:['boss-frost-whale-3','极光天穹·每招之后甲裂，船炮、武器与伙伴一起发力。','先看云往哪儿让开，那就是鲸游过的地方。'],
};

export const codexEntries:ReadonlyArray<Entry>=[
 ...beasts.map(b=>({id:'beast:'+b.id,name:b.name,art:'beast-'+key(b.id),tab:'beasts' as const,
  detail:`栖地：${regions[b.biomeTier]} · 诱饵：${names.get(b.preferredBait)} ×${b.tameFeedsRequired} · 打工：${skills[b.workSkill]} · 随行：${skills[b.companionSkill]}`,
  note:b.heatAuraRadius?'风雪里，它身边能多暖一点。':'第一次见面别急着跑，先记住它爱吃什么。'})),
 ...buildings.map(b=>({id:'building:'+b.id,name:b.name,art:bldArt[b.id]??'building-'+key(b.id),tab:'buildings' as const,
  detail:`${b.size.join('×')} 格 · ${b.buoyancyDelta>=0?'供给':'消耗'}浮力 ${Math.abs(b.buoyancyDelta)} · ${b.cost.length?materials(b.cost):'出航配备'}`,
  note:b.category==='defense'?'先给防线留一格通路，寒潮时才能跑得开。':b.category==='industry'?'料路和脚下的暖区，比加机器更要紧。':'别只算材料，也要给回来的路留空间。'})),
 {id:'building:solar_ark',tab:'buildings',name:'太阳方舟',art:'solar-hearth',detail:'主炉 Lv.4 · 四枚天穹火种 · 解锁极光航线',note:'那束光终于能把云海照穿了。'},
 ...items.map(i=>{
   const recipe=recipes.find(r=>r.output.itemId===i.id);
   const gear=['equipment','weapon','tool'].includes(i.category);
   const source=recipe?materials(recipe.inputs):
     i.id.endsWith('_blueprint')?'探索遗迹、交易或击败守卫取得':i.gatherable?'可在浮岛或漂流残骸找到':
     i.category==='food'?'从垂钓、岛上采集或交易取得':'探索、拆解、加工或交易取得';
   return {id:'item:'+i.id,name:i.name,art:'icon-'+(itemArt[i.id]??key(i.id)),tab:gear?'gear' as const:'supplies' as const,
    detail:(recipe?'配方：':'来源：')+source+('hunger'in i&&i.hunger?` · 饱食 +${i.hunger}`:'')+('warmth'in i&&i.warmth?` · 体温 +${i.warmth}`:''),
    note:gear?'出门前先看一眼背包，能用的装备要带在身上。':'留一份给下一段航程，别一口气全用完。'};
 }),
 ...Object.entries(enemy).map(([id,[art,detail,note]])=>({id:'enemy:'+id,tab:'enemies' as const,
  name:combat.hostiles[id as keyof typeof combat.hostiles]?.name??(id==='frost_whale'?'永冬霜鲸':'冰窟守卫'),art,detail,note})),
];
const valid=new Set(codexEntries.map(e=>e.id));
const discovered=new WeakMap<WorldState,Set<string>>();
function read(w:WorldState){
 let data=discovered.get(w);
 if(!data){data=new Set((w as Archive).codexP2);discovered.set(w,data);}
 return data;
}
export function observeCodex(w:WorldState){
 const data=read(w),size=data.size;
 const add=(id:string)=>{if(valid.has(id))data.add(id);};
 for(const cell of w.ark.buildings)add('building:'+cell.defId);
 if(w.ark.decks.some(x=>x===1))add('building:wood_deck');
 if(w.ark.decks.some(x=>x===2))add('building:iron_deck');
 for(const item of w.player.inventory)if(item)add('item:'+item.itemId);
 for(const b of w.beasts)add('beast:'+b.defId);
 const p=w.player;
 for(const e of w.wildEntities)if(Math.hypot(e.x-p.x,e.y-p.y)<11){
  if(e.kind==='beast')add('beast:'+e.defId);
  else if(e.kind==='raider'||e.kind==='boss')add('enemy:'+e.defId);
 }
 if(caveGuard(w))add('enemy:cave_guardian');
 if(w.bossDefeated||finaleStatus(w).whale)add('enemy:frost_whale');
 if(w.unlockedTech.includes('solar_ark'))add('building:solar_ark');
 if(size!==data.size)(w as Archive).codexP2=[...data];
 return data;
}
export function codexRows(w:WorldState,tab:CodexTab){
 const seen=observeCodex(w);
 return codexEntries.filter(e=>e.tab===tab).map(e=>({...e,seen:seen.has(e.id)}));
}
export function validCodex(w:WorldState):boolean{
 const v=(w as Archive).codexP2;
 return v===undefined||Array.isArray(v)&&v.length<=valid.size&&new Set(v).size===v.length&&v.every(id=>valid.has(id));
}
