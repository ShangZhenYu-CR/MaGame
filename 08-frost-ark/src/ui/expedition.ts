import { guardianLoot,takeGuardianLoot } from '../sim/guardians-p2';
import { petBond } from '../sim/beast-bond';
import { currentLeader,gainBeastXp } from '../sim/beast-growth';
import { activeCave,caveChestTaken,caveContext,caveEntrance,caveEntranceTitle,caveGuard,enterCave,nearCaveGate,useCave } from '../sim/cave';
import { collectQuarry, harvestForage, nearQuarry, nearForage, patchContents, patchReady, patchTitles, type Patch } from '../sim/forage';
import { actionLandmark, landmarkPrompt, nearLandmark, type Landmark } from '../sim/landmarks';
import { docks } from '../sim/dock-direction';
import { areaAt, gangwayGeometry, islandNodeRemaining, islandNodes, nearestIslandNode, nearGangway, toggleGangway,
 type IslandResource } from '../sim/island';
import { helmPoint, nearHelm, toggleCruise } from '../sim/sky-map';
import { harvestIslandResource, toolStatus } from '../sim/tools';
import { itemNames } from '../sim/ark';
import type { BeastEntity,Vec2,WildEntity, WorldState } from '../sim/types';

const byId=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
const set=(node:HTMLElement,s:string)=>{if(node.textContent!==s)node.textContent=s;};
type ContextAction='helm'|'deploy'|'stow'|'gather'|'open-cache'|'landmark'|'forage'|'quarry'|'cave-enter'|'cave-chest'|'cave-exit'|'cave-hunt'|'guardian-loot'|'pet'|'return'|'board'|'dock'|'none';
const duration=350;
export type ExpeditionArea=ReturnType<typeof areaAt>;
interface Hooks{
 state:()=>WorldState;
 message:(issue:string|null,success:string,event?:'place'|'craft'|'hit')=>void;
}
export function expeditionUi(hooks:Hooks){
 const view=byId('game-canvas'),root=byId('expedition-context'),interact=byId<HTMLButtonElement>('expedition-interact');
 const progress=byId<HTMLProgressElement>('expedition-progress');
 let current:ContextAction|null=null,petSelected:BeastEntity|null=null;
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
 type IslandChoice={tag:'mark';point:Landmark}|{tag:'forage';point:Patch}|{tag:'node';point:IslandResource}|{tag:'quarry';point:WildEntity};
 function islandChoice():IslandChoice|undefined{
  const w=hooks.state(),mark=nearLandmark(w),node=nearestIslandNode(w,1.8),patch=nearForage(w),quarry=nearQuarry(w);
  const candidates:IslandChoice[]=[];
  if(mark)candidates.push({tag:'mark',point:mark});
  if(node)candidates.push({tag:'node',point:node});
  if(patch)candidates.push({tag:'forage',point:patch});
  if(quarry)candidates.push({tag:'quarry',point:quarry});
  const distance=(c:IslandChoice)=>Math.hypot(c.point.x-w.player.x,c.point.y-w.player.y);
  // A harvested patch is informational only. Never let it suppress an
  // available resource or an actionable landmark in the same vicinity.
  const actionable=(c:IslandChoice)=>c.tag==='node'||c.tag==='quarry'||(c.tag==='mark'?!!landmarkPrompt(w,c.point).label:patchReady(w,c.point));
  return candidates.sort((a,b)=>Number(actionable(b))-Number(actionable(a))||distance(a)-distance(b))[0];
 }
 function shareGatherXp(w:WorldState){
  const lead=currentLeader(w);if(lead&&Math.hypot(lead.x-w.player.x,lead.y-w.player.y)<4.3)gainBeastXp(w,lead,4);
 }
 function useForage(p:Patch){
   const w=hooks.state(),issue=harvestForage(w,p);if(!issue)shareGatherXp(w);
   hooks.message(issue,'已采集：'+patchContents(p)+'。','hit');
 }
 function useLandmark(mark:Landmark){const result=actionLandmark(hooks.state(),mark);hooks.message(result.issue,result.message,'place');}
 function keyAction(){
  const w=hooks.state(),here=area();
  if(here==='cave'){
   const d=caveContext(w);return d==='exit'?'cave-exit':d==='chest'?'cave-chest':null;
  }
  if(here==='island'&&nearCaveGate(w))return 'cave-enter';
  if(here==='island'){
   if(guardianLoot(w)?.canTake)return 'guardian-loot';
   const choice=islandChoice();
   if(choice?.tag==='mark'&&landmarkPrompt(w,choice.point).label)return 'landmark';
   if(choice?.tag==='forage'&&patchReady(w,choice.point))return 'forage';
   if(choice?.tag==='node')return 'harvest';
   if(choice?.tag==='quarry')return 'quarry';
   return null;
  }
  if(here!=='ark')return null;
  if(w.ark.anchoredIslandId&&nearGangway(w))return 'gangway';
  if(nearHelm(w))return 'helm';
  return null;
 }
 function use():boolean{
  if(petSelected){
   hooks.message(petBond(hooks.state(),petSelected.id),'抚摸了'+petSelected.name+'，羁绊提升。','place');return true;
  }
  const action=keyAction();
  if(action==='cave-enter'||action==='cave-exit'||action==='cave-chest'){
    const w=hooks.state();
    const issue=action==='cave-enter'?enterCave(w):useCave(w);
    hooks.message(issue,action==='cave-enter'?'已进入地下冰窟。':action==='cave-exit'?'已返回浮岛地表。':'获得冰窟稀有图纸与物资。','place');
    return true;
  }
  if(action==='guardian-loot'){
   const loot=takeGuardianLoot(hooks.state());hooks.message(loot.issue,'取得'+loot.name+'，装备配方已解锁。','craft');return true;
  }
  if(action==='landmark'){const mark=islandChoice();if(mark?.tag!=='mark')return false;useLandmark(mark.point);return true;}
  if(action==='quarry'){const v=islandChoice();if(v?.tag!=='quarry')return false;
    hooks.message(collectQuarry(hooks.state(),v.point.id),'已拾取冻云兽肉 ×2。','hit');return true;}
  if(action==='forage'){const patch=islandChoice();if(patch?.tag!=='forage')return false;useForage(patch.point);return true;}
  if(action==='harvest'){harvest();return true;}
  if(action==='gangway'){gangway();return true;}
  if(action==='helm'){cruise();return true;}
  return false;
 }
 interact.onclick=use;
 function pointer(at:Vec2):boolean{
  const w=hooks.state(),a=area();
  if(a==='cave'){
   const c=activeCave(w),action=caveContext(w);
   const point=action==='exit'?c?.exit:action==='chest'?c?.chest:null;
   if(point&&Math.hypot(at.x-point.x,at.y-point.y)<1.1)use();
   return true;
  }
  if(a==='island'){
   const reward=guardianLoot(w);
   if(reward?.canTake&&Math.hypot(at.x-reward.x,at.y-reward.y)<.92)return use();
   const gate=caveEntrance(w);
   if(gate&&nearCaveGate(w)&&Math.hypot(at.x-gate.x,at.y-gate.y)<1.3){use();return true;}
   const v=islandChoice();
   if(v?.tag==='mark'&&Math.hypot(at.x-v.point.x,at.y-v.point.y)<1.25&&landmarkPrompt(w,v.point).label){useLandmark(v.point);return true;}
   if(v?.tag==='forage'&&Math.hypot(at.x-v.point.x,at.y-v.point.y)<.9&&patchReady(w,v.point)){useForage(v.point);return true;}
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
 function update(now:number,hide=false,primary=true,pet:BeastEntity|null=null):ExpeditionArea{
  petSelected=hide?null:pet;
  const w=hooks.state(),here=area(),box=gangwayGeometry(w),v=here==='island'?islandChoice():undefined;
  const node=v?.tag==='node'?v.point:undefined;
  if(gathering){
   if(gathering.world!==w||here!=='island'||Math.hypot(gathering.node.x-w.player.x,gathering.node.y-w.player.y)>1.8)cancel();
   else if(now>=gathering.finish){
    const {node}=gathering;cancel();
    const result=harvestIslandResource(w,node);
    if(result.ok)shareGatherXp(w);
    hooks.message(result.ok?null:result.message,result.message,'hit');
   }else progress.value=1-(gathering.finish-now)/duration;
  }
  let action:ContextAction='none',title='',detail='',label='';
  const mark=v?.tag==='mark'?v.point:undefined,patch=v?.tag==='forage'?v.point:undefined;
  if(here==='cave'){
   const where=caveContext(w),guard=caveGuard(w);
   if(where==='exit'){action='cave-exit';title='回到浮岛地表';detail='沿来时的石阶返回，可随时退出。';label='上石阶';}
   else if(where==='chest'){action='cave-chest';title='古代图纸密室箱';detail=guard&&guard.hp>0?'仍有精英守卫。击败它再开箱。':'守卫已清除，可以领取图纸。';label='开密室箱';}
   else{action='cave-hunt';title='地下冰窟';detail=guard&&guard.hp>0?'绕开预警冰刺；靠近后按 F 反击，也可用装备武器。':caveChestTaken(w)?'图纸已取，沿石阶回到地表。':'通道尽头的密室箱已解锁。';}
  }else if(here==='island'&&nearCaveGate(w)){
   const g=caveEntrance(w)!;
   action='cave-enter';title=caveEntranceTitle(g.tier);detail='下面有寒气、冰刺和守卫，原路可以返回。';label='下到地底';
  }else if(here==='island'){
   const reward=guardianLoot(w);
   if(reward?.canTake){action='guardian-loot';title=reward.name;detail='守卫掉落，拾取后可在背包制作对应装备。';label='拾取图纸';}
   else if(mark){
    action='landmark';
    ({title,detail,label}=landmarkPrompt(w,mark));
   }else if(patch){
    const available=patchReady(w,patch);
    action='forage';title=patchTitles[patch.kind];detail=available?patchContents(patch):'已采收，次日再生。';
    label=available?'采集':'';
   }else if(v?.tag==='quarry'){
    action='quarry';title='狩猎掉落';detail='收下冻云兽肉 ×2，可带回方舟加工。';label='拾取';
   }else if(!node){action='return';title='浮岛探索';detail='靠近树林、矿脉和遗迹箱可采集；按住 Shift 缓步接近云兽。';}
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
  else if(pet){
   action='pet';title=pet.name;detail='抚摸让它安心；投喂暖粮也会加深羁绊。';label='抚摸';
  }else if(box&&nearGangway(w)){
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
  root.dataset.area=here;root.dataset.anchored=String(!!w.ark.anchoredIslandId);root.dataset.resourceKind=mark?'':node?.kind??'';root.dataset.landmark=mark?.kind??'';root.dataset.forage=patch?.kind??'';root.dataset.forageReady=String(!!patch&&patchReady(w,patch));
  root.hidden=hide||action==='none';interact.hidden=!label;interact.disabled=!!gathering;
  interact.querySelector('kbd')!.hidden=!primary;
  if(title)set(byId('expedition-title'),title);
  if(detail)set(byId('expedition-detail'),detail);
  if(label)set(interact.querySelector('span')!,label);
  return here;
 }
 return {area,keyAction,use,pointer,update,cancel};
}
