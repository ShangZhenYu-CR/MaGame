import { islandLandmarks,landmarkLit } from '../sim/landmarks';
import { emitters, partOfDay } from '../sim/heatField';
import type { Vec2, WorldState } from '../sim/types';

export type Project = (x:number,y:number)=>Vec2;
interface Source { x:number; y:number; radius:number; groundY:number; small:boolean }

function radial(stops:readonly [number,string][]):HTMLCanvasElement{
 const c=document.createElement('canvas');c.width=c.height=96;
 const g=c.getContext('2d')!,r=g.createRadialGradient(48,48,0,48,48,48);
 for(const [at,tone] of stops)r.addColorStop(at,tone);
 g.fillStyle=r;g.fillRect(0,0,96,96);
 return c;
}
export class Lightmap {
  private shade=document.createElement('canvas');
  private warm=document.createElement('canvas');
  private shadeCtx=this.shade.getContext('2d')!;
  private warmCtx=this.warm.getContext('2d')!;
  private hole=radial([[0,'rgba(255,255,255,.94)'],[.42,'rgba(255,255,255,.72)'],[1,'rgba(255,255,255,0)']]);
  private small=radial([[0,'rgba(255,255,255,.79)'],[.42,'rgba(255,255,255,.4)'],[1,'rgba(255,255,255,0)']]);
  private reflection=radial([[0,'rgba(255,188,104,.46)'],[.42,'rgba(242,133,51,.244)'],[1,'rgba(184,68,30,0)']]);
  private bloom=radial([[0,'rgba(255,232,179,.83)'],[.17,'rgba(255,197,112,.59)'],[.47,'rgba(242,133,51,.305)'],[.74,'rgba(184,68,30,.11)'],[1,'rgba(184,68,30,0)']]);

  paint(target:CanvasRenderingContext2D, world:WorldState, project:Project, tile:number, lantern?:Vec2):void {
    const {width,height}=target.canvas;
    const sw=Math.max(1,Math.ceil(width/4)), sh=Math.max(1,Math.ceil(height/4));
    for(const layer of [this.shade,this.warm]){
      if(layer.width!==sw||layer.height!==sh){layer.width=sw;layer.height=sh;}
    }
    const g=this.shadeCtx, l=this.warmCtx, part=partOfDay(world.timeOfDay);
    const darkness=world.weather==='whiteout'?.82:part==='暴雪夜'?.71:part==='黄昏'?.34:.08;
    l.globalAlpha=1;g.clearRect(0,0,sw,sh);l.clearRect(0,0,sw,sh);
    const curtain=g.createLinearGradient(0,0,sw*.17,sh);
    curtain.addColorStop(0,`rgba(9,24,41,${darkness*.94})`);
    curtain.addColorStop(.55,`rgba(9,24,41,${darkness})`);
    curtain.addColorStop(1,`rgba(9,24,41,${Math.min(.88,darkness*1.045)})`);
    g.fillStyle=curtain;g.fillRect(0,0,sw,sh);

    const sources:Source[]=[];
    for(const e of emitters(world)){
      if(e.kind==='heat_pipe')continue;
      const p=project(e.x,e.y),radius=tile*e.radius*(e.kind==='hearth_core'?.57:.55);
      if(p.x+radius<0||p.x-radius>width||p.y+radius<0||p.y-radius>height)continue;
      sources.push({x:p.x/4,y:(p.y-tile*(e.kind==='hearth_core'?-.32:.47))/4,groundY:p.y/4,radius:radius/4,small:false});
    }
    if(world.activeIsland)for(const mark of islandLandmarks(world)){
      if(mark.kind!=='spring'&&!landmarkLit(world,mark))continue;
      const p=project(mark.x,mark.y),radius=tile*(mark.kind==='spring'?.62:1.23);
      if(p.x+radius<0||p.x-radius>width||p.y+radius<0||p.y-radius>height)continue;
      sources.push({x:p.x/4,y:(p.y-tile*.29)/4,groundY:p.y/4,radius:radius/4,small:mark.kind==='spring'});
    }
    const p=project(world.player.x,world.player.y);
    sources.push({x:(lantern?.x??p.x+tile*.20)/4,y:(lantern?.y??p.y-tile*.43)/4,
      groundY:p.y/4,radius:tile*1.16/4,small:true});

    let xl=sw,yt=sh,xr=0,yb=0;
    for(const [i,e] of sources.entries()){
      const {x,y}=e, tt=world.tick;
      const flicker=1+Math.sin(tt*.25+i)*.07+Math.sin(tt*.73+i*1.13)*.028;
      const r=e.radius*flicker;
      xl=Math.min(xl,Math.floor(x-r));xr=Math.max(xr,Math.ceil(x+r));
      yt=Math.min(yt,Math.floor(Math.min(y-r*.68,e.groundY-r*.40)));
      yb=Math.max(yb,Math.ceil(Math.max(y+r*.68,e.groundY+r*.58)));
      g.globalCompositeOperation='destination-out';
      g.drawImage(e.small?this.small:this.hole,x-r,y-r,r*2,r*2);
      g.globalCompositeOperation='source-over';
      l.globalAlpha=Math.min(1,(.66+darkness*.55)*flicker/1.22);
      l.drawImage(this.reflection,x-r,e.groundY+r*.09-r*.48,r*2,r*.96);
      const top=r*.68;l.drawImage(this.bloom,x-top,y-top,top*2,top*2);
    }
    target.save();
    target.imageSmoothingEnabled=true;target.imageSmoothingQuality='low';
    target.drawImage(this.shade,0,0,width,height);
    // These additive channels are transparent outside the actual light
    // footprint. Copying only that rectangle preserves both overlays exactly.
    const x=Math.max(0,xl-2),y=Math.max(0,yt-2),right=Math.min(sw,xr+2),bottom=Math.min(sh,yb+2);
    const dw=right-x,dh=bottom-y;
    if(dw>0&&dh>0){
      const px=x*width/sw,py=y*height/sh,ww=dw*width/sw,hh=dh*height/sh;
      target.globalCompositeOperation='screen';target.drawImage(this.warm,x,y,dw,dh,px,py,ww,hh);
      target.globalCompositeOperation='lighter';target.globalAlpha=.13;
      target.drawImage(this.warm,x,y,dw,dh,px,py,ww,hh);
    }
    target.restore();
  }
}
