import { voyageBiome } from '../sim/expansion';
import type { WorldState } from '../sim/types';
import type { ArtLibrary } from './art-library';
import { ovalGlow } from './atmosphere';
import { paintAurora } from './sky-events-view';

const wrap=(n:number,d:number)=>((n%d)+d)%d;
const random=(i:number)=>((Math.imul(Math.imul(i+159,0x9e3779b1)^0xe23aa743,0x6d2b79f5)>>>0)%65521)/65521;
export function paintWindZone(c:CanvasRenderingContext2D,art:ArtLibrary,w:WorldState){
 const zone=voyageBiome(w),{width,height}=c.canvas;
 if(c.canvas.dataset.windZone!==zone)c.canvas.dataset.windZone=zone;
 const tick=w.tick;
 c.save();
 if(zone==='cloud_shallows'){
    // Daylight flurries are on the far air plate. Indoor/exterior near
    // particles remain in the true weather mask later in the render stack.
    const speed=.36+Math.min(1,Math.abs(w.sky.windX))*.65;
    c.fillStyle='#d7e3e8';
    for(let i=0;i<55;i++){
      const x=wrap(random(i*4)*width+tick*speed*(1+random(i*4+1)),width);
      const y=wrap(random(i*4+2)*height+tick*.26,height);
      const r=.47+random(i*4+3)*.79;
      c.globalAlpha=.20+random(i*4+2)*.26;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();
    }
 }else if(zone==='frostpine_isles'){
    for(let i=0;i<5;i++){
      const x=(i+.1)*width*.24+Math.sin(tick*.006+i)*width*.09;
      const y=height*(.32+i*.092)+Math.cos(tick*.007+i)*height*.07;
      ovalGlow(c,x,y,width*.37,height*(.18+.008*i),'rgba(149,187,200,.41)','rgba(87,128,155,0)');
    }
    const cover=c.createLinearGradient(0,0,0,height);
    cover.addColorStop(0,'rgba(31,78,100,.16)');cover.addColorStop(.45,'rgba(112,159,184,.07)');cover.addColorStop(1,'rgba(49,106,124,.30)');
    c.fillStyle=cover;c.fillRect(0,0,width,height);
 }else if(zone==='sulfur_rift'){
    const cover=c.createLinearGradient(0,0,0,height);
    cover.addColorStop(0,'rgba(35,40,52,.36)');cover.addColorStop(.58,'rgba(154,82,50,.27)');cover.addColorStop(1,'rgba(164,87,55,.45)');
    c.fillStyle=cover;c.fillRect(0,0,width,height);
    c.lineCap='round';
    for(let i=0;i<84;i++){
      const v=random(i*7+1),x=wrap(random(i*7)*width+tick*1.18*(.55+v),width);
      const y=wrap(random(i*7+2)*height-tick*.43*(.57+v),height);
      c.globalAlpha=.26+v*.53;c.strokeStyle=i%3?'#d49158':'#af9f92';c.lineWidth=.60+v*.90;
      c.beginPath();c.moveTo(x,y);c.lineTo(x-1.6-v*5.3,y+1.3+v*4.1);c.stroke();
    }
 }else{
    const blue=c.createLinearGradient(0,0,0,height);
    blue.addColorStop(0,'rgba(26,68,81,.29)');blue.addColorStop(.44,'rgba(33,102,104,.15)');blue.addColorStop(1,'rgba(32,73,83,.26)');
    c.fillStyle=blue;c.fillRect(0,0,width,height);paintAurora(c,art,tick,.89);
 }
 c.restore();
}
