import { feedBond } from '../sim/beast-bond';
import { breedBeasts,breedPanel,INCUBATION,startIncubating,takeIncubating } from '../sim/breeding';
import { chooseBeastLead } from '../sim/beast-growth';
import { skills } from '../sim/beast-skills';
import { renameBeast,traitList } from '../sim/beast-traits';
import { isGrappleItem } from '../sim/grapple-tools';
import {
 beastPanel, loadBeastFeed, nearestWildBeast, setBeastRole, strikeWildBeast, tameBeast, transferBeastPack, useRestraint, wildBeastTarget,
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
 const sector=document.querySelector<HTMLElement>('.sector');
 let lockedId:string|null=null,targetId:string|null=null,last=0,packKey='',cardKey='',breedKey='';
 const cards=new Map<string,{role:HTMLElement,status:HTMLElement,vitals:HTMLElement,label:HTMLElement,rate:HTMLElement,training:HTMLElement,lead:HTMLButtonElement,bond:HTMLElement,feed:HTMLButtonElement,rename:HTMLDetailsElement,input:HTMLInputElement,buttons:HTMLButtonElement[]}>();
 const button=(label:string,fn:()=>void)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;return b;};
 const img=(src:string)=>{const i=document.createElement('img');i.src=src;i.alt='';return i;};
 function feedback(issue:string|null,msg:string,event?:'craft'|'hit'){h.msg(issue,msg,event);update(performance.now(),encounter.hidden,true);}
 function subject(w:WorldState,range:number){
  if(lockedId){
   const locked=wildBeastTarget(w,lockedId,Infinity);
   if(locked)return wildBeastTarget(w,lockedId,range);
   lockedId=null;
  }
  return nearestWildBeast(w,range);
 }
 function lockAt(at:{x:number;y:number}){
  const w=h.state(),picked=w.wildEntities.filter(e=>e.alpha&&wildBeastTarget(w,e.id,11)&&
   Math.abs(e.x-at.x)<=.62&&at.y>=e.y-1.18&&at.y<=e.y+.24)
   .sort((a,b)=>Math.hypot(a.x-at.x,a.y-.4-at.y)-Math.hypot(b.x-at.x,b.y-.4-at.y))[0];
  if(!picked)return false;
  lockedId=picked.id;
  update(performance.now(),false,true);
  return true;
 }
 function clearTarget(){
  if(!lockedId)return false;
  lockedId=null;targetId=null;
  update(performance.now(),encounter.hidden,true);
  return true;
 }
 function perform(task:'tame'|'strike'|'paralysis_net'|'beast_trap'):boolean{
  const w=h.state(),range=task==='paralysis_net'?2.8:task==='beast_trap'?1.65:1.8,current=subject(w,range);
  if(!current)return false;
  // Revalidate range and the represented entity at the moment of activation.
  // Never spend a net or bait on a nearer, different creature.
  if(current.id!==targetId)return false;
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
  // The observation card lets the player use a net at its real 2.8-tile
  // cast range; touch, bait and traps still use their shorter reach.
  const nearest=subject(w,lockedId?Infinity:2.8);
  const wild=nearest&&data.wild.find(b=>b.id===nearest.id);
  targetId=wild?.id??null;
  encounter.hidden=hide||!wild;
  if(!wild){delete encounter.dataset.wildId;delete encounter.dataset.species;delete encounter.dataset.weakened;delete encounter.dataset.alpha;delete encounter.dataset.behavior;delete encounter.dataset.locked;return;}
  encounter.dataset.wildId=wild.id;encounter.dataset.species=wild.defId;
  encounter.dataset.alpha=String(!!wild.alpha);encounter.dataset.behavior=wild.mind.mood;encounter.dataset.weakened=String(wild.weakened);
  put(el('wild-species'),(wild.alpha?'精英头领 · ':'')+wild.name);put(el('wild-status'),wild.stunnedTicks>0?`压制中 ${Math.ceil(wild.stunnedTicks/30)}s`:wild.weakened?'虚弱，可投喂':wild.hostile?'警戒':wild.mind.label);
  hp.max=wild.maxHp;hp.value=wild.hp;progress.max=wild.feedsRequired;progress.value=wild.tameProgress;
  const profile=wild.profile;
  put(el('wild-traits'),profile.temperament+' · '+profile.stars+' 星 · '+profile.traits.map(t=>traitList[t].name).join('、'));
  put(el('wild-tame-count'),`${wild.tameProgress}/${wild.feedsRequired}`);
  const bait=el('wild-bait'),quantity=countItem(w,wild.preferredBait),description=`偏好 ${name(wild.preferredBait)} · 背包 ${quantity}`;
  if(bait.dataset.label!==description){
   bait.dataset.label=description;
   const src=h.icon(wild.preferredBait.replaceAll('_','-'));
   bait.replaceChildren(...(src?[img(src),description]:[description]));
  }
  const gap=Math.hypot(w.player.x-wild.x,w.player.y-wild.y);
  encounter.dataset.locked=String(wild.id===lockedId);
  encounter.dataset.distance=gap.toFixed(3);
  const lock=el<HTMLButtonElement>('wild-lock');
  lock.hidden=!wild.alpha;
  lock.setAttribute('aria-pressed',String(wild.id===lockedId));
  put(lock,lockedId?'取消追踪':'追踪头领');
  put(el('wild-distance'),gap>2.8?`请靠近 · ${gap.toFixed(1)} 格 · 麻痹网 2.8 格`:gap>1.8?`${gap.toFixed(1)} 格 · 麻痹网可投 · 投喂 1.8 格`:`${gap.toFixed(1)} 格 · 已到投喂距离`);
  el('wild-distance').hidden=!wild.alpha;
  const net=el<HTMLButtonElement>('wild-net'),trap=el<HTMLButtonElement>('wild-trap');
  for(const [btn,id,label] of [[net,'paralysis_net','麻痹网'],[trap,'beast_trap','兽夹']] as const){
   const qty=countItem(w,id),txt=label+' '+qty;
   if(btn.lastChild?.textContent!==txt)btn.lastChild!.textContent=txt;
   btn.disabled=qty===0||gap>(id==='paralysis_net'?2.8:1.65);
  }
  feedButton.disabled=!wild.weakened||quantity<1||gap>1.8;
  el<HTMLButtonElement>('wild-strike').disabled=gap>1.8;
 }
 function makeCard(beast:Animal){
  const card=document.createElement('article');card.dataset.beastId=beast.id;card.dataset.species=beast.defId;
  const head=document.createElement('div');head.className='beast-card-head';
  const label=document.createElement('strong');label.textContent=beast.name;const role=document.createElement('span');
  const src=h.art(beast.defId);if(src)head.append(img(src));head.append(label,role);
  const status=document.createElement('small'),vitals=document.createElement('div');vitals.className='beast-vitals numbers';
  const skillText=document.createElement('p');skillText.className='beast-skills';
  skillText.textContent=`基地：${skillNames[beast.workSkill]??beast.workSkill}　随行：${skillNames[beast.companionSkill]??beast.companionSkill}`;
  const profile=document.createElement('div');profile.className='beast-profile';
  const subtype=document.createElement('small'),rate=document.createElement('small');
  subtype.textContent='潜力 '+beast.profile.stars+'/5 星 · '+beast.profile.temperament;
  rate.dataset.beastWorkRate='true';profile.append(subtype,rate);
  const training=document.createElement('small');training.dataset.beastGrowth='true';profile.append(training);
  const bond=document.createElement('small');bond.dataset.beastBond='true';profile.append(bond);
  const traits=document.createElement('ul');traits.className='beast-traits';traits.setAttribute('aria-label','个体词条');
  for(const id of beast.profile.traits){
    const tag=document.createElement('li');tag.dataset.trait=id;tag.textContent=traitList[id].name;tag.title=traitList[id].text;
    if(beast.profile.rare===id)tag.dataset.rare='true';
    traits.append(tag);
  }
  profile.append(traits);
  const rename=document.createElement('details'),title=document.createElement('summary'),form=document.createElement('form');
  rename.className='beast-rename';title.textContent='改名';
  const edit=document.createElement('input');edit.type='text';edit.maxLength=32;edit.placeholder='输入昵称';edit.value=beast.name;
  edit.setAttribute('aria-label','云兽昵称');
  const submit=document.createElement('button');submit.type='submit';submit.textContent='保存名字';
  form.append(edit,submit);
  form.onsubmit=e=>{
    e.preventDefault();
    const issue=renameBeast(h.state(),beast.id,edit.value);
    if(!issue){rename.open=false;title.focus();}
    feedback(issue,'已保存云兽昵称。','craft');
  };
  rename.append(title,form);
  const row=document.createElement('div');row.className='beast-roles';
  const buttons=roles.map(([key,label])=>{
   const b=button(label,()=>feedback(setBeastRole(h.state(),beast.id,key),`${beast.name}：${label}`,'craft'));
   b.dataset.beastRole=key;return b;
  });
  const lead=button('设为领队',()=>feedback(chooseBeastLead(h.state(),beast.id),beast.name+'已带队。','craft'));
  lead.dataset.beastLeader='true';lead.hidden=beast.role!=='companion';lead.setAttribute('aria-label',beast.name+'设为领队');
  const feed=button('喂暖粮',()=>feedback(feedBond(h.state(),beast.id),'已投喂，羁绊提升。','craft'));
  feed.dataset.beastBondFeed='true';feed.setAttribute('aria-label',beast.name+'喂暖粮');
  row.append(...buttons,lead,feed);card.append(head,status,vitals,profile,skillText,row,rename);
  cards.set(beast.id,{role,status,vitals,label,rate,training,lead,bond,feed,rename,input:edit,buttons});return card;
 }
 function updateBreeding(w:WorldState){
  const info=breedPanel(w),shell=el('breeding-panel');
  shell.hidden=!info.pairs.length&&!info.nests.length&&!info.eggs;
  if(shell.hidden)return;
  put(el('breeding-eggs'),'随身云兽蛋 '+info.eggs+' 枚 · 设法把巢温维持在 20°C–45°C。');
  const key=JSON.stringify([info.eggs,info.pairs.map(p=>[p.a.name,p.b.name,p.issue]),info.nests.map(n=>[n.id,Math.round(n.temp),Math.floor(n.progress/8),n.egg,n.running,n.near])]);
  if(key===breedKey)return;breedKey=key;
  const lines:HTMLElement[]=[];
  for(const pair of info.pairs){
   const row=document.createElement('div'),label=document.createElement('small');
   row.className='breeding-row';label.textContent=pair.a.name+' ＋ '+pair.b.name+(pair.issue?'：'+pair.issue:' · 可配对');
   const pairButton=button('配对产蛋',()=>feedback(breedBeasts(h.state(),pair.den,pair.a.id,pair.b.id),'获得云兽蛋。','craft'));
   pairButton.dataset.breedPair='true';pairButton.disabled=!!pair.issue;
   row.append(label,pairButton);lines.push(row);
  }
  for(const nest of info.nests){
   const row=document.createElement('div'),label=document.createElement('small');row.className='breeding-row';row.dataset.incubator=nest.id;
   row.dataset.incubating=String(!!nest.egg);row.dataset.progress=String(nest.progress);
   label.textContent=Math.round(nest.temp)+'°C · '+(nest.egg?nest.egg+' '+(nest.running?'孵化 ':'停温 ')+Math.floor(nest.progress/INCUBATION*100)+'%':'空巢');
   const act=nest.egg?button('收回蛋',()=>feedback(takeIncubating(h.state(),nest.id),'已收回云兽蛋，重新放入时从头保温。')):button('放入蛋',()=>feedback(startIncubating(h.state(),nest.id),'云兽蛋已放入孵化巢。','craft'));
   act.dataset.incubatorAction=nest.egg?'take':'load';act.disabled=!nest.near||(!nest.egg&&!info.eggs);
   row.append(label,act);lines.push(row);
  }
  el('breeding-actions').replaceChildren(...lines);
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
  for(const [itemId,count] of quantities)if(!isGrappleItem(itemId))add(itemId,count,'deposit');
  contents.replaceChildren(...nodes);
 }
 function updateRoster(w:WorldState,data:Info){
  if(roster.hidden)return;
  const drop=Math.max(132,Math.ceil((sector?.getBoundingClientRect().bottom??120)+10))+'px';
  if(roster.style.getPropertyValue('--beast-panel-top')!==drop)roster.style.setProperty('--beast-panel-top',drop);
  put(el('beast-summary'),`伙伴 ${data.beasts.length}　随行 ${data.companions}/${data.maxCompanions}　兽窝 ${data.denCount}`);
  const troughs=w.ark.buildings.filter(x=>x.defId==='feed_trough'),near=troughs.some(b=>Math.hypot(w.player.x-b.gx-.5,w.player.y-b.gy-.5)<=2);
  put(el('beast-feed-details'),troughs.length?`饲槽库存 ${data.feed} · 背包 ${countItem(w,'beast_feed')}${near?'':' · 靠近饲料槽加料'}`:'尚无饲料槽 · 在建造手册中制作');
  load.disabled=!near||countItem(w,'beast_feed')===0;
  updateBreeding(w);
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
   put(card.label,x.name);
   put(card.bond,'羁绊 '+Math.round(x.bond));
   card.label.closest('article')!.setAttribute('data-morph',x.morph.variant??'');
   card.feed.disabled=x.bond>=100||countItem(w,'beast_feed')<1||Math.hypot(w.player.x-x.x,w.player.y-x.y)>2.5;
   card.feed.setAttribute('aria-label',x.name+'喂暖粮');
   put(card.rate,'工作 '+Math.round(x.workRate*100)+'%');
   put(card.training,'Lv.'+x.growth.level+' · '+x.growth.xp+'/'+x.growth.next+' 经验');
   card.lead.hidden=x.role!=='companion';card.lead.disabled=x.growth.lead;
   put(card.lead,x.growth.lead?'当前领队':'设为领队');
   card.lead.title=skills[x.defId]?.name??'';card.lead.setAttribute('aria-label',x.name+'设为领队');
   if(!card.rename.open&&card.input.value!==x.name)card.input.value=x.name;
   put(card.vitals,`体力 ${Math.ceil(x.hp)}/${x.maxHp}　体温 ${Math.round(x.warmth)}　饱腹 ${Math.round(x.hunger)}`);
   for(const b of card.buttons)b.setAttribute('aria-pressed',String(b.dataset.beastRole===x.role));
  }
  updatePack(w,data);
 }
 function update(now:number,hide=false,force=false){
  if(!force&&now-last<90)return;last=now;
  const w=h.state(),data=beastPanel(w);updateWild(w,data,hide);updateRoster(w,data);
 }
 el('wild-lock').onclick=()=>{
  if(lockedId){clearTarget();return;}
  if(targetId&&wildBeastTarget(h.state(),targetId,Infinity)?.alpha){
   lockedId=targetId;
   update(performance.now(),false,true);
  }
 };
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
 function closeRename(){
   const detail=roster.querySelector<HTMLDetailsElement>('.beast-rename[open]');
   if(!detail)return false;
   detail.open=false;detail.querySelector('summary')?.focus({preventScroll:true});return true;
 }
 return { update,show,closeRename,lockAt,clearTarget,resetTarget:()=>{lockedId=null;targetId=null;},
 nearby:()=>subject(h.state(),1.8),open:()=>!roster.hidden,tame:()=>perform('tame'),target:()=>targetId };
}
