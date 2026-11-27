import { hasBuildingContact } from '../src/sim/ark';
import { feetSupported } from '../src/sim/ground-footprint';
import { areaAt } from '../src/sim/island';
import type { Vec2,WorldState } from '../src/sim/types';

const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
export function vec(w:WorldState,target:Vec2):{ticks:number;move:Vec2}|null{
 const {x,y}=w.player, quantum=.20, reach=.26, max=74;
 const distance=(a:number,b:number)=>Math.hypot(x+a*quantum-target.x,y+b*quantum-target.y);
 if(distance(0,0)<=reach)return null;
 const q:[number,number,number[]][]=[[0,0,[]]],seen=new Set(['0,0']);
 let best=q[0],bestDistance=distance(0,0);
 const clear=(u:number,v:number)=>{
   const ax=x+u*quantum,ay=y+v*quantum;
   return !hasBuildingContact(w,ax,ay)&&feetSupported(ax,ay,(a,b)=>areaAt(w,a,b)!=='void');
 };
 for(let i=0;i<q.length;i++){
  const [a,b,route]=q[i],d=distance(a,b);
  if(d<bestDistance){best=q[i];bestDistance=d;}
  if(d<=reach*.83)break;
  if(route.length>=max)continue;
  dirs.forEach(([dx,dy],k)=>{
   const u=a+dx,v=b+dy,id=u+','+v;
   if(seen.has(id)||!clear(u,v)||!clear(a+dx*.5,b+dy*.5))return;
   seen.add(id);q.push([u,v,[...route,k]]);
  });
 }
 const route=best[2];
 if(!route.length)throw Error(`Blocked walk: ${x},${y} -> ${target.x},${target.y}`);
 const [dx,dy]=dirs[route[0]];let steps=1;
 while(steps<route.length&&route[steps]===route[0])steps++;
 const speed=(areaAt(w,x,y)==='island'?.087:.095)*(w.player.hunger<=0?.65:1);
 return {ticks:Math.max(1,Math.floor(steps*quantum/speed)),move:{x:dx,y:dy}};
}
