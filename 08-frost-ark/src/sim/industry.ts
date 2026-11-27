import recipes from '../data/recipes.json';
import tech from '../data/tech.json';
import { buildingAt, buildingDefs, hasCost, inventoryChange, isDeck, isEdgeDeck, itemNames, itemStackLimits,
  playerOverTile, refreshBuoyancy } from './ark';
import { heatAt } from './heatField';
import { dropOnDeck, isDeckDrop } from './latte';
import { ensureIndustrySave, getIndustrySave, type IndustryStation } from './m2-state';
import { getNavigation } from './m3-state';
import { crewFurnaceFuel, crewIndustryMultiplier, crewSmeltBonus } from './beasts';
import { TICK_RATE, type BuildingInstance, type ItemStack, type WorldState } from './types';

const processable=new Set(['workbench','furnace','stove','greenhouse','catch_net','sorter_arm']);
const rows=new Map(recipes.map(r=>[r.id,r]));
const nodeById=new Map(tech.nodes.map(n=>[n.id,n]));
const UNDO_TICKS=4*TICK_RATE;
const BINS=8;

export const industryDistance=(w:WorldState,b:BuildingInstance)=>{
  const [sw,sh]=buildingDefs.get(b.defId)!.size;
  const dx=Math.max(b.gx-w.player.x,0,w.player.x-(b.gx+sw));
  const dy=Math.max(b.gy-w.player.y,0,w.player.y-(b.gy+sh));
  return Math.hypot(dx,dy);
};
const near=(w:WorldState,b:BuildingInstance)=>industryDistance(w,b)<=1.35;

export function nearestIndustry(w:WorldState):BuildingInstance|undefined {
  return w.ark.buildings.filter(b=>processable.has(b.defId)&&near(w,b))
    .sort((a,b)=>industryDistance(w,a)-industryDistance(w,b))[0];
}

function stationFor(w:WorldState,b:BuildingInstance):IndustryStation {
  return ensureIndustrySave(w).stations[b.id]??={intake:[],output:[],job:null,cycle:0};
}

export function efficiencyAt(w:WorldState,b:BuildingInstance):number {
  const [sw,sh]=buildingDefs.get(b.defId)?.size??[1,1];
  let min=Infinity;
  for(let y=0;y<sh;y++)for(let x=0;x<sw;x++)min=Math.min(min,heatAt(w,b.gx+x+.5,b.gy+y+.5));
  return min < -20 ? 0 : min < 0 ? .4 : min >= 15 ? 1 : .7;
}

function merge(contents:readonly ItemStack[],additions:readonly ItemStack[]):ItemStack[]|null {
  const next=contents.map(s=>({...s}));
  for(const {itemId,count} of additions){
    const stack=next.find(s=>s.itemId===itemId);
    if((stack?.count??0)+count>(itemStackLimits.get(itemId)??0)||(!stack&&next.length>=BINS))return null;
    if(stack)stack.count+=count;else next.push({itemId,count});
  }
  return next;
}

const isRecipeUnlocked=(w:WorldState,id:string)=>tech.nodes.some(n=>w.unlockedTech.includes(n.id)&&n.unlocksRecipes.includes(id));
const recipeInputs=(w:WorldState,r:typeof recipes[number])=>r.station==='furnace'&&crewFurnaceFuel(w)
  ?r.inputs.filter(s=>s.itemId!=='coal_chunk'):r.inputs;
const recipeOutput=(w:WorldState,r:typeof recipes[number])=>r.id==='smelt_frost_iron'
  ?{...r.output,count:r.output.count+crewSmeltBonus(w)}:r.output;
function recipeIssue(w:WorldState,b:BuildingInstance,r:typeof recipes[number],s:IndustryStation|undefined):string|null{
  if(!near(w,b))return '请先走近设备';
  if(!isRecipeUnlocked(w,r.id))return '请先在木工台研究该配方';
  if(s?.job)return '设备正处理上一批';
  if(!efficiencyAt(w,b))return '设备结冻，先把这里暖起来';
  if(!merge(s?.output??[],[recipeOutput(w,r)]))return '产出格已满，先取走物资';
  if(!hasCost(w,recipeInputs(w,r)))return '材料不足';
  return null;
}

function linkedNet(sorter:BuildingInstance,net:BuildingInstance):boolean{
  return net.defId==='catch_net'&&Math.abs(sorter.gx-net.gx)+Math.abs(sorter.gy-net.gy)<=3;
}

export function industryPanel(w:WorldState,buildingId:string){
  const b=w.ark.buildings.find(v=>v.id===buildingId&&processable.has(v.defId));
  if(!b||!near(w,b))return null;
  const s=getIndustrySave(w)?.stations[b.id],efficiency=efficiencyAt(w,b);
  const job=s?.job?{recipeId:s.job.recipeId,progress:s.job.progress/TICK_RATE,duration:s.job.duration/TICK_RATE}:null;
  const lockedNet=b.defId==='catch_net'&&!isEdgeDeck(w,b.gx,b.gy);
  const noNet=b.defId==='sorter_arm'&&!w.ark.buildings.some(net=>linkedNet(b,net));
  return {
    id:b.id,defId:b.defId,name:buildingDefs.get(b.defId)!.name,efficiency,job,
    recipes:recipes.filter(r=>r.station===b.defId).map(r=>({...r,inputs:recipeInputs(w,r),output:recipeOutput(w,r),seconds:r.seconds??0,issue:recipeIssue(w,b,r,s)})),
    output:s?.output??[],intake:s?.intake??[],
    status:!efficiency?'结冻停机':lockedNet?'请在网栏外侧留出一格开放云海':noNet?'附近没有捕捞网栏':
      b.defId==='catch_net'?'拦截漂流残骸，可手动取货':b.defId==='sorter_arm'?'自动收取三格内网栏物资':
      job?(efficiency<1?'低温减速，正在加工':'正在加工'):'待机',
  };
}

export function startIndustry(w:WorldState,buildingId:string,recipeId:string):string|null {
  const b=w.ark.buildings.find(v=>v.id===buildingId),r=rows.get(recipeId);
  if(!b||!r||r.station!==b.defId||!r.seconds)return '这里不能加工该配方';
  const issue=recipeIssue(w,b,r,getIndustrySave(w)?.stations[b.id]);
  if(issue)return issue;
  if(!inventoryChange(w,recipeInputs(w,r),[]))return '材料不足';
  stationFor(w,b).job={recipeId,progress:0,duration:r.seconds*TICK_RATE,cold:0,paid:recipeInputs(w,r).map(s=>({...s}))};
  return null;
}

export function collectIndustry(w:WorldState,buildingId:string):string|null {
  const b=w.ark.buildings.find(v=>v.id===buildingId&&processable.has(v.defId));
  if(!b||!near(w,b))return '走近设备后再取货';
  const s=getIndustrySave(w)?.stations[b.id];
  if(!s)return '还没有可领取的物资';
  const goods=b.defId==='catch_net'?s.intake:s.output;
  if(!goods.length)return '还没有可领取的物资';
  if(!inventoryChange(w,[],goods))return '背包空间不足，物资已保留';
  if(b.defId==='catch_net')s.intake=[];else s.output=[];
  return null;
}

function techIssue(w:WorldState,id:string):string|null {
  const node=nodeById.get(id);
  if(!node||w.unlockedTech.includes(id))return '已经解锁';
  if(!w.ark.buildings.some(b=>b.defId==='workbench'&&near(w,b)))return '走近木工台后再研究';
  if(!node.prerequisite||!node.researchCost||!w.unlockedTech.includes(node.prerequisite))return '先完成上一阶段研究';
  return hasCost(w,node.researchCost)?null:
    '研究需要'+node.researchCost.map(c=>itemNames.get(c.itemId)+' ×'+c.count).join('、');
}
export function techOptions(w:WorldState){
  return tech.nodes.map(n=>({id:n.id,name:n.name,unlocked:w.unlockedTech.includes(n.id),
    detail:n.id==='tier2_automation'?'熔炉、捕捞网栏、分拣臂、热力中继塔和浮力核心':
      n.id==='tier3_fortress'?'加固铁甲板、玻璃温室与暖绒保温墙 · 霜铁锭 ×1、冰晶碎块 ×2':'木工台、灶台与基础建造',
    issue:techIssue(w,n.id)}));
}
export function unlockTech(w:WorldState,techId:string):string|null {
  const node=nodeById.get(techId);
  if(!node?.researchCost)return '没有这项可研究的工艺';
  const issue=techIssue(w,techId);
  if(issue)return issue;
  if(!inventoryChange(w,node.researchCost,[]))return '研究材料不足';
  w.unlockedTech.push(techId);
  return null;
}

export function stepIndustry(w:WorldState):void {
  const state=getIndustrySave(w);
  if(state?.removal&&state.removal.expires<=w.tick)settleRemoval(w);
  for(const b of w.ark.buildings) {
    if(!processable.has(b.defId))continue;
    const efficiency=efficiencyAt(w,b)*crewIndustryMultiplier(w,b),s=getIndustrySave(w)?.stations[b.id];
    if(s?.job){
      const job=s.job,recipe=rows.get(job.recipeId)!;
      if(!efficiency&&b.defId==='greenhouse'){
        // Frost burns a crop after 30 seconds of continuous exposure.
        if(++job.cold>=30*TICK_RATE)s.job=null;
      }else if(efficiency){
        job.cold=0;
        job.progress=Math.min(job.duration,job.progress+efficiency);
        if(job.progress>=job.duration){
          const output=merge(s.output,[recipeOutput(w,recipe)]);
          if(output){s.output=output;s.job=null;}
        }
      }
    }
    if(!efficiency||(b.defId!=='catch_net'&&b.defId!=='sorter_arm'))continue;
    const active=stationFor(w,b);
    active.cycle+=efficiency;
    if(active.cycle<TICK_RATE)continue;
    active.cycle-=TICK_RATE;
    if(b.defId==='catch_net'&&isEdgeDeck(w,b.gx,b.gy)){
      const d=w.sky.debris.find(v=>!isDeckDrop(v)&&v.id!==w.player.grapple.caughtDebrisId&&
        Math.hypot(v.x-b.gx-.5,v.y-b.gy-.5)<=2.15&&merge(active.intake,v.loot));
      if(d){
        active.intake=merge(active.intake,d.loot)!;
        w.sky.debris=w.sky.debris.filter(v=>v!==d);
      }
    }
    if(b.defId==='sorter_arm') {
      for(const net of w.ark.buildings){
        if(!linkedNet(b,net))continue;
        const upstream=getIndustrySave(w)?.stations[net.id];
        if(!upstream?.intake.length)continue;
        const next=merge(active.output,[upstream.intake[0]]);
        if(next){active.output=next;upstream.intake=upstream.intake.slice(1);break;}
      }
    }
  }
}

export function pendingDismantle(w:WorldState){
  const r=getIndustrySave(w)?.removal;
  if(!r)return null;
  const name=buildingDefs.get(r.building?.defId??(r.deck===2?'iron_deck':'wood_deck'))!.name;
  return {name,remainingSeconds:Math.max(0,r.expires-w.tick)/TICK_RATE};
}

function connectedWithout(w:WorldState,gx:number,gy:number):boolean{
  const hearth=w.ark.buildings.find(b=>b.defId==='hearth_core');
  if(!hearth)return false;
  const i=hearth.gy*w.ark.size+hearth.gx;
  const frontier=[i],seen=new Set(frontier);
  for(let j=0;j<frontier.length;j++){
    const x=frontier[j]%w.ark.size,y=Math.floor(frontier[j]/w.ark.size);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const xx=x+dx,yy=y+dy,at=yy*w.ark.size+xx;
      if((xx===gx&&yy===gy)||!isDeck(w,xx,yy)||seen.has(at))continue;
      frontier.push(at);seen.add(at);
    }
  }
  return seen.size===w.ark.decks.filter(Boolean).length-1;
}

export function dismantleIssue(w:WorldState,gx:number,gy:number):string|null {
  if(!isDeck(w,gx,gy))return '这里没有可拆除的建筑或甲板';
  if(w.activeIsland)return '返回方舟后才能拆除';
  const dock=getNavigation(w)?.dock;
  if(dock?.gx===gx&&dock.gy===gy)return '靠泊期间不能拆除登岛口';

  if(getIndustrySave(w)?.removal)return '上一项仍在撤销期';
  const b=buildingAt(w,gx,gy);
  if(b?.defId==='hearth_core'||b?.id==='storage_main')return '开局主炉与储物箱不可拆除';
  if(b){
    const d=buildingDefs.get(b.defId)!;
    if(d.buoyancyDelta>0&&w.ark.buoyancyMax-d.buoyancyDelta<w.ark.buoyancyUsed)return '拆掉浮力核心会使方舟超载';
  }else{
    if(playerOverTile(w,gx,gy))return '先离开这块甲板';
    if(!connectedWithout(w,gx,gy))return '不能拆断方舟甲板';
    if(w.sky.debris.some(d=>isDeckDrop(d)&&Math.floor(d.x)===gx&&Math.floor(d.y)===gy))return '先捡起甲板上的物资';
  }
  return null;
}
export function dismantle(w:WorldState,gx:number,gy:number):string|null {
  const issue=dismantleIssue(w,gx,gy);
  if(issue)return issue;
  const b=buildingAt(w,gx,gy),state=ensureIndustrySave(w),at=gy*w.ark.size+gx;
  state.removal={gx:b?.gx??gx,gy:b?.gy??gy,deck:b?0:w.ark.decks[at],
    building:b??null,station:b?(state.stations[b.id]??null):null,expires:w.tick+UNDO_TICKS};
  if(b){w.ark.buildings=w.ark.buildings.filter(x=>x!==b);delete state.stations[b.id];}
  else w.ark.decks[at]=0;
  refreshBuoyancy(w);
  return null;
}
export function undoDismantle(w:WorldState):string|null {
  const state=getIndustrySave(w),r=state?.removal;
  if(!state||!r||r.expires<=w.tick)return '没有可以撤销的拆除';
  if(r.building){
    const [sw,sh]=buildingDefs.get(r.building.defId)!.size;
    for(let y=0;y<sh;y++)for(let x=0;x<sw;x++) {
      if(playerOverTile(w,r.gx+x,r.gy+y))return '先走出建筑占用的格子';
    }
    w.ark.buildings.push(r.building);
    if(r.station)state.stations[r.building.id]=r.station;
  }else{
    w.ark.decks[r.gy*w.ark.size+r.gx]=r.deck;
    w.ark.heatGrid[r.gy*w.ark.size+r.gx]=w.ambientTemp;
  }
  state.removal=null;
  refreshBuoyancy(w);
  return null;
}
function settleRemoval(w:WorldState):void{
  const state=getIndustrySave(w)!,r=state.removal!;
  const id=r.building?.defId??(r.deck===2?'iron_deck':'wood_deck');
  const refund=[...buildingDefs.get(id)!.cost,...(r.station?.intake??[]),...(r.station?.output??[])];
  if(r.station?.job)refund.push(...(r.station.job.paid??rows.get(r.station.job.recipeId)!.inputs));
  state.removal=null;
  if(!inventoryChange(w,[],refund))dropOnDeck(w,refund);
}
