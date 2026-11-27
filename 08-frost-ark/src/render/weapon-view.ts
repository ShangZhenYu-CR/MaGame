import { weaponEffects,weaponShots } from '../sim/weapons';
import type { WorldState } from '../sim/types';
import type { Project } from './lightmap';

const ink={thrust:'#d8eff5',sweep:'#ffbd76',bolt:'#abe4ee',throw:'#ffc27a',flame:'#ffb067'};
export function paintWeaponCombat(c:CanvasRenderingContext2D,w:WorldState,project:Project,s:number){
 const shots=weaponShots(w),effects=weaponEffects(w);
 const canvas=c.canvas,flight=shots.at(-1)?.spec.style??'',impact=effects.at(-1)?.style??'';
 if(canvas.dataset.weaponFlight!==flight)canvas.dataset.weaponFlight=flight;
 if(canvas.dataset.weaponImpact!==impact)canvas.dataset.weaponImpact=impact;
 for(const shot of shots){
  const p=project(shot.x,shot.y),from=project(shot.x-shot.vx*2,shot.y-shot.vy*2);
  c.save();c.lineCap='round';c.strokeStyle=ink[shot.spec.style];c.fillStyle='#ffdf9c';
  if(shot.spec.style==='throw'){
   const fly=Math.sin(Math.min(1,(w.tick-shot.started)*Math.hypot(shot.vx,shot.vy)/shot.spec.range)*Math.PI)*s*.53;
   c.beginPath();c.ellipse(p.x,p.y-fly-s*.20,s*.090,s*.13,w.tick*.18,0,Math.PI*2);c.fill();
   c.lineWidth=1.6;c.stroke();
  }else{
   c.lineWidth=2.1;c.beginPath();c.moveTo(from.x,from.y-s*.32);c.lineTo(p.x,p.y-s*.32);c.stroke();
   c.fillStyle='#edf9f7';c.beginPath();c.arc(p.x,p.y-s*.32,2.4,0,Math.PI*2);c.fill();
  }
  c.restore();
 }
 for(const fx of effects){
  const a=project(fx.from.x,fx.from.y),b=project(fx.to.x,fx.to.y);
  const t=(w.tick-fx.at)/(fx.until-fx.at),alpha=Math.max(0,1-t);
  const theta=Math.atan2(b.y-a.y,b.x-a.x),length=Math.hypot(b.x-a.x,b.y-a.y);
  c.save();c.globalAlpha=alpha*.9;c.lineCap='round';c.strokeStyle=ink[fx.style];c.fillStyle=ink[fx.style];
  if(fx.style==='throw'){
   const r=s*fx.radius*(.28+t*.70);
   c.lineWidth=3;c.beginPath();c.ellipse(b.x,b.y,r,r*.52,0,0,Math.PI*2);c.stroke();
   for(let i=0;i<12;i++){
    const rad=i*Math.PI*2/12,xx=b.x+Math.cos(rad)*r,yy=b.y+Math.sin(rad)*r*.52-(1-t)*s*.26;
    c.beginPath();c.arc(xx,yy,1.2+(i%3),0,Math.PI*2);c.fill();
   }
  }else if(fx.style==='sweep'||fx.style==='flame'){
   const r=length*(fx.style==='sweep'?.72+t*.27:.42+t*.58),side=fx.radius;
   c.translate(a.x,a.y-s*.27);
   if(fx.style==='sweep'){
    c.lineWidth=4+5*alpha;c.beginPath();c.arc(0,0,r,theta-side,theta+side);c.stroke();
    c.lineWidth=1.2;c.strokeStyle='#ffeed6';c.beginPath();c.arc(0,0,r+s*.11,theta-side*.82,theta+side*.82);c.stroke();
   }else{
    c.rotate(theta);
    const g=c.createLinearGradient(0,0,r,0);g.addColorStop(0,'rgba(255,228,158,.72)');g.addColorStop(.59,'rgba(237,122,49,.58)');g.addColorStop(1,'rgba(202,71,35,0)');
    c.fillStyle=g;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(r*.46,-s*.33,r,-r*.43);c.quadraticCurveTo(r*.82,0,r,r*.43);c.quadraticCurveTo(r*.46,s*.33,0,0);c.fill();
    c.fillStyle='#ffe2aa';for(let i=0;i<7;i++){c.beginPath();c.arc(r*(.23+(i%4)*.23),Math.sin(i*7+w.tick*.15)*s*.38,1.25+i%3*.4,0,Math.PI*2);c.fill();}
   }
  }else{
   c.lineWidth=fx.style==='thrust'?4:2.6;c.beginPath();c.moveTo(a.x,a.y-s*.30);c.lineTo(b.x,b.y-s*.30);c.stroke();
   if(fx.hit){for(let i=0;i<5;i++){const n=i*Math.PI*2/5;const r=s*(.07+t*.34);c.beginPath();c.arc(b.x+Math.cos(n)*r,b.y-s*.30+Math.sin(n)*r,2,0,Math.PI*2);c.fill();}}
  }
  c.restore();
 }
}
