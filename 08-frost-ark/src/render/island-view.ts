import type { IslandState, Vec2 } from '../sim/types';
import type { ArtLibrary } from './art-library';
import { ovalGlow } from './atmosphere';

const zonePalettes=['t1','t2','t3','t4'] as const;
type ZonePalette=(typeof zonePalettes)[number];
const groundIds=(t:ZonePalette)=>[0,1,2,3].map(i=>'island-'+t+'-terrain-'+i);
const decalIds=(t:ZonePalette)=>['island-'+t+'-ground-decal-0','island-'+t+'-ground-decal-1'];
export const ISLAND_ART=[
  ...zonePalettes.flatMap(t=>[...groundIds(t),...decalIds(t),'island-'+t+'-cliff','island-'+t+'-cliff-natural']),
  'island-sulfur','island-sky-mithril','island-skyfire-ruin',
  'island-frost-pine','island-frost-shrub','island-frost-iron','island-coal','island-prismatic-ice',
  'island-ruin-closed','island-ruin-open','ark-gangway','ark-helm',
] as const;

export interface IslandActor {
  x:number;y:number;art:string;shadow:number;width:number;height:number;scale?:number;flip?:boolean;
}
interface Rim { x:number;y:number;side:-1|0|1 }
interface Topography {
  land:Path2D; coast:Path2D; rim:Rim[];
  minX:number;minY:number;maxX:number;maxY:number;
}
const hash=(x:number,y:number)=>((Math.imul(x+13,1664525)^Math.imul(y+33,1013904223))>>>0)/4294967296;
const frostpine=(biomeId:string)=>biomeId==='frostpine_isles';
const themes={
  t1:{rim:'rgba(201,220,224,.35)',dark:'rgba(36,61,74,.32)',sky:'rgba(224,237,239,.16)',shade:'rgba(23,64,81,.17)'},
  t2:{rim:'rgba(199,219,225,.38)',dark:'rgba(29,48,60,.32)',sky:'rgba(182,202,207,.16)',shade:'rgba(9,32,43,.20)'},
  t3:{rim:'rgba(226,170,99,.38)',dark:'rgba(51,29,30,.38)',sky:'rgba(222,179,122,.19)',shade:'rgba(69,39,37,.24)'},
  t4:{rim:'rgba(177,232,231,.43)',dark:'rgba(16,45,55,.39)',sky:'rgba(175,224,226,.19)',shade:'rgba(21,44,55,.22)'},
} as const;
const topologyCache=new WeakMap<number[],Topography>();
interface Scenery { canvas:HTMLCanvasElement; x:number;y:number;width:number;height:number }
const sceneryCache=new Map<IslandState,Scenery>();
const brushes=new WeakMap<HTMLImageElement,HTMLCanvasElement>();
const grit=(seed:number,x:number,y:number,channel=0)=>{
  let h=Math.imul(seed^Math.imul(x+31,0x62b79305)^Math.imul(y+11,0x6d2b79f5)^Math.imul(channel+3,0x1b873593),0x85ebca6b);
  h=Math.imul(h^(h>>>13),0xc2b2ae35);return ((h^(h>>>16))>>>0)/4294967296;
};
function islandPaintSeed(island:IslandState){
  let h=2166136261;
  for(const ch of island.nodeId)h=Math.imul(h^ch.charCodeAt(0),16777619);
  // Use mask/material content so two independently generated local profiles
  // with the same display ID don't inherit the same coast decorations.
  for(const tile of island.tiles)h=Math.imul(h^tile,16777619);
  return h;
}

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
  const get=(x:number,y:number)=>x>=0&&y>=0&&x<size&&y<size?(island.tiles[y*size+x]??0):0;
  let minX=size,minY=size,maxX=0,maxY=0;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const tile=get(x,y);if(!tile)continue;
    const up=!get(x,y-1),right=!get(x+1,y),down=!get(x,y+1),left=!get(x-1,y);
    minX=Math.min(minX,x); minY=Math.min(minY,y);
    maxX=Math.max(maxX,x+1); maxY=Math.max(maxY,y+1);
    outline(land,coast,x,y,up,right,down,left);
    if(down)rim.push({x:x+.5,y:y+1,side:0});
    if(left&&!down)rim.push({x:x+.045,y:y+.82,side:-1});
    if(right&&!down)rim.push({x:x+.955,y:y+.82,side:1});
  }
  const data={land,coast,rim,minX,minY,maxX,maxY};
  topologyCache.set(island.tiles,data);
  return data;
}

export function islandCameraExtent(island:IslandState):{left:number;top:number;right:number;bottom:number}{
  const t=topography(island);
  return {left:island.offsetX+t.minX,top:island.offsetY+t.minY,
    right:island.offsetX+t.maxX,bottom:island.offsetY+t.maxY};
}

// Fade the silhouette of each *painted* sample before applying it. A separate
// stencil keeps the source colours intact, without mirrored repetition or lines.
function feather(image:HTMLImageElement):HTMLCanvasElement{
  let result=brushes.get(image);if(result)return result;
  result=document.createElement('canvas');result.width=image.naturalWidth;result.height=image.naturalHeight;
  const c=result.getContext('2d')!,w=result.width,h=result.height;
  c.drawImage(image,0,0,w,h);
  c.globalCompositeOperation='destination-in';
  c.scale(w,h);
  const g=c.createRadialGradient(.49,.53,.04,.48,.51,.53);
  g.addColorStop(0,'#fff');g.addColorStop(.42,'rgba(255,255,255,.94)');
  g.addColorStop(.82,'rgba(255,255,255,.2)');g.addColorStop(1,'rgba(255,255,255,0)');
  c.fillStyle=g;c.fillRect(0,0,1,1);
  brushes.set(image,result);return result;
}

function paintScenery(art:ArtLibrary,island:IslandState,geo:Topography,t:ZonePalette):Scenery{
  const previous=sceneryCache.get(island);
  if(previous){
    sceneryCache.delete(island);sceneryCache.set(island,previous);return previous;
  }
  const {minX,minY,maxX,maxY}=geo,p=36;
  const x=minX-2,y=minY-1,width=maxX-minX+4,height=maxY-minY+5;
  const canvas=document.createElement('canvas');
  canvas.width=width*p;canvas.height=height*p;
  const c=canvas.getContext('2d')!,seed=islandPaintSeed(island),theme=themes[t];
  c.setTransform(p,0,0,p,-x*p,-y*p);
  // Weight closer faces later (exact support remains the walking mask).
  const rim=[...geo.rim].sort((a,b)=>a.y-b.y);
  for(const e of rim){
    const i=Math.floor(e.x*11),j=Math.floor(e.y*11),v=grit(seed,i,j),u=grit(seed,i,j,9);
    const natural=e.side!==0||u>.27;
    const height=e.side===0?(natural?1.14+v*1.34:1.56+v*.58):.60+v*.77;
    art.paint(c,'island-'+t+(natural?'-cliff-natural':'-cliff'),
      e.x+(v-.5)*.22,e.y-.11-(e.side===0?0:.085),1,{
        width:e.side===0?1.42+u*.42:.66+u*.25,height,rotation:(u-.52)*.14,
      });
  }

  c.save();c.clip(geo.land);
  const [base,...variants]=groundIds(t);
  // An opaque fine-grain underpainting closes every interstice; the irregular
  // large and small strokes below carry the visible material.
  art.paintTile(c,base,minX,minY,maxX-minX,maxY-minY);
  for(const [pass,step] of [3.35,1.52,.86].entries()){
    for(let j=Math.floor(minY/step)-1;j<=Math.ceil(maxY/step);j++){
      for(let i=Math.floor(minX/step)-1;i<=Math.ceil(maxX/step);i++){
        const u=grit(seed,i,j,pass*13+1),v=grit(seed,i,j,pass*13+2),
          px=(i+(j%2)*.42+(u-.5)*.85)*step,py=(j+(v-.5)*.85)*step;
        const gx=Math.max(0,Math.min(island.size-1,Math.floor(px))),gy=Math.max(0,Math.min(island.size-1,Math.floor(py)));
        const material=island.tiles[gy*island.size+gx];
        const index=(Math.floor(grit(seed,i,j,pass*13+3)*variants.length)+(material===2?1:material===4?2:0))%variants.length;
        const brush=feather(art.image(variants[index])),w=step*(2.45+u*.75),h=step*(2.34+v*.78);
        c.save();c.globalAlpha=pass===0?.95:pass===1?.47+u*.21:.20+u*.15;
        c.translate(px,py);c.rotate((grit(seed,i,j,pass*13+4)-.5)*1.3);
        c.drawImage(brush,-w*.5,-h*.5,w,h);c.restore();
      }
    }
  }
  const decals=decalIds(t);
  for(let j=minY;j<maxY;j++)for(let i=minX;i<maxX;i++){
    const density=grit(seed,i,j,31),land=island.tiles[j*island.size+i];
    if(!land||density<(land===3?.84:.899))continue;
    const px=i+.17+grit(seed,i,j,33)*.66,py=j+.18+grit(seed,i,j,34)*.64,
      s=grit(seed,i,j,35),v=grit(seed,i,j,37);
    c.globalAlpha=.26+s*.43;
    art.paint(c,decals[v<.52?0:1],px,py,1,{width:.31+s*.72,height:.19+s*.44,rotation:(v-.5)*1.83});
  }
  c.globalAlpha=1;
  c.lineCap='round';c.lineJoin='round';
  // Several clipped widths feather the visible top into the deeper painted
  // cliff plates instead of leaving an outlined geometric border.
  c.strokeStyle=theme.dark;
  for(const [line,alpha] of [[1.12,.15],[.85,.21],[.56,.28],[.34,.46],[.18,.63]]){
    c.lineWidth=line;c.globalAlpha=alpha;c.stroke(geo.coast);
  }
  c.globalAlpha=.58;c.strokeStyle=theme.rim;c.lineWidth=.044;c.stroke(geo.coast);
  c.globalAlpha=1;
  const wash=c.createLinearGradient(minX,minY,maxX,maxY);
  wash.addColorStop(0,theme.sky);wash.addColorStop(.36,'rgba(199,223,226,0)');wash.addColorStop(1,theme.shade);
  c.fillStyle=wash;c.fill(geo.land);c.restore();
  const next={canvas,x,y,width,height};
  // At most two rasters of the active/chart-neighbor island; no full-screen
  // texture reconstruction or growing phase-space cache as new islands load.
  if(sceneryCache.size>=2)sceneryCache.delete(sceneryCache.keys().next().value!);
  sceneryCache.set(island,next);return next;
}

export function paintIsland(
  c:CanvasRenderingContext2D,art:ArtLibrary,island:IslandState,project:(x:number,y:number)=>Vec2,tile:number,tick:number,
):void{
  const {offsetX,offsetY}=island, geo=topography(island), {width:W,height:H}=c.canvas;
  if(geo.minX>geo.maxX)return;
  const start=project(offsetX+geo.minX,offsetY+geo.minY);
  const end=project(offsetX+geo.maxX,offsetY+geo.maxY);
  if(start.x>W+tile||start.y>H+tile||end.x< -tile||end.y< -tile*4)return;

  const t=island.biomeId==='sulfur_rift'?'t3':island.biomeId==='aurora_zenith'?'t4':frostpine(island.biomeId)?'t2':'t1';
  // Dark under-hold diffuses into the clouds, below the distinct painted strata.
  const rx=(end.x-start.x)*.64,ry=Math.max(tile,(end.y-start.y)*.19);
  ovalGlow(c,(start.x+end.x)/2,end.y+tile*.86,rx,ry,'rgba(8,24,38,.54)','rgba(8,24,38,0)');
  const scenery=paintScenery(art,island,geo,t);
  const q=project(offsetX+scenery.x,offsetY+scenery.y);
  c.save();c.imageSmoothingQuality='low';
  c.drawImage(scenery.canvas,q.x,q.y,scenery.width*tile,scenery.height*tile);c.restore();

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
  if(node.kind==='chest'&&biomeId==='aurora_zenith'&&remaining>0)
    return {...base,art:'island-skyfire-ruin',width:1.60,height:1.48,shadow:.65};
  if(node.kind==='chest')
    return {...base,art:remaining>0?'island-ruin-closed':'island-ruin-open',width:1.52,height:1.43,shadow:.60};
  if(remaining<=0)return null;
  if(node.kind==='tree'){
    if(!frostpine(biomeId)&&v<.57)
      return {...base,art:'island-frost-shrub',width:1.28,height:1.33,shadow:.47,flip:v<.22};
    return {...base,art:'island-frost-pine',width:1.79,height:2.28,shadow:.55,scale:.90+v*.23,flip:v<.42};
  }
  if(node.kind==='ore'){
    const art=node.itemId==='sulfur_ore'?'island-sulfur':node.itemId==='sky_mithril'?'island-sky-mithril':node.itemId==='coal_chunk'?'island-coal':
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
  const vertical=bounds.height>bounds.width;
  const span=(vertical?bounds.height:bounds.width)*tile,h=tile;
  c.save();
  if(vertical){c.translate(a.x+tile,a.y);c.rotate(Math.PI/2);a.x=0;a.y=0;}
  ovalGlow(c,a.x+span/2,a.y+h*.90,span*.63,h*.58,'rgba(9,28,42,.53)','rgba(9,28,42,0)');
  const modules=Math.max(1,Math.round(span/tile));
  for(let i=0;i<modules;i++){
    // Keep the side-view timbers and guardrails in their original orientation.
    // A slight overlap tucks the authored module into both actual surfaces.
    art.paintTile(c,'ark-gangway',a.x+i*span/modules-tile*.068,a.y-h*.13,
      span/modules+tile*.136,h*1.20);
  }
  c.restore();
}
