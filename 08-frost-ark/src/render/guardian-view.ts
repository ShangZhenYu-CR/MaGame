import { guardianTell } from '../sim/guardians-p2';
import { areaAt } from '../sim/island';
import type { Vec2,WorldState } from '../sim/types';
import { clamp,ovalGlow } from './atmosphere';

export function paintGuardianEffects(c:CanvasRenderingContext2D,w:WorldState,project:(x:number,y:number)=>Vec2,tile:number){
 if(areaAt(w,w.player.x,w.player.y)!=='island')return;
 const state=guardianTell(w);if(!state)return;
 const phase=.65+.22*Math.sin(w.tick*.37);
 const line=(a:Vec2,b:Vec2,color:string,width:number,dashed=false)=>{
  const p=project(a.x,a.y),q=project(b.x,b.y);
  c.save();c.lineCap='round';c.strokeStyle=color;c.lineWidth=width;
  if(dashed){c.setLineDash([7,6]);c.lineDashOffset=-w.tick*.7;}
  c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke();c.restore();
 };
 if(state.trail){
  const {a,b,until}=state.trail;
  const alpha=clamp((until-w.tick)/46);
  line(a,b,`rgba(152,217,237,${.27*alpha})`,tile*.88);
  line(a,b,`rgba(211,239,246,${.57*alpha})`,2,true);
 }
 const warn=state.warn;
 if(warn){
  if(warn.skill==='dash'){
   line(warn.at,warn.aim,`rgba(116,181,213,${phase*.47})`,tile*1.23);
   line(warn.at,warn.aim,`rgba(221,242,247,${phase})`,3,true);
  }else{
   const p=project(warn.at.x,warn.at.y);
   const radius=tile*(warn.skill==='quake'?3.27:warn.skill==='howl'?2.6:2.18);
   const cold=warn.skill==='howl';
   const tone=cold?'154,211,234':'240,144,86';
   ovalGlow(c,p.x,p.y,radius,radius,`rgba(${tone},${phase*.32})`,`rgba(${tone},0)`);
   c.save();c.strokeStyle=`rgba(${tone},${phase})`;c.setLineDash([8,6]);c.lineDashOffset=-w.tick*.65;c.lineWidth=2.5;
   c.beginPath();c.arc(p.x,p.y,radius,0,Math.PI*2);c.stroke();c.restore();
  }
 }
 const e=state.last;
 if(e&&e.until>w.tick&&e.skill!=='dash'){
  const age=1-clamp((e.until-w.tick)/42),p=project(e.at.x,e.at.y),r=tile*(.44+age*(e.skill==='quake'?3.1:2.18));
  const color=e.skill==='howl'?'184,219,234':'246,154,85';
  ovalGlow(c,p.x,p.y,r,r,`rgba(${color},${.38*(1-age)})`,`rgba(${color},0)`);
  c.save();c.lineWidth=3;c.strokeStyle=`rgba(${color},${(1-age)*.8})`;c.beginPath();
  c.arc(p.x,p.y,r,0,Math.PI*2);c.stroke();c.restore();
 }
}
