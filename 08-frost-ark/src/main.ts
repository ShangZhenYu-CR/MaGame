import './ui/ark.css';
import { ArkView, type Ghost } from './render/ark-view';
import { build, buildCosts, buildDefinitions, buildingAt, buildIssue, countItem, craftTorch, itemNames, type BuildKind } from './sim/ark';
import { aim, cancelCharge, fire, startCharge } from './sim/cloud';
import { deserializeWorld, serializeWorld } from './sim/save';
import { nearestStorage, storageContents, STORAGE_SLOTS, transferStorage } from './sim/storage-box';
import { addFuel, FUEL_MAX, heatAt, partOfDay, primaryHearth, upgradeHearth } from './sim/heatField';
import { dropSupply, isDeckDrop, manuallyRecover } from './sim/latte';
import { TICK_RATE, type WorldState } from './sim/types';
import { createInitialWorld, stepWorld } from './sim/world';
import { openArchive, savedWorld, storeWorld } from './ui/storage';
import { createIndustryUi, itemList } from './ui/industry';
import { dismantle, dismantleIssue, industryDistance, industryPanel, nearestIndustry } from './sim/industry';
import { audio } from './audio/synth';

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
let lockerSignature='';
type Mode = 'hook' | 'dismantle' | BuildKind;
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
  ['warmth','warmth-value'],['life','life-value'],['fuel','fuel-value'],
] as const).map(([id,value])=>[el<HTMLMeterElement>(id+'-meter'),el(value)] as const);
const localTemperature=el('local-temp');
const industry=createIndustryUi({
  state:()=>w, select:kind=>{industry.showCatalog(false);choose(kind);},
  message:finishAction,icon:iconPath,research:()=>{toggleCatalog(true);el('build-tech-title').scrollIntoView({block:'nearest'});},
});
function finishAction(issue:string|null,success:string,event?:'craft'|'undo'|'dismantle'|'place'):void{
  tell(issue??success);
  if(issue)return;
  if(event)audio.play(event);
  void saveNow();
}
function useNearby():void{
  if(industry.stationOpen()){industry.showStation(null);return;}
  if(!locker.hidden){toggleStorage(false);return;}
  const box=nearestStorage(w), station=nearestIndustry(w);
  if(station&&(!box||industryDistance(w,station)<industryDistance(w,box)))openIndustry(station.id);
  else toggleStorage(true);
}
function openIndustry(id:string):void{
  closeOtherPanels('industry');cancelCharge(w);keys.clear();industry.showStation(id);
}
function closeOtherPanels(except:'bag'|'locker'|'catalog'|'industry'):void{
  if(except!=='bag')toggleBag(false);
  if(except!=='locker')locker.hidden=true;
  if(except!=='catalog')industry.showCatalog(false);
  if(except!=='industry')industry.showStation(null);
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
  const path=iconPath(itemId.replaceAll('_','-'))??iconPath(itemIcons[itemId]??'');
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
  const count=[countItem(w,'grapple_hook'),Math.floor(wood/2),countItem(w,'torch_item'),Math.floor(wood/3),w.player.inventory.filter(Boolean).length+'/18'];
  count.forEach((n,i)=>toolbar[i].textContent=String(n));
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
  if(show){ cancelCharge(w); fillBag(); }
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
  for(const s of w.player.inventory)if(s&&s.itemId!=='grapple_hook')carried.set(s.itemId,(carried.get(s.itemId)??0)+s.count);
  drawList('storage-stacks',stash.map(s=>[s.itemId,s.count]),'withdraw');
  drawList('storage-deposit',carried,'deposit');
}
function fillBag():void {
  const signature=JSON.stringify(w.player.inventory);
  if(signature===stackSignature)return;
  stackSignature=signature;
  const entries=w.player.inventory.filter(s=>s!==null).map(s=>{
    const li=document.createElement('li'), name=document.createElement('span'), count=document.createElement('strong');
    name.textContent=itemNames.get(s.itemId) ?? s.itemId;count.textContent='×'+s.count;count.className='numbers';itemLabel(name,s.itemId);
    li.append(name,count);return li;
  });
  el('stacks').replaceChildren(...entries);
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
  w=next;toggleStorage(false);industry.showStation(null);industry.showCatalog(false);lockerSignature='';cancelCharge(w);
  caught=null;keys.clear();messageUntil=0;message='';stackSignature='';view.position(w);fillBag();
}
function ghostAt(): Ghost|null {
  if(mode==='hook'||!pointer)return null;
  const at=view.world(pointer.x,pointer.y), x=Math.floor(at.x), y=Math.floor(at.y);
  const targeted=mode==='dismantle'?buildingAt(w,x,y):null;
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
  if(industry.catalogOpen())toggleCatalog(false);
  choose(k===mode&&k==='dismantle'?'hook':k as Mode);
});

function warmthAction(kind:'fuel'|'upgrade'|'drop'|'pickup'):void {
  const reason=kind==='fuel'?addFuel(w):kind==='upgrade'?upgradeHearth(w):
    kind==='drop'?(dropSupply(w)?null:'背包里没有浮木板。'):(manuallyRecover(w)?null:'附近没有可捡的掉落物。');
  const result={fuel:'已给余烬主炉添柴。',upgrade:'主炉升至 Lv.2，拿铁会捡拾暖区的掉落物。',drop:'放下了浮木板 ×1，可按 F 拾回。',pickup:'已捡回地上的物品。'};
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
addEventListener('blur',()=>{keys.clear();cancelCharge(w);});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){ keys.clear();cancelCharge(w);void saveNow(); }
});
addEventListener('pointerdown',()=>audio.unlock());
addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(e.ctrlKey||e.metaKey||e.altKey||e.target===input)return;
  audio.unlock();
  if('wasd'.split('').includes(k)){keys.add(k);e.preventDefault();return;}
  if(e.repeat)return;
  if(k==='escape'){
    industry.closeTip();
    if(industry.stationOpen())industry.showStation(null);
    else if(industry.catalogOpen())toggleCatalog(false);
    else if(!locker.hidden)toggleStorage(false);
    else if(!panel.hidden)toggleBag(false);
    else if(mode!=='hook')choose('hook');
    else cancelCharge(w);
  } else if(k==='e')useNearby();
  else if(k==='b')toggleCatalog();
  else if(k==='x'){toggleCatalog(false);choose(mode==='dismantle'?'hook':'dismantle');}
  else if(k==='z')industry.undoAction();
  else if(k==='m')toggleMute();
  else if(k==='q')choose('hook');
  else if(k==='1')choose('wood_deck');
  else if(k==='2')choose('torch_post');
  else if(k==='3')choose('wind_wall');
  else if(k==='r')warmthAction('fuel');
  else if(k==='u')warmthAction('upgrade');
  else if(k==='g')warmthAction('drop');
  else if(k==='f')warmthAction('pickup');
  else if(k==='i'){ e.preventDefault();toggleBag(); }
});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
canvas.addEventListener('pointermove',e=>{
  pointer={x:e.clientX,y:e.clientY};
  aim(w,view.world(e.clientX,e.clientY));
});
canvas.addEventListener('pointerleave',()=>{pointer=null;});
canvas.addEventListener('pointerdown',e=>{
  if(!active||e.button!==0)return;
  pointer={x:e.clientX,y:e.clientY};
  const at=view.world(e.clientX,e.clientY);
  const x=Math.floor(at.x),y=Math.floor(at.y);
  if(mode==='hook'){
    const hit=buildingAt(w,x,y);
    if(hit&&hit.id===nearestStorage(w)?.id){toggleStorage();return;}
    if(hit&&industryPanel(w,hit.id)){openIndustry(hit.id);return;}
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
  stepWorld(w,1,{x:Number(keys.has('d'))-Number(keys.has('a')),y:Number(keys.has('s'))-Number(keys.has('w'))});
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
  elapsed+=Math.min(100,Math.max(0,now-last));last=now;
  while(elapsed>=1000/TICK_RATE){
    if(active)simulation();
    elapsed-=1000/TICK_RATE;
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
  industry.update();
  setVital(0,w.player.warmth,w.player.maxWarmth);
  setVital(1,w.player.hp,w.player.maxHp);
  setVital(2,h?.fuel??0,FUEL_MAX[Math.min(2,h?.level??0)]||120);
  const reading=`脚下 ${local}°C`;
  if(localTemperature.textContent!==reading)localTemperature.textContent=reading;
  updateToolbar();
  thermal.dataset.cold=String(w.player.warmth<=25);
  const phase=w.weather==='whiteout'?'大寒潮':partOfDay(w.timeOfDay);
  const report=`${phase} · 主炉 Lv.${h?.level??0} · 燃料 ${Math.ceil(h?.fuel??0)}`;
  if(briefing.textContent!==report)briefing.textContent=report;
  const cat=w.latte.mood==='alert'?'拿铁 · 炸毛警戒':w.latte.mood==='hungry_hearth'?'拿铁 · 提醒添柴':'拿铁 · 炉边打呼';
  const catLine=cat+(w.latte.autoLootUnlocked?' · 暖区拾取':'');
  if(catStatus.textContent!==catLine)catStatus.textContent=catLine;
  if(mood!==w.player.portraitMood){mood=w.player.portraitMood;portrait.src=portraits[mood]??portraits[0];}
  toast(caught?'正在拉回：'+catchName:g.charging?'抓钩蓄力 '+Math.round(g.charge*100)+'%':
    g.active?'抓钩已抛出…':now<messageUntil?message:'');
  const interactionHint=mode==='hook'?(nearbyStorage()?'按 E 或点击储物箱存取物品':nearestIndustry(w)?'按 E 或点击加工站操作':'按住左键蓄力，松开抛钩'):
    mode==='wood_deck'?'移动鼠标贴合甲板直边，左键拼接':mode==='torch_post'?'先在背包手搓火把，再选空甲板放置':
    mode==='wind_wall'?'挡风墙放在空甲板，减缓周围热量散失':mode==='dismantle'?'点击选中拆除目标；可按 Z 撤销':
    `${buildDefinitions[mode].name} · 移到甲板预览后左键放置`;
  if(hint.textContent!==interactionHint)hint.textContent=interactionHint;
  meter.hidden=!g.charging;bar.style.width=(g.charge*100)+'%';
  note.hidden=mode==='hook'||!pointer;
  view.draw(w,ghostAt());
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
