import { buildKinds, buildCosts, buildDefinitions, countItem, itemNames, type BuildKind } from '../sim/ark';
import { collectIndustry, industryPanel, pendingDismantle, startIndustry, techOptions, undoDismantle, unlockTech } from '../sim/industry';
import type { ItemStack, WorldState } from '../sim/types';
import techTree from '../data/tech.json';
import { bindTooltips } from './tooltip';

const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
const descriptions:Partial<Record<BuildKind,string>>={
 wood_deck:'扩建可行走的甲板，须连接方舟边缘。',iron_deck:'更耐损的甲板，须连接方舟边缘。',torch_post:'近处小型热源。',
 wind_wall:'挡住一部分寒风，减缓热量流失。',warm_wall:'比木墙更能锁住热量。',buoyancy_core:'增加浮力上限 32 点。',
 heat_relay:'把主炉暖区向远端延伸。',workbench:'研究蓝图并制作工具。',furnace:'把冻铁废件熔成霜铁锭。',
 stove:'将原材料煮成暖食。',catch_net:'放在外缘，拦截从旁经过的漂流物。',sorter_arm:'放在捕捞网栏旁，将捕获物转存到分拣输出。',
 greenhouse:'在暖区种植霜薯等作物，需要 2×2 空甲板。',
};
const name=(id:string)=>itemNames.get(id)??id;
export const itemList=(stacks:readonly ItemStack[])=>stacks.map(x=>`${name(x.itemId)} ×${x.count}`).join(' · ');
const buildIcons:Partial<Record<BuildKind,string>>={wood_deck:'deck',torch_post:'torch',wind_wall:'wall'};
const materialIcons:Record<string,string>={driftwood:'driftwood',frost_iron_scrap:'iron',grapple_hook:'hook',rope:'rope',torch_item:'torch'};
const buildingTech=new Map(techTree.nodes.flatMap(n=>n.unlocksBuildings.map(id=>[id,n.id] as const)));
const text=(el:HTMLElement,v:string)=>{if(el.textContent!==v)el.textContent=v;};
function button(label:string,tip:string,fn:()=>void):HTMLButtonElement{
 const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.tip=tip;b.onclick=fn;return b;
}
function image(src:string):HTMLImageElement{const img=document.createElement('img');img.src=src;img.alt='';return img;}
function row(cls:string,title:string, detail:string):[HTMLDivElement,HTMLDivElement]{
 const r=document.createElement('div');r.className=cls;
 const label=document.createElement('div'),n=document.createElement('strong'),sub=document.createElement('small');
 n.textContent=title;sub.textContent=detail;label.append(n,sub);r.append(label);return [r,label];
}
interface Callbacks{
 state:()=>WorldState;
 select:(kind:BuildKind)=>void;
 message:(issue:string|null,success:string,event?:'craft'|'undo')=>void;
 icon:(id:string)=>string|undefined;
 research:()=>void;
}
export function createIndustryUi(cb:Callbacks){
 const catalog=el('build-catalog'),station=el('industry-panel'),lift=el<HTMLMeterElement>('buoyancy-gauge');
 const spare=el('buoyancy-spare'),undo=el('dismantle-undo'),progress=el<HTMLProgressElement>('undo-progress');
 const collect=el<HTMLButtonElement>('industry-collect'),closeTip=bindTooltips(el('app'),el('ui-tip'));
 let activeStation:string|null=null,catalogKey='',stationKey='',liftKey='';
 const buttons=new Map<BuildKind,HTMLButtonElement>();
 const itemIcon=(id:string)=>cb.icon(id.replaceAll('_','-'))??cb.icon(materialIcons[id]??'');
 for(const kind of buildKinds){
  const def=buildDefinitions[kind],[gw,gh]=def.size;
  const lift=def.buoyancyDelta>0?`+${def.buoyancyDelta} 浮力`:def.buoyancyDelta<0?`占用 ${-def.buoyancyDelta} 浮力`:'不占浮力';
  const b=button('','',()=>cb.select(kind));b.dataset.buildKind=kind;b.setAttribute('aria-label',def.name);
  const src=cb.icon(buildIcons[kind]??kind.replaceAll('_','-'));
  if(src)b.append(image(src));
  const label=document.createElement('span'),cap=document.createElement('small');label.textContent=def.name;
  cap.textContent=`${gw}×${gh} · ${lift}`;label.append(cap);b.append(label);
  el(['workbench','furnace','stove','catch_net','sorter_arm','greenhouse'].includes(kind)?'catalog-industry':'catalog-structure').append(b);
  buttons.set(kind,b);
 }
 function showCatalog(show:boolean){
  catalog.hidden=!show;el('build-catalog-toggle').setAttribute('aria-expanded',String(show));
  if(show){catalogKey='';updateCatalog();}else closeTip();
 }
 function showStation(id:string|null){
  if(activeStation===id&&!station.hidden)return;
  station.hidden=!id;activeStation=id;stationKey='';closeTip();if(id)updateStation();
 }
 function updateCatalog(){
  const w=cb.state(), {buoyancyMax,buoyancyUsed}=w.ark,tech=techOptions(w);
  const key=JSON.stringify([w.player.inventory,buoyancyMax,buoyancyUsed,tech]);if(key===catalogKey)return;catalogKey=key;
  text(el('catalog-budget'),`已用 ${buoyancyUsed} / ${buoyancyMax} · 还能承重 ${Math.max(0,buoyancyMax-buoyancyUsed)}`);
  for(const [kind,b] of buttons){
   const costs=buildCosts[kind],locked=!w.unlockedTech.includes(buildingTech.get(kind)??'');
   const details=costs.map(i=>`${name(i.itemId)} ${countItem(w,i.itemId)}/${i.count}`).join(' · ');
   b.dataset.affordable=String(!locked&&costs.every(i=>countItem(w,i.itemId)>=i.count)&&buoyancyUsed-buildDefinitions[kind].buoyancyDelta<=buoyancyMax);
   b.dataset.locked=String(locked);b.dataset.tip=(locked?'蓝图未研究 · ':'')+(descriptions[kind]??'')+(details?' 材料：'+details:'');
  }
  const focusId=(document.activeElement as HTMLElement|null)?.dataset.techId;
  el('catalog-tech').replaceChildren(...tech.map(t=>{
   const [r,label]=row('tech-row',t.name,t.detail);
   if(t.unlocked){const done=document.createElement('span');done.dataset.done='';done.textContent='已研究';r.append(done);}
   else {
    const b=button('研究',t.issue??t.detail,()=>{cb.message(unlockTech(cb.state(),t.id),`已研究：${t.name}`,'craft');updateCatalog();});
    b.dataset.techId=t.id;b.setAttribute('aria-label',`研究 ${t.name}`);
    if(t.issue){b.setAttribute('aria-disabled','true');const why=document.createElement('small');why.textContent=t.issue;label.append(why);}
    r.append(b);
   }
   return r;
  }));
  if(focusId)el('catalog-tech').querySelector<HTMLButtonElement>(`[data-tech-id="${CSS.escape(focusId)}"]`)?.focus({preventScroll:true});
 }
 function stackRows(stacks:readonly ItemStack[],empty:string):HTMLLIElement[]{
  if(!stacks.length){const li=document.createElement('li');li.textContent=empty;return [li];}
  return stacks.map(i=>{
   const li=document.createElement('li'),label=document.createElement('span'),qty=document.createElement('strong'),src=itemIcon(i.itemId);
   label.textContent=name(i.itemId);if(src){label.className='item-name';label.prepend(image(src));}
   qty.textContent='×'+i.count;qty.className='numbers';li.append(label,qty);return li;
  });
 }
 function updateStation(){
  if(!activeStation)return;
  const info=industryPanel(cb.state(),activeStation);if(!info){showStation(null);return;}
  const {id,defId,recipes,job,output,intake,efficiency,status}=info;
  station.dataset.buildingId=id;station.dataset.defId=defId;el('bench-research').hidden=defId!=='workbench';
  text(el('industry-title'),info.name);text(el('industry-status'),`${status} · 效率 ${Math.round(efficiency*100)}%`);
  const progress=el<HTMLProgressElement>('industry-progress');el('industry-job').hidden=!job;
  if(job){
   const recipe=recipes.find(r=>r.id===job.recipeId);
   text(el('industry-job-label'),`${recipe?name(recipe.output.itemId):'正在加工'} · ${Math.max(0,job.duration-job.progress).toFixed(1)} 秒`);
   progress.max=job.duration;progress.value=job.progress;
  }
  const key=JSON.stringify([id,recipes,!!job,output,intake]);if(key===stationKey)return;stationKey=key;
  el('industry-intake-section').hidden=!intake.length&&defId!=='catch_net';
  el('industry-intake').replaceChildren(...stackRows(intake,'网内暂空'));
  el('industry-output').replaceChildren(...stackRows(output,'暂无产出'));
  collect.textContent=defId==='catch_net'?'收取网内物资':'收取产出';collect.disabled=!(output.length||intake.length);
  el('industry-recipes-section').hidden=recipes.length===0;
  const focusId=(document.activeElement as HTMLElement|null)?.dataset.recipeId;
  el('industry-recipes').replaceChildren(...recipes.map(r=>{
   const [rl,label]=row('recipe-row',`${name(r.output.itemId)} ×${r.output.count}`,`${itemList(r.inputs)} · ${r.seconds} 秒`);
   const src=itemIcon(r.output.itemId);if(src){label.className='recipe-label';label.prepend(image(src));}
   const b=button('开始',r.issue??`生产 ${itemList([r.output])}`,()=>{
    cb.message(startIndustry(cb.state(),id,r.id),`开始加工：${name(r.output.itemId)}`,'craft');updateStation();
   });
   b.dataset.recipeId=r.id;b.setAttribute('aria-label',`开始 ${name(r.output.itemId)}`);
   if(r.issue)b.setAttribute('aria-disabled','true');rl.append(b);return rl;
  }));
  if(focusId)el('industry-recipes').querySelector<HTMLButtonElement>(`[data-recipe-id="${CSS.escape(focusId)}"]`)?.focus({preventScroll:true});
 }
 function undoAction(){
  if(pendingDismantle(cb.state()))cb.message(undoDismantle(cb.state()),'已撤销拆除，原样放回。','undo');
 }
 collect.onclick=()=>{if(activeStation){cb.message(collectIndustry(cb.state(),activeStation),'物资已收入背包。','craft');updateStation();}};
 el('catalog-close').onclick=()=>{showCatalog(false);el('build-catalog-toggle').focus();};
 el('industry-close').onclick=()=>showStation(null);
 el('bench-research').onclick=cb.research;
 el('undo-dismantle').onclick=undoAction;
 return {
  showCatalog,showStation,undoAction,closeTip,catalogOpen:()=>!catalog.hidden,stationOpen:()=>!station.hidden,stationId:()=>activeStation,
  update(){
   const w=cb.state(),{buoyancyMax,buoyancyUsed}=w.ark,key=buoyancyUsed+'/'+buoyancyMax;
   if(key!==liftKey){
    liftKey=key;lift.max=Math.max(1,buoyancyMax);lift.value=buoyancyUsed;
    const left=Math.max(0,buoyancyMax-buoyancyUsed),near=String(left<=4);
    lift.dataset.near=near;spare.dataset.near=near;spare.textContent='余 '+left;
   }
   const pending=pendingDismantle(w);undo.hidden=!pending;
   if(pending){text(el('dismantle-name'),`已拆除：${pending.name}`);text(el('undo-seconds'),pending.remainingSeconds.toFixed(1)+'s');progress.value=pending.remainingSeconds;}
   if(!catalog.hidden)updateCatalog();if(!station.hidden)updateStation();
  },
 };
}
