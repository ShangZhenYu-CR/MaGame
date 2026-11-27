import { isGrappleItem } from './grapple-tools';
import { damagePlayer, healPlayer } from './rescue';
import beastData from '../data/beasts.json';
import biomes from '../data/biomes.json';
import { buildingDefs, inventoryChange, itemNames, itemStackLimits, refreshBuoyancy } from './ark';
import { heatAt, primaryHearth } from './heatField';
import { areaAt, consumeIslandNode, dockedIsland, harvestIssue, islandNodes, islandNodeRemaining } from './island';
import { ensureFauna, getFauna } from './m4-state';
import { nextRng } from './rng';
import { toolDefinition, toolStatus } from './tools';
import { TICK_RATE, type BeastEntity, type BeastRole, type BuildingInstance, type ItemStack,
  type WildEntity, type WorldState } from './types';

export const beastDefinitions=new Map(beastData.map(d=>[d.id,d]));
export const MAX_COMPANIONS=3;
const MAX_ROSTER=18,DEN_CAPACITY=2,FEED_LIMIT=50,PACK_LIMIT=12;
const RADIUS=1.8,DEN_TEMP=15;
const names=Object.fromEntries(beastData.map(d=>[d.id,d.name]));
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
const at=(b:BuildingInstance)=>({x:b.gx+(b.defId==='beast_den'?1:.5),y:b.gy+(b.defId==='beast_den'?1:.5)});
const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(n,hi));

function syncFauna(w:WorldState):void{
  const map=dockedIsland(w);
  const current=getFauna(w);
  if(!map&&!current)return;
  const fauna=ensureFauna(w);
  if((map?.nodeId??null)===fauna.islandId&&(!map||(map.offsetX===fauna.offsetX&&map.offsetY===fauna.offsetY)))return;
  if(fauna.islandId){
    fauna.fauna[fauna.islandId]=w.wildEntities.filter(e=>e.kind==='beast'&&e.homeIslandId===fauna.islandId)
      .map(e=>({...e,x:e.x-fauna.offsetX,y:e.y-fauna.offsetY}));
  }
  w.wildEntities=w.wildEntities.filter(e=>e.kind!=='beast');
  fauna.islandId=map?.nodeId??null;
  if(!map)return;
  fauna.offsetX=map.offsetX;fauna.offsetY=map.offsetY;
  const node=w.sky.islands.find(n=>n.id===map.nodeId)!;
  const saved=fauna.fauna[map.nodeId];
  let locals=saved;
  if(!locals){
    const biome=biomes.find(b=>b.id===map.biomeId);
    const species=(node.id==='aurora_vault'?[]:biome?.wildBeasts??[]).filter(id=>(beastDefinitions.get(id)?.biomeTier??9)<=node.tier);
    let rng=node.seed^0x89beec3;
    locals=species.map((id,i)=>{
      const d=beastDefinitions.get(id)!;
      const r=nextRng(rng);rng=r.state;
      const x=[13,24,28,35][i]??31,y=[33,25,38,33][i]??37;
      return {id:'wild_'+map.nodeId+'_'+id,kind:'beast',defId:id,homeIslandId:map.nodeId,
        x:x+.5+r.value*.32,y:y+.5,hp:d.maxHp,maxHp:d.maxHp,stunnedTicks:0,tameProgress:0,hostile:false};
    });
  }
  w.wildEntities.push(...locals.map(e=>({...e,x:e.x+map.offsetX,y:e.y+map.offsetY})));
  delete fauna.fauna[map.nodeId];
}

const activeWild=(w:WorldState,e:WildEntity)=>e.kind==='beast'&&e.hp>0&&e.homeIslandId===w.activeIsland?.nodeId;
export const beastWeakened=(e:WildEntity)=>e.stunnedTicks>0||(e.hp>0&&e.hp<=e.maxHp*.35);
export function nearestWildBeast(w:WorldState,maxDistance=RADIUS):WildEntity|undefined{
  if(!w.activeIsland)return undefined;
  return w.wildEntities.filter(e=>activeWild(w,e)&&distance(w.player,e)<=maxDistance)
    .sort((a,b)=>distance(w.player,a)-distance(w.player,b))[0];
}
function target(w:WorldState,id:string,range=RADIUS){
  return w.activeIsland?w.wildEntities.find(e=>e.id===id&&activeWild(w,e)&&distance(w.player,e)<=range):undefined;
}
export function useRestraint(w:WorldState,id:string,kind:'paralysis_net'|'beast_trap'):string|null{
  if(kind!=='paralysis_net'&&kind!=='beast_trap')return '需要麻痹冰网或霜铁兽夹';
  const e=target(w,id,kind==='paralysis_net'?2.8:1.65);
  if(!e)return '走近一只野生云兽再使用';
  if(e.stunnedTicks>2*TICK_RATE)return '它已被控制，趁现在投喂';
  if(!inventoryChange(w,[{itemId:kind,count:1}],[]))return '背包里没有'+itemNames.get(kind);
  e.stunnedTicks=(kind==='paralysis_net'?8:16)*TICK_RATE;
  e.hostile=false;
  return null;
}

export function strikeWildBeast(w:WorldState,id:string):string|null{
  const e=target(w,id);
  if(!e)return '请靠近要压制的云兽';
  const state=ensureFauna(w);
  if(w.tick-state.lastStrike<12)return '等它站稳再出手';
  state.lastStrike=w.tick;
  const axe=toolStatus(w,'wood_axe');
  const power=(axe?.durability?axe.tier===2?21:17:13)+Math.floor(companionStrikePower(w)*.15);
  e.hp=Math.max(0,e.hp-power);
  e.hostile=e.hp>e.maxHp*.35&&!e.stunnedTicks;
  return null;
}

export function tameBeast(w:WorldState,id:string):string|null{
  const e=target(w,id);
  if(!e)return '走近云兽后再投喂';
  const def=beastDefinitions.get(e.defId)!;
  if(!beastWeakened(e))return '用麻痹冰网或兽夹控制，或将生命压到 35% 以下';
  if(w.beasts.length>=MAX_ROSTER)return '兽群已达到收容上限';
  if(!inventoryChange(w,[{itemId:def.preferredBait,count:1}],[]))return '需要热食诱饵：'+itemNames.get(def.preferredBait);
  e.tameProgress++;
  if(e.tameProgress<def.tameFeedsRequired){
    e.stunnedTicks=Math.max(e.stunnedTicks,5*TICK_RATE);
    return null;
  }
  w.wildEntities=w.wildEntities.filter(x=>x!==e);
  const role=w.beasts.filter(b=>b.role==='companion').length<MAX_COMPANIONS?'companion':'rest';
  w.beasts.push({id:e.id,defId:e.defId,name:def.name,x:e.x,y:e.y,hp:Math.max(1,e.hp),
    maxHp:e.maxHp,warmth:80,hunger:100,role,denBuildingId:null,workCooldown:3*TICK_RATE});
  return null;
}

function facilities(w:WorldState,id:string){return w.ark.buildings.filter(b=>b.defId===id);}
function onArk(w:WorldState){return areaAt(w,w.player.x,w.player.y)==='ark';}
export function nearestBeastFacility(w:WorldState):BuildingInstance|undefined{
  return onArk(w)?w.ark.buildings.filter(b=>['beast_den','feed_trough'].includes(b.defId)&&distance(w.player,at(b))<=2.15)
    .sort((a,b)=>distance(w.player,at(a))-distance(w.player,at(b)))[0]:undefined;
}
function currentDen(w:WorldState,b:BeastEntity){
  return w.ark.buildings.find(d=>d.id===b.denBuildingId&&d.defId==='beast_den');
}
function denWarm(w:WorldState,d:BuildingInstance){
  const p=at(d);return heatAt(w,p.x,p.y)>=DEN_TEMP;
}
function assigned(w:WorldState,d:BuildingInstance,except:string){
  return w.beasts.filter(b=>b.id!==except&&b.denBuildingId===d.id).length;
}
export function setBeastRole(w:WorldState,id:string,role:BeastRole):string|null{
  const b=w.beasts.find(x=>x.id===id);
  if(!b)return '这只云兽还没加入方舟';
  if(role!=='companion'&&role!=='work'&&role!=='rest')return '未知分工';
  if(role==='companion'){
    if(b.role!==role&&w.beasts.filter(x=>x.role==='companion').length>=MAX_COMPANIONS)return '最多能带 3 只云兽同行';
    b.role=role;b.denBuildingId=null;refreshBuoyancy(w);return null;
  }
  if(!onArk(w))return '回到方舟后再分配兽窝';
  const den=facilities(w,'beast_den').find(d=>denWarm(w,d)&&assigned(w,d,id)<DEN_CAPACITY);
  if(!den)return '需要有空位、至少 15°C 的保暖兽窝';
  const seat=assigned(w,den,id);
  b.role=role;b.denBuildingId=den.id;
  // Two distinct front berths keep the animals readable and never stack them.
  b.x=den.gx+.55+seat*.9;b.y=den.gy+1.63;
  refreshBuoyancy(w);return null;
}

export function loadBeastFeed(w:WorldState,count=1):string|null{
  if(!onArk(w)||!facilities(w,'feed_trough').some(d=>distance(w.player,at(d))<=2.15))return '走近自动饲料槽后再加料';
  if(!Number.isSafeInteger(count)||count<1)return '要加入至少 1 份饲料';
  const state=ensureFauna(w);
  if(state.feed+count>FEED_LIMIT)return '饲料槽已经放不下了';
  if(!inventoryChange(w,[{itemId:'beast_feed',count}],[]))return '需要在木工台制作暖粮饲料';
  state.feed+=count;return null;
}
function active(b:BeastEntity){return b.hp>0&&b.hunger>10&&b.warmth>16;}
export function beastCompanions(w:WorldState):BeastEntity[]{
  return w.beasts.filter(b=>b.role==='companion'&&active(b)&&distance(w.player,b)<=5);
}
export function companionStrikePower(w:WorldState):number{
  return beastCompanions(w).reduce((sum,b)=>sum+(beastDefinitions.get(b.defId)?.attack??0),0);
}
function working(w:WorldState,b:BeastEntity){
  const den=currentDen(w,b);
  return b.role==='work'&&active(b)&&!!den&&denWarm(w,den);
}
export const crewCruiseMultiplier=(w:WorldState)=>w.beasts.some(b=>b.defId==='tempest_wyvern'&&working(w,b))?1.35:1;
export const crewBuoyancyBonus=(w:WorldState)=>w.beasts.some(b=>b.defId==='tempest_wyvern'&&working(w,b))?.35:0;
export const crewIndustryMultiplier=(w:WorldState,b:BuildingInstance)=>b.defId==='greenhouse'&&
  w.beasts.some(v=>v.defId==='glacierstag'&&working(w,v))?1.6:1;
export const crewSmeltBonus=(w:WorldState)=>w.beasts.some(b=>b.defId==='burrowback'&&working(w,b))?1:0;
export const crewFurnaceFuel=(w:WorldState)=>w.beasts.some(b=>b.defId==='magmalisk'&&working(w,b));
export function beastHeatEmitters(w:WorldState){
  return beastCompanions(w).flatMap(b=>{
    const radius=beastDefinitions.get(b.defId)?.heatAuraRadius??0;
    return radius?[{x:b.x,y:b.y,radius,power:b.defId==='emberfox'?29:b.defId==='magmalisk'?35:17,kind:b.defId}]:[];
  });
}

function moveToward(b:{x:number;y:number},x:number,y:number,speed:number,w:WorldState):void{
  const d=Math.hypot(x-b.x,y-b.y);
  if(d>.08){
    const n=Math.min(d,speed)/d,dx=(x-b.x)*n,dy=(y-b.y)*n;
    if(areaAt(w,b.x+dx,b.y)!=='void')b.x+=dx;
    if(areaAt(w,b.x,b.y+dy)!=='void')b.y+=dy;
  }
}
function moveCompanion(w:WorldState,b:BeastEntity,index:number){
  const p=w.player;
  const angle=(index+1)*2.1;
  const x=p.x+Math.sin(angle)*.7,y=p.y+Math.cos(angle)*.65;
  const targetLand=areaAt(w,x,y)!=='void';
  // Followers may take a different line over the narrow gangway; regroup if
  // their old line becomes impassable after boarding.
  if(distance(b,p)>4)b.x=p.x,b.y=p.y;
  moveToward(b,targetLand?x:p.x,targetLand?y:p.y,.075,w);
}

function moveWorker(w:WorldState,b:BeastEntity):void{
  const priorities:Record<string,string[]>={
    burrowback:['furnace'], emberfox:['hearth_core'], galehawk:['catch_net'],
    frostyak:['wind_wall','warm_wall'], glacierstag:['greenhouse'], magmalisk:['furnace'],
    tempest_wyvern:['buoyancy_core'],
  };
  const station=w.ark.buildings.filter(s=>priorities[b.defId]?.includes(s.defId))
    .sort((a,c)=>distance(b,at(a))-distance(b,at(c)))[0];
  if(!station)return;
  const [sw,sh]=buildingDefs.get(station.defId)?.size??[1,1];
  const spots=[{x:station.gx+sw*.5,y:station.gy+sh+.32},
    {x:station.gx-.32,y:station.gy+sh*.5},{x:station.gx+sw+.32,y:station.gy+sh*.5}];
  const spot=spots.find(p=>areaAt(w,p.x,p.y)==='ark');
  if(spot)moveToward(b,spot.x,spot.y,.033,w);
}

function work(w:WorldState,b:BeastEntity):void{
  if(b.defId==='emberfox'){
    const h=primaryHearth(w);
    const cap=h&&h.level>=2?180:120;
    if(h&&h.fuel<cap/2&&inventoryChange(w,[{itemId:'driftwood',count:1}],[]))
      h.fuel=Math.min(cap,h.fuel+18*1.25);
  }else if(b.defId==='galehawk'){
    const drift=w.sky.debris.find(d=>!d.heavy&&!d.id.startsWith('deckdrop_')&&
      d.id!==w.player.grapple.caughtDebrisId&&distance(b,d)<=9);
    if(drift&&inventoryChange(w,[],drift.loot))w.sky.debris=w.sky.debris.filter(d=>d!==drift);
  }else if(b.defId==='frostyak'){
    const wall=w.ark.buildings.find(d=>(d.defId==='wind_wall'||d.defId==='warm_wall')&&d.hp<d.maxHp);
    if(wall)wall.hp=Math.min(wall.maxHp,wall.hp+16);
    inventoryChange(w,[],[{itemId:'warm_fur',count:1}]);
  }
}

function companionWork(w:WorldState,b:BeastEntity):void{
  if(b.defId==='burrowback'&&w.activeIsland){
    const ore=islandNodes(w).find(n=>n.kind==='ore'&&!harvestIssue(w,n)&&islandNodeRemaining(w,n)>0);
    if(ore&&inventoryChange(w,[],[{itemId:ore.itemId,count:1}]))consumeIslandNode(w,ore);
  }else if(b.defId==='glacierstag'){
    w.player.warmth=Math.min(w.player.maxWarmth,w.player.warmth+5);
    healPlayer(w,2);
  }
}

function canUseTrough(w:WorldState,b:BeastEntity):boolean{
  return areaAt(w,b.x,b.y)==='ark'&&facilities(w,'feed_trough').some(t=>distance(b,at(t))<7);
}

export function beastPackContents(w:WorldState):readonly ItemStack[]{return getFauna(w)?.pack??[];}
const packAvailable=(w:WorldState)=>beastCompanions(w).some(b=>b.defId==='frostyak'&&distance(w.player,b)<=2.5);
export function transferBeastPack(w:WorldState,itemId:string,direction:'deposit'|'withdraw'):string|null{
  if(!packAvailable(w))return '随行霜角牦牛不在身边';
  if(toolDefinition(itemId)||isGrappleItem(itemId))return '耐久工具和抓钩请留在身上';
  const state=ensureFauna(w),s=state.pack.find(v=>v.itemId===itemId);
  if(direction==='deposit'){
    const max=itemStackLimits.get(itemId)??0;
    if((s&&s.count>=max)||(!s&&state.pack.length>=PACK_LIMIT))return '行囊已满';
    if(!inventoryChange(w,[{itemId,count:1}],[]))return '背包中没有这件物品';
    if(s)s.count++;else state.pack.push({itemId,count:1});
  }else{
    if(!s)return '行囊中没有这件物品';
    if(!inventoryChange(w,[],[{itemId,count:1}]))return '背包已满';
    if(--s.count<=0)state.pack=state.pack.filter(v=>v!==s);
  }
  return null;
}

export function beastPanel(w:WorldState){
  const state=getFauna(w),nearest=nearestBeastFacility(w);
  return {companions:w.beasts.filter(b=>b.role==='companion').length,maxCompanions:MAX_COMPANIONS,
    denCount:facilities(w,'beast_den').length,feed:state?.feed??0,packAvailable:packAvailable(w),pack:beastPackContents(w),
    nearFacility:nearest?.defId??null,
    beasts:w.beasts.map(b=>{
      const d=beastDefinitions.get(b.defId)!,den=currentDen(w,b);
      const status=b.warmth<=16?'失温停工':b.hunger<=10?'饥饿待喂':b.role==='companion'?'正在随行':
        !den?'未分配兽窝':!denWarm(w,den)?'兽窝太冷':b.role==='work'?'正在打工':'窝内休息';
      return {...b,preferredBait:d.preferredBait,workSkill:d.workSkill,companionSkill:d.companionSkill,status};
    }),
    wild:w.wildEntities.filter(e=>activeWild(w,e)).map(e=>{
      const d=beastDefinitions.get(e.defId)!;
      return {...e,name:names[e.defId],preferredBait:d.preferredBait,feedsRequired:d.tameFeedsRequired,weakened:beastWeakened(e)};
    }),
  };
}

export function stepBeasts(w:WorldState):void{
  syncFauna(w);
  if(w.tick%TICK_RATE===0&&w.beasts.some(b=>b.defId==='tempest_wyvern'))refreshBuoyancy(w);
  for(const e of w.wildEntities){
    if(e.kind!=='beast'||e.hp<=0)continue;
    if(e.stunnedTicks)e.stunnedTicks--;
    if(!activeWild(w,e)||e.stunnedTicks||!e.hostile)continue;
    const p=w.player,d=distance(p,e);
    if(d>5){e.hostile=false;continue;}
    if(d>.8)moveToward(e,p.x,p.y,.047,w);
    else if(w.tick%(TICK_RATE*2)===0)damagePlayer(w,(beastDefinitions.get(e.defId)?.attack??6)*.28);
  }
  let companionIndex=0;
  for(const b of w.beasts){
    if(b.role==='companion')moveCompanion(w,b,companionIndex++);
    else if(working(w,b))moveWorker(w,b);
    if(b.workCooldown>0)b.workCooldown--;
    if(w.tick%TICK_RATE===0){
      const den=currentDen(w,b);
      const warm=(!!den&&denWarm(w,den))||heatAt(w,b.x,b.y)>=15;
      const temperature=heatAt(w,b.x,b.y);
      b.warmth=clamp(b.warmth+(warm?3:temperature<0?temperature<-20?-4:-1.1:0),0,100);
      b.hunger=Math.max(0,b.hunger-(b.role==='rest'?.23:b.role==='companion'?.38:.76));
      if(b.hunger<60&&canUseTrough(w,b)){
        const state=getFauna(w);
        if(state?.feed){state.feed--;b.hunger=Math.min(100,b.hunger+43);}
      }
      if(b.role==='rest'&&warm&&b.hunger>10)b.hp=Math.min(b.maxHp,b.hp+3.5);
      if(b.warmth<=0&&b.hp>1)b.hp=Math.max(1,b.hp-1);
    }
    if(!b.workCooldown&&active(b)){
      if(working(w,b)){work(w,b);b.workCooldown=TICK_RATE*(b.defId==='frostyak'?12:7);}
      else if(b.role==='companion'){companionWork(w,b);b.workCooldown=TICK_RATE*10;}
    }
  }
}
