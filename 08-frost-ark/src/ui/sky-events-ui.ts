import { countItem } from '../sim/ark';
import { activeSkyEvent,couldMoorTrader,eventDescription,eventName,moorTrader,skyEventDistance,stormTell,tradeSky,tradeSummary,trades } from '../sim/sky-events';
import { TICK_RATE,type WorldState } from '../sim/types';

const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
const set=(e:HTMLElement,s:string)=>{if(e.textContent!==s)e.textContent=s;};
export function skyEventsUi(cb:{state:()=>WorldState;icon:(id:string)=>string|undefined;save:()=>void;toast:(message:string)=>void}){
 const brief=el('sky-event-brief'),heading=el('sky-event-title'),detail=el('sky-event-detail'),image=el<HTMLImageElement>('sky-event-icon');
 const moor=el<HTMLButtonElement>('sky-event-moor'),dialog=el<HTMLDialogElement>('sky-trader');
 const status=el('sky-trader-result'),wares=el('sky-trader-stock');
 let stockKey='',lastEvent='';
 const gifts={warm_berry_soup:'warm-berry-soup',merchant_route_blueprint:'merchant-route-blueprint',
    magnetic_salvage_buckle:'magnetic-salvage-buckle'} as Record<string,string>;
 const open=()=>dialog.open;
 const close=()=>{if(dialog.open)dialog.close();stockKey='';};
 function stock(){
  const w=cb.state(),event=activeSkyEvent(w);
  if(!event||!couldMoorTrader(w)){close();return;}
  const key=JSON.stringify([event.id,event.trades,w.player.inventory]);
  if(key===stockKey)return;stockKey=key;
  wares.replaceChildren(...trades.map(offer=>{
    const row=document.createElement('div'),im=document.createElement('img'),labels=document.createElement('div');
    const title=document.createElement('strong'),cost=document.createElement('small'),b=document.createElement('button');
    row.className='sky-offer';row.dataset.offer=offer.id;im.alt='';const icon=cb.icon(gifts[offer.give[0].itemId]);
    if(icon)im.src=icon;
    title.textContent=tradeSummary(offer.give);cost.textContent='交付 '+tradeSummary(offer.cost);
    const claimed=event.trades.includes(offer.id),canGive=offer.cost.every(c=>countItem(w,c.itemId)>=c.count);
    b.type='button';b.dataset.offer=offer.id;b.disabled=claimed||!canGive;
    b.textContent=claimed?'已换完':canGive?'交换':'材料不足';
    b.setAttribute('aria-label','交换 '+title.textContent);
    b.onclick=()=>{
     const issue=tradeSky(cb.state(),offer.id);
     set(status,issue??('交易完成：'+tradeSummary(offer.give)));
     if(!issue){cb.save();stock();}
    };
    labels.append(title,cost);row.append(im,labels,b);return row;
  }));
 }
 function show():boolean{
  const issue=moorTrader(cb.state());
  if(issue){cb.toast(issue);return false;}
  stockKey='';set(status,'');dialog.showModal();stock();cb.save();return true;
 }
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 el('sky-trader-close').onclick=close;moor.onclick=()=>{if(!open())show();};
 function frame(hide:boolean,primary:boolean){
  const w=cb.state(),e=activeSkyEvent(w);
  if(open())stock();
  brief.hidden=hide||!e||!!w.activeIsland;
  if(!e){brief.dataset.event='';lastEvent='';return;}
  if(lastEvent!==e.id){
    lastEvent=e.id;brief.dataset.event=e.kind;
    const icon=cb.icon('event-'+e.kind);if(icon)image.src=icon;
  }
  set(heading,eventName(e.kind));
  const distance=skyEventDistance(w,e),left=Math.ceil((e.expires-w.tick)/TICK_RATE);
  let subtitle=eventDescription(e.kind);
  if(e.kind==='merchant')subtitle=w.ark.anchoredIslandId?'当前已靠浮岛，解缆后才能会合游商。':e.moored?'已系缆，按 E 重开交易。':w.sky.cruising?'礼让接近，舵轮处先停船。':'相距 '+distance.toFixed(1)+' 航格 · 停在近处可交易。';
  if(e.kind==='thunder'&&distance<=2.55)subtitle=stormTell(w,e)==='warning'?'雷击预警：离开右舷！':stormTell(w,e)==='burst'?'雷暴已击中舷边。':subtitle;
  set(detail,subtitle+' · '+left+' 秒');
  moor.hidden=!primary;
 }
 return {open,close,show,frame};
}
