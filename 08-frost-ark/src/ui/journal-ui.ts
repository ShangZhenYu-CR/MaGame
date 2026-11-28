import { claimChapter,journalView } from '../sim/journal';
import type { WorldState } from '../sim/types';
type Hooks={state:()=>WorldState;say:(issue:string|null,msg:string)=>void};
export function journalUi(h:Hooks){
 const box=document.getElementById('voyage-journal')!;
 const toggle=document.getElementById('journal-toggle')!;
 const list=document.getElementById('journal-list')!,current=document.getElementById('journal-current')!;
 let opened=false,signature='';
 const close=()=>show(false);
 function show(open:boolean){
  opened=open;paint();
 }
 function paint(covered=false){
  const w=h.state(),view=journalView(w),short=view.first?.name??'全部完成';
  const open=opened&&!covered;
  box.hidden=!open;
  toggle.setAttribute('aria-expanded',String(open));
  const label=toggle.querySelector('span')!;
  if(label.textContent!==short)label.textContent=short;
  if(!open)return;
  current.textContent=view.first?`现在：${view.first.name} · ${view.first.guide}`:'八章已经完成。航海日志可以继续打开回看。';
  const key=[view.done,view.paid].join(':');
  if(key===signature)return;signature=key;
  list.replaceChildren(...view.rows.map((r,i)=>{
   const row=document.createElement('li'),head=document.createElement('div'),title=document.createElement('strong');
   title.textContent=('0'+(i+1)).slice(-2)+' · '+r.name;
   const stage=document.createElement('span');stage.textContent=r.claimed?'已领':r.complete?'完成':r.id===view.first?.id?'当前':'待完成';
   row.dataset.chapter=r.id;row.dataset.complete=String(r.complete);
   head.append(title,stage);row.append(head);
   if(r.complete&&!r.claimed){
    const b=document.createElement('button');b.type='button';b.textContent='领取 · '+r.rewardLabel;
    b.onclick=()=>{h.say(claimChapter(h.state(),r.id),'已领取本章补给：'+r.rewardLabel);paint();};row.append(b);
   }
   return row;
  }));
 }
 toggle.onclick=()=>show(!opened);document.getElementById('journal-close')!.onclick=close;
 return {paint,close,toggle:()=>show(!opened),open:()=>opened&&!box.hidden,reset:()=>{signature='';close();}};
}
