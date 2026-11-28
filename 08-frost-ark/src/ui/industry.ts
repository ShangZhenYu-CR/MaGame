import { actInHome,addFuelToHopper,changeRoute,treatDamage } from '../sim/industry';
import { buildKinds, buildCosts, buildDefinitions, countItem, itemNames, type BuildKind } from '../sim/ark';
import { collectIndustry, industryPanel, pendingDismantle, startIndustry, techOptions, undoDismantle, unlockTech } from '../sim/industry';
import type { ItemStack, WorldState } from '../sim/types';
import techTree from '../data/tech.json';
import { bindTooltips } from './tooltip';

const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
const descriptions:Partial<Record<BuildKind,string>>={
 ice_barricade:'敌人走入冰刺区时减速并受伤，不影响队友。',
 ward_searchlight:'灯光扩展寒潮视野、照破霜影潜行，并为近处补暖。',
 oil_mortar:'中远距抛射油弹，短暂预警后打击落点附近的敌人。',
 auto_repairer:'在储物箱 4 格内待命，消耗储备木板或冻铁，修补 3 格内受损防线。',
 incubator:'只在 20°C–45°C 生效，走近后按 E 放入云兽蛋。',
 fishing_spot:'放在开放舷边，停船后靠近按 E 下钩。',
 warm_cot:'暖室里安全过夜，恢复全部体力。',tea_table:'消耗一份净水，喝茶回温和回体力。',latte_climber:'给拿铁留一块安心休息的高台。',
 water_purifier:'把冰晶碎块融成净水。',wall_lamp:'挂在挡风墙上，提供暖光与舒适度。',
 heat_pipe:'铺在甲板上，不占位。从主炉沿相邻管道传热。',insulated_floor:'覆在木甲板或铁甲板上保温，不影响行走。',repair_station:'手持修理锤，可按建筑修补或一次修复全船。',
 wind_sail:'增加巡航速度，顺风鼓帆更快。',steam_thruster:'提高巡航推力并抵消逆风阻力。',wind_vane:'减少偏航损耗，扩大新岛搜寻范围。',
 fuel_hopper:'自动给紧邻的主炉或熔炉补燃料。',steam_chute:'将相邻分拣臂与远端容器相连。',
 wind_door:'E 开关，关闭时可封住房间。',frost_airlock:'只为马楠和伙伴打开，离开后自动闭合。',
 frost_turret:'远射自动防御塔，暖区供能时拦截敌袭。',
 fire_oil_turret:'近距火油喷射，可连片驱散冰兽，严寒时须供暖。',
 wood_deck:'扩建可行走的甲板，须连接方舟边缘。',iron_deck:'更耐损的甲板，须连接方舟边缘。',torch_post:'近处小型热源。',
 wind_wall:'挡住一部分寒风，减缓热量流失。',warm_wall:'比木墙更能锁住热量。',buoyancy_core:'增加浮力上限 32 点。',
 heat_relay:'把主炉暖区向远端延伸。',workbench:'研究蓝图并制作工具。',furnace:'把冻铁废件熔成霜铁锭。',
 stove:'将原材料煮成暖食。',catch_net:'放在外缘，拦截从旁经过的漂流物。',sorter_arm:'放在捕捞网栏旁，将捕获物转存到分拣输出。',
 greenhouse:'在暖区种植霜薯等作物，需要 2×2 空甲板。',
 beast_den:'建在暖区，供云兽工作、休眠与恢复（2×2）。',feed_trough:'添加云兽饲料，给家园里的伙伴补充饥饿。',
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
 let activeStation:string|null=null,catalogKey='',stationKey='',liftKey='',routeKey='',repairKey='';
 const buttons=new Map<BuildKind,HTMLButtonElement>();
 const itemIcon=(id:string)=>cb.icon(id.replaceAll('_','-'))??cb.icon(materialIcons[id]??'');
 const lateBlueprints=new Set<string>(['beast_den','feed_trough','frost_turret','fire_oil_turret','ice_barricade','ward_searchlight','oil_mortar','auto_repairer','wind_door','frost_airlock','fuel_hopper','steam_chute','wind_sail','steam_thruster','wind_vane','heat_pipe','insulated_floor','repair_station','warm_cot','tea_table','latte_climber','water_purifier','wall_lamp','incubator']);
 const categoryGroup=(kind:BuildKind)=>el(['workbench','furnace','stove','catch_net','sorter_arm','greenhouse','beast_den','feed_trough','fuel_hopper','steam_chute','repair_station','water_purifier','fishing_spot','incubator'].includes(kind)?'catalog-industry':'catalog-structure');
 for(const kind of buildKinds){
  const def=buildDefinitions[kind],[gw,gh]=def.size;
  const lift=def.buoyancyDelta>0?`+${def.buoyancyDelta} 浮力`:def.buoyancyDelta<0?`占用 ${-def.buoyancyDelta} 浮力`:'不占浮力';
  const b=button('','',()=>cb.select(kind));b.dataset.buildKind=kind;b.setAttribute('aria-label',def.name);
  const src=cb.icon(buildIcons[kind]??kind.replaceAll('_','-'));
  if(src)b.append(image(src));
  const label=document.createElement('span'),cap=document.createElement('small');label.textContent=def.name;
  cap.textContent=`${gw}×${gh} · ${lift}`;label.append(cap);b.append(label);
  if(!lateBlueprints.has(kind))categoryGroup(kind).append(b);
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
   if(lateBlueprints.has(kind)){if(locked)b.remove();else if(!b.isConnected)categoryGroup(kind).append(b);}
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
  const {id,defId,recipes,job,output,intake,efficiency,status,logistics,fuel,repair,home}=info;
  el('home-panel').hidden=!home;
  const homeButton=el<HTMLButtonElement>('home-action');
  if(home){
    homeButton.disabled=!!home.issue;homeButton.dataset.action=home.action;
    text(homeButton,home.action==='sleep'?'睡到天亮':'喝一杯热茶');
    text(el('home-status'),home.issue??('暖室舒适 Lv.'+home.level));
  }
  el('repair-panel').hidden=!repair;
  if(repair){
    const key=JSON.stringify([id,repair]);
    if(repairKey!==key){
      repairKey=key;
      text(el('repair-summary'),!repair.hammer?'需先在木工台制作修理锤':repair.targets.length?
        '全船材料：'+itemList(repair.inputs):'方舟暂无受损设施');
      el<HTMLButtonElement>('repair-all').disabled=!repair.hammer||!repair.targets.length;
      el('repair-targets').replaceChildren(...repair.targets.map(t=>{
        const li=document.createElement('li'),name=document.createElement('span');
        name.textContent=`${t.name} (${t.gx},${t.gy}) · 缺 ${t.missing}`;
        const action=button('修这台',itemList(t.inputs),()=>{
          cb.message(treatDamage(cb.state(),id,t.id),'已修好'+t.name+'。','craft');updateStation();
        });
        action.disabled=!repair.hammer;action.setAttribute('aria-label','修复 '+t.name);
        li.append(name,action);return li;
      }));
    }
  }
  const route=el<HTMLSelectElement>('logistics-route'),displays=logistics!==null;
  el('logistics-panel').hidden=!displays;
  el('hopper-buttons').hidden=defId!=='fuel_hopper';
  el('logistics-route-label').hidden=defId!=='sorter_arm'&&defId!=='steam_chute';
  if(logistics){
    const {mode,options,stats}=logistics,key=JSON.stringify([id,mode,options]);
    if(routeKey!==key){
      routeKey=key;
      const opts=[['buffer','保留在设备内'],['auto','自动对接'],...options.map(a=>[a.id,`${a.name} (${a.gx},${a.gy}) · ${a.hops} 段`])];
      if(!opts.some(v=>v[0]===mode))opts.push([mode,'连接已断开']);
      route.replaceChildren(...opts.map(([v,n])=>{const o=document.createElement('option');o.value=v;o.textContent=n;return o;}));
      route.value=mode;
    }
    text(el('logistics-line'),defId==='fuel_hopper'?'已供炉 '+((stats?.hearthRefills??0)+(stats?.furnaceRefills??0))+' 次':defId==='furnace'?
      '自动燃料 '+Math.ceil(fuel):options.length+' 个可达设备 · 已传 '+(stats?.delivered??0)+' 件');
  }
  station.dataset.buildingId=id;station.dataset.defId=defId;el('bench-research').hidden=defId!=='workbench';
  text(el('industry-title'),info.name);text(el('industry-status'),`${status} · 效率 ${Math.round(efficiency*100)}%`);
  const progress=el<HTMLProgressElement>('industry-progress');el('industry-job').hidden=!job;
  if(job){
   const recipe=recipes.find(r=>r.id===job.recipeId);
   text(el('industry-job-label'),`${recipe?name(recipe.output.itemId):'正在加工'} · ${Math.max(0,job.duration-job.progress).toFixed(1)} 秒`);
   progress.max=job.duration;progress.value=job.progress;
  }
  const key=JSON.stringify([id,recipes,!!job,output,intake]);if(key===stationKey)return;stationKey=key;
  el('industry-intake-section').hidden=!intake.length&&defId!=='catch_net'&&defId!=='fuel_hopper';
  el('industry-intake').replaceChildren(...stackRows(intake,'网内暂空'));
  el('industry-output').replaceChildren(...stackRows(output,'暂无产出'));
  collect.textContent=defId==='catch_net'?'收取网内物资':defId==='fuel_hopper'?'取回库存燃料':'收取产出';collect.disabled=!(output.length||intake.length);
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
 el<HTMLSelectElement>('logistics-route').onchange=e=>{
  if(activeStation){cb.message(changeRoute(cb.state(),activeStation,(e.currentTarget as HTMLSelectElement).value),'输送目标已更新。');updateStation();}
 };
 for(const [button,id] of [['hopper-wood','driftwood'],['hopper-coal','coal_chunk']]){
  el(button).onclick=()=>{if(activeStation){cb.message(addFuelToHopper(cb.state(),activeStation,id),'燃料已装入料斗。');updateStation();}};
 }
 el('home-action').onclick=e=>{
   const mode=(e.currentTarget as HTMLButtonElement).dataset.action;
   if(activeStation&&(mode==='sleep'||mode==='tea')){
     cb.message(actInHome(cb.state(),activeStation,mode),mode==='sleep'?'睡到清晨，体力已回满。':'热茶暖身，恢复体力。','craft');updateStation();
   }
 };
 el('repair-all').onclick=()=>{if(activeStation){cb.message(treatDamage(cb.state(),activeStation),'已修复全船。','craft');updateStation();}};
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
