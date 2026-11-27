import { buildCosts,buildDefinitions,countItem,itemNames,type BuildKind } from '../sim/ark';
import { isMeal,quickMeal } from '../sim/food';
import { equippedGrapple,FROST_GRAPPLE } from '../sim/grapple-tools';
import { bindShortcut, DEFAULT_SHORTCUTS,dynamicShortcuts,heldTool,shortcuts,supportedShortcut,switchShortcuts,type Shortcut } from '../sim/hotbar';
import { toolDefinition } from '../sim/tools';
import { weaponById } from '../sim/weapons';
import type { WorldState } from '../sim/types';
const structureIcon:Partial<Record<BuildKind,string>>={wood_deck:'deck',torch_post:'torch',wind_wall:'wall',iron_deck:'iron-deck',sorter_arm:'sorter',warm_wall:'warm-wall'};
const toolImages:Record<string,string>={wood_axe:'hand-axe',frost_axe:'hand-axe-upgraded',mining_pick:'mining-pick',frost_pick:'mining-pick-upgraded'};
const mime='application/x-frost-shortcut';
export interface Command{
  kind:'building'|'weapon'|'meal'|'hook'|'tool'|'empty';
  id:string;name:string;icon?:string;quantity:string;ready:boolean;
}
export function resolveShortcut(w:WorldState,b:Shortcut):Command{
 const firstWeapon=w.player.weapon??w.player.inventory.find(s=>s&&weaponById.has(s.itemId))?.itemId;
 const id=(b==='@weapon'?firstWeapon:b==='@meal'?quickMeal(w):b)??'';
 const empty=(name:string,icon?:string):Command=>({kind:'empty',id:'',name,icon,quantity:'',ready:false});
 if(!id)return b==='@weapon'?empty('待装备','frost-iron-spear'):b==='@meal'?empty('待备热食','baked-root'):empty('未绑定');
 if(id==='@hook'){
  const h=equippedGrapple(w),frost=h===FROST_GRAPPLE;
  return {kind:'hook',id:'hook',name:frost?'强化抓钩':'抓钩',icon:frost?'frost-grapple-hook':'hook',quantity:h?'1':'0',ready:!!h};
 }
 if(Object.hasOwn(buildDefinitions,id)){
  const d=buildDefinitions[id as BuildKind],cost=buildCosts[id as BuildKind];
  const n=cost.length?Math.min(...cost.map(x=>Math.floor(countItem(w,x.itemId)/x.count))):0;
  return {kind:'building',id,name:({wood_deck:'甲板',torch_post:'火把',wind_wall:'挡风'} as Record<string,string>)[id]??d.name,
    icon:structureIcon[id as BuildKind]??id.replaceAll('_','-'),quantity:String(n),ready:n>0};
 }
 const name=itemNames.get(id)??id;
 const count=countItem(w,id);
 if(toolDefinition(id)){
  const current=w.player.inventory.find(s=>s?.itemId===id)?.durability;
  return {kind:'tool',id,name,icon:toolImages[id],quantity:String(current??count),ready:count>0&&(current??1)>0};
 }
 if(isMeal(id))return {kind:'meal',id,name,icon:id.replaceAll('_','-'),quantity:String(count),ready:count>0};
 return {kind:'weapon',id,name,icon:id.replaceAll('_','-'),quantity:String(count),ready:count>0};
}

export function setupHotbar(h:{state:()=>WorldState;mode:()=>string;icon:(s:string)=>string|undefined;
  action:(a:Command,source:'key'|'click')=>void;changed:()=>void}){
 const slots=[...document.querySelectorAll<HTMLButtonElement>('[data-quick-slot]')];
 const details=document.querySelector<HTMLDetailsElement>('#quickbar-editor')!;
 const editor=document.getElementById('quickbar-bindings')!;
 let editSignature='',signature='';
 const name=(b:Shortcut)=>b===null?'留空':Object.hasOwn(dynamicShortcuts,b)?
   dynamicShortcuts[b as keyof typeof dynamicShortcuts]:itemNames.get(b)??buildDefinitions[b as BuildKind]?.name??b;
 const execute=(i:number,source:'key'|'click'='key')=>{h.action(resolveShortcut(h.state(),shortcuts(h.state())[i]),source);};
 const configure=()=>{
  const w=h.state(),configured=shortcuts(w);
  const choices=[null,...Object.keys(dynamicShortcuts),...Object.keys(buildDefinitions).filter(x=>x!=='hearth_core'),
   ...new Set(w.player.inventory.flatMap(s=>s&&supportedShortcut(s.itemId)?[s.itemId]:[])),
   ...configured,...DEFAULT_SHORTCUTS] as Shortcut[];
  const distinct=[...new Set(choices)];
  const current=JSON.stringify([distinct,configured]);if(current===editSignature)return;editSignature=current;
  const pending=(document.activeElement as HTMLElement)?.dataset.quickBind;
  editor.replaceChildren(...configured.map((b,i)=>{
   const row=document.createElement('label'),key=document.createElement('kbd'),select=document.createElement('select');
   key.textContent=String(i+1);select.dataset.quickBind=String(i+1);select.setAttribute('aria-label','绑定快捷键 '+(i+1));
   for(const id of distinct){const o=document.createElement('option');o.value=id??'';o.textContent=name(id);select.append(o);}
   select.value=b??'';
   select.onchange=()=>{bindShortcut(h.state(),i,select.value||null);h.changed();configure();};
   row.append(key,select);return row;
  }));
  if(pending)editor.querySelector<HTMLElement>(`[data-quick-bind="${pending}"]`)?.focus({preventScroll:true});
 };
 for(const button of slots){
  const i=Number(button.dataset.quickSlot)-1;
  button.addEventListener('click',()=>execute(i,'click'));
  button.draggable=true;
  button.addEventListener('dragstart',e=>{
   if(!e.dataTransfer)return;e.dataTransfer.setData(mime,'slot:'+i);e.dataTransfer.effectAllowed='move';
  });
  button.addEventListener('dragover',e=>{if(e.dataTransfer?.types.includes(mime))e.preventDefault();});
  button.addEventListener('drop',e=>{
   const raw=e.dataTransfer?.getData(mime);if(!raw)return;e.preventDefault();
   const w=h.state(),ok=raw.startsWith('slot:')?switchShortcuts(w,Number(raw.slice(5)),i):
    raw.startsWith('item:')&&bindShortcut(w,i,raw.slice(5));
   if(ok){h.changed();configure();}
  });
 }
 details.ontoggle=()=>{if(details.open)configure();};
 return {run:execute,configure,
  closeEditor:()=>{if(!details.open)return false;details.open=false;return true;},
  drag:(node:HTMLElement,id:string)=>{
   if(!supportedShortcut(id))return;
   node.draggable=true;node.addEventListener('dragstart',e=>{
    if(!e.dataTransfer)return;e.dataTransfer.setData(mime,'item:'+id);e.dataTransfer.effectAllowed='copy';
   });
  },
  frame:()=>{
   const w=h.state(),mode=h.mode(),bindings=shortcuts(w);
   const next=JSON.stringify([bindings,mode,w.player.weapon,w.player.diet.quick,heldTool(w),w.player.inventory]);
   if(next===signature)return;signature=next;
   const commands=bindings.map(b=>resolveShortcut(w,b));
   for(const button of slots){
    const i=Number(button.dataset.quickSlot)-1,a=commands[i],art=button.querySelector('img')!;
    const src=a.icon?h.icon(a.icon):undefined;
    if(src){if(art.getAttribute('src')!==src)art.src=src;art.hidden=false;}else {art.hidden=true;art.removeAttribute('src');}
    const label=button.querySelector('span')!;
    const shorts:Record<string,string>={fire_oil_flask:'火油瓶',magma_sprayer:'熔核喷器',frost_iron_spear:'霜铁长矛',frost_axe:'强化手斧',frost_pick:'强化矿镐'};
    label.textContent=shorts[a.id]??a.name;
    label.classList.toggle('dense',label.textContent.length>5);
    button.querySelector('output')!.textContent=a.quantity;
    button.setAttribute('aria-pressed',String(a.id!==''&&(mode===a.id||
     (mode==='weapon'&&a.kind==='weapon'&&w.player.weapon===a.id)||(mode==='tool'&&a.kind==='tool'&&heldTool(w)===a.id))));
    button.setAttribute('aria-label',`${i+1} · ${a.name}`);
    button.title=a.name==='未绑定'?'在背包编排，或拖入道具':a.name+' · '+(i+1);
    button.dataset.ready=String(a.ready);
   }
  },
 };
}
