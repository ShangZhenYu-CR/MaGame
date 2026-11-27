import type { IslandState, Vec2 } from '../sim/types';
import type { ArtLibrary } from './art-library';
import { ovalGlow } from './atmosphere';

export const ISLAND_ART=[
  'island-t1-ground-1','island-t1-ground-2','island-t1-cliff',
  'island-t2-ground-1','island-t2-ground-2','island-t2-cliff',
  'island-frost-pine','island-frost-shrub','island-frost-iron','island-coal','island-prismatic-ice',
  'island-ruin-closed','island-ruin-open','ark-gangway','ark-helm',
] as const;

export interface IslandActor {
  x:number;y:number;art:string;shadow:number;width:number;height:number;scale?:number;flip?:boolean;
}
interface Rim { x:number;y:number;side:-1|0|1 }
interface Topography {
  land:Path2D; interior:HTMLCanvasElement; coast:Path2D; rim:Rim[];
  minX:number;minY:number;maxX:number;maxY:number;
}
const hash=(x:number,y:number)=>((Math.imul(x+13,1664525)^Math.imul(y+33,1013904223))>>>0)/4294967296;
const frostpine=(biomeId:string)=>biomeId==='frostpine_isles';
const topologyCache=new WeakMap<number[],Topography>();
const patterns=new WeakMap<HTMLImageElement,HTMLCanvasElement>();
let terrainBlend:HTMLCanvasElement|undefined;

// Trace the actual 64×64 walking mask. Only exposed corners are softened; shared
// tile edges remain exact and aggregate to one seamless painterly clip path.
function outline(a:Path2D,coast:Path2D,x:number,y:number,up:boolean,right:boolean,down:boolean,left:boolean):void {
  const d=.24,a0=up&&left?d:0,a1=up&&right?d:0,a2=down&&right?d:0,a3=down&&left?d:0;
  const edge=(sx:number,sy:number,ex:number,ey:number,exposed:boolean,index:number)=>{
    if(!exposed){a.lineTo(ex,ey);return;}
    const dx=ex-sx,dy=ey-sy,n=.065+hash(x*7+index,y*11+index)*.095;
    coast.moveTo(sx,sy);
    for(const path of [a,coast])path.bezierCurveTo(sx+dx*.31-dy*n,sy+dy*.31+dx*n,
      sx+dx*.79+dy*n*.48,sy+dy*.79-dx*n*.48,ex,ey);
  };
  a.moveTo(x+a0,y);
  edge(x+a0,y,x+1-a1,y,up,0);
  if(a1)a.quadraticCurveTo(x+1,y,x+1,y+a1);
  edge(x+1,y+a1,x+1,y+1-a2,right,1);
  if(a2)a.quadraticCurveTo(x+1,y+1,x+1-a2,y+1);
  edge(x+1-a2,y+1,x+a3,y+1,down,2);
  if(a3)a.quadraticCurveTo(x,y+1,x,y+1-a3);
  edge(x,y+1-a3,x,y+a0,left,3);
  if(a0)a.quadraticCurveTo(x,y,x+a0,y);
  a.closePath();
}

function topography(island:IslandState):Topography {
  const existing=topologyCache.get(island.tiles);
  if(existing)return existing;
  const land=new Path2D(), coast=new Path2D(), rim:Rim[]=[];
  const size=island.size;
  // One pixel per cell interpolates smoothly as a terrain material weight,
  // leaving a world-space gradation instead of blocky adjacent texture squares.
  const interior=document.createElement('canvas');
  interior.width=interior.height=size;
  const mask=interior.getContext('2d')!;
  mask.fillStyle='#fff';
  const get=(x:number,y:number)=>x>=0&&y>=0&&x<size&&y<size?(island.tiles[y*size+x]??0):0;
  let minX=size,minY=size,maxX=0,maxY=0;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const tile=get(x,y);if(!tile)continue;
    const up=!get(x,y-1),right=!get(x+1,y),down=!get(x,y+1),left=!get(x-1,y);
    minX=Math.min(minX,x); minY=Math.min(minY,y);
    maxX=Math.max(maxX,x+1); maxY=Math.max(maxY,y+1);
    outline(land,coast,x,y,up,right,down,left);
    if(tile===2||tile===4){
      mask.globalAlpha=tile===2?.87:.64;mask.fillRect(x,y,1,1);
    }
    if(down)rim.push({x:x+.5,y:y+1,side:0});
    if(left&&!down)rim.push({x:x+.045,y:y+.82,side:-1});
    if(right&&!down)rim.push({x:x+.955,y:y+.82,side:1});
  }
  const data={land,interior,coast,rim,minX,minY,maxX,maxY};
  topologyCache.set(island.tiles,data);
  return data;
}

export function islandCameraExtent(island:IslandState):{left:number;top:number;right:number;bottom:number}{
  const t=topography(island);
  return {left:island.offsetX+t.minX,top:island.offsetY+t.minY,
    right:island.offsetX+t.maxX,bottom:island.offsetY+t.maxY};
}

function mirroredTexture(c:CanvasRenderingContext2D,image:HTMLImageElement,span:number):CanvasPattern {
  let atlas=patterns.get(image);
  if(!atlas){
    atlas=document.createElement('canvas');
    const w=image.width,h=image.height;
    atlas.width=w*2;atlas.height=h*2;
    const ac=atlas.getContext('2d')!;
    for(const fx of [0,1])for(const fy of [0,1]){
      ac.save();ac.translate(fx?2*w:0,fy?2*h:0);
      ac.scale(fx?-1:1,fy?-1:1);ac.drawImage(image,0,0);ac.restore();
    }
    patterns.set(image,atlas);
  }
  const pattern=c.createPattern(atlas,'repeat')!;
  pattern.setTransform(new DOMMatrix().scale(span/image.width,span/image.height));
  return pattern;
}

export function paintIsland(
  c:CanvasRenderingContext2D,art:ArtLibrary,island:IslandState,project:(x:number,y:number)=>Vec2,tile:number,tick:number,
):void{
  const {offsetX,offsetY}=island, geo=topography(island), {width:W,height:H}=c.canvas;
  if(geo.minX>geo.maxX)return;
  const start=project(offsetX+geo.minX,offsetY+geo.minY);
  const end=project(offsetX+geo.maxX,offsetY+geo.maxY);
  if(start.x>W+tile||start.y>H+tile||end.x< -tile||end.y< -tile*4)return;

  const t=frostpine(island.biomeId)?'t2':'t1';
  // Dark under-hold diffuses into the clouds, below the distinct painted strata.
  const rx=(end.x-start.x)*.64,ry=Math.max(tile,(end.y-start.y)*.19);
  ovalGlow(c,(start.x+end.x)/2,end.y+tile*.86,rx,ry,'rgba(8,24,38,.54)','rgba(8,24,38,0)');
  for(const e of geo.rim){
    const p=project(offsetX+e.x,offsetY+e.y);
    if(p.x< -tile*2||p.x>W+tile*2||p.y< -tile*3||p.y>H+tile*2)continue;
    const v=hash(e.x*100|0,e.y*100|0);
    const h=e.side===0?1.83+v*.82:1.02+v*.35;
    art.paint(c,`island-${t}-cliff`,p.x,p.y-tile*.08,tile,{
      width:e.side===0?1.57+v*.12:.68,height:h,flip:e.side>0||(e.side===0&&v<.45),
    });
  }

  const q=project(offsetX,offsetY);
  c.save();
  c.translate(q.x,q.y);c.scale(tile,tile);
  c.clip(geo.land);
  // Sample painted surface in multi-tile continuous patches rather than stamping
  // the same JPEG-like block into each constituent collision cell.
  c.fillStyle=mirroredTexture(c,art.image(`island-${t}-ground-1`),3.8);
  c.fill(geo.land);
  const blend=terrainBlend??(terrainBlend=document.createElement('canvas'));
  if(blend.width!==W||blend.height!==H){blend.width=W;blend.height=H;}
  const layer=blend.getContext('2d')!;
  layer.clearRect(0,0,W,H);
  layer.save();layer.translate(q.x,q.y);layer.scale(tile,tile);
  layer.fillStyle=mirroredTexture(layer,art.image(`island-${t}-ground-2`),4.6);
  layer.fillRect(geo.minX,geo.minY,geo.maxX-geo.minX,geo.maxY-geo.minY);
  layer.imageSmoothingEnabled=true;
  layer.globalCompositeOperation='destination-in';
  layer.drawImage(geo.interior,0,0,island.size,island.size);
  layer.restore();
  c.save();c.resetTransform();c.drawImage(blend,0,0);c.restore();

  c.lineCap='round';c.lineJoin='round';
  c.strokeStyle=t==='t2'?'rgba(29,48,60,.32)':'rgba(36,61,74,.32)';
  c.lineWidth=.25;c.stroke(geo.coast);
  c.strokeStyle=t==='t2'?'rgba(199,219,225,.38)':'rgba(201,220,224,.35)';
  c.lineWidth=.068;c.stroke(geo.coast);
  const wash=c.createLinearGradient(geo.minX,geo.minY,geo.maxX,geo.maxY);
  wash.addColorStop(0,t==='t2'?'rgba(182,202,207,.16)':'rgba(224,237,239,.16)');
  wash.addColorStop(.36,'rgba(199,223,226,0)');
  wash.addColorStop(1,t==='t2'?'rgba(9,32,43,.20)':'rgba(23,64,81,.17)');
  c.fillStyle=wash;c.fill(geo.land);
  c.restore();

  // Translucent air wash at the western docking shelf and at the island foot.
  const breath=Math.sin(tick*.021)*tile*.21;
  ovalGlow(c,start.x+tile*.12,(start.y+end.y)*.5+breath,tile*.68,tile*1.9,
    'rgba(163,193,204,.17)','rgba(163,193,204,0)');
  ovalGlow(c,(start.x+end.x)*.5+breath,end.y+tile*1.2,rx*.64,tile*.54,
    'rgba(125,163,185,.24)','rgba(125,163,185,0)');
}

export function islandActor(
  node:{x:number;y:number;kind:string;itemId?:string},remaining:number,biomeId:string,
):IslandActor|null{
  const base={x:node.x,y:node.y};
  const v=hash(Math.floor(node.x*100),Math.floor(node.y*100));
  if(node.kind==='chest')
    return {...base,art:remaining>0?'island-ruin-closed':'island-ruin-open',width:1.52,height:1.43,shadow:.60};
  if(remaining<=0)return null;
  if(node.kind==='tree'){
    if(!frostpine(biomeId)&&v<.57)
      return {...base,art:'island-frost-shrub',width:1.28,height:1.33,shadow:.47,flip:v<.22};
    return {...base,art:'island-frost-pine',width:1.79,height:2.28,shadow:.55,scale:.90+v*.23,flip:v<.42};
  }
  if(node.kind==='ore'){
    const art=node.itemId==='coal_chunk'?'island-coal':
      node.itemId==='ice_shard'?'island-prismatic-ice':'island-frost-iron';
    return {...base,art,width:1.45,height:1.27,shadow:.50,scale:.88+v*.24,flip:v<.45};
  }
  return null;
}

export function paintGangway(c:CanvasRenderingContext2D,art:ArtLibrary,
  bounds:{x:number;y:number;width:number;height:number;deployed:boolean},project:(x:number,y:number)=>Vec2,tile:number,
):void{
  if(!bounds.deployed)return;
  const a=project(bounds.x,bounds.y);
  const span=bounds.width*tile, h=bounds.height*tile;
  ovalGlow(c,a.x+span/2,a.y+h*.90,span*.63,h*.58,'rgba(9,28,42,.53)','rgba(9,28,42,0)');
  const modules=Math.max(1,Math.round(bounds.width));
  for(let i=0;i<modules;i++){
    // Keep the side-view timbers and guardrails in their original orientation.
    // A slight overlap tucks the authored module into both actual surfaces.
    art.paintTile(c,'ark-gangway',a.x+i*span/modules-tile*.068,a.y-h*.13,
      span/modules+tile*.136,h*1.20);
  }
}
