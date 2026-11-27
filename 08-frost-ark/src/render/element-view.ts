import { status } from '../sim/elements';
import type { Vec2,WorldState } from '../sim/types';
import type { ArtLibrary } from './art-library';
import { ovalGlow } from './atmosphere';

export const ELEMENT_ART=['icon-status-burn','icon-status-chill','icon-status-frozen','icon-status-broken'] as const;
export interface ElementActor extends Vec2 { id?:string;height?:number;float?:number }
export function paintElementSigns(c:CanvasRenderingContext2D,art:ArtLibrary,actors:readonly ElementActor[],
 w:WorldState,project:(x:number,y:number)=>Vec2,tile:number):void{
 const shown=new Set<string>();
 for(const actor of actors){
  if(!actor.id)continue;
  const s=status(w,actor.id),tick=w.tick;
  const active=[s.burn>tick?'burn':'',s.frozen>tick?'frozen':s.chill>tick?'chill':'',s.broken>tick?'broken':''].filter(Boolean);
  const p=project(actor.x,actor.y);
  if(p.x<0||p.x>c.canvas.width||p.y<0||p.y>c.canvas.height)continue;
  if(s.melt>tick)shown.add('melt');
  if(!active.length)continue;
  let x=p.x+((actor.height??1)>2?tile*.72:tile*.36);
  const y=p.y-tile*((actor.height??1)+.085)-(actor.float??0);
  for(const badge of active){
    shown.add(badge);
    c.save();c.fillStyle='rgba(11,28,40,.89)';c.strokeStyle='rgba(134,166,181,.48)';
    c.beginPath();c.roundRect(x,y,20,20,4);c.fill();c.stroke();
    art.paint(c,'icon-status-'+badge,x+10,y+18,20,{width:.87,height:.87});
    c.restore();
    x+=22;
  }
 }
 const signature=[...shown].join(' ');
 if(c.canvas.dataset.elemental!==signature)c.canvas.dataset.elemental=signature;
}
export function paintElementAura(c:CanvasRenderingContext2D,w:WorldState,actor:ElementActor,p:Vec2,tile:number){
 if(!actor.id)return;
 const s=status(w,actor.id);
 if(s.burn>w.tick){
  c.save();c.globalCompositeOperation='screen';
  ovalGlow(c,p.x,p.y,tile*.70,tile*.30,'rgba(246,123,60,.32)','rgba(246,123,60,0)');
  c.strokeStyle='#ffcb8d';c.globalAlpha=.65;c.lineWidth=1.4;
  for(let i=0;i<5;i++){
   const u=(w.tick*.073+i*.29)%1,x=p.x+Math.sin(i*9+u*3)*tile*.25,y=p.y-u*tile*.73;
   c.beginPath();c.moveTo(x,y);c.lineTo(x+1-u*2,y-2.5-u*3);c.stroke();
  }
  c.restore();
 }else if(s.frozen>w.tick){
  ovalGlow(c,p.x,p.y,tile*.55,tile*.28,'rgba(137,197,232,.31)','rgba(110,191,233,0)');
 }
}
