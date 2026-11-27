import { inheritedMorph,type Variant } from '../sim/breeding';
import beasts from '../data/beasts.json';
import type { Vec2, WorldState } from '../sim/types';
import { clamp, ovalGlow } from './atmosphere';

interface BeastVisual { art:string;width:number;height:number;shadow:number;lift?:number }
const visuals:Record<string,BeastVisual>={
  burrowback:{art:'beast-burrowback',width:1.14,height:1.03,shadow:.47},
  emberfox:{art:'beast-emberfox',width:1.30,height:1.24,shadow:.48},
  galehawk:{art:'beast-galehawk',width:1.34,height:1.18,shadow:.39,lift:.22},
  frostyak:{art:'beast-frostyak',width:1.76,height:1.55,shadow:.70},
  glacierstag:{art:'beast-glacierstag',width:1.41,height:1.86,shadow:.54},
  magmalisk:{art:'beast-magmalisk',width:1.89,height:1.38,shadow:.75},
  tempest_wyvern:{art:'beast-tempest-wyvern',width:2.16,height:1.77,shadow:.79,lift:.23},
};
export const BEAST_ART=Object.values(visuals).map(v=>v.art);
const definitions=new Map(beasts.map(d=>[d.id,d]));

interface BeastMark {
  hp:number; restraint:boolean; progress:number; feeds:number; wild:boolean; resting:boolean;
}
export interface BeastActor extends BeastVisual {
  id:string;x:number;y:number;float:number;flip:boolean;scale:number;rotation:number;tint?:Variant;beastMark?:BeastMark;
}

export class BeastScene {
  private recent=new Map<string,{x:number;y:number;flip:boolean;lastMotion:number}>();
  actors(w:WorldState,tile:number):BeastActor[]{
    const actors:BeastActor[]=[], alive=new Set<string>();
    const add=(id:string,kind:string,x:number,y:number,mark?:BeastMark,tint?:Variant,young=false)=>{
      const visual=visuals[kind];if(!visual)return;
      alive.add(id);
      const prev=this.recent.get(id);
      const next=prev??{x,y,flip:false,lastMotion:-999};
      const dx=x-next.x,dy=y-next.y,d=Math.hypot(dx,dy);
      if(d>.006&&d<1){next.lastMotion=w.tick;if(Math.abs(dx)>.008)next.flip=dx>0;}
      else if(d>=1||next.lastMotion>w.tick)next.lastMotion=-999;
      next.x=x;next.y=y;this.recent.set(id,next);
      const walking=w.tick-next.lastMotion<=3&&!mark?.restraint&&!mark?.resting;
      const phase=w.tick*.24+x*.60+y*.42;
      const lift=visual.lift&&!mark?.restraint&&!mark?.resting?
        (visual.lift+.04*Math.sin(phase*.73))*tile:walking?Math.abs(Math.sin(phase))*tile*.035:0;
      actors.push({...visual,id,x,y,flip:next.flip,rotation:walking?Math.sin(phase)*.035:0,
        float:lift,scale:(young?.67:1)*(1+Math.sin(phase*.40)*(mark?.restraint?.005:.021)),tint,beastMark:mark});
    };
    for(const b of w.wildEntities){
      if(b.kind!=='beast'||b.hp<=0||!w.ark.anchoredIslandId)continue;
      if('homeIslandId' in b&&b.homeIslandId&&b.homeIslandId!==w.ark.anchoredIslandId)continue;
      const def=definitions.get(b.defId);if(!def)continue;
      const near=Math.hypot(w.player.x-b.x,w.player.y-b.y)<=4.5;
      const hp=clamp(b.hp/Math.max(1,b.maxHp));
      const restraint=b.stunnedTicks>0;
      add(b.id,b.defId,b.x,b.y,near&&(hp<.995||restraint||b.tameProgress>0)?
        {hp,restraint,progress:b.tameProgress,feeds:def.tameFeedsRequired,wild:true,resting:false}:undefined);
    }
    for(const b of w.beasts){
      if(b.hp<=0)continue;
      const hp=clamp(b.hp/Math.max(1,b.maxHp));
      const near=Math.hypot(w.player.x-b.x,w.player.y-b.y)<=3.4;
      const morph=inheritedMorph(w,b.id);
      add(b.id,b.defId,b.x,b.y,near&&(hp<.99||b.role==='rest')?
        {hp,restraint:false,progress:0,feeds:0,wild:false,resting:b.role==='rest'}:undefined,morph.variant??undefined,morph.young);
    }
    for(const id of this.recent.keys())if(!alive.has(id))this.recent.delete(id);
    return actors;
  }
}

export function paintBeastCues(c:CanvasRenderingContext2D,p:Vec2,b:BeastActor,tile:number,tick:number):void{
  const mark=b.beastMark;if(!mark)return;
  const lift=b.float??0;
  if(mark.restraint){
    // Stunned-only loose net glint and wobbling ice particles; actual animal is painted above.
    c.save();c.lineCap='round';c.lineWidth=1;
    c.strokeStyle='rgba(164,215,235,.57)';c.setLineDash([3,4]);
    c.beginPath();c.ellipse(p.x,p.y-tile*.07,tile*b.shadow*.95,tile*b.shadow*.34,0,0,Math.PI*2);c.stroke();
    c.restore();
    for(let i=0;i<4;i++){
      const a=tick*.105+i*Math.PI*.5;
      const x=p.x+Math.cos(a)*tile*b.shadow*.74;
      const y=p.y-tile*b.height*.73-lift+Math.sin(a)*tile*.085;
      ovalGlow(c,x,y,2.6,2.6,'rgba(192,227,243,.70)','rgba(192,227,243,0)');
    }
  }
  if(mark.hp>=.995&&mark.progress===0)return;
  const width=tile*.64, height=4, y=p.y-lift-tile*(b.height*.95+.09), x=p.x-width/2;
  c.save();
  c.beginPath();c.roundRect(x-1,y-1,width+2,height+2,2.4);c.fillStyle='rgba(15,29,38,.88)';c.fill();
  const bar=width*mark.hp;
  if(bar>0){
    c.beginPath();c.roundRect(x,y,bar,height,1.9);
    c.fillStyle=mark.wild?(mark.hp<=.35?'#e6b46b':'#d98571'):'#7fbd98';c.fill();
  }
  if(mark.progress>0&&mark.feeds>0){
    for(let i=0;i<mark.feeds;i++){
      const px=p.x+(i-(mark.feeds-1)*.5)*8;
      c.beginPath();c.arc(px,y-6,2.5,0,Math.PI*2);
      c.fillStyle=i<mark.progress?'#ffd49b':'rgba(129,158,176,.62)';c.fill();
    }
  }
  c.restore();
}
