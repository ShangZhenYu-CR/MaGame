import { activeCave,caveChestTaken,caveGuard,caveGuardMax,CAVE_OFFSET,CAVE_SIZE,iceTrap } from '../sim/cave';
import { incapacitated } from '../sim/rescue';
import { rolling,rollAge,ROLL_TICKS } from '../sim/roll';
import type { Vec2,WorldState } from '../sim/types';
import type { ArtLibrary } from './art-library';
import { ovalGlow } from './atmosphere';
import { paintWeaponCombat } from './weapon-view';

export const CAVE_ART=['cave-gate-ice','cave-gate-basalt','cave-gate-ruin','cave-stairs','cave-chest-closed','cave-chest-open',
  'cave-floor-dark','cave-floor-ice','cave-floor-basalt','cave-wall','cave-spikes-set','cave-spikes-raised','cave-guardian'] as const;
const floors=['','cave-floor-dark','cave-floor-ice','cave-floor-basalt'];
type Project=(x:number,y:number)=>Vec2;
type Cave=NonNullable<ReturnType<typeof activeCave>>;
const layers=new Map<Cave,HTMLCanvasElement>();
const S=46;

const pads=new WeakMap<HTMLImageElement,HTMLCanvasElement>();
function brush(image:HTMLImageElement){
 let stamp=pads.get(image);if(stamp)return stamp;
 stamp=document.createElement('canvas');stamp.width=image.width;stamp.height=image.height;
 const c=stamp.getContext('2d')!;
 c.drawImage(image,0,0);c.globalCompositeOperation='destination-in';c.scale(stamp.width,stamp.height);
 const blend=c.createRadialGradient(.49,.49,.04,.47,.51,.53);
 blend.addColorStop(0,'#fff');blend.addColorStop(.43,'rgba(255,255,255,.91)');
 blend.addColorStop(.96,'rgba(255,255,255,0)');blend.addColorStop(1,'rgba(255,255,255,0)');
 c.fillStyle=blend;c.fillRect(0,0,1,1);pads.set(image,stamp);return stamp;
}
function stoneSeed(seed:number,x:number,y:number,i:number){
 let h=Math.imul(seed^Math.imul(x+11,0x27d4eb2d)^Math.imul(y+17,0xa3141593)^Math.imul(i+7,0x68bc21eb),0x85ebca6b);
 h=Math.imul(h^(h>>>13),0xc2b2ae35);return ((h^(h>>>16))>>>0)/4294967296;
}

function staticLayer(cave:Cave,art:ArtLibrary):HTMLCanvasElement{
 const found=layers.get(cave);if(found)return found;
 const field=document.createElement('canvas');
 field.width=(CAVE_SIZE.x+2)*S;field.height=(CAVE_SIZE.y+3)*S;
 const c=field.getContext('2d')!;
 const floor=(x:number,y:number)=>x>=0&&x<CAVE_SIZE.x&&y>=0&&y<CAVE_SIZE.y?cave.tiles[y*CAVE_SIZE.x+x]:0;
 const shape=new Path2D();
 for(let row=0;row<CAVE_SIZE.y;row++)for(let col=0;col<CAVE_SIZE.x;col++)
   if(floor(col,row))shape.rect((col+1)*S,(row+2)*S,S,S);
 c.save();c.clip(shape);
 art.paintTile(c,cave.tier===3?'cave-floor-basalt':'cave-floor-dark',S,2*S,CAVE_SIZE.x*S,CAVE_SIZE.y*S);
 for(const [pass,spacing] of [1.62,.93].entries()){
  for(let row=-.5;row<CAVE_SIZE.y+1;row+=spacing)for(let col=-.5;col<CAVE_SIZE.x+1;col+=spacing){
    const x0=Math.floor(col*10),y0=Math.floor(row*10),rand=(k:number)=>stoneSeed(cave.seed,x0,y0,k+pass*7);
    const x=col+(rand(0)-.5)*spacing,y=row+(rand(1)-.5)*spacing;
    const value=floor(Math.floor(x),Math.floor(y));if(!value)continue;
    const tex=brush(art.image(floors[value]));
    const w=(1.68+rand(2)*.6)*spacing*S,h=(1.68+rand(3)*.6)*spacing*S;
    c.save();c.translate((x+1.5)*S,(y+2.5)*S);c.rotate((rand(4)-.5)*.85);
    c.globalAlpha=(pass===0?.72:.44)*(value===2?.80:1);
    c.drawImage(tex,-w/2,-h/2,w,h);c.restore();
  }
 }
 c.restore();
 for(let row=0;row<CAVE_SIZE.y;row++)for(let col=0;col<CAVE_SIZE.x;col++){
    if(!floor(col,row))continue;
    const x=(col+1.5)*S,y=(row+2)*S,hash=(Math.imul(row+14,917243)^Math.imul(col+38,27190037))>>>0;
    const depth=.82+(hash%7)*.078,stretch=.87+(hash%9)*.041;
    if(!floor(col,row-1))art.paint(c,'cave-wall',x,y+S*.2,S,{width:1.42*stretch,height:depth,flip:!!(hash%2),rotation:((hash%5)-2)*.028});
    if(!floor(col,row+1))art.paint(c,'cave-wall',x,y+S*1.22,S,{width:1.31*stretch,height:.46+depth*.15,flip:!!(hash%2)});
    if(!floor(col-1,row))art.paint(c,'cave-wall',x-S*.60,y+S*.74,S,{width:.66,height:depth*.93});
    if(!floor(col+1,row))art.paint(c,'cave-wall',x+S*.62,y+S*.67,S,{width:.69,height:depth*.88,flip:true});
 }
 if(layers.size>=2)layers.delete(layers.keys().next().value!);
 layers.set(cave,field);return field;
}

export function paintCave(c:CanvasRenderingContext2D,art:ArtLibrary,w:WorldState,cave:Cave,project:Project,tile:number,time:number){
 const {width,height}=c.canvas;
 const rockbase=c.createLinearGradient(0,0,width,height);
 rockbase.addColorStop(0,'#141f2c');rockbase.addColorStop(.58,'#1c2d3e');rockbase.addColorStop(1,'#142333');
 c.fillStyle=rockbase;c.fillRect(0,0,width,height);
 const tex=staticLayer(cave,art),base=project(CAVE_OFFSET.x-1,CAVE_OFFSET.y-2);
 c.drawImage(tex,base.x,base.y,(CAVE_SIZE.x+2)*tile,(CAVE_SIZE.y+3)*tile);
 for(const t of cave.traps){
   const p=project(t.x,t.y),state=iceTrap(w,t.phase);
   if(state==='warning'){
     ovalGlow(c,p.x,p.y,.72*tile,.54*tile,'rgba(228,161,91,.32)','rgba(220,115,43,0)');
     c.save();c.strokeStyle='rgba(247,181,110,.72)';c.lineWidth=1.8;
     c.beginPath();c.ellipse(p.x,p.y,tile*.57,tile*.57,0,0,2*Math.PI);c.stroke();c.restore();
   }
   art.paint(c,state==='active'?'cave-spikes-raised':'cave-spikes-set',p.x,p.y,tile);
 }
 const exit=project(cave.exit.x,cave.exit.y),chest=project(cave.chest.x,cave.chest.y);
 ovalGlow(c,exit.x,exit.y,tile*1.38,tile*.94,'rgba(231,162,88,.32)','rgba(229,137,65,0)');
 art.paint(c,'cave-stairs',exit.x,exit.y+tile*.27,tile,{width:1.53,height:1.14});
 const p=w.player,g=caveGuard(w);
 const d=Math.abs(p.facing.x)>Math.abs(p.facing.y)?p.facing.x>0?'east':'west':p.facing.y>0?'south':'north';
 const bodies=[{...cave.chest,art:caveChestTaken(w)?'cave-chest-open':'cave-chest-closed',w:1.19,h:1.04,shadow:.43,rotate:0,float:0},
   {x:p.x,y:p.y,art:'manan-'+d,w:1.43,h:1.43,shadow:.30,rotate:incapacitated(w)?1.27:rolling(w)?Math.min(1,rollAge(w)/ROLL_TICKS)*6.28:0,
    float:Math.hypot(p.vx,p.vy)>.002&&!incapacitated(w)?Math.sin(time*.021)*tile*.035:0}];
 if(g&&g.hp>0){
   if(g.warning>w.tick){
     const aim=project(g.aim.x,g.aim.y);
     ovalGlow(c,aim.x,aim.y,tile,tile,'rgba(228,136,75,.42)','rgba(226,112,52,0)');
     c.save();c.strokeStyle='rgba(249,178,105,.88)';c.lineWidth=2.2;c.setLineDash([6,4]);
     c.beginPath();c.arc(aim.x,aim.y,tile*1.02,0,Math.PI*2);c.stroke();c.restore();
   }
   bodies.push({x:g.x,y:g.y,art:'cave-guardian',w:1.64,h:1.55,shadow:.59,rotate:.014*Math.sin(time*.007),float:0});
 }
 for(const a of bodies.sort((a,b)=>a.y-b.y)){
   const p=project(a.x,a.y);
   ovalGlow(c,p.x,p.y,tile*a.shadow,tile*a.shadow*.43,'rgba(8,18,30,.55)');
   art.paint(c,a.art,p.x,p.y-a.float,tile,{width:a.w,height:a.h,rotation:a.rotate});
 }
 if(g&&g.hp>0){
   const at=project(g.x,g.y),bar=tile*1.06,x=at.x-bar*.5,y=at.y-tile*1.63;
   c.save();c.fillStyle='rgba(18,30,41,.88)';c.fillRect(x-2,y-2,bar+4,8);
   c.fillStyle='#d39359';c.fillRect(x,y,bar*g.hp/caveGuardMax(cave.tier),4);
   c.fillStyle='#e4d3b4';c.font='600 11px system-ui, sans-serif';c.textAlign='center';
   c.fillText('精英守卫',at.x,y-5);c.restore();
 }
 paintWeaponCombat(c,w,project,tile);
 const feet=project(p.x,p.y);
 c.save();c.globalCompositeOperation='screen';
 ovalGlow(c,chest.x,chest.y,tile*1.36,tile*1.13,'rgba(107,183,204,.15)','rgba(80,148,179,0)');
 ovalGlow(c,feet.x,feet.y-tile*.36,tile*1.62,tile*1.43,'rgba(227,145,72,.27)','rgba(211,112,48,0)');
 c.restore();
 const vignette=c.createRadialGradient(width*.5,height*.49,height*.30,width*.5,height*.5,height*.78);
 vignette.addColorStop(0,'rgba(11,22,35,0)');vignette.addColorStop(1,'rgba(11,22,35,.50)');
 c.fillStyle=vignette;c.fillRect(0,0,width,height);
}
