import { countItem,itemNames } from '../sim/ark';
import { craftWeapon,selectedWeapon,weaponCooldown,weaponSpecs,weaponRecipe,type WeaponStyle } from '../sim/weapons';
import { TICK_RATE,type WorldState } from '../sim/types';
import { itemList } from './industry';

const styleNames:Record<WeaponStyle,string>={thrust:'直刺',sweep:'横扫',bolt:'远射',throw:'投掷爆燃',flame:'扇形喷焰'};
interface Hooks{state:()=>WorldState;icon:(name:string)=>string|undefined;activate:(id:string)=>void;lower:()=>void;toggle:()=>void;
  changed:()=>void;say:(issue:string|null,success:string,event?:'craft')=>void}

export function weaponsUi(h:Hooks){
 const list=document.getElementById('weapon-recipes')!,hud=document.getElementById('weapon-toggle') as HTMLButtonElement;
 const status=hud.querySelector('output')!,title=hud.querySelector('span')!,art=hud.querySelector('img')!;
 const name=(id:string)=>itemNames.get(id)??id;
 let current:string|null=null;
 function update(){
  const focus=(document.activeElement as HTMLElement|null)?.dataset.weaponId;
  const w=h.state();
  list.replaceChildren(...weaponSpecs.map(d=>{
    const article=document.createElement('article'),image=document.createElement('img'),body=document.createElement('div');
    const nameEl=document.createElement('strong'),desc=document.createElement('small'),cost=document.createElement('small'),buttons=document.createElement('div');
    article.dataset.weaponSpec=d.id;image.alt='';const path=h.icon(d.id.replaceAll('_','-'));if(path)image.src=path;
    nameEl.textContent=name(d.id);
    desc.textContent=`${styleNames[d.style]} · ${d.range} 格 · 破甲 ${d.pierce}`;
    const recipe=weaponRecipe(d.id),requires=recipe?.inputs??[],known=countItem(w,d.id);
    cost.textContent=known?'背包 ×'+known:itemList(requires);
    const act=(label:string,fn:()=>void)=>{
      const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.weaponId=d.id;
      b.setAttribute('aria-label',label+name(d.id));b.onclick=fn;return b;
    };
    if(!known||d.style==='throw'){
      const create=act('制作',()=>{h.say(craftWeapon(w,d.id),'已制作：'+name(d.id),'craft');h.changed();});
      create.disabled=requires.some(x=>countItem(w,x.itemId)<x.count);buttons.append(create);
    }
    if(known){
      const equipped=w.player.weapon===d.id;
      const equip=act(equipped?'使用':'握持',()=>h.activate(d.id));buttons.append(equip);
      if(equipped)buttons.append(act('卸下',h.lower));
    }
    body.append(nameEl,desc,cost);buttons.className='weapon-buttons';article.append(image,body,buttons);return article;
  }));
  if(focus)list.querySelector<HTMLButtonElement>(`[data-weapon-id="${focus}"]`)?.focus({preventScroll:true});
 }
 function frame(armed:boolean){
  const w=h.state(),spec=selectedWeapon(w);
  const id=spec?.id??null;hud.hidden=!id;hud.setAttribute('aria-pressed',String(armed));
  if(id!==current){current=id;
    if(id){title.textContent=name(id);art.src=h.icon(id.replaceAll('_','-'))!;hud.setAttribute('aria-label','切换武器 '+name(id));}
  }
  const remaining=weaponCooldown(w),line=remaining&&armed?(remaining/TICK_RATE).toFixed(1)+'s':armed?'左键出招':'T 握持';
  if(status.textContent!==line)status.textContent=line;
 }
 hud.onclick=h.toggle;
 return {update,frame};
}
