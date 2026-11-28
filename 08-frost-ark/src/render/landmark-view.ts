import { latteTreasure } from '../sim/latte-growth';
import { treasureCue } from './latte-view';
import { islandLandmarks,landmarkLit,VENT_RADIUS,ventState,type Landmark } from '../sim/landmarks';
import type { Vec2,WorldState } from '../sim/types';
import type { ArtLibrary } from './art-library';
import { ovalGlow } from './atmosphere';

export const LANDMARK_ART=['landmark-camp','landmark-spring','landmark-obelisk','landmark-obelisk-lit','landmark-vent','landmark-wreck'] as const;

export function landmarkScene(c:CanvasRenderingContext2D,art:ArtLibrary,w:WorldState,project:(x:number,y:number)=>Vec2,tile:number,found:()=>void){
  const actors:{x:number;y:number;art:string;shadow:number}[]=[];
  for(const mark of islandLandmarks(w)){
    const at=project(mark.x,mark.y),cw=c.canvas.width,ch=c.canvas.height;
    if(at.x < -tile*6||at.x>cw+tile*6||at.y< -tile*6||at.y>ch+tile*6)continue;
    if((mark.kind==='obelisk'||mark.kind==='wreck')&&at.x>=0&&at.y>=0&&at.x<=cw&&at.y<=ch&&latteTreasure(w,mark)){
      treasureCue(c,at,tile,w.tick);found();
    }
    const lit=landmarkLit(w,mark);
    const artId=lit?'landmark-obelisk-lit':('landmark-'+mark.kind);
    if(mark.kind==='spring'){
      art.paint(c,artId,at.x,at.y,tile);
      thermal(c,w.tick,mark,at,tile,'spring');
    }else{
      if(mark.kind==='vent')thermal(c,w.tick,mark,at,tile,ventState(w,mark));
      if(lit){
        ovalGlow(c,at.x,at.y,tile*5.1,tile*4.6,'rgba(230,148,72,.18)','rgba(216,104,35,0)');
        c.save();c.strokeStyle='rgba(242,166,83,.55)';c.lineWidth=Math.max(1.4,tile*.038);
        c.beginPath();c.ellipse(at.x,at.y,tile*5.12,tile*5.12,0,0,Math.PI*2);c.stroke();c.restore();
      }
      actors.push({...mark,art:artId,shadow:mark.kind==='obelisk'?.39:mark.kind==='vent'?.36:.69});
    }
  }
  return actors;
}

function thermal(c:CanvasRenderingContext2D,tick:number,l:Landmark,p:Vec2,tile:number,state:'spring'|'quiet'|'warning'|'active'):void{
  const danger=state==='warning'||state==='active',warm=state==='spring';
  const erupting=state==='active';
  if(danger){
    ovalGlow(c,p.x,p.y,tile*VENT_RADIUS,tile*VENT_RADIUS,'rgba(227,103,49,.26)','rgba(213,87,35,.035)');
    c.save();
    c.strokeStyle=erupting?'rgba(255,170,103,.82)':'rgba(238,170,87,.78)';
    c.lineWidth=tile*.048;c.setLineDash([tile*.12,tile*.08]);c.lineDashOffset=-tick*.9;
    c.beginPath();c.arc(p.x,p.y,tile*VENT_RADIUS,0,Math.PI*2);c.stroke();c.restore();
  }
  if(!warm&&!danger)return;
  c.save();
  for(let i=0;i<(warm?7:danger?12:0);i++){
    const ph=((tick+(l.phase+i*17))%(warm?68:44))/(warm?68:44);
    const spread=Math.sin(i*3.7+ph*2.4+tick*.035)*(warm?.58:.26);
    const x=p.x+tile*(spread+ph*.38),y=p.y-tile*((warm?.32:.48)+ph*(erupting?2.1:warm?1.1:.7));
    c.globalAlpha=(1-ph)*(erupting?.66:warm?.38:.38);
    const color=warm?'rgba(195,224,213,.43)':erupting?'rgba(232,162,87,.60)':'rgba(204,161,76,.30)';
    ovalGlow(c,x,y,tile*(.17+ph*.28),tile*(.10+ph*.20),color);
  }
  c.restore();
}
