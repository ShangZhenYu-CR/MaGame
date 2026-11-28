import { areaAt } from '../sim/island';
import { turretAim } from '../sim/turret-aim';
import type { Vec2,WorldState } from '../sim/types';
import type { ArtLibrary } from './art-library';
import { ovalGlow } from './atmosphere';

export const rotating={
 frost_turret:{key:'arrow',baseH:.81,offset:.54,wide:1.02,headH:.61},
 fire_oil_turret:{key:'oil',baseH:.91,offset:.67,wide:.92,headH:.69},
 oil_mortar:{key:'mortar',baseH:.78,offset:.50,wide:.86,headH:.68},
} as const;
export const LIVING_ART=[...Object.values(rotating).flatMap(a=>['turret-'+a.key+'-base','turret-'+a.key+'-head']),
 'building-greenhouse-seedling','building-greenhouse-ripe','snow-print-boot','snow-print-hoof'];
export type Rotator=typeof rotating[keyof typeof rotating];
type Aim={angle:number;stamp:number};
type Print=Vec2&{type:'boot'|'hoof';yaw:number;at:number};
type Last=Vec2&{step:number;at:number};
const hoofed=new Set(['frostyak','burrowback','glacierstag','magmalisk']);
export class LivingView{
 private state?:WorldState;
 private island:string|null=null;
 private traced:Print[]=[];
 private footprints=new Map<string,Last>();
 private axes=new Map<string,Aim>();
 private tick=-1;
 private reset(w:WorldState){if(this.state!==w){this.state=w;this.axes.clear();this.footprints.clear();this.traced=[];this.island=null;this.tick=-1;}}
 turret(c:CanvasRenderingContext2D,art:ArtLibrary,w:WorldState,id:string,a:Rotator,p:Vec2,at:Vec2,tile:number){
  this.reset(w);
  const aim=turretAim(w,id),def=-.47;
  const angle=aim?Math.atan2(aim.y-at.y,aim.x-at.x):def;
  const past=this.axes.get(id)??{angle:def,stamp:w.tick};
  const elapsed=Math.min(6,Math.max(0,w.tick-past.stamp));
  const tau=Math.PI*2,delta=((angle-past.angle+Math.PI+tau)%tau)-Math.PI;
  past.angle=(past.angle+Math.max(-.16*elapsed,Math.min(.16*elapsed,delta))+tau)%tau;
  past.stamp=w.tick;this.axes.set(id,past);
  if(w.tick%90===0&&this.axes.size>100)for(const [key,v] of this.axes)if(v.stamp<w.tick-120)this.axes.delete(key);
  art.paint(c,'turret-'+a.key+'-head',p.x,p.y-tile*a.offset,tile,{width:a.wide,height:a.headH,rotation:past.angle-def});
  return past.angle.toFixed(2);
 }
 prints(c:CanvasRenderingContext2D,art:ArtLibrary,w:WorldState,project:(x:number,y:number)=>Vec2,tile:number){
  this.reset(w);
  const land=w.activeIsland,node=land&&w.sky.islands.find(x=>x.id===land.nodeId);
  const id=node&&node.biomeId!=='sulfur_rift'?node.id:null;
  if(id!==this.island){this.island=id;this.traced=[];this.footprints.clear();}
  if(!id)return {boot:0,hoof:0};
  if(w.tick!==this.tick){
   this.tick=w.tick;
   this.traced=this.traced.filter(m=>m.at+190>w.tick);
   const sample=(key:string,pos:Vec2,type:Print['type'])=>{
    if(areaAt(w,pos.x,pos.y)!=='island'){this.footprints.delete(key);return;}
    const last=this.footprints.get(key);
    if(!last||last.at+80<w.tick){this.footprints.set(key,{x:pos.x,y:pos.y,step:0,at:w.tick});return;}
    const dx=pos.x-last.x,dy=pos.y-last.y,d=Math.hypot(dx,dy);
    if(d<(type==='hoof'?.52:.40))return;
    if(d<1.45){
     const yaw=Math.atan2(dy,dx)+Math.PI/2;
     const offset=(type==='hoof'?.145:.079)*(last.step%2===0?1:-1);
     this.traced.push({x:pos.x+dy/d*offset,y:pos.y-dx/d*offset,type,yaw,at:w.tick});
    }
    this.footprints.set(key,{x:pos.x,y:pos.y,step:last.step+1,at:w.tick});
   };
   sample('player',w.player,'boot');
   for(const e of w.beasts)if(e.hp>0&&hoofed.has(e.defId))sample(e.id,e,'hoof');
   for(const e of w.wildEntities)if(e.hp>0&&e.kind==='beast'&&e.homeIslandId===id&&hoofed.has(e.defId))sample(e.id,e,'hoof');
   if(this.traced.length>105)this.traced.splice(0,this.traced.length-105);
  }
  let boot=0,hoof=0;
  for(const f of this.traced){
   const p=project(f.x,f.y);
   if(p.x<0||p.y<0||p.x>c.canvas.width||p.y>c.canvas.height)continue;
   c.save();c.globalAlpha=Math.max(0,1-(w.tick-f.at)/190)*.76;
   art.paint(c,'snow-print-'+f.type,p.x,p.y,tile,{width:f.type==='boot'?.19:.26,height:f.type==='boot'?.28:.31,rotation:f.yaw});
   c.restore();if(f.type==='boot')boot++;else hoof++;
  }
  return {boot,hoof};
 }
}

export function paintFlue(c:CanvasRenderingContext2D,p:Vec2,w:WorldState,tile:number,forge:boolean,seed:number){
 const src={x:p.x+tile*(forge?.22:.18),y:p.y-tile*(forge?1.10:.78)};
 for(let i=0;i<5;i++){
  const u=(w.tick*.029+i*.21+seed*.071)%1;
  const x=src.x+tile*(w.sky.windX*.095*u+Math.sin(i*3.1+w.tick*.039)*.12*u);
  const y=src.y-tile*(u*(forge?.91:.65)),a=(1-u)*(.19+.05*Math.sin(w.tick*.15));
  ovalGlow(c,x,y,tile*(.077+u*.15),tile*(.083+u*.14),`rgba(169,199,213,${a})`,'rgba(155,180,196,0)');
 }
}
