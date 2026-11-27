import { activeSkillFx } from '../sim/beast-skills';
import type { Vec2,WorldState } from '../sim/types';
import { ovalGlow } from './atmosphere';

const table={earth:['#e3c7a0','rgba(199,151,92,.42)'],flame:['#ffc68b','rgba(245,113,45,.51)'],
 rush:['#f6d7a7','rgba(180,212,226,.49)'],heal:['#caead7','rgba(108,200,180,.41)'],
 dive:['#d4edfa','rgba(139,210,238,.46)'],gale:['#c7e2e9','rgba(99,191,223,.53)']} as const;
export function paintCompanionBurst(c:CanvasRenderingContext2D,w:WorldState,project:(x:number,y:number)=>Vec2,tile:number){
 const fx=activeSkillFx(w);if(!fx)return;
 const life=Math.min(1,(w.tick-fx.start)/(fx.until-fx.start)),alpha=1-life;
 const start=project(fx.from.x,fx.from.y),p=project(fx.to.x,fx.to.y),radius=tile*fx.radius;
 const [line,core]=table[fx.style];
 c.save();c.globalCompositeOperation='screen';c.lineCap='round';c.strokeStyle=line;
 c.globalAlpha=alpha*.66;ovalGlow(c,p.x,p.y,radius*(.43+life*.68),radius*(.35+life*.49),core,'rgba(16,36,52,0)');
 for(let ring=0;ring<3;ring++){
  c.globalAlpha=alpha*(.68-ring*.16);c.lineWidth=Math.max(1,tile*(.050-ring*.011));
  const r=radius*Math.min(1,.2+life*.82+ring*.12);
  c.beginPath();c.ellipse(p.x,p.y,r,r*.84,(life-.5)*.18,ring*.59,Math.PI*2+ring*.21);c.stroke();
 }
 const strength=fx.style==='flame'?1.18:1;
 for(let i=0;i<26;i++){
  const angle=i*2.399+life*(fx.style==='gale'?4.82:1.42);
  const span=(.31+.69*((i*37)%23)/22)*radius*Math.sqrt(Math.max(.025,life));
  const x=p.x+Math.cos(angle)*span,y=p.y+Math.sin(angle)*span*.84-tile*life*.22;
  c.globalAlpha=alpha*(.27+((i*16)%20)/26);c.lineWidth=(1.1+(i%3)*.43)*strength;
  c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(angle)*tile*.19,y+Math.sin(angle)*tile*.14);c.stroke();
 }
 if(fx.style!=='heal'&&Math.hypot(start.x-p.x,start.y-p.y)>tile*.55){
   for(let i=0;i<4;i++){
     c.globalAlpha=alpha*(.63-i*.13);c.lineWidth=tile*(.10-i*.019);
     c.beginPath();c.moveTo(start.x,start.y-tile*.22);
     c.quadraticCurveTo((start.x+p.x)/2,(start.y+p.y)/2-tile*(.29+i*.23),p.x,p.y);c.stroke();
   }
 }
 c.restore();
}
