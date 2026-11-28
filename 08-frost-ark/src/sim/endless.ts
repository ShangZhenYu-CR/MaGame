import specs from '../data/combat_m5.json';
import { inventoryChange } from './ark';
import { downDock } from './dock-direction';
import { areaAt,gangwayGeometry } from './island';
import { incapacitated } from './rescue';
import type { Vec2,WildEntity,WorldState } from './types';

const possible=['frostmane_lord','rift_carapace','icebreaker_beast'] as const;
type Ancient=(typeof possible)[number];
type Job={stamp:number;island:string;kind:Ancient;depth:number;phase:'offered'|'active'|'reward'};
type Voyage={started:number;distance:number;jobSerial:number;cleared:number;job:Job|null};
type Save=WorldState&{endlessP2?:Voyage;finaleM6?:{mode:string}};
const save=(w:WorldState)=>(w as Save).endlessP2;
export const isEndless=(w:WorldState)=>(w as Save).finaleM6?.mode==='endless'&&w.bossDefeated;
const init=(w:WorldState)=>((w as Save).endlessP2??={started:w.day,distance:0,jobSerial:0,cleared:0,job:null});
export const depthOf=(w:WorldState)=>{
 const s=save(w);return s&&isEndless(w)?1+Math.floor(s.distance/15)+Math.floor(Math.max(0,w.day-s.started)/10):1;
};
export const ancientDue=(w:WorldState)=>{
 const s=save(w),delta=s&&isEndless(w)?w.day-s.started:0;
 return delta>0&&delta%10===0;
};
export const hasAncientWhiteout=(w:WorldState)=>ancientDue(w)&&w.timeOfDay>=.74;
export function endlessTemperature(w:WorldState):number{
 if(!isEndless(w))return 0;
 return -Math.min(24,Math.floor(Math.sqrt(depthOf(w)-1)*3))-(hasAncientWhiteout(w)?13:0);
}
function offer(w:WorldState,s:Voyage){
 const choices=w.sky.islands.filter(n=>n.discovered&&n.id!=='aurora_vault'&&n.tier>=2);
 const available=choices.length?choices:w.sky.islands.filter(n=>n.id==='frostpine_cove'||n.id==='shallows_lantern');
 if(!available.length)return;
 let hash=Math.imul(w.seed^w.day,0x45d9f3b)^Math.imul(++s.jobSerial,0x27d4eb2d);
 hash=(hash^(hash>>>16))>>>0;
 const island=available[hash%available.length];
 island.discovered=true;
 s.job={stamp:w.day,island:island.id,kind:possible[(hash>>>9)%possible.length],depth:depthOf(w),phase:'offered'};
}
export function stepEndless(w:WorldState,progress=0){
 if(!isEndless(w))return;
 const s=init(w);
 if(progress>0&&Number.isFinite(progress))s.distance+=progress;
 if(!s.job||s.job.phase==='offered'&&s.job.stamp+2<=w.day)offer(w,s);
}
export function reclaimBounty(w:WorldState):{issue:string|null;claimed:boolean}{
 const s=save(w),j=s?.job;
 if(!s||!j||!isEndless(w)||incapacitated(w))return {issue:'当前没有可操作的深空悬赏。',claimed:false};
 if(j.phase==='offered'){j.phase='active';return {issue:null,claimed:false};}
 if(j.phase==='active')return {issue:'请前往目标浮岛击败古兽。',claimed:false};
 if(!inventoryChange(w,[],rewardFor(j.depth)))return {issue:'背包没有余位，奖励仍保留。',claimed:false};
 s.cleared++;s.job=null;offer(w,s);
 return {issue:null,claimed:true};
}
const rewardFor=(depth:number)=>[{itemId:'sky_mithril',count:Math.min(8,2+Math.floor(depth/3))},
 {itemId:'coal_chunk',count:Math.min(12,4+Math.floor(depth/2))},{itemId:'warm_fur',count:3}];
export const isBountyEnemy=(e:WildEntity)=>e.kind==='boss'&&e.id.startsWith('ancient_');
const idFor=(j:Job,serial:number)=>'ancient_'+serial+'_'+j.island;
const maxFor=(j:Job)=>Math.round(specs.hostiles[j.kind].hp*(1.34+Math.min(2,Math.sqrt(j.depth-1)*.16)));
export function ancientValid(w:WorldState,e:WildEntity){
 const a=save(w),j=a?.job;
 return !!a&&!!j&&isBountyEnemy(e)&&(j.phase==="active"||j.phase==="reward"&&e.hp<=0)&&e.defId===j.kind&&e.id===idFor(j,a.jobSerial)&&e.maxHp===maxFor(j);
}
export function defeatAncient(w:WorldState,e:WildEntity):boolean{
 if(!ancientValid(w,e))return false;
 save(w)!.job!.phase='reward';return true;
}
export function syncAncient(w:WorldState){
 const s=save(w),job=s?.job,bridge=gangwayGeometry(w);
 if(!s||!job||job.phase!=='active'||w.activeIsland?.nodeId!==job.island||!bridge?.deployed)return;
 const id=idFor(job,s.jobSerial);if(w.wildEntities.some(e=>e.id===id))return;
 const p=w.player;
 if(areaAt(w,p.x,p.y)!=='island')return;
 let at:Vec2|undefined;
 for(const a of [9,8,10,7,11,6])for(const b of [0,2,-2,3,-3]){
  if(at)break;
  const q=downDock(bridge.landing,bridge.side,a,b);
  if(areaAt(w,q.x,q.y)==='island')at=q;
 }
 if(!at||Math.hypot(at.x-p.x,at.y-p.y)>10)return;
 const hp=maxFor(job);
 w.wildEntities.push({id,defId:job.kind,kind:'boss',x:at.x,y:at.y,hp,maxHp:hp,stunnedTicks:0,tameProgress:0,hostile:true});
}
export function endlessView(w:WorldState){
 const s=save(w),j=s?.job;if(!s||!isEndless(w))return null;
 const size=w.ark.decks.length;
 let tiles=0,warm=0;
 for(let i=0;i<size;i++)if(w.ark.decks[i]){tiles++;if((w.ark.heatGrid[i]??w.ambientTemp)>=15)warm++;}
 const days=w.day-s.started,points=tiles+warm*2+w.beasts.length*17+days*3+s.cleared*60+depthOf(w)*12;
 return {depth:depthOf(w),days,points,cleared:s.cleared,warm,tiles,
   grade:points>=900?'S · 星海巨舰':points>=450?'A · 远航方舟':points>=220?'B · 坚暖甲板':'C · 初航',
   nextAncient:10-days%10,ancient:hasAncientWhiteout(w),
   job:j?{...j,name:'远古'+specs.hostiles[j.kind].name,zone:w.sky.islands.find(n=>n.id===j.island)?.name??j.island,
    reward:rewardFor(j.depth)}:null};
}
export function validEndless(w:WorldState):boolean{
 const s=save(w);if(s===undefined)return true;
 const int=(x:unknown)=>typeof x==='number'&&Number.isSafeInteger(x)&&x>=0;
 if(!isEndless(w)||!s||!int(s.started)||s.started>w.day||!Number.isFinite(s.distance)||s.distance<0||s.distance>1e12||
    !int(s.jobSerial)||!int(s.cleared)||s.cleared>s.jobSerial)return false;
 const j=s.job;return j===null||!!j&&int(j.stamp)&&j.stamp<=w.day&&int(j.depth)&&j.depth>=1&&j.depth<=depthOf(w)&&
  ['offered','active','reward'].includes(j.phase)&&possible.includes(j.kind)&&w.sky.islands.some(n=>n.id===j.island);
}
