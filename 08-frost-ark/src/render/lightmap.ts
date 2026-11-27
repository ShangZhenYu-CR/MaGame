import { emitters, partOfDay } from '../sim/heatField';
import type { Vec2, WorldState } from '../sim/types';

export type Project = (x:number,y:number)=>Vec2;
interface Source { x:number; y:number; radius:number; groundY:number; small:boolean }

export class Lightmap {
  private shade=document.createElement('canvas');
  private warm=document.createElement('canvas');
  private shadeCtx=this.shade.getContext('2d')!;
  private warmCtx=this.warm.getContext('2d')!;

  paint(target:CanvasRenderingContext2D, world:WorldState, project:Project, tile:number, lantern?:Vec2):void {
    const {width,height}=target.canvas;
    const sw=Math.max(1,Math.ceil(width/4)), sh=Math.max(1,Math.ceil(height/4));
    for(const layer of [this.shade,this.warm]){
      if(layer.width!==sw||layer.height!==sh){layer.width=sw;layer.height=sh;}
    }
    const g=this.shadeCtx, l=this.warmCtx, part=partOfDay(world.timeOfDay);
    const darkness=world.weather==='whiteout'?.82:part==='暴雪夜'?.71:part==='黄昏'?.34:.08;
    g.clearRect(0,0,sw,sh); l.clearRect(0,0,sw,sh);
    const curtain=g.createLinearGradient(0,0,sw*.17,sh);
    curtain.addColorStop(0,`rgba(9,24,41,${darkness*.94})`);
    curtain.addColorStop(.55,`rgba(9,24,41,${darkness})`);
    curtain.addColorStop(1,`rgba(9,24,41,${Math.min(.88,darkness*1.045)})`);
    g.fillStyle=curtain;g.fillRect(0,0,sw,sh);

    const sources:Source[]=emitters(world).map(e=>{
      const p=project(e.x,e.y);
      return {x:p.x/4,y:(p.y-tile*(e.kind==='hearth_core'?-.32:.47))/4,
        groundY:p.y/4,radius:tile*e.radius*(e.kind==='hearth_core'?.57:.55)/4,small:false};
    });
    const p=project(world.player.x,world.player.y);
    sources.push({x:(lantern?.x??p.x+tile*.20)/4,y:(lantern?.y??p.y-tile*.43)/4,
      groundY:p.y/4,radius:tile*1.16/4,small:true});

    for(const [i,e] of sources.entries()){
      const {x,y}=e, tt=world.tick;
      const flicker=1+Math.sin(tt*.25+i)*.07+Math.sin(tt*.73+i*1.13)*.028;
      const r=e.radius*flicker;
      const hole=g.createRadialGradient(x,y,0,x,y,r);
      hole.addColorStop(0,`rgba(255,255,255,${e.small?.79:.94})`);
      hole.addColorStop(.42,`rgba(255,255,255,${e.small?.40:.72})`);
      hole.addColorStop(1,'rgba(255,255,255,0)');
      g.globalCompositeOperation='destination-out';
      g.fillStyle=hole;g.fillRect(x-r,y-r,r*2,r*2);
      g.globalCompositeOperation='source-over';

      const intensity=(.66+darkness*.55)*flicker;
      l.save();
      l.translate(x,e.groundY+r*.09); l.scale(1,.48);
      const reflection=l.createRadialGradient(0,0,0,0,0,r);
      reflection.addColorStop(0,`rgba(255,188,104,${.38*intensity})`);
      reflection.addColorStop(.42,`rgba(242,133,51,${.20*intensity})`);
      reflection.addColorStop(1,'rgba(184,68,30,0)');
      l.fillStyle=reflection;l.fillRect(-r,-r,r*2,r*2);
      l.restore();

      const bloom=l.createRadialGradient(x,y,0,x,y,r*.68);
      bloom.addColorStop(0,`rgba(255,232,179,${.68*intensity})`);
      bloom.addColorStop(.17,`rgba(255,197,112,${.49*intensity})`);
      bloom.addColorStop(.47,`rgba(242,133,51,${.25*intensity})`);
      bloom.addColorStop(.74,`rgba(184,68,30,${.09*intensity})`);
      bloom.addColorStop(1,'rgba(184,68,30,0)');
      l.fillStyle=bloom;l.fillRect(x-r,y-r,r*2,r*2);
    }
    target.save();
    target.imageSmoothingEnabled=true;
    target.drawImage(this.shade,0,0,width,height);
    target.globalCompositeOperation='screen';
    target.drawImage(this.warm,0,0,width,height);
    target.globalCompositeOperation='lighter';
    target.globalAlpha=.13;
    target.drawImage(this.warm,0,0,width,height);
    target.restore();
  }
}
