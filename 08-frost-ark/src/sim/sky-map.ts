import { buildingAt, isDeck } from './ark';
import { ensureNavigationState, getNavigation } from './m3-state';
import { beastCompanions, crewCruiseMultiplier } from './beasts';
import { nextRng } from './rng';
import { canReachAurora } from './finale';
import { TICK_RATE, type IslandNode, type Vec2, type WorldState } from './types';

export const DISCOVERY_RADIUS=7;
export const DOCK_RADIUS=.65;
export const CRUISE_SPEED=.94;

const locations=[
  {id:'shallows_lantern',name:'微灯礁',biomeId:'cloud_shallows',tier:1,x:5.6,y:.1},
  {id:'shallows_ice',name:'冷帆浮岛',biomeId:'cloud_shallows',tier:1,x:10.2,y:4.8},
  {id:'frostpine_cove',name:'霜松湾',biomeId:'frostpine_isles',tier:2,x:16.6,y:-3.3},
  {id:'frostpine_gate',name:'冻林门',biomeId:'frostpine_isles',tier:2,x:20.6,y:6.3},
];

export function seedIslands(seed:number):IslandNode[]{
  let state=(seed|0)^0x3b13e6a9;
  return locations.map((v,i)=>{
    const sx=nextRng(state),sy=nextRng(sx.state);
    state=sy.state;
    const spread=i===0?.36:1.4;
    const skyX=v.x+(sx.value-.5)*spread,skyY=v.y+(sy.value-.5)*spread;
    return {id:v.id,name:v.name,biomeId:v.biomeId,tier:v.tier,seed:sy.state,skyX,skyY,
      discovered:Math.hypot(skyX,skyY)<=DISCOVERY_RADIUS,bossDefeated:false,deltas:{}};
  });
}
export function ensureNavigation(w:WorldState):void{
  if(!w.sky.islands.length)w.sky.islands=seedIslands(w.seed);
  const nav=ensureNavigationState(w);
  if(nav.targetId&&!w.sky.islands.some(n=>n.id===nav.targetId))nav.targetId=null;
  for(const node of w.sky.islands)
    if(distance(w,node)<=DISCOVERY_RADIUS)node.discovered=true;
}

const distance=(w:WorldState,node:IslandNode)=>Math.hypot(node.skyX-w.sky.x,node.skyY-w.sky.y);
const clear=(w:WorldState,x:number,y:number)=>isDeck(w,x,y)&&!buildingAt(w,x,y);

export function helmPoint(w:WorldState):Vec2{
  const c=w.ark.size/2;
  for(const [dx,dy] of [[0,-3],[1,-3],[-1,-3],[0,-2],[1,-2],[-1,-2],[-2,-3],[2,-3]]){
    if(clear(w,c+dx,c+dy))return {x:c+.5+dx,y:c+.5+dy};
  }
  for(let i=0;i<w.ark.decks.length;i++){
    const x=i%w.ark.size,y=Math.floor(i/w.ark.size);
    if(clear(w,x,y))return {x:x+.5,y:y+.5};
  }
  return {x:c+.5,y:c-2.5};
}
export function nearHelm(w:WorldState):boolean{
  const p=w.player,h=helmPoint(w);
  return !w.activeIsland&&isDeck(w,Math.floor(p.x),Math.floor(p.y))&&Math.hypot(p.x-h.x,p.y-h.y)<=1.3;
}

export function setDestination(w:WorldState,id:string):string|null{
  if(!canReachAurora(w,id))return '点燃太阳方舟后才能前往极光天穹。';
  ensureNavigation(w);
  if(!w.sky.islands.some(n=>n.id===id))return '航图上没有这个信号';
  if(w.ark.anchoredIslandId===id)return '方舟已靠泊这座浮岛';
  ensureNavigationState(w).targetId=id;
  return null;
}

export function navigationPanel(w:WorldState){
  const nav=getNavigation(w);
  const {x,y,headingX,headingY,cruising}=w.sky;
  return {x,y,headingX,headingY,cruising,targetId:nav?.targetId??null,anchoredIslandId:w.ark.anchoredIslandId,
    islands:w.sky.islands.map(n=>({...n,distance:distance(w,n)}))};
}

export function toggleCruise(w:WorldState):string|null{
  if(!nearHelm(w))return '靠近舵轮后按 E 操作';
  ensureNavigation(w);
  const nav=ensureNavigationState(w);
  if(w.sky.cruising){w.sky.cruising=false;return null;}
  if(nav.dock?.deployed)return '先到右舷收起登岛跳板';
  if(!nav.targetId||nav.targetId===w.ark.anchoredIslandId){
    const next=w.sky.islands.filter(n=>n.id!==w.ark.anchoredIslandId&&canReachAurora(w,n.id)).sort((a,b)=>distance(w,a)-distance(w,b))[0];
    if(!next)return '航图还没有其他可前往的信号';
    nav.targetId=next.id;
  }
  w.ark.anchoredIslandId=null;nav.dock=null;
  w.sky.cruising=true;
  return null;
}

function findDock(w:WorldState){
  const size=w.ark.size, helm=helmPoint(w);
  const head=Math.floor(helm.y)*size+Math.floor(helm.x),frontier=[head],seen=new Set(frontier);
  for(let i=0;i<frontier.length;i++){
    const x=frontier[i]%size,y=Math.floor(frontier[i]/size);
    for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
      const xx=x+dx,yy=y+dy,at=yy*size+xx;
      if(seen.has(at)||!clear(w,xx,yy))continue;
      seen.add(at);frontier.push(at);
    }
  }
  // Keep the whole island landing east of the outermost deck, not just east of
  // the local row; this prevents boarding through another constructed wing.
  const east=Math.max(...w.ark.decks.flatMap((deck,i)=>deck?[i%size]:[]));
  const rows=Array.from({length:size},(_,i)=>i).sort((a,b)=>Math.abs(a-size/2)-Math.abs(b-size/2));
  for(const gy of rows){
    for(let gx=east;gx>=east-2;gx--){
      const at=gy*size+gx;
      if(seen.has(at)&&clear(w,gx,gy)&&!isDeck(w,gx+1,gy))return {gx,gy};
    }
  }
  return null;
}

export function stepNavigation(w:WorldState):void{
  if(!w.sky.cruising)return;
  const nav=ensureNavigationState(w);
  const destination=w.sky.islands.find(n=>n.id===nav.targetId);
  if(!destination||!canReachAurora(w,destination.id)){w.sky.cruising=false;return;}
  const dx=destination.skyX-w.sky.x,dy=destination.skyY-w.sky.y,gap=Math.hypot(dx,dy);
  if(gap<=DOCK_RADIUS){
    const dock=findDock(w);
    if(!dock){w.sky.cruising=false;return;}
    w.sky.x=destination.skyX;w.sky.y=destination.skyY;w.sky.cruising=false;
    destination.discovered=true;
    ensureNavigation(w);
    w.ark.anchoredIslandId=destination.id;
    nav.dock={nodeId:destination.id,...dock,deployed:false};
    return;
  }
  const speed=CRUISE_SPEED*crewCruiseMultiplier(w)*(w.weather==='whiteout'?.7:w.weather==='snow'?.85:1)/TICK_RATE;
  w.sky.headingX=dx/gap;w.sky.headingY=dy/gap;
  w.sky.x+=w.sky.headingX*Math.min(gap,speed);
  w.sky.y+=w.sky.headingY*Math.min(gap,speed);
  const eyes=beastCompanions(w).some(b=>b.defId==='galehawk')?1.3:1;
  for(const n of w.sky.islands)if(distance(w,n)<=DISCOVERY_RADIUS*eyes)n.discovered=true;
}
