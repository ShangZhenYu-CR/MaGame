import { incapacitated } from './rescue';
import { feetSupported, PLAYER_FOOT_RADIUS } from './ground-footprint';
import { highTierCache, highTierOre } from './m5-zones';
import biomes from '../data/biomes.json';
import { fitsOnDeck, hasBuildingContact, isDeck, walk, walkOnGround } from './ark';
import { getNavigation } from './m3-state';
import { nextRng } from './rng';
import { ISLAND_SIZE, type IslandNode, type IslandState, type ItemStack, type Vec2, type WorldState } from './types';

export const ISLAND_SNOW=1;
export const ISLAND_SLATE=2;
export const ISLAND_SHORE=3;
export const ISLAND_SOIL=4;
export const GANGWAY_LENGTH=3;
const PORT_X=9;
const PORT_Y=32;
const TILE_COUNT=ISLAND_SIZE**2;

export interface IslandResource {
  readonly id:string;
  readonly key:string;
  readonly kind:'tree'|'ore'|'chest';
  readonly itemId:string;
  readonly count:number;
  readonly x:number;
  readonly y:number;
  readonly loot:readonly ItemStack[];
}
interface GeneratedIsland {
  map:IslandState;
  resources:IslandResource[];
}
const cache=new Map<string,GeneratedIsland>();

function ground(seed:number,x:number,y:number):number{
  let mix=Math.imul(seed^Math.imul(x+13,0x1b873593)^Math.imul(y+11,0x27d4eb2d),0x85ebca6b);
  mix=Math.imul(mix^(mix>>>13),0xc2b2ae35);
  return ((mix^(mix>>>16))>>>0)/4294967296;
}

function generate(node:IslandNode,offsetX:number,offsetY:number):GeneratedIsland {
  const key=[node.id,node.seed,node.biomeId,offsetX,offsetY].join(':');
  const previous=cache.get(key);
  if(previous)return previous;
  const tiles=Array<number>(TILE_COUNT).fill(0);
  const solid=(x:number,y:number)=>{
    if(x<PORT_X||y<4||x>ISLAND_SIZE-5||y>ISLAND_SIZE-5)return false;
    if(x<18&&Math.abs(y-PORT_Y)<=1)return true;
    const nx=(x-34)/23,ny=(y-32)/22, angle=Math.atan2(ny,nx);
    const phase=ground(node.seed,1,1)*6.28;
    const outline=1+.10*Math.sin(5*angle+phase)+.085*Math.cos(3*angle-phase);
    return nx*nx+ny*ny<outline;
  };
  for(let y=0;y<ISLAND_SIZE;y++)for(let x=0;x<ISLAND_SIZE;x++){
    if(!solid(x,y))continue;
    const shore=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>!solid(x+dx,y+dy));
    const variation=Math.sin((x+node.seed%26)*.48)*Math.cos(y*.39)+ground(node.seed,x,y)*.48;
    tiles[y*ISLAND_SIZE+x]=shore?ISLAND_SHORE:variation>.67?ISLAND_SLATE:
      variation>.15&&node.tier>=2?ISLAND_SOIL:ISLAND_SNOW;
  }
  // Keep only the connected landmass reachable from the west landing.
  const frontier=[PORT_Y*ISLAND_SIZE+PORT_X],seen=new Set(frontier);
  for(let i=0;i<frontier.length;i++){
    const at=frontier[i];
    for(const neighbor of [at-1,at+1,at-ISLAND_SIZE,at+ISLAND_SIZE]){
      if(!tiles[neighbor]||seen.has(neighbor))continue;
      seen.add(neighbor);frontier.push(neighbor);
    }
  }
  for(let i=0;i<tiles.length;i++)if(!seen.has(i))tiles[i]=0;

  const resources:IslandResource[]=[];
  const add=(kind:IslandResource['kind'],x:number,y:number)=>{
    const at=y*ISLAND_SIZE+x;
    if(!tiles[at])return;
    if(resources.some(r=>Math.hypot(r.x-offsetX-x-.5,r.y-offsetY-y-.5)<2.6))return;
    const resourceKey=kind+'_'+at;
    // Seed fixes both resource positions and materials, independent of the player's route.
    const vein=ground(node.seed,x,y);
    const featured=x===16&&y===32;
    const material=highTierOre(node.tier,vein,featured)??(featured?'frost_iron_scrap':
      node.tier>=2&&vein>.5?'coal_chunk':node.tier===1&&vein>.82?'ice_shard':'frost_iron_scrap');
    const itemId=kind==='tree'?'driftwood':kind==='ore'?material:'ice_shard';
    const count=kind==='chest'?1:kind==='tree'?((node.tier===1&&x===13&&y===31)?4:3):2;
    const starterCache=(node.id==='shallows_lantern'||node.id==='shallows_ice')&&x===20&&y===32;
    const loot=kind==='chest'?(highTierCache(node.tier)??(node.tier===1?
      [{itemId:starterCache?'frost_iron_scrap':'ice_shard',count:starterCache?2:4},{itemId:'rope',count:3},{itemId:'raw_root',count:starterCache?3:2}]:
      [{itemId:'coal_chunk',count:4},{itemId:'warm_berry',count:3},{itemId:'warm_fur',count:2}])):
      [{itemId,count:1}];
    resources.push({id:node.id+'_'+resourceKey,key:resourceKey,kind,itemId,count,loot,x:offsetX+x+.5,y:offsetY+y+.5});
  };
  // Readable near-shore tutorial route with guaranteed first wood, vein and ruin.
  add('tree',13,31);add('ore',16,32);add('chest',20,32);
  let state=node.seed;
  for(let i=0;i<210&&resources.length<46;i++){
    const rx=nextRng(state),ry=nextRng(rx.state);state=ry.state;
    const x=14+Math.floor(rx.value*44),y=11+Math.floor(ry.value*42);
    if(tiles[y*ISLAND_SIZE+x]===ISLAND_SHORE)continue;
    const type=i%29===0?'chest':i%3===0||tiles[y*ISLAND_SIZE+x]===ISLAND_SLATE?'ore':'tree';
    add(type,x,y);
  }
  Object.freeze(tiles);
  const fresh={map:{nodeId:node.id,biomeId:node.biomeId,size:ISLAND_SIZE,offsetX,offsetY,tiles},resources};
  if(cache.size>=8)cache.delete(cache.keys().next().value!);
  cache.set(key,fresh);
  return fresh;
}

export function gangwayGeometry(w:WorldState){
  const dock=getNavigation(w)?.dock;
  if(!dock||dock.nodeId!==w.ark.anchoredIslandId)return null;
  return {x:dock.gx+1,y:dock.gy,width:GANGWAY_LENGTH,height:1,deployed:dock.deployed};
}
function generatedAtDock(w:WorldState):GeneratedIsland|null{
  const g=gangwayGeometry(w);
  const point=g&&w.sky.islands.find(n=>n.id===w.ark.anchoredIslandId);
  return g&&point?generate(point,g.x+g.width-PORT_X,g.y-PORT_Y):null;
}
export function dockedIsland(w:WorldState):IslandState|null{return generatedAtDock(w)?.map??null;}
export function islandNodes(w:WorldState):readonly IslandResource[]{return generatedAtDock(w)?.resources??[];}
export function islandNodeRemaining(w:WorldState,node:IslandResource):number{
  const point=w.sky.islands.find(n=>n.id===w.ark.anchoredIslandId);
  return point?Math.max(0,node.count-(point.deltas[node.key]??0)):0;
}

export function distanceToIslandNode(w:WorldState,node:IslandResource):number{
  return Math.hypot(w.player.x-node.x,w.player.y-node.y);
}
export function nearestIslandNode(w:WorldState,maxDistance=2):IslandResource|undefined{
  if(!w.activeIsland)return undefined;
  return islandNodes(w).filter(n=>distanceToIslandNode(w,n)<=maxDistance&&islandNodeRemaining(w,n)>0)
    .sort((a,b)=>distanceToIslandNode(w,a)-distanceToIslandNode(w,b))[0];
}
function liveNode(w:WorldState,node:IslandResource):IslandResource|undefined{
  return islandNodes(w).find(n=>n.id===node.id&&n.key===node.key);
}
export function harvestIssue(w:WorldState,node:IslandResource,maxDistance=1.8):string|null{
  if(incapacitated(w))return '昏迷中，等待救援。';
  if(!w.activeIsland)return '先走过跳板到浮岛上';
  const live=liveNode(w,node);
  if(!live||distanceToIslandNode(w,live)>maxDistance)return '走近资源后再收集';
  if(!islandNodeRemaining(w,live))return '这里已经采空了';
  return null;
}
export function consumeIslandNode(w:WorldState,node:IslandResource,amount=1):boolean{
  const live=liveNode(w,node),point=w.sky.islands.find(n=>n.id===w.activeIsland?.nodeId);
  if(!live||!point||!Number.isSafeInteger(amount)||amount<1||harvestIssue(w,live)||
    amount>islandNodeRemaining(w,live))return false;
  point.deltas[live.key]=(point.deltas[live.key]??0)+amount;
  return true;
}

export function areaAt(w:WorldState,x:number,y:number):'ark'|'gangway'|'island'|'void'{
  if(!Number.isFinite(x)||!Number.isFinite(y))return 'void';
  if(isDeck(w,Math.floor(x),Math.floor(y)))return 'ark';
  const g=gangwayGeometry(w);
  if(!g?.deployed)return 'void';
  if(x>=g.x&&x<g.x+g.width&&y>=g.y&&y<g.y+g.height)return 'gangway';
  const map=w.activeIsland ?? dockedIsland(w);
  if(map){
    const gx=Math.floor(x-map.offsetX),gy=Math.floor(y-map.offsetY);
    if(gx>=0&&gx<map.size&&gy>=0&&gy<map.size&&map.tiles[gy*map.size+gx])return 'island';
  }
  return 'void';
}

const distanceToDock=(w:WorldState)=>{
  const g=gangwayGeometry(w);
  return g?Math.hypot(w.player.x-(g.x-.5),w.player.y-(g.y+.5)):Infinity;
};
export const nearGangway=(w:WorldState):boolean=>areaAt(w,w.player.x,w.player.y)==='ark'&&distanceToDock(w)<=1.35;

/** The centre is already aboard. Move no further than the shoe margin
 * before removing the floor beneath the remaining overhang. */
function stepBackFromDockSeam(w:WorldState,g:NonNullable<ReturnType<typeof gangwayGeometry>>):boolean {
  const p=w.player,r=PLAYER_FOOT_RADIUS,x=g.x-r-.001;
  if(p.x>=g.x||p.x<g.x-r||p.y<g.y||p.y>=g.y+g.height||
    !fitsOnDeck(w,x,p.y)||hasBuildingContact(w,x,p.y))return false;
  p.x=x;p.vx=p.vy=0;
  return true;
}

export function toggleGangway(w:WorldState):string|null{
  const dock=getNavigation(w)?.dock;
  if(!dock||w.sky.cruising)return '请先靠泊浮岛';
  if(!nearGangway(w))return '走到右舷登岛口后再操作';
  if(dock.deployed&&!fitsOnDeck(w,w.player.x,w.player.y)&&
    !stepBackFromDockSeam(w,gangwayGeometry(w)!))return '先退回甲板站稳，再收跳板';
  dock.deployed=!dock.deployed;
  return null;
}

export function walkExpedition(w:WorldState,direction:Vec2,pace=1):void{
  const g=gangwayGeometry(w),p=w.player;
  if(incapacitated(w)){p.vx=p.vy=0;return;}
  if(!g?.deployed){
    // Older saves could retract the bridge while the player's centre was on the
    // ship but their feet still overlapped the seam. Let a step back free them
    // without moving any valid old-save position, even on an irregular deck.
    if(g&&direction.x<0&&!fitsOnDeck(w,p.x,p.y))stepBackFromDockSeam(w,g);
    walk(w,direction,pace);
    return;
  }
  const speed=areaAt(w,p.x,p.y)==='island'?.087:.095;
  walkOnGround(w,direction,speed*pace,(x,y)=>feetSupported(x,y,(px,py)=>areaAt(w,px,py)!=='void'));
  const area=areaAt(w,p.x,p.y);
  if(area!=='ark'&&(p.grapple.charging||p.grapple.active)){
    p.grapple.charging=p.grapple.active=false;p.grapple.caughtDebrisId=null;p.grapple.charge=0;
  }
  if(area==='island'){
    if(!w.activeIsland)w.activeIsland=dockedIsland(w);
  }else if(w.activeIsland)w.activeIsland=null;
}

export function expeditionTemperature(w:WorldState,x:number,y:number):number|null{
  const area=areaAt(w,x,y);
  if(area==='gangway')return w.ambientTemp-2;
  if(area!=='island')return null;
  const node=w.sky.islands.find(n=>n.id===w.ark.anchoredIslandId);
  return w.ambientTemp+(biomes.find(b=>b.id===node?.biomeId)?.baseTempOffset??0)-2;
}

/** Validate deltas against the generated bodies, not a saved terrain copy. */
export function validIslandDeltas(node:IslandNode):boolean{
  const caps=new Map(generate(node,0,0).resources.map(r=>[r.key,r.count]));
  return Object.entries(node.deltas).every(([key,value])=>Number.isSafeInteger(value)&&value>0&&value<=(caps.get(key)??0));
}
