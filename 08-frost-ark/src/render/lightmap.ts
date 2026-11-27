import { emitters, partOfDay } from '../sim/heatField';
import type { Vec2, WorldState } from '../sim/types';

export class Lightmap {
  private cv=document.createElement('canvas');
  private glow=this.cv.getContext('2d')!;

  paint(target:CanvasRenderingContext2D,world:WorldState,project:(x:number,y:number)=>Vec2,tile:number):void {
    const {width,height}=target.canvas;
    const sw=Math.max(1,Math.ceil(width/4)),sh=Math.max(1,Math.ceil(height/4));
    if(this.cv.width!==sw||this.cv.height!==sh){this.cv.width=sw;this.cv.height=sh;}
    const g=this.glow, part=partOfDay(world.timeOfDay);
    g.clearRect(0,0,sw,sh);
    const night=part==='暴雪夜';
    const darkness=world.weather==='whiteout'?.62:night?.49:part==='黄昏'?.26:.075;
    g.fillStyle=`rgba(14,41,67,${darkness})`;g.fillRect(0,0,sw,sh);
    for(const [i,e] of emitters(world).entries()){
      const p=project(e.x,e.y-.27);
      const x=p.x/4,y=p.y/4;
      const r=(e.kind==='hearth_core'?e.radius*.64:e.radius*.57)*tile/4*(1+.035*Math.sin(world.tick*.16+i));
      const hole=g.createRadialGradient(x,y,0,x,y,r);
      hole.addColorStop(0,'rgba(255,184,108,0.94)');hole.addColorStop(.44,'rgba(255,172,101,0.68)');hole.addColorStop(1,'rgba(255,172,101,0)');
      g.globalCompositeOperation='destination-out';g.fillStyle=hole;g.fillRect(x-r,y-r,r*2,r*2);
      g.globalCompositeOperation='source-over';
      const warm=g.createRadialGradient(x,y,.07*r,x,y,r*.89);
      warm.addColorStop(0,night?'rgba(255,165,74,0.49)':'rgba(255,177,99,0.31)');
      warm.addColorStop(.42,night?'rgba(235,119,51,0.30)':'rgba(239,137,76,0.18)');
      warm.addColorStop(1,'rgba(234,122,48,0)');g.fillStyle=warm;g.fillRect(x-r,y-r,r*2,r*2);
    }
    target.imageSmoothingEnabled=true;target.drawImage(this.cv,0,0,width,height);
    target.imageSmoothingEnabled=false;
  }
}
