import { achievementView,takeAchievement } from '../sim/achievements';
import type { WorldState } from '../sim/types';

const images=import.meta.glob<string>('../assets/art/badge-*.png',{eager:true,query:'?inline',import:'default'});
const src=(id:string)=>images['../assets/art/'+id+'.png'];
type Hooks={state:()=>WorldState;prepare:()=>void};
export function achievementsUi(h:Hooks){
 const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
 const box=el('achievement-panel'),wall=el('medal-wall'),toast=el('achievement-toast');
 const count=el('achievement-count'),list=el('lifetime-stats'),switcher=el('achievements-toggle');
 let until=0,signature='',last:WorldState|null=null,statsAt=0;
 function show(open:boolean){
  if(open)h.prepare();
  box.hidden=!open;switcher.setAttribute('aria-expanded',String(open));
  if(open)paint(true);
 }
 function paint(force=false){
  if(box.hidden)return;
  const w=h.state(),data=achievementView(w);
  const key=String(data.unlocked)+':'+data.rows.filter(r=>r.unlocked).map(x=>x.id).join(',');
  if(force||signature!==key){
   signature=key;
   count.textContent=data.unlocked+' / '+data.rows.length;
   wall.replaceChildren(...data.rows.map(r=>{
    const li=document.createElement('li'),img=document.createElement('img'),title=document.createElement('strong'),hint=document.createElement('small');
    li.dataset.medal=r.id;li.dataset.earned=String(r.unlocked);
    img.src=src(r.art);img.alt='';img.decoding='async';
    title.textContent=r.name;hint.textContent=r.detail;
    li.append(img,title,hint);return li;
   }));
  }
  if(!force&&statsAt===Math.floor(w.tick/30))return;statsAt=Math.floor(w.tick/30);
  list.replaceChildren(...data.stats.flatMap(([label,value])=>{
   const a=document.createElement('dt'),b=document.createElement('dd');a.textContent=String(label);b.textContent=String(value);
   return [a,b];
  }));
 }
 function frame(now:number,hide=false){
  const w=h.state();
  if(last!==w){toast.hidden=true;until=0;signature='';last=w;}
  if(hide){toast.hidden=true;return;}
  if(now>=until){
   const a=takeAchievement(w);
   if(!a){toast.hidden=true;}
   else{
    toast.dataset.medal=a.id;el<HTMLImageElement>('achievement-toast-icon').src=src(a.art);
    el('achievement-toast-label').textContent=a.title;toast.hidden=false;until=now+2250;
   }
  }
  if(!box.hidden&&w.tick%30===0)paint();
 }
 switcher.onclick=()=>show(box.hidden);el('achievement-close').onclick=()=>show(false);
 return {open:()=>!box.hidden,show,toggle:()=>show(box.hidden),frame};
}
