import { cannonEffects,seaWhale,whaleIced } from '../sim/whale-sea';
import type { Vec2,WorldState } from '../sim/types';
import type { ArtLibrary } from './art-library';
import { clamp,ovalGlow } from './atmosphere';

type Sprite=Vec2&{art:string;phase:number;open:boolean};
export function paintSeaWhale(c:CanvasRenderingContext2D,art:ArtLibrary,w:WorldState,b:Sprite,project:(x:number,y:number)=>Vec2,tile:number){
 const sea=seaWhale(w);if(!sea)return;
 const p=project(b.x,b.y),angle=sea.angle,swell=Math.sin(w.tick*.069);
 const rise=tile*(.17+.25*(1+swell));
 ovalGlow(c,p.x,p.y+tile*.16,tile*2.48,tile*.69,'rgba(117,172,196,.37)','rgba(76,115,154,0)');
 c.save();c.globalAlpha=.95;
 art.paint(c,b.art,p.x,p.y-rise,tile,{width:5.6+b.phase*.29,height:4.2+b.phase*.22,flip:Math.sin(angle)<0,rotation:Math.sin(angle*1.7)*.076+swell*.024});
 c.restore();
 for(let i=0;i<4;i++){
  const t=(i*.19+w.tick*.016)%1;const side=Math.sin(angle);
  ovalGlow(c,p.x+tile*((i-1.5)*.54+side*t*1.4),p.y+tile*(.19+t*.12),tile*(.4+t*.55),tile*(.11+t*.17),
   `rgba(174,208,222,${(1-t)*.35})`,'rgba(159,192,211,0)');
 }
 if(b.open)ovalGlow(c,p.x,p.y-tile*1.75,tile*.92,tile*.53,'rgba(239,162,88,.28)','rgba(229,142,78,0)');
}
export function paintSeaCombat(c:CanvasRenderingContext2D,w:WorldState,project:(x:number,y:number)=>Vec2,tile:number){
 const sea=seaWhale(w);if(sea){
  for(const b of w.ark.buildings){
   if(!whaleIced(w,b.gx,b.gy))continue;
   const p=project(b.gx+.5,b.gy+.65);
   ovalGlow(c,p.x,p.y,tile*.64,tile*.44,'rgba(157,214,235,.37)','rgba(117,172,195,0)');
   c.save();c.lineWidth=1.35;c.strokeStyle='rgba(187,230,242,.82)';
   for(let k=0;k<5;k++){
    const x=p.x+tile*(k-2)*.14,y=p.y+tile*(.04+k%2*.10);
    c.beginPath();c.moveTo(x,y);c.lineTo(x+tile*.10,y-tile*(.23+.09*(k%3)));c.lineTo(x+tile*.16,y-tile*.14);c.stroke();
   }
   c.restore();
  }
 }
 const effects=cannonEffects(w);
 for(const shot of effects){
  const p=project(shot.from.x,shot.from.y),q=project(shot.to.x,shot.to.y);
  const left=clamp((shot.until-w.tick)/27),t=1-left;
  const x=p.x+(q.x-p.x)*t,y=p.y+(q.y-p.y)*t-tile*(.69+Math.sin(t*Math.PI)*1.26);
  c.save();c.lineWidth=2;c.strokeStyle='#ffc982';c.globalAlpha=left*.72;
  c.beginPath();c.moveTo(p.x,p.y-tile*.62);c.quadraticCurveTo((p.x+x)/2,Math.min(y,p.y)-tile*.68,x,y);c.stroke();c.restore();
  ovalGlow(c,x,y,tile*.39,tile*.31,'rgba(247,170,90,.8)','rgba(240,129,61,0)');
  if(t<.34)ovalGlow(c,p.x,p.y-tile*.57,tile*.53,tile*.39,'rgba(247,170,90,.68)','rgba(240,129,61,0)');
 }
 return effects.length;
}
