import { countItem,itemNames } from '../sim/ark';
import { craftGear,equipGear,equipment,equipmentCost,gearLabel,gearModifiers,gearSlots } from '../sim/equipment';
import type { WorldState } from '../sim/types';
import { itemList } from './industry';

interface EquipmentHooks{
 state:()=>WorldState;
 art:(name:string)=>string|undefined;
 message:(issue:string|null,success:string,event?:'craft')=>void;
 change:()=>void;
}

export function equipmentUi(h:EquipmentHooks){
 const slots=document.getElementById('gear-slots')!,list=document.getElementById('gear-recipes')!,bonus=document.getElementById('gear-bonuses')!;
 const name=(id:string)=>itemNames.get(id)??id;
 const icon=(id:string)=>{
   const img=document.createElement('img'),src=h.art(id.replaceAll('_','-'));
   img.alt='';if(src)img.src=src;
   return img;
 };
 const action=(key:string,id:string,name:string,fn:()=>void)=>{
   const b=document.createElement('button');b.type='button';b.textContent=name;b.dataset.gearAction=key;b.dataset.gearId=id;b.onclick=fn;
   return b;
 };
 const pct=(v:number)=>Math.round(v*100)+'%';
 function update(){
   const focusId=(document.activeElement as HTMLElement|null)?.dataset.gearId;
   const w=h.state(),p=w.player,mods=gearModifiers(w);
   slots.replaceChildren(...gearSlots.map(slot=>{
     const e=document.createElement('span'),id=p.gear[slot],caption=document.createElement('small'),item=document.createElement('strong');
     e.dataset.gearSlot=slot;caption.textContent=gearLabel[slot];item.textContent=id?name(id):'未装备';
     e.append(caption,...(id?[icon(id)]:[]),item);
     return e;
   }));
   bonus.textContent='抗寒 '+pct(mods.cold)+' · 减伤 '+pct(mods.guard)+
     (mods.personalHeat?' · 随身温感 +'+mods.personalHeat+'°C':'')+(mods.hookRadius?' · 捞取容差增加':'');
   list.replaceChildren(...equipment.map(d=>{
     const e=document.createElement('article'),left=document.createElement('div'),title=document.createElement('strong'),details=document.createElement('small');
     const id=d.id,owned=countItem(w,id)>0,wearing=owned&&p.gear[d.slot]===id;
     e.dataset.gearRecipe=id;
     title.textContent=name(id);details.textContent=gearLabel[d.slot]+' · 抗寒 '+pct(d.cold)+' / 减伤 '+pct(d.guard);
     if(d.personalHeat)details.textContent+=' · 温感 +'+d.personalHeat+'°C';
     if(d.hookRadius)details.textContent+=' · 扩大捞取范围';
     left.append(title,details);
     const inputs=equipmentCost(id);
     if(!owned){const cost=document.createElement('small');cost.textContent=itemList(inputs);left.append(cost);}
     const b=action(owned?'equip':'craft',id,owned?(wearing?'卸下':'装备'):'制作',()=>{
       const issue=owned?equipGear(h.state(),id):craftGear(h.state(),id);
       h.message(issue,(owned?(wearing?'已卸下：':'已装备：'):'已制作：')+name(id),owned?undefined:'craft');
       h.change();
     });
     b.setAttribute('aria-label',b.textContent+name(id));
     if(owned)b.setAttribute('aria-pressed',String(wearing));
     else b.disabled=inputs.some(s=>countItem(w,s.itemId)<s.count);
     e.append(icon(id),left,b);return e;
   }));
   if(focusId) list.querySelector<HTMLButtonElement>(`[data-gear-id="${focusId}"]`)?.focus({preventScroll:true});
 }
 return {update};
}
