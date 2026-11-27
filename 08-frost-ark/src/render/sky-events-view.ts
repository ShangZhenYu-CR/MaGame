import { activeSkyEvent,skyEventDistance,stormTell } from '../sim/sky-events';
import type { Vec2,WorldState } from '../sim/types';
import type { ArtLibrary } from './art-library';
import { ovalGlow } from './atmosphere';

export const EVENT_ART=['event-merchant','event-pirates','event-salvage','event-aurora-drape','icon-event-thunder'];
export function paintAurora(c:CanvasRenderingContext2D,art:ArtLibrary,tick:number,intensity=.62){
 const {width,height}=c.canvas;
 c.save();c.globalCompositeOperation='screen';c.globalAlpha=intensity;
 for(let i=0;i<2;i++){
   const x=width*(.54+i*.14)+Math.sin(tick*.011+i*.85)*width*.12;
   const y=height*(.26+i*.11)+Math.cos(tick*.013+i)*height*.029;
   art.paint(c,'event-aurora-drape',x,y,1,{width:width*.87,height:height*.26,rotation:Math.sin(tick*.009+i)*.12});
   c.globalAlpha=intensity*.47;
 }
 c.restore();
}
export function paintSkyEvent(c:CanvasRenderingContext2D,art:ArtLibrary,w:WorldState,project:(x:number,y:number)=>Vec2,tile:number){
 const e=activeSkyEvent(w),W=c.canvas.width,H=c.canvas.height;if(!e||w.activeIsland)return;
 // Ordinary island mooring and balloon mooring cannot coexist. The moving
 // vessel stays in the air lane rather than visually intersecting that shore.
 if(w.ark.anchoredIslandId&&e.kind==='merchant')return;
 const outside=skyEventDistance(w,e);
 if(e.kind==='warm'){if(outside<3.5)paintAurora(c,art,w.tick,.87);return;}
 if(e.kind==='thunder'){
   if(outside>3.5)return;
   const point=project(w.ark.size*.5+6.4,w.ark.size*.5-4.0);
   c.save();c.globalAlpha=.68;art.paint(c,'icon-event-thunder',point.x,point.y,tile,{width:5,height:3.6});c.restore();
   if(stormTell(w,e)==='burst'){
     c.save();c.globalCompositeOperation='screen';c.strokeStyle='rgba(230,204,139,.72)';c.lineWidth=2.35;
     c.beginPath();c.moveTo(point.x,point.y);c.lineTo(point.x-tile*.36,point.y+tile*.67);
     c.lineTo(point.x-tile*.85,point.y+tile*.54);c.lineTo(point.x-tile*1.27,point.y+tile*1.97);c.stroke();c.restore();
   }
   return;
 }
 if(outside>3.9)return;
 let right=0,left=w.ark.size;
 for(let i=0;i<w.ark.decks.length;i++)if(w.ark.decks[i]){const x=i%w.ark.size;left=Math.min(left,x);right=Math.max(right,x);}
 const x=e.kind==='salvage'?left-3.25:right+3.9+(e.moored?0:(e.x-w.sky.x)*.8);
 const p=project(x,w.ark.size*.50+(e.kind==='merchant'?2.05:.65)+(e.y-w.sky.y)*1.34+Math.sin(w.tick*.062)*.18);
 if(p.x < -5*tile||p.x>W+5*tile||p.y>H+3*tile||p.y< -2*tile)return;
 ovalGlow(c,p.x,p.y+tile*.24,tile*1.93,tile*.62,'rgba(19,46,62,.43)','rgba(20,42,60,0)');
 art.paint(c,'event-'+e.kind,p.x,p.y,tile,{rotation:Math.sin(w.tick*.039)*.025});
}
