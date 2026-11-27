import { actionLandmark, landmarkPrompt, nearLandmark, type Landmark } from '../sim/landmarks';
import { docks } from '../sim/dock-direction';
import { areaAt, gangwayGeometry, islandNodeRemaining, islandNodes, nearestIslandNode, nearGangway, toggleGangway,
 type IslandResource } from '../sim/island';
import { helmPoint, nearHelm, toggleCruise } from '../sim/sky-map';
import { harvestIslandResource, toolStatus } from '../sim/tools';
import { itemNames } from '../sim/ark';
import type { Vec2, WorldState } from '../sim/types';

const byId=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
const set=(node:HTMLElement,s:string)=>{if(node.textContent!==s)node.textContent=s;};
type ContextAction='helm'|'deploy'|'stow'|'gather'|'open-cache'|'landmark'|'return'|'board'|'dock'|'none';
const duration=350;
export type ExpeditionArea=ReturnType<typeof areaAt>;
interface Hooks{
 state:()=>WorldState;
 message:(issue:string|null,success:string,event?:'place'|'craft'|'hit')=>void;
}
export function expeditionUi(hooks:Hooks){
 const view=byId('game-canvas'),root=byId('expedition-context'),interact=byId<HTMLButtonElement>('expedition-interact');
 const progress=byId<HTMLProgressElement>('expedition-progress');
 let current:ContextAction|null=null;
 let gathering:{node:IslandResource;finish:number;world:WorldState}|null=null;
 const area=()=>{const w=hooks.state();return areaAt(w,w.player.x,w.player.y);};
 function cruise(){
  const w=hooks.state(),running=w.sky.cruising;
  hooks.message(toggleCruise(w),running?'已停止巡航。':'方舟已起航。','place');
 }
 function gangway(){
  const w=hooks.state(),out=gangwayGeometry(w)?.deployed;
  hooks.message(toggleGangway(w),out?'跳板已收回。':'跳板已搭好，沿跳板走上浮岛。','place');
 }
 function harvest(node?:IslandResource){
  if(gathering)return;
  const w=hooks.state(),target=node??nearestIslandNode(w,1.8);
  if(!target){hooks.message('靠近树林、矿脉或遗迹箱，再按 E。','');return;}
  const kind=target.kind==='tree'?'wood_axe':target.kind==='ore'?'mining_pick':undefined;
  const tool=kind&&toolStatus(w,kind);
  if(kind&&(!tool||!tool.durability)){
   hooks.message(!tool?`先打开背包（I）制作${kind==='wood_axe'?'手斧':'矿镐'}。`:`${tool.name}已损坏，请在背包修理。`,'');
   return;
  }
  const now=performance.now();gathering={node:target,finish:now+duration,world:w};progress.hidden=false;progress.value=0;
 }
 function chosenMark():Landmark|undefined{
  const w=hooks.state(),mark=nearLandmark(w),node=nearestIslandNode(w,1.8);
  if(!mark)return;
  if(!node||Math.hypot(mark.x-w.player.x,mark.y-w.player.y)<Math.hypot(node.x-w.player.x,node.y-w.player.y))
    return mark;
 }
 function useLandmark(mark:Landmark){const result=actionLandmark(hooks.state(),mark);hooks.message(result.issue,result.message,'place');}
 function keyAction(){
  const w=hooks.state(),here=area();
  if(here==='island'){
   const mark=chosenMark();
   if(mark&&landmarkPrompt(w,mark).label)return 'landmark';
   if(mark)return null;
   return nearestIslandNode(w,1.8)?'harvest':null;
  }
  if(here!=='ark')return null;
  if(w.ark.anchoredIslandId&&nearGangway(w))return 'gangway';
  if(nearHelm(w))return 'helm';
  return null;
 }
 function use():boolean{
  const action=keyAction();
  if(action==='landmark'){const mark=chosenMark();if(!mark)return false;useLandmark(mark);return true;}
  if(action==='harvest'){harvest();return true;}
  if(action==='gangway'){gangway();return true;}
  if(action==='helm'){cruise();return true;}
  return false;
 }
 interact.onclick=use;
 function pointer(at:Vec2):boolean{
  const w=hooks.state(),a=area();
  if(a==='island'){
   const mark=chosenMark();
   if(mark&&Math.hypot(at.x-mark.x,at.y-mark.y)<1.25&&landmarkPrompt(w,mark).label){useLandmark(mark);return true;}
   const picked=islandNodes(w).filter(n=>Math.hypot(at.x-n.x,at.y-n.y)<.8&&islandNodeRemaining(w,n)>0)
      .sort((p,q)=>Math.hypot(at.x-p.x,at.y-p.y)-Math.hypot(at.x-q.x,at.y-q.y))[0];
   if(picked&&Math.hypot(w.player.x-picked.x,w.player.y-picked.y)<=1.8)harvest(picked);
   return true;
  }
  if(a==='gangway')return true;
  const g=gangwayGeometry(w);
  if(g&&nearGangway(w)&&Math.hypot(at.x-g.deck.x,at.y-g.deck.y)<.84){gangway();return true;}
  const h=helmPoint(w);
  if(nearHelm(w)&&Math.hypot(at.x-h.x,at.y-h.y)<.65){cruise();return true;}
  return false;
 }
 function cancel(){gathering=null;progress.hidden=true;}
 function update(now:number,hide=false,primary=true):ExpeditionArea{
  const w=hooks.state(),here=area(),box=gangwayGeometry(w),node=here==='island'?nearestIslandNode(w,1.8):undefined;
  if(gathering){
   if(gathering.world!==w||here!=='island'||Math.hypot(gathering.node.x-w.player.x,gathering.node.y-w.player.y)>1.8)cancel();
   else if(now>=gathering.finish){
    const {node}=gathering;cancel();
    const result=harvestIslandResource(w,node);
    hooks.message(result.ok?null:result.message,result.message,'hit');
   }else progress.value=1-(gathering.finish-now)/duration;
  }
  let action:ContextAction='none',title='',detail='',label='';
  const mark=here==='island'?chosenMark():undefined;
  if(here==='island'){
   if(mark){
    action='landmark';
    ({title,detail,label}=landmarkPrompt(w,mark));
   }else if(!node){action='return';title='浮岛探索';detail='靠近树林、矿脉和遗迹箱可采集；沿来时的跳板回船。';}
   else {
    const kind=node.kind==='tree'?'wood_axe':node.kind==='ore'?'mining_pick':undefined;
    const tool=kind&&toolStatus(w,kind),name=kind==='wood_axe'?'手斧':'矿镐';
    action=node.kind==='chest'?'open-cache':'gather';
    title=node.kind==='tree'?'冻土树林':node.kind==='ore'?'外露矿脉':'浮岛遗迹箱';
    label=gathering?'采集中…':node.kind==='chest'?'开箱':node.kind==='ore'?'开采':'采伐';
    detail=node.kind==='chest'?'收取遗迹箱内的补给':!tool?`需要${name} · 在背包（I）制作`:
      !tool.durability?`${tool.name}已损坏 · 在背包（I）修理`:
      `${itemNames.get(node.itemId)??node.itemId} ×${islandNodeRemaining(w,node)} · ${tool.name} ${tool.durability}/${tool.maxDurability}`;
   }
  }else if(here==='gangway'){action='board';title='在跳板上';detail='靠着板中央继续走，上岛和回船都不用再次按键。';}
  else if(box&&nearGangway(w)){
   action=box.deployed?'stow':'deploy';
   title=box.deployed?'跳板已搭好':'已靠泊 · '+docks[box.side].label+'登岛口';
   const verb=docks[box.side].verb;
   detail=box.deployed?'沿跳板'+verb+'走即可登岛；回到甲板后可收回。':'搭跳板后沿板'+verb+'走，进入浮岛。';
   label=box.deployed?'收跳板':'搭跳板';
  }else if(nearHelm(w)){
   action='helm';title='方舟舵轮';detail='按 N 打开航图，选择目标浮岛。';
   label=w.sky.cruising?'停航':'巡航';
  }else if(w.ark.anchoredIslandId){
   action='dock';title='已靠泊';detail='走到'+(box?docks[box.side].label:'舷侧')+'登岛口搭跳板。';
  }
  if(current!==action){current=action;root.dataset.action=action;view.dataset.context=action;}
  root.dataset.area=here;root.dataset.anchored=String(!!w.ark.anchoredIslandId);root.dataset.resourceKind=mark?'':node?.kind??'';root.dataset.landmark=mark?.kind??'';
  root.hidden=hide||action==='none';interact.hidden=!label;interact.disabled=!!gathering;
  interact.querySelector('kbd')!.hidden=!primary;
  if(title)set(byId('expedition-title'),title);
  if(detail)set(byId('expedition-detail'),detail);
  if(label)set(interact.querySelector('span')!,label);
  return here;
 }
 return {area,keyAction,use,pointer,update,cancel};
}
