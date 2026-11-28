import { defenseEvents,defenseLights,mortarFlights } from '../sim/defenses-p2';
import type { Vec2,WorldState } from '../sim/types';
import { clamp,ovalGlow } from './atmosphere';
export function paintDefenseEffects(c:CanvasRenderingContext2D,w:WorldState,project:(x:number,y:number)=>Vec2,tile:number){
 const signals=new Set<string>();
 if(w.weather==='whiteout'){
  for(const light of defenseLights(w)){
   const p=project(light.x,light.y),angle=-.60+Math.sin((w.tick+light.x*12)*.037)*.48;
   const q={x:p.x+tile*4.4*Math.cos(angle),y:p.y+tile*4.4*Math.sin(angle)};
   c.save();c.globalCompositeOperation='screen';
   const g=c.createLinearGradient(p.x,p.y-tile*.78,q.x,q.y);
   g.addColorStop(0,'rgba(255,183,98,.35)');g.addColorStop(1,'rgba(244,210,144,0)');
   c.fillStyle=g;c.beginPath();c.moveTo(p.x,p.y-tile*.78);
   c.lineTo(q.x+tile*.79,q.y+tile*1.04);c.lineTo(q.x+tile*.59,q.y-tile*.91);c.closePath();c.fill();c.restore();
  }
 }
 for(const f of mortarFlights(w)){
  const z=clamp((w.tick-f.launched)/(f.land-f.launched));
  const from=project(f.from.x,f.from.y),to=project(f.to.x,f.to.y);
  const x=from.x+(to.x-from.x)*z,y=from.y+(to.y-from.y)*z-tile*(.52+Math.sin(z*Math.PI)*2.15);
  ovalGlow(c,x,y,tile*.25,tile*.25,'rgba(255,193,116,.91)','rgba(234,121,62,0)');
  c.save();c.lineWidth=1.4;c.strokeStyle='rgba(222,147,105,.73)';c.setLineDash([5,4]);
  c.beginPath();c.ellipse(to.x,to.y,tile*1.48,tile*.88,0,0,Math.PI*2);c.stroke();c.restore();
  signals.add('flight');
 }
 for(const event of defenseEvents(w)){
  const p=project(event.at.x,event.at.y),age=clamp((event.until-w.tick)/23);
  const warm=event.kind!=='spike',hue=warm?'240,156,91':'151,212,239';
  const rad=tile*(event.kind==='blast'?1.72:event.kind==='reveal'?.51:.42);
  ovalGlow(c,p.x,p.y,rad,rad*.62,`rgba(${hue},${age*.54})`,`rgba(${hue},0)`);
  c.save();c.globalAlpha=age;c.strokeStyle=`rgba(${hue},.9)`;c.lineWidth=1.5;c.beginPath();
  c.ellipse(p.x,p.y,rad*(.75+(1-age)*.33),rad*.53,0,0,Math.PI*2);c.stroke();
  if(event.kind==='repair'||event.kind==='reveal'){
   c.fillStyle='#f4d7a9';c.font='600 12px system-ui, sans-serif';c.textAlign='center';
   c.fillText(event.kind==='repair'?'抢修':'显形',p.x,p.y-tile*.82);
  }
  c.restore();signals.add(event.kind);
 }
 return [...signals].join(',');
}
