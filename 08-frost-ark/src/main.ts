import './ui/ark.css';
import { ArkView, type Ghost } from './render/ark-view';
import { build, buildIssue, craftTorch, itemNames, type BuildKind } from './sim/ark';
import { aim, cancelCharge, fire, startCharge } from './sim/cloud';
import { deserializeWorld, serializeWorld } from './sim/save';
import { nearestStorage, storageContents, STORAGE_SLOTS, transferStorage } from './sim/storage-box';
import { addFuel, heatAt, partOfDay, primaryHearth, upgradeHearth } from './sim/heatField';
import { dropSupply, manuallyRecover } from './sim/latte';
import { TICK_RATE, type WorldState } from './sim/types';
import { createInitialWorld, stepWorld } from './sim/world';
import { openArchive, savedWorld, storeWorld } from './ui/storage';

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
type Mode = 'hook' | BuildKind;
const controls: Record<Mode,HTMLElement>={ hook:el('hook'),wood_deck:el('build-deck'),torch_post:el('build-torch'),wind_wall:el('build-wall') };
let mode: Mode='hook', w: WorldState=createInitialWorld(), pointer:{x:number;y:number}|null=null;
let db: IDBDatabase|null=null, active=false, saveQueue=Promise.resolve();
let messageUntil=0, caught:string|null=null, catchName='', countAtCatch=0, catchLootId='';
let stackSignature='';

function tell(text:string):void { action.textContent=text;messageUntil=w.tick+105; }
function choose(next:Mode):void {
  cancelCharge(w);
  mode=next;
  for(const [k,b] of Object.entries(controls)) b.setAttribute('aria-pressed',String(k===mode));
}
function toggleBag(show=panel.hidden):void {
  if(show)locker.hidden=true;
  panel.hidden=!show;el('bag').setAttribute('aria-expanded',String(show));
  if(show){ cancelCharge(w); fillBag(); }
}
function toggleStorage(show=locker.hidden):void {
  if(show&&!nearbyStorage()){tell('走到甲板上的储物箱旁，再按 E。');return;}
  if(show){toggleBag(false);cancelCharge(w);keys.clear();fillLocker();}
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
      label.textContent=name+' ×'+count;label.className='numbers';
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
    name.textContent=itemNames.get(s.itemId) ?? s.itemId;count.textContent='×'+s.count;count.className='numbers';
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
  w=next;toggleStorage(false);lockerSignature='';cancelCharge(w);caught=null;keys.clear();messageUntil=0;stackSignature='';view.position(w);fillBag();
}
function ghostAt(): Ghost|null {
  if(mode==='hook'||!pointer)return null;
  const at=view.world(pointer.x,pointer.y), x=Math.floor(at.x), y=Math.floor(at.y);
  const issue=buildIssue(w,mode,x,y);
  note.hidden=false;note.textContent=issue??(mode==='wood_deck'?'吸附就绪 · 浮木板 ×2':mode==='torch_post'?'放置就绪 · 防风火把 ×1':'挡风墙 · 浮木板 ×3');
  return {x,y,ok:!issue,torch:mode==='torch_post',wall:mode==='wind_wall'};
}
for(const [k,b] of Object.entries(controls)) b.addEventListener('click',()=>choose(k as Mode));
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
  if(craftTorch(w)){tell('手制完成：防风火把 ×2');void saveNow();}
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
addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(e.ctrlKey||e.metaKey||e.altKey||e.target===input)return;
  if('wasd'.split('').includes(k)){keys.add(k);e.preventDefault();return;}
  if(e.repeat)return;
  if(k==='escape'){
    if(!locker.hidden)toggleStorage(false);
    else if(!panel.hidden)toggleBag(false);
    else if(mode!=='hook')choose('hook');
    else cancelCharge(w);
  } else if(k==='e')toggleStorage();
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
  if(mode==='hook'){
    const box=nearestStorage(w);
    if(box&&Math.floor(at.x)===box.gx&&Math.floor(at.y)===box.gy){toggleStorage();return;}
    if(startCharge(w,at))canvas.setPointerCapture(e.pointerId);
  } else {
    const x=Math.floor(at.x),y=Math.floor(at.y), kind=mode;
    const issue=buildIssue(w,kind,x,y);
    if(!issue&&build(w,kind,x,y)){
      tell(kind==='wood_deck'?'甲板已拼接，可以走上去。':kind==='torch_post'?'防风火把已点亮。':'挡风墙已放好，附近热量散得更慢。');void saveNow();
    } else tell(issue??'这里不能施工。');
  }
});
canvas.addEventListener('pointerup',e=>{
  if(e.button!==0)return;
  aim(w,view.world(e.clientX,e.clientY));fire(w);
});
canvas.addEventListener('pointercancel',()=>cancelCharge(w));
canvas.addEventListener('contextmenu',e=>e.preventDefault());

function simulation():void {
  const g=w.player.grapple;
  stepWorld(w,1,{x:Number(keys.has('d'))-Number(keys.has('a')),y:Number(keys.has('s'))-Number(keys.has('w'))});
  if(caught!==g.caughtDebrisId){
    if(g.caughtDebrisId){
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
  if(!locker.hidden&&!nearbyStorage())toggleStorage(false);
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
  const body=`体温 ${Math.round(w.player.warmth)}　生命 ${Math.ceil(w.player.hp)}　脚下 ${local}°C`;
  if(thermal.textContent!==body)thermal.textContent=body;
  thermal.dataset.cold=String(w.player.warmth<=25);
  const phase=w.weather==='whiteout'?'大寒潮':partOfDay(w.timeOfDay);
  const report=`${phase} · 主炉 Lv.${h?.level??0} · 燃料 ${Math.ceil(h?.fuel??0)}`;
  if(briefing.textContent!==report)briefing.textContent=report;
  const cat=w.latte.mood==='alert'?'拿铁 · 炸毛警戒':w.latte.mood==='hungry_hearth'?'拿铁 · 提醒添柴':'拿铁 · 炉边打呼';
  const catLine=cat+(w.latte.autoLootUnlocked?' · 暖区拾取':'');
  if(catStatus.textContent!==catLine)catStatus.textContent=catLine;
  if(mood!==w.player.portraitMood){mood=w.player.portraitMood;portrait.src=portraits[mood]??portraits[0];}
  if(caught)action.textContent='正在拉回：'+catchName;
  else if(g.charging)action.textContent='抓钩蓄力 '+Math.round(g.charge*100)+'%';
  else if(g.active)action.textContent='抓钩已抛出…';
  else if(w.tick>=messageUntil)action.textContent='余烬还在。先从云里捞点木头。';
  hint.textContent=mode==='hook'?(nearbyStorage()?'按 E 或点击储物箱存取物品':'按住左键蓄力，松开抛钩'):mode==='wood_deck'?'移动鼠标贴合甲板直边，左键拼接':mode==='torch_post'?'先在背包手搓火把，再选空甲板放置':'挡风墙放在空甲板，减缓周围热量散失';
  meter.hidden=!g.charging;bar.style.width=(g.charge*100)+'%';
  note.hidden=mode==='hook'||!pointer;
  view.draw(w,ghostAt());
  if(!panel.hidden)fillBag();
  if(!locker.hidden)fillLocker();
  requestAnimationFrame(frame);
}
let last=performance.now(),elapsed=0;
view.resize(w);requestAnimationFrame(frame);
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
