import type { JuiceEvent,JuiceType } from '../sim/juice';
import type { Vec2 } from '../sim/types';
import { clamp,ovalGlow } from './atmosphere';

const colors:Record<JuiceType,string>={
 hit:'#ff8776',burn:'#ffc17c',hurt:'#f18c87',heal:'#a7ecad',warmth:'#ffd591',wood:'#c69766',ore:'#ffcf84',build:'#c0ae93',
};
const loud=new Set<JuiceType>(['hit','hurt']);
type Effect=JuiceEvent&{at:number;serial:number;offset:number};
export class JuiceView{
 private current:Effect[]=[];
 private serial=0;
 private until=0;
 private shaken=0;
 freezeUntil=0;
 reset(){this.current=[];this.until=this.shaken=this.freezeUntil=0;}
 push(events:JuiceEvent[],now:number,shake:boolean){
  if(!events.length)return;
  for(const e of events){
   const offset=this.current.filter(q=>q.target===e.target&&q.at===now).length;
   this.current.push({...e,at:now,serial:++this.serial,offset});
   if(loud.has(e.type))this.freezeUntil=Math.max(this.freezeUntil,now+40);
   if(shake&&e.critical){this.shaken=now;this.until=now+175;}
  }
  if(this.current.length>28)this.current.splice(0,this.current.length-28);
 }
 animating(now:number){return now<this.until||this.current.some(e=>now-e.at<860);}
 stopShake(){this.shaken=this.until=0;}
 shake(now:number):Vec2{
  if(now>=this.until)return {x:0,y:0};
  const elapsed=now-this.shaken,amplitude=4.1*(1-elapsed/175);
  return {x:Math.round(Math.sin(elapsed*.22)*amplitude),y:Math.round(Math.sin(elapsed*.14)*amplitude*.78)};
 }
 flash(id:string|undefined,now:number):boolean{
  return !!id&&this.current.some(e=>e.target===id&&loud.has(e.type)&&now-e.at<110);
 }
 bounce(id:string|undefined,now:number):number{
  if(!id)return 0;
  let latest:Effect|undefined;
  for(let i=this.current.length-1;i>=0;i--){const e=this.current[i];if(e.target===id&&e.type==='build'){latest=e;break;}}
  if(!latest)return 0;
  const t=clamp((now-latest.at)/320);
  return Math.sin(t*Math.PI*2.55)*(1-t)*.185;
 }
 paint(c:CanvasRenderingContext2D,project:(x:number,y:number)=>Vec2,s:number,now:number){
  this.current=this.current.filter(e=>now-e.at<860);
  const signature=[...new Set(this.current.map(e=>e.type))].join(' ');
  if(c.canvas.dataset.juice!==signature)c.canvas.dataset.juice=signature;
  if(c.canvas.dataset.juiceSerial!==String(this.serial))c.canvas.dataset.juiceSerial=String(this.serial);
  const critic=this.current.some(e=>e.critical);
  if(c.canvas.dataset.critical!==String(critic))c.canvas.dataset.critical=String(critic);
  c.save();
  c.textAlign='center';c.textBaseline='bottom';c.lineJoin='round';c.lineCap='round';
  for(const e of this.current){
   const p=project(e.x,e.y),age=(now-e.at),t=clamp(age/700);
   if(p.x<-s||p.x>c.canvas.width+s||p.y<-s||p.y>c.canvas.height+s)continue;
   const damage=loud.has(e.type)||e.type==='burn',flying=e.type==='wood'||e.type==='ore'||e.type==='build';
   const y=p.y-s*(damage?.65:.37);
   if((damage||flying)&&age<490){
    const u=age/490,tail=1-u,wood=e.type==='wood',build=e.type==='build';
    c.save();c.globalAlpha=tail*.85;c.fillStyle=colors[e.type];c.strokeStyle=wood?'#e3b187':'#ffe2ae';
    if(build)ovalGlow(c,p.x,p.y,s*(.24+u*.58),s*(.09+u*.19),'rgba(139,122,100,.52)','rgba(139,122,100,0)');
    for(let i=0;i<(e.critical?15:9);i++){
     const theta=i*2.39996+e.serial*.39,d=s*(.03+u*(.30+i%4*.09));
     const x=p.x+Math.cos(theta)*d, yy=(damage?y:p.y)+Math.sin(theta)*d*.42-u*(1-u)*s*(build?.33:1.2);
     c.beginPath();
     if(wood||build){
      c.ellipse(x,yy,1.5+i%4,wood?.9:1.5,theta+u*2.0,0,Math.PI*2);c.fill();
     }else{
      c.lineWidth=1.25+(i%3)*.25;c.moveTo(x,yy);c.lineTo(x+Math.cos(theta)*(3+tail*4),yy+Math.sin(theta)*3);c.stroke();
     }
    }
    c.restore();
   }
   if(e.amount<=0)continue;
   const num=Math.round(e.amount),bold=e.critical?25:20;
   const label=damage?(e.melt?'融化暴击 −':e.critical?'暴击 −':'−')+num:e.type==='warmth'?'+ '+num+' 体温':'+ '+num;
   const px=p.x+(e.offset===0?0:e.offset%2===0?-1:1)*(15+10*e.offset)+Math.sin(e.serial*2.1)*6*t;
   const py=y-13*t-23*Math.sqrt(t)-e.offset*26;
   c.globalAlpha=1-clamp((age-510)/300);
   // Numbers use a fixed-width face just like the tabular HUD counters.
   c.font='800 '+bold+'px ui-monospace, "Noto Sans Mono CJK SC", monospace';
   c.strokeStyle='#172b35';c.lineWidth=e.critical?4.5:3.2;c.strokeText(label,px,py);
   c.fillStyle=e.critical?'#ffe0a0':colors[e.type];c.fillText(label,px,py);
  }
  c.restore();
 }
}
