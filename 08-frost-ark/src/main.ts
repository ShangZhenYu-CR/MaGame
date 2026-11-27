import { voyageBiome } from './sim/expansion';
import { couldMoorTrader } from './sim/sky-events';
import { skyEventsUi } from './ui/sky-events-ui';
import { activeCave,caveMelee } from './sim/cave';
import { cancelFishing,FISH_CHEST,fishingAction,fishingPanel,nearFishing,openFishChest,stepFishing } from './sim/forage';
import './ui/ark.css';
import './ui/finale.css';
import { finaleUi } from './ui/finale-ui';
import { ArkView, type Ghost } from './render/ark-view';
import { build, buildCosts, buildDefinitions, buildingAt, buildIssue, countItem, craftTorch, itemNames, type BuildKind } from './sim/ark';
import { aim, cancelCharge, fire, grappleRange, startCharge } from './sim/cloud';
import { craftGrapple, equippedGrapple, FROST_GRAPPLE, grappleRecipes, isGrappleItem } from './sim/grapple-tools';
import { deserializeWorld, serializeWorld } from './sim/save';
import { nearestStorage, storageContents, STORAGE_SLOTS, transferStorage } from './sim/storage-box';
import { addFuel, FUEL_MAX, HEARTH_NAMES, HEARTH_UPGRADE, PRESSURE_HEARTH_UPGRADE, heatAt, partOfDay, primaryHearth, upgradeHearth } from './sim/heatField';
import { dropSupply, isDeckDrop, manuallyRecover } from './sim/latte';
import { TICK_RATE, type WorldState } from './sim/types';
import { incapacitated, RESCUE_TICKS, rescueShield } from './sim/rescue';
import { eatMeal, isMeal, mealRemaining, quickMeal, type MealId } from './sim/food';
import { createInitialWorld, stepWorld } from './sim/world';
import { openArchive, savedWorld, storeWorld } from './ui/storage';
import { createIndustryUi, itemList } from './ui/industry';
import { dismantle, dismantleIssue, industryDistance, industryPanel, nearestIndustry } from './sim/industry';
import { audio } from './audio/synth';
import { navigationUi } from './ui/navigation';
import { expeditionUi } from './ui/expedition';
import { expeditionToolsUi } from './ui/expedition-tools';
import biomes from './data/biomes.json';
import { nearestBeastFacility, nearestWildBeast } from './sim/beasts';
import { nearestIslandNode } from './sim/island';
import { beastUi } from './ui/beasts';
import { equipmentUi } from './ui/equipment';
import { weaponsUi } from './ui/weapons';
import { chooseWeapon, selectedWeapon, triggerWeapon, weaponHover, weaponById } from './sim/weapons';
import { setupHeatRadar } from './ui/heat-radar';
import { helmPoint } from './sim/sky-map';
import { roomComfort } from './sim/home';
import { utilityAt } from './sim/utilities';
import { logisticsStats } from './sim/logistics';
import { doorCenter,doorOpen,indoorsAt,nearestManualDoor,operateWindDoor } from './sim/rooms';
import { gearModifiers } from './sim/equipment';
import { heldTool,holdTool } from './sim/hotbar';
import { setupHotbar,type Command } from './ui/hotbar';
import { takeJuice } from './sim/juice';
import { rollGuard,rolling,startRoll } from './sim/roll';
import { combatM5Ui } from './ui/combat-m5';

function el<T extends HTMLElement = HTMLElement>(id: string): T { return document.getElementById(id)! as T; }
const canvas=el<HTMLCanvasElement>('game-canvas'), view=new ArkView(canvas);
const portrait=el<HTMLImageElement>('manan-portrait');
const portraits=[0,1,2,3].map(n=>`../assets/character/head-${n}.png`);
portrait.src=portraits[0];
let mood=0;
const thermal=el('thermal-stats'), briefing=el('weather-status'), catStatus=el('latte-status');
const stats=el('hud-stats'), hint=el('hint'), action=el('action'), save=el('save-label'), note=el('build-note');
const meter=el('meter'), bar=el('charge-bar'), panel=el('inventory'), input=el<HTMLInputElement>('save-file');
const keys=new Set<string>();
const locker=el('storage-panel');
const shakeOption=el<HTMLInputElement>('critical-shake');
const shakePref='frost-ark-critical-shake';
shakeOption.checked=!matchMedia('(prefers-reduced-motion: reduce)').matches;
try{const stored=localStorage.getItem(shakePref);if(stored!==null)shakeOption.checked=stored==='1';}catch{}
shakeOption.onchange=()=>{
  if(!shakeOption.checked)view.juice.stopShake();
  try{localStorage.setItem(shakePref,shakeOption.checked?'1':'0');}catch{}
};
function collectJuice(now:number):void{
  const events=takeJuice(w);
  if(!events.length)return;
  view.juice.push(events,now,shakeOption.checked);
  const sound=events.find(e=>e.type==='wood'||e.type==='ore'||e.type==='hit'||e.type==='hurt');
  if(sound)audio.play(sound.type==='wood'||sound.type==='ore'?sound.type:'impact');
}
let lockerSignature='';
type Mode = 'hook' | 'weapon' | 'tool' | 'dismantle' | BuildKind;
const controls: Partial<Record<Mode,HTMLElement>>={ hook:el('hook'),wood_deck:el('build-deck'),torch_post:el('build-torch'),wind_wall:el('build-wall'),dismantle:el('dismantle-mode') };
let mode: Mode='hook', w: WorldState=createInitialWorld(), pointer:{x:number;y:number}|null=null;
let db: IDBDatabase|null=null, active=false, saveQueue=Promise.resolve();
let messageUntil=0, caught:string|null=null, catchName='', countAtCatch=0, catchLootId='';
let stackSignature='', toolbarSignature='', message='', lastAmbient=0;
const icons=import.meta.glob<string>('./assets/art/icon-*.png',{eager:true,query:'?inline',import:'default'});
const iconPath=(id:string):string|undefined=>icons['./assets/art/icon-'+id+'.png'];
const itemIcons:Record<string,string>={grapple_hook:'hook',driftwood:'driftwood',frost_iron_scrap:'iron',rope:'rope',torch_item:'torch'};
const toolbar=([
  ['hook','hook'],['build-deck','deck'],['build-torch','torch'],['build-wall','wall'],['bag','bag'],
] as const).map(([id,icon])=>{
  const button=el(id), portrait=button.querySelector('img')!;
  const path=iconPath(icon);
  if(path)portrait.src=path;
  return button.querySelector('output')!;
});
const vitals=([
  ['warmth','warmth-value'],['life','life-value'],['fuel','fuel-value'],['hunger','hunger-value'],['stamina','stamina-value'],
] as const).map(([id,value])=>[el<HTMLMeterElement>(id+'-meter'),el(value)] as const);
const localTemperature=el('local-temp');
const industry=createIndustryUi({
  state:()=>w, select:kind=>{industry.showCatalog(false);choose(kind);},
  message:finishAction,icon:iconPath,research:()=>{toggleCatalog(true);el('build-tech-title').scrollIntoView({block:'nearest'});},
});
const chart=navigationUi({state:()=>w,icon:iconPath,close:()=>toggleChart(false),onCommand:finishAction});
const expedition=expeditionUi({state:()=>w,message:finishAction});
const toolUi=expeditionToolsUi({state:()=>w,icon:iconPath,message:finishAction});
const finale=finaleUi({state:()=>w,say:finishAction,sound:x=>audio.play(x),icon:iconPath,
  prepare:()=>{keys.clear();cancelCharge(w);expedition.cancel();chart.hide();closeOtherPanels('catalog');industry.showCatalog(false);}});
const beastSprites=import.meta.glob<string>('./assets/art/beast-*.png',{eager:true,query:'?inline',import:'default'});
const beastArt=(id:string)=>beastSprites['./assets/art/beast-'+id+'.png'];
const beasts=beastUi({state:()=>w,msg:finishAction,icon:iconPath,art:beastArt});
const weaponUi=weaponsUi({state:()=>w,icon:iconPath,activate:activateWeapon,lower:lowerWeapon,toggle:toggleWeapon,changed:()=>fillBag(),say:finishAction});
const gearUi=equipmentUi({state:()=>w,art:iconPath,message:finishAction,change:()=>fillBag()});
const m5Ui=combatM5Ui({state:()=>w,msg:finishAction});
const skyToggle=el('sky-map-toggle');
const helmIcon=iconPath('helm');
if(helmIcon){const img=document.createElement('img');img.alt='';img.src=helmIcon;skyToggle.prepend(img);}
const radar=setupHeatRadar();
const quickbar=setupHotbar({state:()=>w,mode:()=>mode,icon:iconPath,action:runShortcut,changed:()=>{void saveNow();}});
const skyEvents=skyEventsUi({state:()=>w,icon:iconPath,save:()=>{void saveNow();},toast:tell});
const regions=new Map(biomes.map(b=>[b.id,b.name]));

function toggleChart(show=!chart.open()):void{
  if(!show){chart.hide();industry.closeTip();return;}
  if(skyEvents.open())skyEvents.close();
  if(activeCave(w)){tell('先回到地表再打开航图。');return;}
  keys.clear();cancelFishing(w);cancelCharge(w);expedition.cancel();industry.closeTip();chart.show();
}
skyToggle.onclick=()=>toggleChart();
function toggleBeastRoster(show=!beasts.open()):void{
  if(show){closeOtherPanels('beasts');cancelCharge(w);expedition.cancel();keys.clear();}
  beasts.show(show);
}
el('beast-roster-toggle').onclick=()=>toggleBeastRoster();

function triggerFishing():void{
  const result=fishingAction(w);finishAction(result.issue,result.message,result.caught?'hit':'place');
  cancelCharge(w);
}
const fishHud=el('fishing-hud'),fishTrack=el('fishing-track');
const fishUse=el<HTMLButtonElement>('fishing-use'),fishLabel=fishUse.querySelector('span')!;
const bobber=iconPath('fishing-bobber');
if(bobber)el<HTMLImageElement>('fishing-cursor').src=bobber;
const fishHook=iconPath('fishing-hook');
if(fishHook){const img=document.createElement('img');img.alt='';img.src=fishHook;fishUse.prepend(img);}
fishUse.onclick=triggerFishing;
function paintFishing(hide:boolean,selected:boolean):void{
  const event=stepFishing(w);if(event&&!incapacitated(w))tell(event);
  const cast=fishingPanel(w);fishHud.hidden=hide||!(selected||cast);
  fishTrack.hidden=!cast;fishHud.dataset.phase=cast?'cast':'idle';
  const label=cast?'收线':'抛线',detail=cast?'游标进入亮区时按 E 或空格 · Esc 收竿':'停船后抛线，抓准咬钩时机。';
  if(fishLabel.textContent!==label)fishLabel.textContent=label;
  if(el('fishing-detail').textContent!==detail)el('fishing-detail').textContent=detail;
  if(!cast)return;
  fishTrack.style.setProperty('--bite-left',cast.left*100+'%');
  fishTrack.style.setProperty('--bite-width',(cast.right-cast.left)*100+'%');
  fishTrack.style.setProperty('--cast-progress',cast.peek*100+'%');
  fishTrack.dataset.ready=String(cast.peek>=cast.left&&cast.peek<=cast.right);
}

function finishAction(issue:string|null,success:string,event?:'craft'|'undo'|'dismantle'|'place'|'hit'):void{
  tell(issue??success);
  if(issue)return;
  if(event)audio.play(event);
  void saveNow();
}
type PrimaryInteraction={kind:'expedition'|'trader'|'fishing'|'feed'|'storage'|'beasts'|'close-storage'|'close-station'|'close-beasts'|'none'}|
  {kind:'station';id:string;label:string}|{kind:'door';id:string;open:boolean};
function primaryInteraction():PrimaryInteraction{
  if(beasts.open())return {kind:'close-beasts'};
  if(industry.stationOpen())return {kind:'close-station'};
  if(!locker.hidden)return {kind:'close-storage'};
  if(chart.open()||finale.arena()||skyEvents.open())return {kind:'none'};
  const here=expedition.area(),travel=expedition.keyAction();
  if(here==='island'){
    const wild=nearestWildBeast(w);
    if(travel!=='cave-enter'&&wild&&(wild.stunnedTicks>0||wild.hp<=wild.maxHp*.35||(travel!=='landmark'&&travel!=='forage'&&travel!=='quarry'&&!nearestIslandNode(w,1.8))))return {kind:'feed'};
  }
  if(fishingPanel(w))return {kind:'fishing'};
  if(panel.hidden&&!industry.catalogOpen()&&couldMoorTrader(w))return {kind:'trader'};
  if(travel&&travel!=='helm')return {kind:'expedition'};
  if(here!=='ark')return {kind:'none'};
  const door=nearestManualDoor(w),box=nearestStorage(w),station=nearestIndustry(w),animal=nearestBeastFacility(w);
  if(door){
    const {x,y}=doorCenter(door),dist=Math.hypot(x-w.player.x,y-w.player.y);
    const others=[box,station,animal].filter(b=>b!==undefined);
    if(others.every(b=>dist<=Math.hypot(b.gx+.5-w.player.x,b.gy+.5-w.player.y)+.24))
      return {kind:'door',id:door.id,open:doorOpen(door)};
  }
  const fish=panel.hidden&&!industry.catalogOpen()?nearFishing(w):undefined;
  if(fish){
    const distance=Math.hypot(fish.gx+.50-w.player.x,fish.gy+.72-w.player.y);
    if([box,station,animal].filter(v=>v!==undefined).every(v=>distance<=industryDistance(w,v)+.16)&&
      (travel!=='helm'||distance+.12<Math.hypot(helmPoint(w).x-w.player.x,helmPoint(w).y-w.player.y)))return {kind:'fishing'};
  }
  // A relocated helm can share an enclosed room with furniture. Preserve E
  // at the helm itself, but let nearer machinery take priority when the
  // player is standing at its interaction boundary rather than at the wheel.
  if(travel==='helm'){
    const helm=helmPoint(w),dist=Math.hypot(w.player.x-helm.x,w.player.y-helm.y);
    if(!station||dist<=Math.max(.55,industryDistance(w,station)+.28))return {kind:'expedition'};
  }
  if(animal&&(!box||industryDistance(w,animal)<industryDistance(w,box))&&
    (!station||industryDistance(w,animal)<industryDistance(w,station)))return {kind:'beasts'};
  if(station&&(!box||industryDistance(w,station)<industryDistance(w,box)))
    return {kind:'station',id:station.id,label:buildDefinitions[station.defId as BuildKind]?.name??'加工站'};
  return {kind:box?'storage':'none'};
}
function useNearby():void{
  const action=primaryInteraction();
  switch(action.kind){
    case 'close-beasts':toggleBeastRoster(false);break;
    case 'close-station':industry.showStation(null);break;
    case 'close-storage':toggleStorage(false);break;
    case 'feed':beasts.tame();break;
    case 'expedition':expedition.use();break;
    case 'fishing':triggerFishing();break;
    case 'trader':skyEvents.show();break;
    case 'beasts':toggleBeastRoster(true);break;
    case 'door':finishAction(operateWindDoor(w,action.id),action.open?'防风门已关上。':'防风门已打开。');break;
    case 'station':openIndustry(action.id);break;
    case 'storage':toggleStorage(true);break;
  }
}
function openIndustry(id:string):void{
  closeOtherPanels('industry');cancelCharge(w);keys.clear();industry.showStation(id);
}
function closeOtherPanels(except:'bag'|'locker'|'catalog'|'industry'|'beasts'):void{
  cancelFishing(w);skyEvents.close();
  if(except!=='bag')toggleBag(false);
  if(except!=='locker')locker.hidden=true;
  if(except!=='catalog')industry.showCatalog(false);
  if(except!=='industry')industry.showStation(null);
  if(except!=='beasts')beasts.show(false);
}
function toggleCatalog(show=!industry.catalogOpen()):void{
  if(show){closeOtherPanels('catalog');cancelCharge(w);keys.clear();}
  industry.showCatalog(show);
}
function updateMute():void{
  const button=el('audio-toggle'),muted=audio.isMuted();
  button.setAttribute('aria-pressed',String(muted));
  button.lastChild!.textContent=muted?' 音效关':' 音效开';
}
function toggleMute():void{audio.setMuted(!audio.isMuted());updateMute();}
updateMute();
el('audio-toggle').onclick=toggleMute;
el('build-catalog-toggle').onclick=()=>toggleCatalog();

function itemLabel(label:HTMLElement,itemId:string):void {
  const path=toolUi.iconFor(itemId)??iconPath(itemId.replaceAll('_','-'))??iconPath(itemIcons[itemId]??'');
  if(!path)return;
  const icon=document.createElement('img');icon.alt='';icon.src=path;
  label.classList.add('item-name');label.prepend(icon);
}
function setVital(i:number,n:number,max:number):void {
  const [meter,output]=vitals[i];const display=String(Math.ceil(n));
  if(meter.max!==max)meter.max=max;
  if(meter.value!==n)meter.value=n;
  if(output.textContent!==display)output.textContent=display;
}
function updateToolbar():void {
  const signature=JSON.stringify(w.player.inventory);
  if(signature===toolbarSignature)return;
  toolbarSignature=signature;
  const wood=countItem(w,'driftwood');
  const hook=equippedGrapple(w), reinforced=hook===FROST_GRAPPLE;
  const hookButton=el('hook');
  hookButton.querySelector('img')!.src=iconPath(reinforced?'frost-grapple-hook':'hook')!;
  hookButton.querySelector('span')!.textContent=reinforced?'强化抓钩':'抓钩';
  hookButton.setAttribute('aria-label',reinforced?'霜铁强化抓钩':'抓钩');
  hookButton.title=reinforced?'霜铁强化抓钩 · 最远 '+grappleRange(1,true).toFixed(2)+' 格，能抓重型货箱':'云海抓钩 · 最远 '+grappleRange(1)+' 格';
  const count=[hook?1:0,Math.floor(wood/2),countItem(w,'torch_item'),Math.floor(wood/3),w.player.inventory.filter(Boolean).length+'/18'];
  count.forEach((n,i)=>toolbar[i].textContent=String(n));
}

function runShortcut(a:Command,source:'key'|'click'):void{
  if(incapacitated(w)||rolling(w)||chart.open()||finale.blocking()||finale.open()||fishingPanel(w))return;
  // Keep the original click-to-build workflow usable while crafting in
  // the visible bag. Numeric shortcuts remain inactive in all panels.
  if(!panel.hidden&&!(source==='click'&&(a.kind==='building'||a.kind==='hook')))return;
  if(!locker.hidden||industry.stationOpen()||industry.catalogOpen()||beasts.open())return;
  switch(a.kind){
    case 'building':choose(a.id as BuildKind);break;
    case 'hook':choose('hook');break;
    case 'weapon':if(a.ready)activateWeapon(a.id);else tell('背包里没有可用的'+a.name+'。');break;
    case 'meal':if(isMeal(a.id))consumeMeal(a.id);break;
    case 'tool':
      if(holdTool(w,a.id)){choose('tool');tell('手持：'+a.name);void saveNow();}
      else tell('背包里没有可用的'+a.name+'。');
      break;
  }
}
function activateWeapon(id:string):void{
  const issue=chooseWeapon(w,id);
  if(issue){tell(issue);return;}
  toggleBag(false);choose('weapon');tell('已握持：'+itemNames.get(id));void saveNow();
}
function lowerWeapon():void{
  const issue=chooseWeapon(w,null);
  if(issue){tell(issue);return;}
  choose('hook');tell('武器已卸下，可存入储物箱。');fillBag();void saveNow();
}
function toggleWeapon():void{
  if(mode==='weapon'){choose('hook');return;}
  const id=w.player.weapon??w.player.inventory.find(v=>v&&weaponById.has(v.itemId))?.itemId;
  if(id)activateWeapon(id);else tell('先在背包制作武器。');
}

function toast(text:string):void {
  if(text&&action.textContent!==text)action.textContent=text;
  const shown=String(Boolean(text));
  if(action.dataset.shown!==shown)action.dataset.shown=shown;
}
function tell(text:string):void { message=text;messageUntil=performance.now()+2520;toast(text); }
function choose(next:Mode):void {
  cancelCharge(w);
  mode=next;
  for(const [k,b] of Object.entries(controls)) b?.setAttribute('aria-pressed',String(k===mode));
  canvas.dataset.mode=mode;industry.closeTip();
}
function toggleBag(show=panel.hidden):void {
  if(show)closeOtherPanels('bag');
  panel.hidden=!show;el('bag').setAttribute('aria-expanded',String(show));
  if(show){ cancelCharge(w); fillBag(); }else quickbar.closeEditor();
}
function toggleStorage(show=locker.hidden):void {
  if(show&&!nearbyStorage()){tell('走到甲板上的储物箱旁，再按 E。');return;}
  if(show){closeOtherPanels('locker');cancelCharge(w);keys.clear();fillLocker();}
  locker.hidden=!show;
}
function nearbyStorage():boolean { return !!nearestStorage(w); }
function fillLocker():void {
  const stash=storageContents(w);
  const signature=JSON.stringify([stash,w.player.inventory]);
  if(signature===lockerSignature)return;
  lockerSignature=signature;
  el('storage-count').textContent=stash.length+'/'+STORAGE_SLOTS;
  const drawList=(target:string, entries:Iterable<[string,number]>, direction:'deposit'|'withdraw')=>{
    const nodes=Array.from(entries,([itemId,count])=>{
      const li=document.createElement('li'),label=document.createElement('span'),button=document.createElement('button');
      const name=itemNames.get(itemId)??itemId;
      label.textContent=name+' ×'+count;label.className='numbers';itemLabel(label,itemId);
      button.type='button';button.textContent=direction==='deposit'?'存入 1':'取出 1';
      button.setAttribute('aria-label',(direction==='deposit'?'存入 ':'取出 ')+name);
      button.onclick=()=>{
        const issue=transferStorage(w,itemId,direction);
        tell(issue??(direction==='deposit'?'已存入：':'已取回：')+name+' ×1');
        if(!issue){fillLocker();void saveNow();}
      };
      li.append(label,button);
      return li;
    });
    if(nodes.length===0){
      const empty=document.createElement('li');empty.textContent=direction==='withdraw'?'箱内空着':'没有可存物品';nodes.push(empty);
    }
    el(target).replaceChildren(...nodes);
  };
  const carried=new Map<string,number>();
  for(const s of w.player.inventory)if(s&&!isGrappleItem(s.itemId))carried.set(s.itemId,(carried.get(s.itemId)??0)+s.count);
  drawList('storage-stacks',stash.map(s=>[s.itemId,s.count]),'withdraw');
  drawList('storage-deposit',carried,'deposit');
}
function fillBag():void {
  const signature=JSON.stringify([w.player.inventory,w.player.diet.quick,w.player.gear,w.player.weapon]);
  if(signature===stackSignature)return;
  stackSignature=signature;
  const entries=w.player.inventory.filter(s=>s!==null).map(s=>{
    const li=document.createElement('li'), name=document.createElement('span'), count=document.createElement('strong');
    quickbar.drag(li,s.itemId);
    name.textContent=itemNames.get(s.itemId) ?? s.itemId;count.textContent='×'+s.count;count.className='numbers';itemLabel(name,s.itemId);
    li.append(name,count);
    if(isMeal(s.itemId)){
      const id=s.itemId,actions=document.createElement('div'),eat=document.createElement('button'),pin=document.createElement('button');
      actions.className='meal-actions';eat.type=pin.type='button';
      eat.textContent='食用';eat.dataset.eatMeal=id;eat.setAttribute('aria-label','食用'+itemNames.get(id));
      eat.onclick=()=>consumeMeal(id);
      pin.textContent=w.player.diet.quick===id?'H 已设':'设为 H';
      pin.setAttribute('aria-pressed',String(w.player.diet.quick===id));
      pin.setAttribute('aria-label','设为快捷食物：'+itemNames.get(id));
      pin.onclick=()=>{w.player.diet.quick=id;fillBag();void saveNow();};
      actions.append(eat,pin);li.append(actions);
    }else if(s.itemId===FISH_CHEST){
      const open=document.createElement('button');open.type='button';open.textContent='开宝匣';
      open.dataset.fishTreasure='true';open.setAttribute('aria-label','打开稀有漂流宝匣');
      open.onclick=()=>{finishAction(openFishChest(w),'打开宝匣，获得冻铁、缆绳与冰晶。','craft');fillBag();};li.append(open);
    }
    return li;
  });
  el('stacks').replaceChildren(...entries);
  const hook=equippedGrapple(w);
  el<HTMLButtonElement>('craft-grapple').disabled=!!hook;
  el<HTMLButtonElement>('craft-frost-grapple').disabled=hook!== 'grapple_hook';
  gearUi.update();weaponUi.update();
}
const foodShortcut=el<HTMLButtonElement>('quick-meal'),buff=el('meal-buff');
const buffBar=el('status-buffs');
const buffs=[...buffBar.querySelectorAll<HTMLElement>('[data-buff]')];
['warm-wind-coat','solar-ark','pocket-hand-warmer'].forEach((id,i)=>buffs[i].querySelector('img')!.src=iconPath(id)!);
buffs[0].title='防寒装备减缓失温';
buffs[1].title='救援苏醒后的短暂免伤';
buffs[2].title='暖区内能快速回温';
function paintBuffHud(local:number,shield:number):void{
  const comfort=roomComfort(w);
  const active=[gearModifiers(w).cold>0,shield>0,(comfort>0||local>=15)&&!incapacitated(w)];
  const label=buffs[2].querySelector('span')!,tag=comfort?'舒适 Lv.'+comfort:'舒适';
  if(label.textContent!==tag)label.textContent=tag;
  buffs.forEach((b,i)=>{if(b.hidden===active[i])b.hidden=!active[i];});
  const hide=active.every(s=>!s);if(buffBar.hidden!==hide)buffBar.hidden=hide;
  if(shield){
    const t=Math.ceil(shield/TICK_RATE)+'s',node=buffs[1].querySelector('output')!;
    if(node.textContent!==t)node.textContent=t;
  }
}
let shownMeal:MealId|null=null, shownMealCount=-1, shownBuff:MealId|null=null;
function consumeMeal(id=quickMeal(w)):void{
  if(!id){tell('背包里没有可食用的熟食。');return;}
  const issue=eatMeal(w,id);
  finishAction(issue,'吃下了'+itemNames.get(id)+'，回饱、回温、回血。','craft');
  if(!panel.hidden)fillBag();
}
foodShortcut.onclick=()=>consumeMeal();
function updateFoodHud():void{
  const id=quickMeal(w),amount=id?countItem(w,id):0;
  if(id!==shownMeal||amount!==shownMealCount){
    shownMeal=id;shownMealCount=amount;foodShortcut.hidden=!id;
    if(id){
      foodShortcut.querySelector('img')!.src=iconPath(id.replaceAll('_','-'))!;
      foodShortcut.querySelector('span')!.textContent=itemNames.get(id)!;
      foodShortcut.querySelector('output')!.textContent='×'+amount;
      foodShortcut.setAttribute('aria-label','快捷食用'+itemNames.get(id));
    }
  }
  const seconds=Math.ceil(mealRemaining(w)/TICK_RATE),last=w.player.diet.last;
  buff.hidden=!seconds;
  if(seconds&&last){
    if(last!==shownBuff){shownBuff=last;buff.querySelector('img')!.src=iconPath(last.replaceAll('_','-'))!;}
    const output=buff.querySelector('output')!,value=seconds+' 秒';
    if(output.textContent!==value)output.textContent=value;
  }
}
function saveNow():Promise<void> {
  if(!db || !active) return Promise.resolve();
  const archive=db, snapshot=structuredClone(w);
  saveQueue=saveQueue.then(()=>storeWorld(archive,snapshot)).then(()=>{
    if(save.dataset.error==='true') delete save.dataset.error;
    save.textContent='本地自动存档 · 已保存'; save.dataset.saved='true';
  },()=>{
    save.textContent='存档写入失败 · 可导出 JSON';save.dataset.error='true';delete save.dataset.saved;
  });
  return saveQueue;
}
function safeWorld(next:WorldState):void {
  finale.reset();view.juice.reset();cancelFishing(w);skyEvents.close();
  expedition.cancel();chart.hide(false);beasts.show(false);w=next;toggleStorage(false);industry.showStation(null);industry.showCatalog(false);lockerSignature='';cancelCharge(w);
  caught=null;keys.clear();messageUntil=0;message='';stackSignature='';
  if(mode==='weapon'&&!w.player.weapon||mode==='tool'&&!heldTool(w))choose('hook');
  view.position(w);fillBag();
}
function ghostAt(): Ghost|null {
  if(mode==='hook'||mode==='weapon'||mode==='tool'||!pointer||expedition.area()!=='ark')return null;
  const at=view.world(pointer.x,pointer.y), x=Math.floor(at.x), y=Math.floor(at.y);
  const targeted=mode==='dismantle'?(utilityAt(w,x,y,'wall_lamp')??buildingAt(w,x,y)??utilityAt(w,x,y)):null;
  const issue=mode==='dismantle'?dismantleIssue(w,x,y):buildIssue(w,mode,x,y);
  const defId=mode==='dismantle'?(targeted?.defId??'wood_deck'):mode;
  const label=issue??(mode==='wood_deck'?'吸附就绪 · 浮木板 ×2':mode==='torch_post'?'放置就绪 · 防风火把 ×1':
    mode==='wind_wall'?'挡风墙 · 浮木板 ×3':mode==='dismantle'?'点击拆除 · 4 秒内可撤销':
    `${buildDefinitions[mode].name} · ${itemList(buildCosts[mode])}`);
  note.hidden=false;if(note.textContent!==label)note.textContent=label;
  const valid=String(!issue);if(note.dataset.valid!==valid)note.dataset.valid=valid;
  return {x:targeted?.gx??x,y:targeted?.gy??y,ok:!issue&&mode!=='dismantle',defId};
}
for(const [k,b] of Object.entries(controls))b?.addEventListener('click',()=>{
  if(b.hasAttribute('data-quick-slot'))return;
  if(industry.catalogOpen())toggleCatalog(false);
  choose(k===mode&&k==='dismantle'?'hook':k as Mode);
});

function warmthAction(kind:'fuel'|'upgrade'|'drop'|'pickup'):void {
  const reason=kind==='fuel'?addFuel(w):kind==='upgrade'?upgradeHearth(w):
    kind==='drop'?(dropSupply(w)?null:'背包里没有浮木板。'):(manuallyRecover(w)?null:'附近没有可捡的掉落物。');
  const result={fuel:'已给余烬主炉添柴。',upgrade:primaryHearth(w)?.level===3?'硫磺高压炉升阶完成：暖圈扩大，浮力 +24。':'主炉升至 Lv.2，拿铁会捡拾暖区的掉落物。',drop:'放下了浮木板 ×1，可按 F 拾回。',pickup:'已捡回地上的物品。'};
  tell(reason??result[kind]);if(!reason)void saveNow();
}
el('fuel-hearth').onclick=()=>warmthAction('fuel');
el('upgrade-hearth').onclick=()=>warmthAction('upgrade');
el('bag').onclick=()=>toggleBag();
el('close').onclick=()=>toggleBag(false);
el('storage-close').onclick=()=>toggleStorage(false);
el('craft-torch').onclick=()=>{
  if(craftTorch(w))finishAction(null,'手制完成：防风火把 ×2','craft');
  else tell('材料不足，或背包没有空位。');
  fillBag();
};
el('grapple-basic-cost').textContent=itemList(grappleRecipes[0].inputs);
el('grapple-frost-cost').textContent=itemList(grappleRecipes[1].inputs);
for(const [id,tier] of [['craft-grapple',1],['craft-frost-grapple',2]] as const){
  el(id).onclick=()=>{
    finishAction(craftGrapple(w,tier),tier===1?'手制完成：云海抓钩。':'抓钩已强化：更远、更快，可抓重型货箱。','craft');
    fillBag();
  };
}
el('export').onclick=()=>{
  const url=URL.createObjectURL(new Blob([serializeWorld(w)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='frost-ark-save.json';a.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),1500);
};
el('import').onclick=()=>input.click();
input.onchange=async()=>{
  const file=input.files?.[0];
  input.value='';
  if(!file)return;
  try{
    if(file.size>2_000_000)throw new Error('文件大于 2 MB');
    const next=deserializeWorld(await file.text());
    safeWorld(next);tell('已载入 JSON 存档。');await saveNow();
  }catch(e){tell('导入失败：'+(e instanceof Error?e.message:'文件无法读取'));}
};
addEventListener('resize',()=>view.resize(w));
addEventListener('blur',()=>{keys.clear();cancelFishing(w);cancelCharge(w);expedition.cancel();});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){ keys.clear();cancelCharge(w);void saveNow(); }
});
addEventListener('pointerdown',()=>audio.unlock());
document.addEventListener('click',e=>{if(incapacitated(w)){e.preventDefault();e.stopImmediatePropagation();}},true);
addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(e.ctrlKey||e.metaKey||e.altKey||e.target===input)return;
  if((e.target instanceof HTMLSelectElement||e.target instanceof HTMLInputElement&&e.target.type==='text')&&k!=='escape')return;
  if(finale.blocking()||incapacitated(w))return;
  if(skyEvents.open()){
    if(!e.repeat&&k==='escape'){e.preventDefault();skyEvents.close();}
    else if(!e.repeat&&k==='m')toggleMute();
    return;
  }
  if(finale.open()){
    if(!e.repeat&&(k==='j'||k==='escape')){e.preventDefault();finale.showCodex(false);}
    if(!e.repeat&&k==='m')toggleMute();
    return;
  }
  if(!chart.open()&&k==='j'&&!e.repeat){e.preventDefault();finale.toggle();return;}
  if(!rolling(w)&&!chart.open()&&k==='f'&&!e.repeat&&finale.strikeWhale()){e.preventDefault();return;}
  audio.unlock();
  if(chart.open()){
    if(!e.repeat&&(k==='escape'||k==='n')){e.preventDefault();toggleChart(false);}
    else if(!e.repeat&&k==='m')toggleMute();
    return;
  }
  if(fishingPanel(w)&&!e.repeat&&(k==='e'||k==='escape'||e.code==='Space')){
    e.preventDefault();
    if(k==='escape'){cancelFishing(w);tell('鱼线已收回。');}
    else triggerFishing();
    return;
  }
  if(e.code==='Space'&&panel.hidden&&locker.hidden&&!industry.catalogOpen()&&!industry.stationOpen()&&!beasts.open()){
    e.preventDefault();
    if(e.repeat)return;
    const issue=startRoll(w,{x:Number(keys.has('d'))-Number(keys.has('a')),y:Number(keys.has('s'))-Number(keys.has('w'))});
    if(issue)tell(issue);else {expedition.cancel();void saveNow();}
    return;
  }
  if('wasd'.split('').includes(k)){keys.add(k);e.preventDefault();return;}
  if(e.repeat)return;
  if(k==='escape'){
    expedition.cancel();industry.closeTip();
    if(beasts.open()){if(!beasts.closeRename())toggleBeastRoster(false);}
    else if(industry.stationOpen())industry.showStation(null);
    else if(industry.catalogOpen())toggleCatalog(false);
    else if(!locker.hidden)toggleStorage(false);
    else if(!panel.hidden){if(!quickbar.closeEditor())toggleBag(false);}
    else if(mode!=='hook')choose('hook');
    else cancelCharge(w);
  } else if(k==='e')useNearby();
  else if(k==='n'){e.preventDefault();toggleChart();}
  else if(k==='b')toggleCatalog();
  else if(k==='v')toggleBeastRoster();
  else if(k==='y')radar.toggle();
  else if(k==='x'){toggleCatalog(false);choose(mode==='dismantle'?'hook':'dismantle');}
  else if(k==='z')industry.undoAction();
  else if(k==='m')toggleMute();
  else if(k==='q')choose('hook');
  else if(k==='t')toggleWeapon();
  else if(/^[1-9]$/.test(k)){e.preventDefault();quickbar.run(Number(k)-1);}
  else if(k==='r')warmthAction('fuel');
  else if(k==='u')warmthAction('upgrade');
  else if(k==='g')warmthAction('drop');
  else if(k==='h'){e.preventDefault();consumeMeal();}
  else if(k==='f'&&!rolling(w)){
    if(activeCave(w)){
      if(panel.hidden&&locker.hidden&&!industry.stationOpen()&&!industry.catalogOpen()&&!beasts.open())
        finishAction(caveMelee(w),'击中冰窟守卫。','hit');
    }else if(!m5Ui.strike())warmthAction('pickup');
  }
  else if(k==='i'){ e.preventDefault();toggleBag(); }
});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
canvas.addEventListener('pointermove',e=>{
  pointer={x:e.clientX,y:e.clientY};
  aim(w,view.world(e.clientX,e.clientY));
});
canvas.addEventListener('pointerleave',()=>{pointer=null;});
canvas.addEventListener('pointerdown',e=>{
  if(!active||incapacitated(w)||rolling(w)||skyEvents.open()||e.button!==0||fishingPanel(w)||chart.open()||finale.open()||finale.blocking())return;
  pointer={x:e.clientX,y:e.clientY};
  const at=view.world(e.clientX,e.clientY);
  const x=Math.floor(at.x),y=Math.floor(at.y);
  if(mode==='weapon'){
    const issue=triggerWeapon(w,at);
    if(issue)tell(issue);else{audio.play('hit');void saveNow();}
    return;
  }
  if((mode==='hook'||mode==='tool'||expedition.area()!=='ark')&&expedition.pointer(at))return;
  if(mode==='tool')return;
  if(mode==='hook'){
    const hit=buildingAt(w,x,y);
    if(hit&&hit.id===nearestStorage(w)?.id){toggleStorage();return;}
    if(hit&&industryPanel(w,hit.id)){openIndustry(hit.id);return;}
    if(hit&&['beast_den','feed_trough'].includes(hit.defId)&&industryDistance(w,hit)<=1.4){toggleBeastRoster(true);return;}
    if(startCharge(w,at))canvas.setPointerCapture(e.pointerId);
  } else if(mode==='dismantle'){
    finishAction(dismantle(w,x,y),'已拆除。可在 4 秒内撤销。','dismantle');
  } else {
    const kind=mode, issue=buildIssue(w,kind,x,y);
    if(!issue&&build(w,kind,x,y)){
      const text=kind==='wood_deck'?'甲板已拼接，可以走上去。':kind==='torch_post'?'防风火把已点亮。':
        kind==='wind_wall'?'挡风墙已放好，附近热量散得更慢。':`${buildDefinitions[kind].name}已放好。`;
      finishAction(null,text,'place');
    } else tell(issue??'这里不能施工。');
  }
});
canvas.addEventListener('pointerup',e=>{
  if(e.button!==0)return;
  const charged=w.player.grapple.charging;aim(w,view.world(e.clientX,e.clientY));fire(w);if(charged)audio.play('hook');
});
canvas.addEventListener('pointercancel',()=>cancelCharge(w));
canvas.addEventListener('contextmenu',e=>e.preventDefault());

function simulation():void {
  const g=w.player.grapple;
  const pending=w.latte.autoLootUnlocked&&w.sky.debris.filter(isDeckDrop).length;
  const wasDown=incapacitated(w);
  if(mode==='weapon'&&!w.player.weapon)choose('hook');
  stepWorld(w,1,{x:Number(keys.has('d'))-Number(keys.has('a')),y:Number(keys.has('s'))-Number(keys.has('w'))});
  if(!wasDown&&incapacitated(w)){
    keys.clear();expedition.cancel();chart.hide(false);beasts.show(false);skyEvents.close();
    toggleStorage(false);toggleBag(false);industry.showStation(null);industry.showCatalog(false);
    caught=null;messageUntil=0;void saveNow();
  }else if(wasDown&&!incapacitated(w)){
    keys.clear();tell('已在主炉边苏醒，获得 10 秒复苏护盾。');void saveNow();
  }
  if(caught!==g.caughtDebrisId){
    if(g.caughtDebrisId){
      audio.play('hit');
      const loot=w.sky.debris.find(d=>d.id===g.caughtDebrisId)?.loot[0];
      catchLootId=loot?.itemId??'';catchName=itemNames.get(catchLootId)??'残骸';
      countAtCatch=w.player.inventory.reduce((n,s)=>n+(s?.itemId===catchLootId?s.count:0),0);
    }else if(caught){
      const total=w.player.inventory.reduce((n,s)=>n+(s?.itemId===catchLootId?s.count:0),0);
      tell(total>countAtCatch?'已回收入包：'+catchName+' ×'+(total-countAtCatch):'背包没有空位，残骸已放在甲板上。');
      void saveNow();
    }
    caught=g.caughtDebrisId;
  }
  if(pending&&w.sky.debris.filter(isDeckDrop).length<pending){tell('拿铁捡回了暖区掉落物。');void saveNow();}
  if(!locker.hidden&&!nearbyStorage())toggleStorage(false);
  if(industry.stationOpen()){
    const selected=w.ark.buildings.find(b=>b.id===industry.stationId());
    if(!selected||industryDistance(w,selected)>1.35)industry.showStation(null);
  }
  if(w.tick%90===0)void saveNow();
}
function frame(now:number):void {
  collectJuice(now);
  elapsed+=Math.min(100,Math.max(0,now-Math.max(last,view.juice.freezeUntil)));last=now;
  while(now>=view.juice.freezeUntil&&elapsed>=1000/TICK_RATE){
    if(active)simulation();
    elapsed-=1000/TICK_RATE;
    collectJuice(now);
  }
  if(canvas.dataset.hitstop!==String(now<view.juice.freezeUntil))canvas.dataset.hitstop=String(now<view.juice.freezeUntil);
  const down=incapacitated(w), shield=rescueShield(w), rescue=el('rescue-status');
  rescue.hidden=!down&&!shield;
  rescue.dataset.phase=down?'down':'shield';
  canvas.dataset.playerState=down?'down':shield?'shield':'awake';
  const rollPhase=rolling(w)?rollGuard(w)?'guard':'recover':'ready';
  if(canvas.dataset.roll!==rollPhase)canvas.dataset.roll=rollPhase;
  if(!rescue.hidden){
    const at=w.player.rescue.startedAt??w.tick;
    const title=down?'马楠失去意识':'复苏护盾';
    const detail=down?(expedition.area()==='ark'?'拿铁正在拖你回炉边':'主炉启动应急拖回')+
      ' · '+Math.max(1,Math.ceil((RESCUE_TICKS-w.tick+at)/TICK_RATE))+' 秒':
      Math.ceil(shield/TICK_RATE)+' 秒 · 暂时免受伤害';
    if(el('rescue-title').textContent!==title)el('rescue-title').textContent=title;
    if(el('rescue-description').textContent!==detail)el('rescue-description').textContent=detail;
  }
  const g=w.player.grapple;
  const nextStats=`DAY ${w.day}　${w.ambientTemp}°C　浮力 ${w.ark.buoyancyUsed}/${w.ark.buoyancyMax}`;
  if(stats.textContent!==nextStats)stats.textContent=nextStats;
  const h=primaryHearth(w), local=Math.round(heatAt(w,w.player.x,w.player.y));
  if(now-lastAmbient>=180){
    lastAmbient=now;
    audio.update({wind:w.weather==='whiteout'?.96:w.weather==='snow'?.72:.19,
      fire:h&&h.fuel>0?Math.min(1,Math.max(0,(local+8)/44)):0});
  }
  industry.update();chart.paint(false,now);
  const overlay=down||skyEvents.open()||chart.open()||!panel.hidden||!locker.hidden||industry.stationOpen()||industry.catalogOpen()||beasts.open();
  radar.update(w,!overlay&&!w.activeIsland&&!finale.open()&&!finale.blocking());
  const context=primaryInteraction();
  const here=expedition.update(now,overlay||finale.arena()||context.kind==='fishing'||context.kind==='trader',context.kind==='expedition');
  const feedKey=el('wild-feed').querySelector('kbd')!;
  feedKey.hidden=context.kind!=='feed';
  beasts.update(now,overlay);m5Ui.update(now,overlay);
  canvas.dataset.primaryInteraction=context.kind;
  paintFishing(overlay||finale.arena(),context.kind==='fishing');
  skyEvents.frame(down||finale.arena(),context.kind==='trader');
  toolUi.update(here);
  finale.update(chart.open()||!panel.hidden||!locker.hidden||industry.stationOpen()||industry.catalogOpen()||finale.open());
  const region=regions.get(voyageBiome(w))??'碎云浅海';
  if(el('sector-name').textContent!==region)el('sector-name').textContent=region;
  setVital(0,w.player.warmth,w.player.maxWarmth);
  setVital(1,w.player.hp,w.player.maxHp);
  setVital(2,h?.fuel??0,FUEL_MAX[Math.min(4,h?.level??0)]||120);
  setVital(3,w.player.hunger,w.player.maxHunger);setVital(4,w.player.roll.stamina,100);updateFoodHud();weaponUi.frame(mode==='weapon');
  const reading=`脚下 ${local}°C`;
  if(localTemperature.textContent!==reading)localTemperature.textContent=reading;
  const flow=logisticsStats(w);
  if(flow||canvas.dataset.logistics){
    const data=flow?JSON.stringify({tick:w.tick-w.tick%30,hearth:Math.round(h?.fuel??0),
      furnace:Math.round(w.ark.buildings.find(b=>b.defId==='furnace')?.fuel??0),...flow}):'';
    if(data!==canvas.dataset.logistics)canvas.dataset.logistics=data;
  }
  updateToolbar();quickbar.frame();paintBuffHud(local,shield);
  const tool=heldTool(w)??'';if(canvas.dataset.heldTool!==tool)canvas.dataset.heldTool=tool;
  thermal.dataset.cold=String(w.player.warmth<=25);
  const phase=w.weather==='whiteout'?'大寒潮':partOfDay(w.timeOfDay);
  const level=h?.level??0, upgrade=el<HTMLButtonElement>('upgrade-hearth');
  const upgradeTitle=level<2?itemList(HEARTH_UPGRADE):level===2?itemList(PRESSURE_HEARTH_UPGRADE):HEARTH_NAMES[level]??'';
  if(upgrade.title!==upgradeTitle)upgrade.title=upgradeTitle;
  const report=`${phase} · 主炉 Lv.${level}${level===3?' 硫磺高压炉':''} · 燃料 ${Math.ceil(h?.fuel??0)}`;
  if(briefing.textContent!==report)briefing.textContent=report;
  const cat=w.latte.mood==='alert'?'拿铁 · 炸毛警戒':w.latte.mood==='hungry_hearth'?'拿铁 · 提醒添柴':'拿铁 · 炉边打呼';
  const catLine=cat+(w.latte.autoLootUnlocked?' · 暖区拾取':'');
  if(catStatus.textContent!==catLine)catStatus.textContent=catLine;
  if(mood!==w.player.portraitMood){mood=w.player.portraitMood;portrait.src=portraits[mood]??portraits[0];}
  toast(caught?'正在拉回：'+catchName:g.charging?'抓钩蓄力 '+Math.round(g.charge*100)+'%':
    g.active?'抓钩已抛出…':now<messageUntil?message:'');
  const room=el('indoor-status'),sheltered=indoorsAt(w,w.player);if(room.hidden===sheltered)room.hidden=!sheltered;
  const contextHint=!overlay&&(context.kind==='door'?'按 E '+(context.open?'关上防风门':'打开防风门'):context.kind==='storage'?'按 E 或点击储物箱存取物品':
    context.kind==='station'?'按 E 操作'+context.label:context.kind==='beasts'?'按 E 打开伙伴管理':'');
  const interactionHint=contextHint||(here==='island'?(beasts.target()?'靠近虚弱云兽可投喂 · V 查看伙伴':'靠近资源采集 · I 制作和修理工具'):
    here==='gangway'?'沿跳板继续走 · 无需切换场景':mode==='hook'?'按住左键蓄力，松开抛钩':mode==='weapon'?
    (selectedWeapon(w)?'朝目标点击左键出招 · Q 切回抓钩':'先在背包装备武器'):
    mode==='tool'?'走近浮岛资源按 E 采集 · Q 切回抓钩':mode==='wood_deck'?'移动鼠标贴合甲板直边，左键拼接':mode==='torch_post'?'先在背包手搓火把，再选空甲板放置':
    mode==='wind_wall'?'挡风墙放在空甲板，减缓周围热量散失':mode==='dismantle'?'点击选中拆除目标；可按 Z 撤销':
    `${buildDefinitions[mode].name} · 移到甲板预览后左键放置`);
  if(hint.textContent!==interactionHint)hint.textContent=interactionHint;
  meter.hidden=!g.charging;bar.style.width=(g.charge*100)+'%';
  note.hidden=mode==='hook'||mode==='weapon'||mode==='tool'||!pointer||here!=='ark';
  const locked=mode==='weapon'&&pointer&&!overlay&&!finale.open()&&!finale.blocking()?weaponHover(w,view.world(pointer.x,pointer.y)):null;
  view.draw(w,ghostAt(),now,locked);
  if(!panel.hidden)fillBag();
  if(!locker.hidden)fillLocker();
  requestAnimationFrame(frame);
}
let last=performance.now(),elapsed=0;
canvas.dataset.mode=mode;view.resize(w);requestAnimationFrame(frame);
async function restore():Promise<void> {
  try {
    db=await openArchive();
    const previous=await savedWorld(db);
    if(previous)safeWorld(previous);
    active=true;
    await saveNow();
  } catch {
    db?.close();db=null;active=true;
    save.textContent='存档不可用 · 可导出 JSON';save.dataset.error='true';
  }
}
void restore();
