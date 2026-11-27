import {
 beastPanel, loadBeastFeed, nearestWildBeast, setBeastRole, strikeWildBeast, tameBeast, transferBeastPack, useRestraint,
} from '../sim/beasts';
import { countItem, itemNames } from '../sim/ark';
import type { BeastRole, WorldState } from '../sim/types';

const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
const put=(node:HTMLElement,value:string)=>{if(node.textContent!==value)node.textContent=value;};
const name=(id:string)=>itemNames.get(id)??id;
const skillNames:Record<string,string>={
 mine_crush:'提高熔炼产量',auto_mine:'协助凿矿',stoke_hearth:'维持炉火',mobile_warmth:'移动暖圈',
 fetch_debris:'自动拾荒',scout_dive:'侦察与俯冲',produce_fur_repair:'产绒与修墙',pack_charge:'随行仓与冲撞',
 boost_greenhouse:'加速温室',warm_heal_aura:'回温与疗愈',power_furnace_deice:'熔炉供能',flame_cone:'扇形火线',
 boost_buoyancy_speed:'增加浮力和航速',gale_blade:'疾风刃',
};
const roles:readonly [BeastRole,string][]=[['companion','随行出战'],['work','基地打工'],['rest','休整回温']];
type Info=ReturnType<typeof beastPanel>;
type Animal=Info['beasts'][number];
type Wild=Info['wild'][number];
interface BeastUIHooks{
 state:()=>WorldState;
 msg:(issue:string|null,success:string,event?:'craft'|'hit')=>void;
 icon:(id:string)=>string|undefined;
 art:(id:string)=>string|undefined;
}
export function beastUi(h:BeastUIHooks){
 const roster=el('beast-roster'),encounter=el('wild-encounter'),list=el('beast-list'),pack=el('beast-pack');
 const progress=el<HTMLProgressElement>('tame-progress'),hp=el<HTMLMeterElement>('wild-hp'),feedButton=el<HTMLButtonElement>('wild-feed');
 const load=el<HTMLButtonElement>('beast-feed-load');
 let targetId:string|null=null,last=0,packKey='',cardKey='';
 const cards=new Map<string,{role:HTMLElement,status:HTMLElement,vitals:HTMLElement,buttons:HTMLButtonElement[]}>();
 const button=(label:string,fn:()=>void)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;return b;};
 const img=(src:string)=>{const i=document.createElement('img');i.src=src;i.alt='';return i;};
 function feedback(issue:string|null,msg:string,event?:'craft'|'hit'){h.msg(issue,msg,event);update(performance.now(),encounter.hidden,true);}
 function perform(task:'tame'|'strike'|'paralysis_net'|'beast_trap'):boolean{
  const w=h.state(),current=nearestWildBeast(w);
  if(!current)return false;
  const id=current.id,title=beastPanel(w).wild.find(x=>x.id===id)?.name??'云兽';
  if(task==='strike')feedback(strikeWildBeast(w,id),`压制了${title}。`,'hit');
  else if(task==='tame'){
   const issue=tameBeast(w,id);
   const joined=!issue&&w.beasts.some(x=>x.id===id||x.defId===current.defId)&&!w.wildEntities.some(x=>x.id===id);
   feedback(issue,joined?`${title}已成为方舟伙伴！`:`已投喂${title}。`,'craft');
  }else feedback(useRestraint(w,id,task),task==='paralysis_net'?`麻痹网困住了${title}。`:`兽夹困住了${title}。`,'hit');
  return true;
 }
 function updateWild(w:WorldState,data:Info,hide:boolean){
  const nearest=nearestWildBeast(w);
  const wild=nearest&&data.wild.find(b=>b.id===nearest.id);
  targetId=wild?.id??null;
  encounter.hidden=hide||!wild;
  if(!wild){delete encounter.dataset.wildId;delete encounter.dataset.species;delete encounter.dataset.weakened;return;}
  encounter.dataset.wildId=wild.id;encounter.dataset.species=wild.defId;encounter.dataset.weakened=String(wild.weakened);
  put(el('wild-species'),wild.name);put(el('wild-status'),wild.stunnedTicks>0?`压制中 ${Math.ceil(wild.stunnedTicks/30)}s`:wild.weakened?'虚弱，可投喂':'警戒');
  hp.max=wild.maxHp;hp.value=wild.hp;progress.max=wild.feedsRequired;progress.value=wild.tameProgress;
  put(el('wild-tame-count'),`${wild.tameProgress}/${wild.feedsRequired}`);
  const bait=el('wild-bait'),quantity=countItem(w,wild.preferredBait),description=`偏好 ${name(wild.preferredBait)} · 背包 ${quantity}`;
  if(bait.dataset.label!==description){
   bait.dataset.label=description;
   const src=h.icon(wild.preferredBait.replaceAll('_','-'));
   bait.replaceChildren(...(src?[img(src),description]:[description]));
  }
  const net=el<HTMLButtonElement>('wild-net'),trap=el<HTMLButtonElement>('wild-trap');
  for(const [btn,id,label] of [[net,'paralysis_net','麻痹网'],[trap,'beast_trap','兽夹']] as const){
   const qty=countItem(w,id),txt=label+' '+qty;
   if(btn.lastChild?.textContent!==txt)btn.lastChild!.textContent=txt;
   btn.disabled=qty===0;
  }
  feedButton.disabled=!wild.weakened||quantity<1;
 }
 function makeCard(beast:Animal){
  const card=document.createElement('article');card.dataset.beastId=beast.id;card.dataset.species=beast.defId;
  const head=document.createElement('div');head.className='beast-card-head';
  const label=document.createElement('strong');label.textContent=beast.name;const role=document.createElement('span');
  const src=h.art(beast.defId);if(src)head.append(img(src));head.append(label,role);
  const status=document.createElement('small'),vitals=document.createElement('div');vitals.className='beast-vitals numbers';
  const skills=document.createElement('p');skills.className='beast-skills';
  skills.textContent=`基地：${skillNames[beast.workSkill]??beast.workSkill}　随行：${skillNames[beast.companionSkill]??beast.companionSkill}`;
  const row=document.createElement('div');row.className='beast-roles';
  const buttons=roles.map(([key,label])=>{
   const b=button(label,()=>feedback(setBeastRole(h.state(),beast.id,key),`${beast.name}：${label}`,'craft'));
   b.dataset.beastRole=key;return b;
  });
  row.append(...buttons);card.append(head,status,vitals,skills,row);cards.set(beast.id,{role,status,vitals,buttons});return card;
 }
 function updatePack(w:WorldState,data:Info){
  pack.hidden=!data.packAvailable;
  const key=JSON.stringify([data.packAvailable,data.pack,w.player.inventory]);if(key===packKey||pack.hidden)return;packKey=key;
  const contents=el('beast-pack-contents'),nodes:HTMLElement[]=[];
  function add(itemId:string,count:number,direction:'deposit'|'withdraw'){
   const line=document.createElement('div');line.className='beast-pack-row';
   const b=button((direction==='deposit'?'存入 ':'取出 ')+name(itemId),()=>feedback(transferBeastPack(h.state(),itemId,direction),'已转移物资。'));
   b.dataset.beastPackMove=direction;b.dataset.itemId=itemId;line.append(`${name(itemId)} ×${count}`,b);nodes.push(line);
  }
  for(const x of data.pack)add(x.itemId,x.count,'withdraw');
  const quantities=new Map<string,number>();
  for(const x of w.player.inventory)if(x)quantities.set(x.itemId,(quantities.get(x.itemId)??0)+x.count);
  for(const [itemId,count] of quantities)if(itemId!=='grapple_hook')add(itemId,count,'deposit');
  contents.replaceChildren(...nodes);
 }
 function updateRoster(w:WorldState,data:Info){
  if(roster.hidden)return;
  put(el('beast-summary'),`伙伴 ${data.beasts.length}　随行 ${data.companions}/${data.maxCompanions}　兽窝 ${data.denCount}`);
  const troughs=w.ark.buildings.filter(x=>x.defId==='feed_trough'),near=troughs.some(b=>Math.hypot(w.player.x-b.gx-.5,w.player.y-b.gy-.5)<=2);
  put(el('beast-feed-details'),troughs.length?`饲槽库存 ${data.feed} · 背包 ${countItem(w,'beast_feed')}${near?'':' · 靠近饲料槽加料'}`:'尚无饲料槽 · 在建造手册中制作');
  load.disabled=!near||countItem(w,'beast_feed')===0;
  const key=data.beasts.map(x=>x.id).join('|');
  if(key!==cardKey){
   cardKey=key;cards.clear();list.replaceChildren(...data.beasts.map(makeCard));
  }
  if(!data.beasts.length&&!list.childNodes.length){
   const empty=document.createElement('p');empty.className='beast-empty';empty.textContent='在浮岛上压制云兽，带齐它偏爱的热食，靠近后按 E 投喂。';list.append(empty);
  }
  for(const x of data.beasts){
   const card=cards.get(x.id)!;
   put(card.role,roles.find(([id])=>id===x.role)?.[1]??'');
   put(card.status,x.status);
   put(card.vitals,`体力 ${Math.ceil(x.hp)}/${x.maxHp}　体温 ${Math.round(x.warmth)}　饱腹 ${Math.round(x.hunger)}`);
   for(const b of card.buttons)b.setAttribute('aria-pressed',String(b.dataset.beastRole===x.role));
  }
  updatePack(w,data);
 }
 function update(now:number,hide=false,force=false){
  if(!force&&now-last<90)return;last=now;
  const w=h.state(),data=beastPanel(w);updateWild(w,data,hide);updateRoster(w,data);
 }
 el('wild-strike').onclick=()=>perform('strike');
 feedButton.onclick=()=>perform('tame');
 for(const [elem,id] of [['wild-net','paralysis_net'],['wild-trap','beast_trap']] as const){
  const b=el(elem),src=h.icon(id.replaceAll('_','-'));if(src)b.prepend(img(src));
  b.onclick=()=>perform(id);
 }
 load.onclick=()=>feedback(loadBeastFeed(h.state()),'已添加云兽饲料。','craft');
 function show(open:boolean){
  roster.hidden=!open;el('beast-roster-toggle').setAttribute('aria-expanded',String(open));
  if(open)update(performance.now(),true,true);
 }
 el('beast-roster-close').onclick=()=>{show(false);el('beast-roster-toggle').focus({preventScroll:true});};
 return { update,show,open:()=>!roster.hidden,tame:()=>perform('tame'),target:()=>targetId };
}
