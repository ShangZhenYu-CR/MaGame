import './ui/ark.css';
import { ArkView, type Ghost } from './render/ark-view';
import { build, buildIssue, craftTorch, itemNames, type BuildKind } from './sim/ark';
import { aim, cancelCharge, fire, startCharge } from './sim/cloud';
import { deserializeWorld, serializeWorld } from './sim/save';
import { TICK_RATE, type WorldState } from './sim/types';
import { createInitialWorld, stepWorld } from './sim/world';
import { openArchive, savedWorld, storeWorld } from './ui/storage';

function el<T extends HTMLElement = HTMLElement>(id: string): T { return document.getElementById(id)! as T; }
const canvas=el<HTMLCanvasElement>('game-canvas'), view=new ArkView(canvas);
el<HTMLImageElement>('manan-portrait').src='../assets/character/head-0.png';
const stats=el('hud-stats'), hint=el('hint'), action=el('action'), save=el('save-label'), note=el('build-note');
const meter=el('meter'), bar=el('charge-bar'), panel=el('inventory'), input=el<HTMLInputElement>('save-file');
const keys=new Set<string>();
type Mode = 'hook' | BuildKind;
const controls: Record<Mode,HTMLElement>={ hook:el('hook'),wood_deck:el('build-deck'),torch_post:el('build-torch') };
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
  panel.hidden=!show;el('bag').setAttribute('aria-expanded',String(show));
  if(show){ cancelCharge(w); fillBag(); }
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
  w=next;cancelCharge(w);caught=null;keys.clear();messageUntil=0;stackSignature='';view.position(w);fillBag();
}
function ghostAt(): Ghost|null {
  if(mode==='hook'||!pointer)return null;
  const at=view.world(pointer.x,pointer.y), x=Math.floor(at.x), y=Math.floor(at.y);
  const issue=buildIssue(w,mode,x,y);
  note.hidden=false;note.textContent=issue??(mode==='wood_deck'?'吸附就绪 · 浮木板 ×2':'放置就绪 · 防风火把 ×1');
  return {x,y,ok:!issue,torch:mode==='torch_post'};
}
for(const [k,b] of Object.entries(controls)) b.addEventListener('click',()=>choose(k as Mode));
el('bag').onclick=()=>toggleBag();
el('close').onclick=()=>toggleBag(false);
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
    if(!panel.hidden)toggleBag(false);
    else if(mode!=='hook')choose('hook');
    else cancelCharge(w);
  } else if(k==='q')choose('hook');
  else if(k==='1')choose('wood_deck');
  else if(k==='2')choose('torch_post');
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
    if(startCharge(w,at))canvas.setPointerCapture(e.pointerId);
  } else {
    const x=Math.floor(at.x),y=Math.floor(at.y), kind=mode;
    const issue=buildIssue(w,kind,x,y);
    if(!issue&&build(w,kind,x,y)){
      tell(kind==='wood_deck'?'甲板已拼接，可以走上去。':'防风火把已点亮。');void saveNow();
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
      tell(total>countAtCatch?'已回收入包：'+catchName+' ×'+(total-countAtCatch):'背包没有空位，残骸已松开。');
      void saveNow();
    }
    caught=g.caughtDebrisId;
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
  if(caught)action.textContent='正在拉回：'+catchName;
  else if(g.charging)action.textContent='抓钩蓄力 '+Math.round(g.charge*100)+'%';
  else if(g.active)action.textContent='抓钩已抛出…';
  else if(w.tick>=messageUntil)action.textContent='余烬还在。先从云里捞点木头。';
  hint.textContent=mode==='hook'?'按住左键蓄力，松开抛钩':mode==='wood_deck'?'移动鼠标贴合甲板直边，左键拼接':'先在背包手搓火把，再选空甲板放置';
  meter.hidden=!g.charging;bar.style.width=(g.charge*100)+'%';
  note.hidden=mode==='hook'||!pointer;
  view.draw(w,ghostAt());
  if(!panel.hidden)fillBag();
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
