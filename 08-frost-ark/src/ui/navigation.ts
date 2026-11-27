import { docks } from '../sim/dock-direction';
import { cruiseSpeed } from '../sim/sky-map';
import { DISCOVERY_RADIUS, DOCK_RADIUS, nearHelm, navigationPanel, setDestination, toggleCruise } from '../sim/sky-map';
import { gangwayGeometry } from '../sim/island';
import { canReachAurora } from '../sim/finale';
import type { WorldState } from '../sim/types';
import biomes from '../data/biomes.json';

type Route=ReturnType<typeof navigationPanel>;
type Marker=Route['islands'][number];
const get=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
const put=(el:HTMLElement,text:string)=>{if(el.textContent!==text)el.textContent=text;};
const region=new Map(biomes.map(b=>[b.id,b]));
const islandTitle=(p:Marker)=>p.discovered?p.name:`未识别浮岛 · T${p.tier}`;
const units=(n:number)=>n.toFixed(1)+' 航格';
interface ChartHooks{
 state:()=>WorldState;
 icon:(id:string)=>string|undefined;
 close:()=>void;
 onCommand:(issue:string|null,success:string)=>void;
}
export function navigationUi(hooks:ChartHooks){
 const dialog=get<HTMLDialogElement>('sky-map'),close=get<HTMLButtonElement>('sky-map-close'),toggle=get('sky-map-toggle');
 const list=get('sky-island-list'),marks=get('sky-markers'),status=get('sky-nav-status'),hint=get('sky-map-hint');
 const set=get<HTMLButtonElement>('sky-set-course'),cruise=get<HTMLButtonElement>('sky-cruise');
 const line=document.getElementById('sky-line')!,scan=document.getElementById('sky-scan-ring')!,dock=document.getElementById('sky-dock-ring')!;
 let selected:string|null=null,notice='',noticeUntil=0,key='',last=0;
 const buttons=new Map<string,{list:HTMLButtonElement,mark:HTMLButtonElement,name:HTMLElement,dist:HTMLElement}>();
 function select(id:string){selected=id;notice='';paint(true);}
 function chartButton(marker:Marker,scene:boolean):HTMLButtonElement{
  const b=document.createElement('button');b.type='button';b.className=scene?'sky-marker':'sky-island';
  if(scene)b.dataset.chartIsland=marker.id;else b.dataset.islandId=marker.id;
  b.onclick=()=>select(marker.id);
  const src=hooks.icon('island-tier-'+marker.tier);
  if(src){const img=document.createElement('img');img.src=src;img.alt='';b.append(img);}
  else if(scene){const t=document.createElement('span');t.textContent='T'+marker.tier;b.append(t);}
  return b;
 }
 function rebuild(islands:Marker[]){
  const signature=islands.map(v=>v.id).join('|');if(signature===key)return;
  const focus=(document.activeElement as HTMLElement|null)?.dataset.islandId;key=signature;
  buttons.clear();list.replaceChildren();marks.replaceChildren();
  for(const item of islands){
   const li=chartButton(item,false),mark=chartButton(item,true),name=document.createElement('span'),dist=document.createElement('small');
   li.append(name,dist);list.append(li);marks.append(mark);buttons.set(item.id,{list:li,mark,name,dist});
  }
  if(focus) buttons.get(focus)?.list.focus({preventScroll:true});
 }
 const courseStatus=(nav:Route)=>(nav.anchoredIslandId?'docked':nav.cruising?'cruising':'stopped');
 function paint(force=false,now=performance.now()){
  if(!dialog.open||(!force&&now-last<120))return;
  last=now;const w=hooks.state(),nav=navigationPanel(w);
  rebuild(nav.islands);
  const mode=courseStatus(nav);status.dataset.navState=mode;
  const anchor=nav.islands.find(v=>v.id===nav.anchoredIslandId),target=nav.islands.find(v=>v.id===nav.targetId);
  const heading=Math.round((Math.atan2(nav.headingX,-nav.headingY)*180/Math.PI+360)%360).toString().padStart(3,'0');
  const modeLabel=mode==='docked'?`已靠泊 · ${anchor?.name??'浮岛'}`:mode==='cruising'?`巡航中${target?' · '+islandTitle(target):''}`:'停泊中';
  const speed=w.sky.cruising?' · '+cruiseSpeed(w).toFixed(2)+' 云里/秒':'';
  put(status,`${modeLabel}${speed}　航向 ${heading}°　方位 (${nav.x.toFixed(1)}, ${nav.y.toFixed(1)})`);
  if(selected&&!buttons.has(selected))selected=null;
  const choice=nav.islands.find(v=>v.id===selected);
  put(get('sky-destination'),choice?islandTitle(choice):'未选择浮岛');
  const zone=choice&&region.get(choice.biomeId);
  put(get('sky-destination-detail'),choice?
   `${choice.discovered?zone?.name??'已发现浮岛':'未实地探测的航图信号'} · T${choice.tier} · ${units(choice.distance)}${choice.distance<=DOCK_RADIUS?' · 靠泊范围内':''}`:
   '点击航图或右侧记录，查看浮岛距离与所在风区。');
  put(set,choice&&choice.id===nav.targetId?'已设为目的地':'设为目的地');
  const locked=!!choice&&!canReachAurora(w,choice.id);
  if(locked)put(get('sky-destination-detail'),'极光天穹 · 点燃太阳方舟后开放');
  set.disabled=locked||!choice||!nearHelm(w)||choice.id===nav.anchoredIslandId||choice.id===nav.targetId;
  const connection=gangwayGeometry(w),bridge=connection?.deployed;
  cruise.disabled=!nearHelm(w)||(!nav.cruising&&!!bridge);
  cruise.dataset.cruising=String(nav.cruising);put(cruise,nav.cruising?'停止巡航':nav.anchoredIslandId?'解缆巡航':'开始巡航');
  put(hint,now<noticeUntil?notice:nearHelm(w)?bridge?'离港前请先到'+docks[connection!.side].label+'收起登岛跳板。':'设置目的地后按「开始巡航」，方舟抵达时会自动靠泊。':'航图可随时查看；走近甲板北面的舵轮才能改航向。');
  // The ship is always the chart centre. Zoom to cover the local navigation envelope.
  const extentX=Math.max(DISCOVERY_RADIUS*1.12,...nav.islands.map(v=>Math.abs(v.skyX-nav.x)));
  const extentY=Math.max(DISCOVERY_RADIUS*1.12,...nav.islands.map(v=>Math.abs(v.skyY-nav.y)));
  const k=Math.min(246/extentX,151/extentY);
  for(const [el,r] of [[scan,DISCOVERY_RADIUS],[dock,DOCK_RADIUS]] as const){el.setAttribute('rx',String(r*k));el.setAttribute('ry',String(r*k));}
  let d='M300 200L300 200';const route=target??choice;
  for(const item of nav.islands){
   const node=buttons.get(item.id)!;
   const x=300+(item.skyX-nav.x)*k,y=200+(item.skyY-nav.y)*k;
   node.mark.style.left=x/6+'%';node.mark.style.top=y/4+'%';
   node.mark.dataset.discovered=String(item.discovered);
   node.mark.setAttribute('aria-label',`${islandTitle(item)}，${units(item.distance)}`);
   const pressed=String(item.id===selected);
   node.mark.setAttribute('aria-pressed',pressed);node.list.setAttribute('aria-pressed',pressed);
   put(node.name,islandTitle(item));
   put(node.dist,item.id===nav.anchoredIslandId?'靠泊':units(item.distance));
   if(item===route)d=`M300 200L${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  line.setAttribute('d',d);
 }
 function issueResult(issue:string|null,message:string){
  notice=issue??message;noticeUntil=performance.now()+3500;hooks.onCommand(issue,message);paint(true);
 }
 set.onclick=()=>{
  if(!selected)return;
  const w=hooks.state(),node=navigationPanel(w).islands.find(v=>v.id===selected);
  if(node)issueResult(setDestination(w,node.id),`已设航向：${islandTitle(node)}`);
 };
 cruise.onclick=()=>{const w=hooks.state(),was=w.sky.cruising;issueResult(toggleCruise(w),was?'已停止巡航。':'方舟已起航。');};
 close.onclick=hooks.close;
 dialog.addEventListener('cancel',e=>{e.preventDefault();hooks.close();});
 return {
  open:()=>dialog.open,paint,
  show(){
   if(dialog.open)return;
   const nav=navigationPanel(hooks.state());
   selected=nav.targetId??nav.anchoredIslandId??nav.islands.find(v=>v.discovered)?.id??null;notice='';noticeUntil=0;
   dialog.showModal();toggle.setAttribute('aria-expanded','true');paint(true);close.focus();
  },
  hide(restoreFocus=true){
   if(!dialog.open)return;
   dialog.close();toggle.setAttribute('aria-expanded','false');if(restoreFocus)toggle.focus({preventScroll:true});
  },
 };
}
