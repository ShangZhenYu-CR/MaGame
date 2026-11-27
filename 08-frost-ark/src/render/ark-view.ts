import { Lightmap } from './lightmap';
import { ArtLibrary } from './art-library';
import { clamp, cloudscape, ovalGlow, WeatherFinish } from './atmosphere';
import { primaryHearth } from '../sim/heatField';
import { isDeckDrop } from '../sim/latte';
import { aimEnd, hookTip } from '../sim/cloud';
import type { Vec2, WorldState } from '../sim/types';
import { PALETTE as P } from './palette';

export interface Ghost { x:number; y:number; ok:boolean; torch:boolean; wall?:boolean }
const deckIds=['deck-1','deck-2','deck-3','deck-4'];
const required=[
  ...deckIds,'manan-south','manan-north','manan-west','manan-east','latte-sleep','latte-alert','latte-walk','latte-walk-alt',
  'hearth-1','hearth-2','rail','corner','rock','icicles','storage','wall','torch',
  'debris-wood','debris-iron','debris-rope','clouds',
] as const;
interface Cell { x:number; y:number; hash:number; temperature:number; left:boolean; right:boolean; front:boolean; back:boolean }
interface Actor {
  x:number;y:number;art:string;shadow:number;
  width?:number;height?:number;rotation?:number;scale?:number;flip?:boolean;float?:number;fire?:'hearth'|'torch';hearthLevel?:number;
}
const tau=Math.PI*2;
const hash=(x:number,y:number)=>(Math.imul(x+101,1597334677)^Math.imul(y+291,3812015801))>>>0;

export class ArkView {
  private ctx:CanvasRenderingContext2D;
  private scale=60;
  private userScale:number|undefined;
  private origin:Vec2={x:0,y:0};
  private art=new ArtLibrary(required);
  private lightmap=new Lightmap();
  private weather=new WeatherFinish();
  private loaded=false;
  private loadError='';
  readonly ready:Promise<void> = this.art.ready;

  constructor(private canvas:HTMLCanvasElement) {
    this.ctx=canvas.getContext('2d')!;
    this.ready.then(()=>{this.loaded=true;},err=>{this.loadError=err instanceof Error?err.message:String(err);});
    canvas.addEventListener('wheel',e=>{
      if(e.ctrlKey || e.metaKey)return;
      e.preventDefault();
      this.zoom(e.deltaY);
    },{passive:false});
  }

  zoom(deltaY:number):void{
    if(deltaY)this.userScale=clamp(this.scale-Math.sign(deltaY)*4,44,80);
  }

  resize(w:WorldState):void {
    this.canvas.width=Math.max(1,this.canvas.clientWidth);
    this.canvas.height=Math.max(1,this.canvas.clientHeight);
    this.position(w);
  }

  position(w:WorldState):void {
    const {width,height}=this.canvas, center=w.ark.size/2+.5;
    this.scale=this.userScale??clamp(Math.round(Math.min(width/15.2,height/10.7)),56,64);
    const deadzoneX=clamp((width/this.scale-6)/2,.2,2.5);
    const deadzoneY=clamp(height/this.scale*.34-.55,.15,2.8);
    const cx=center+Math.sign(w.player.x-center)*Math.max(0,Math.abs(w.player.x-center)-deadzoneX);
    const cy=center+Math.sign(w.player.y-center)*Math.max(0,Math.abs(w.player.y-center)-deadzoneY);
    this.origin={x:Math.round(width/2-cx*this.scale),y:Math.round(height*.414+clamp((680-height)*.15,0,24)-cy*this.scale)};
    const data=this.canvas.dataset;
    if(data.tileScale!==String(this.scale))data.tileScale=String(this.scale);
    if(data.originX!==String(this.origin.x))data.originX=String(this.origin.x);
    if(data.originY!==String(this.origin.y))data.originY=String(this.origin.y);
  }

  screen(x:number,y:number):Vec2 {
    return {x:this.origin.x+x*this.scale,y:this.origin.y+y*this.scale};
  }

  world(clientX:number,clientY:number):Vec2 {
    const b=this.canvas.getBoundingClientRect();
    return {x:((clientX-b.left)*this.canvas.width/Math.max(1,b.width)-this.origin.x)/this.scale,
      y:((clientY-b.top)*this.canvas.height/Math.max(1,b.height)-this.origin.y)/this.scale};
  }

  draw(w:WorldState,ghost:Ghost|null):void {
    this.position(w);
    const c=this.ctx,s=this.scale;
    if(!this.loaded){
      c.fillStyle=P.skyDeep;c.fillRect(0,0,c.canvas.width,c.canvas.height);
      c.textAlign='center';c.font='15px system-ui';c.fillStyle=P.uiMuted;
      c.fillText(this.loadError?`美术资产载入失败 · ${this.loadError}`:'正在准备霜云方舟…',c.canvas.width/2,c.canvas.height/2);
      return;
    }
    c.imageSmoothingEnabled=true;
    c.imageSmoothingQuality='medium';
    const project=this.screen.bind(this);
    const {width,height}=c.canvas;
    const deck=(x:number,y:number)=>x>=0&&y>=0&&x<w.ark.size&&y<w.ark.size&&!!w.ark.decks[y*w.ark.size+x];
    const cells:Cell[]=[];
    const a=this.worldBounds();
    for(let y=a.top;y<=a.bottom;y++) for(let x=a.left;x<=a.right;x++){
      if(!deck(x,y))continue;
      cells.push({x,y,hash:hash(x,y),temperature:w.ark.heatGrid[y*w.ark.size+x]??w.ambientTemp,
        left:!deck(x-1,y),right:!deck(x+1,y),front:!deck(x,y+1),back:!deck(x,y-1)});
    }

    // L0: Parallax cloud ocean and high-altitude haze.
    cloudscape(c,this.art.image('clouds'),w,this.origin);
    // L1: Projected hull, deck, and generated structural fittings.
    const b=this.deckStructure(c,cells,w);
    const actors:Actor[]=[...this.edgeActors(cells,w,ghost)];
    const fire=primaryHearth(w);
    for(const bld of w.ark.buildings){
      const {gx,gy}=bld;
      if(bld.defId==='hearth_core')actors.push({x:gx+1,y:gy+1.76,art:bld.level>=2?'hearth-2':'hearth-1',
        width:2.65,height:2.43,shadow:1.15,fire:bld.fuel>0?'hearth':undefined,hearthLevel:bld.level});
      if(bld.defId==='storage_box')actors.push({x:gx+.5,y:gy+.80,art:'storage',width:1.26,height:1.23,shadow:.51});
      if(bld.defId==='wind_wall')actors.push({x:gx+.5,y:gy+.79,art:'wall',width:1.18,height:1.24,shadow:.57});
      if(bld.defId==='torch_post')actors.push({x:gx+.5,y:gy+.80,art:'torch',width:.82,height:1.31,shadow:.26,fire:'torch'});
    }
    const pl=w.player,latte=w.latte;
    const catWalking=fire?Math.hypot(latte.x-fire.gx-2.4,latte.y-fire.gy-2.4)>.23:false;
    actors.push({x:latte.x,y:latte.y,art:catWalking?(Math.floor(w.tick/7)%2?'latte-walk':'latte-walk-alt'):latte.mood==='cozy'?'latte-sleep':'latte-alert',
      width:.94,height:.94,shadow:.32,scale:1+(.5+.5*Math.sin(w.tick*.12))*.03,rotation:catWalking?Math.sin(w.tick*.45)*.026:0});
    const dir=Math.abs(pl.facing.x)>Math.abs(pl.facing.y)?(pl.facing.x<0?'west':'east'):(pl.facing.y<0?'north':'south');
    const walking=!!(pl.vx||pl.vy);
    const player:Actor={x:pl.x,y:pl.y,art:`manan-${dir}`,width:1.43,height:1.43,shadow:.34,scale:walking?1:1+(.5+.5*Math.sin(w.tick*.115))*.03,
      rotation:walking?Math.sin(w.tick*.42)*Math.PI/72:0,float:walking?Math.abs(Math.sin(w.tick*.31))*s*.04:0};
    actors.push(player);

    const g=pl.grapple;
    const held=w.sky.debris.find(d=>d.id===g.caughtDebrisId);
    for(const d of w.sky.debris){
      if(d.x<0||!d.loot.length)continue;
      const pos=project(d.x,d.y);
      if(pos.x< -s||pos.x>width+s||pos.y< -s||pos.y>height+s)continue;
      const drop=isDeckDrop(d),id=d.loot[0].itemId;
      actors.push({x:d.x,y:d.y+(drop?.14:.22),art:id==='frost_iron_scrap'?'debris-iron':id==='rope'?'debris-rope':'debris-wood',
        shadow:drop?.24:0,width:drop?.60:1.04,height:drop?.60:1.04,
        float:drop?0:s*(.04+.075*Math.sin(w.tick*.10+d.x)),rotation:drop?0:.048*Math.sin(w.tick*.052+d.y)});
    }

    // L2: Whole-scene grounding before painting the sprites.
    const firePos=fire&&fire.fuel>0?{x:fire.gx+1,y:fire.gy+1.18}:null;
    for(const actor of actors){
      if(!actor.shadow)continue;
      const p=project(actor.x,actor.y),r=s*actor.shadow;
      if(firePos){
        const dx=actor.x-firePos.x,dy=actor.y-firePos.y,dist=Math.hypot(dx,dy);
        if(dist>.32&&dist<4){
          c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(dy,dx));
          ovalGlow(c,r*.56,0,r*1.37,r*.37,`rgba(8,16,28,${.23*(1-dist/4)})`);
          c.restore();
        }
      }
      ovalGlow(c,p.x,p.y+r*.12,r*1.14,r*.42,'rgba(8,16,28,.44)');
    }
    if(ghost)this.paintGhost(c,ghost);

    // L3: Ground-point based depth ordering (including foreground edge fittings).
    actors.sort((a,b)=>a.y-b.y);
    for(const actor of actors){
      const p=project(actor.x,actor.y);
      this.art.paint(c,actor.art,p.x,p.y-(actor.float??0),s,actor);
      if(actor.fire)this.paintFire(c,actor,p,w.tick);
    }
    if(g.active||g.charging)this.paintHook(c,w,held);
    // L4 and L5: Night/fire composite, then screen particles and hypothermia.
    const lens=this.art.offset(player.art,dir==='south'?.135:dir==='north'?.865:dir==='east'?.46:.54,.73,s*1.43,s*1.43);
    const feet=project(pl.x,pl.y);
    this.lightmap.paint(c,w,project,s,{x:feet.x+lens.x,y:feet.y+lens.y-(player.float??0)});
    if(b && w.weather!=='clear')this.lowClouds(c,b,w.tick,true);
    this.weather.paint(c,w);
    if(this.canvas.dataset.artReady!=='true')this.canvas.dataset.artReady='true';
  }

  private worldBounds():{left:number;top:number;right:number;bottom:number}{
    const {width,height}=this.canvas,s=this.scale;
    return {left:Math.max(0,Math.floor(-this.origin.x/s)-3),right:Math.ceil((width-this.origin.x)/s)+3,
      top:Math.max(0,Math.floor(-this.origin.y/s)-5),bottom:Math.ceil((height-this.origin.y)/s)+2};
  }

  private deckStructure(c:CanvasRenderingContext2D,cells:Cell[],w:WorldState):HullBounds|null{
    if(!cells.length)return null;
    const s=this.scale;
    const minX=Math.min(...cells.map(t=>t.x)),minY=Math.min(...cells.map(t=>t.y));
    const maxX=Math.max(...cells.map(t=>t.x))+1,maxY=Math.max(...cells.map(t=>t.y))+1;
    const p=this.screen((minX+maxX)/2,maxY);
    const b:HullBounds={x:p.x,y:p.y,w:(maxX-minX)*s,d:(maxY-minY)*s};
    ovalGlow(c,p.x+s*.17,p.y+s*.79,b.w*.66,b.d*.26,'rgba(12,31,46,.48)');
    this.lowClouds(c,b,w.tick,false);

    const hull=cells.filter(t=>t.front||t.left||t.right).sort((a,b)=>a.y-b.y);
    for(const t of hull){
      const side=!t.front;
      const p=this.screen(t.x+(t.left&&side?.16:t.right&&side?.84:.5),t.y+1);
      const span=side?.99:1.46;
      const height=(side?1.03:1.44)+((t.hash>>>5)%5)*.17;
      const tip=p.y+s*(height*.73-(side?.28:0));
      this.art.paint(c,'rock',p.x,tip,s,{width:span,height,flip:!!(t.hash%2)});
      if(!side||t.hash%3===0){
        this.art.paint(c,'icicles',p.x+s*(t.hash%2===0?-.24:.27),p.y+s*(.53+((t.hash>>>6)%4)*.13),s,
          {width:side?.49:.69,height:.65+((t.hash>>>13)%5)*.12,flip:!!(t.hash%2)});
      }
      if(t.hash%3!==1){
        c.save();c.globalCompositeOperation='screen';
        ovalGlow(c,p.x+s*.17,p.y+s*(side?.18:.47),s*.18,s*.22,'rgba(64,155,172,.18)','rgba(64,155,172,0)');
        c.restore();
      }
    }
    for(const t of cells){
      const p=this.screen(t.x,t.y);
      const id=deckIds[t.hash%4];
      this.art.paintTile(c,id,p.x,p.y,s,s);
      this.frost(c,t,p);
    }
    return b;
  }

  private lowClouds(c:CanvasRenderingContext2D,b:HullBounds,tick:number,front:boolean):void {
    const n=front?5:9;
    for(let i=0;i<n;i++){
      const width=b.w*(.16+(i%3)*.091);
      const dx=b.w*(((i*.221+tick*.00043)%1)-.5);
      const y=b.y+(i%4)*b.d*.04+(front?.21:.11)*b.d;
      ovalGlow(c,b.x+dx,y,width,width*.16,front?'rgba(139,180,202,.08)':'rgba(118,166,188,.16)','rgba(118,166,188,0)');
    }
  }

  private frost(c:CanvasRenderingContext2D,t:Cell,p:Vec2):void {
    const strength=clamp((8-t.temperature)/28);
    if(!strength)return;
    const s=this.scale;
    const a=Math.min(.55,.12+strength*.4);
    const overlay=c.createLinearGradient(p.x,p.y,p.x+s,p.y+s);
    overlay.addColorStop(0,`rgba(163,206,225,${a*.8})`);
    overlay.addColorStop(.40,`rgba(162,202,221,${a*.45})`);
    overlay.addColorStop(.68,`rgba(167,199,214,${a*.32})`);
    overlay.addColorStop(1,`rgba(191,226,235,${a*.90})`);
    c.fillStyle=overlay;c.fillRect(p.x,p.y,s,s);
    c.save();c.lineCap='round';
    for(const [ex,ey,dx,dy] of [
      ...(t.back?[[0,0,1,0]]:[]),...(t.right?[[1,0,0,1]]:[]),
      ...(t.front?[[1,1,-1,0]]:[]),...(t.left?[[0,1,0,-1]]:[]),
    ]){
      const edge=c.createLinearGradient(p.x+s*ex,p.y+s*ey,p.x+s*(ex-dy*.19),p.y+s*(ey+dx*.19));
      edge.addColorStop(0,`rgba(218,239,246,${a})`);edge.addColorStop(1,'rgba(188,225,240,0)');
      c.fillStyle=edge;
      c.beginPath();c.moveTo(p.x+s*ex,p.y+s*ey);c.lineTo(p.x+s*(ex+dx),p.y+s*(ey+dy));
      c.lineTo(p.x+s*(ex+dx-dy*.17),p.y+s*(ey+dy+dx*.17));c.lineTo(p.x+s*(ex-dy*.17),p.y+s*(ey+dx*.17));c.closePath();c.fill();
      c.strokeStyle=`rgba(218,236,241,${a*.67})`;c.lineWidth=.6;
      c.beginPath();
      for(let i=0;i<8;i++){
        const q=(i+.5)/8, n=((t.hash>>>(i*3))&7)*.011+.025;
        const x=p.x+s*(ex+dx*q),y=p.y+s*(ey+dy*q);
        c.moveTo(x,y);c.lineTo(x-s*dy*n,y+s*dx*n);
        c.lineTo(x-s*dy*n-s*dx*.045,y+s*dx*n-s*dy*.045);
      }
      c.stroke();
    }
    c.fillStyle=`rgba(220,239,246,${a*.71})`;
    c.beginPath();
    for(let i=0;i<9;i++){
      const q=hash(t.x+i*49,t.y-i*17);
      const x=p.x+s*(.04+(q%87)*.0105), y=p.y+s*(.05+((q>>>9)%87)*.0103);
      c.moveTo(x+.84,y);c.arc(x,y,.4+(q>>>24)%4*.22,0,tau);
    }
    c.fill();c.restore();
  }

  private edgeActors(cells:Cell[],w:WorldState,ghost:Ghost|null):Actor[]{
    const trims:Actor[]=[];
    const put=(x:number,y:number,art:string,width:number,height:number,flip=false)=>
      trims.push({x,y,art,width,height,shadow:art==='corner'?.17:.26,flip});
    const center=w.ark.size/2;
    const hasGhost=(x:number,y:number)=>!!ghost&&ghost.x===x&&ghost.y===y&&ghost.ok&&!ghost.torch&&!ghost.wall;
    for(const t of cells){
      const {x,y}=t;
      // A main gap on each side of the launch deck; expanded cells follow the outer contour.
      if(t.back&&!hasGhost(x,y-1)&&x!==center)put(x+.5,y+.10,'rail',1.18,.54);
      if(t.front&&!hasGhost(x,y+1)&&x!==center)put(x+.5,y+.97,'rail',1.14,.55);
      if(t.left&&!hasGhost(x-1,y)&&y!==center-1)put(x+.11,y+.79,'rail',.48,.89,true);
      if(t.right&&!hasGhost(x+1,y)&&y!==center-1)put(x+.88,y+.79,'rail',.48,.89);
      if(t.back&&t.left)put(x+.10,y+.12,'corner',.43,.58,true);
      if(t.back&&t.right)put(x+.88,y+.12,'corner',.43,.58);
      if(t.front&&t.left)put(x+.10,y+.99,'corner',.43,.58,true);
      if(t.front&&t.right)put(x+.88,y+.99,'corner',.43,.58);
      if(t.front&&x===center){put(x+.16,y+1,'corner',.34,.46);put(x+.87,y+1,'corner',.34,.46,true);}
      if(t.back&&x===center){put(x+.16,y+.1,'corner',.34,.46);put(x+.87,y+.1,'corner',.34,.46,true);}
    }
    return trims;
  }

  private paintGhost(c:CanvasRenderingContext2D,ghost:Ghost):void {
    const p=this.screen(ghost.x,ghost.y),s=this.scale;
    c.save();
    c.globalAlpha=ghost.ok?.57:.30;
    if(ghost.wall||ghost.torch)
      this.art.paint(c,ghost.wall?'wall':'torch',p.x+s*.5,p.y+s*.8,s,{width:ghost.wall?1.18:.82,height:ghost.wall?1.24:1.31});
    else this.art.paintTile(c,deckIds[hash(ghost.x,ghost.y)%4],p.x,p.y,s,s);
    c.globalAlpha=.97;c.strokeStyle=ghost.ok?P.uiConfirmTeal:P.uiDanger;
    c.lineWidth=2;c.setLineDash([5,4]);c.strokeRect(p.x+.5,p.y+.5,s-1,s-1);
    c.restore();
  }

  private paintHook(c:CanvasRenderingContext2D,w:WorldState,held:Vec2|undefined):void{
    const g=w.player.grapple,s=this.scale;
    const p=this.screen(w.player.x,w.player.y);
    const worldTip=g.charging?aimEnd(w,{x:g.targetX,y:g.targetY}):hookTip(w);
    const q=this.screen(worldTip.x,worldTip.y);
    if(held)q.y-=s*.19;
    c.save();
    const x=p.x+Math.sign(q.x-p.x)*s*.29,y=p.y-s*.40;
    c.beginPath();c.moveTo(x,y);c.quadraticCurveTo((x+q.x)/2,(y+q.y)/2+(g.charging?0:6),q.x,q.y);
    c.strokeStyle='rgba(20,35,43,.74)';c.lineWidth=g.charging?2.5:4;c.stroke();
    c.strokeStyle=g.charging?P.hearthCore:P.uiAccentWarm;
    c.lineWidth=g.charging?1.35:2;c.setLineDash(g.charging?[5,6]:[]);c.stroke();c.setLineDash([]);
    c.beginPath();c.moveTo(q.x-4,q.y-3);c.lineTo(q.x,q.y+3);c.lineTo(q.x+6,q.y-4);
    c.strokeStyle=P.hearthCore;c.stroke();
    if(held){c.beginPath();c.ellipse(q.x,q.y,s*.35,s*.25,0,0,tau);c.strokeStyle='rgba(255,208,138,.58)';c.stroke();}
    c.restore();
  }

  private paintFire(c:CanvasRenderingContext2D,actor:Actor,p:Vec2,tick:number):void {
    const hearth=actor.fire==='hearth',s=this.scale;
    const anchor=this.art.offset(actor.art,hearth?.48:.50,hearth?.79:.17,s*actor.width!,s*actor.height!);
    const x=p.x+anchor.x,y=p.y+anchor.y;
    const r=s*(hearth?.30:.14),up=r*(1.12+Math.sin(tick*.29)*.16+Math.sin(tick*.73)*.07);
    c.save();
    c.globalCompositeOperation='screen';
    ovalGlow(c,x,y,r*1.45,r*1.07,'rgba(230,105,44,.54)','rgba(230,105,44,0)');
    let g=c.createLinearGradient(x,y-up,x,y+r*.50);
    g.addColorStop(0,'rgba(242,133,51,0)');g.addColorStop(.33,'rgba(232,99,39,.74)');
    g.addColorStop(.72,'rgba(255,172,65,.88)');g.addColorStop(1,'rgba(255,229,154,.94)');
    c.fillStyle=g;
    for(let i=0;i<3;i++){
      const xx=x+(i-1)*r*.46,h=up*(.66+i%2*.34+Math.sin(tick*.31+i*2)*.18);
      const lean=Math.sin(tick*.22+i)*r*.28;
      c.beginPath();c.moveTo(xx-r*.28,y+r*.32);
      c.bezierCurveTo(xx-r*.62,y-r*.13,xx+r*.25,y-h*.38,xx+lean,y-h);
      c.bezierCurveTo(xx+r*.22,y-h*.58,xx+r*.64,y-r*.08,xx+r*.31,y+r*.28);
      c.closePath();c.fill();
    }
    for(let i=0;i<(hearth?10:5);i++){
      const f=((tick*.027+i*.179)%1),ex=x+(i%2===0?1:-1)*r*(f*.82+Math.sin(f*6+i)*.2);
      const ey=y-f*r*2.25;
      c.globalAlpha=(1-f)*.65;c.fillStyle=i%2?'#f4a04f':'#ffdf99';
      c.beginPath();c.arc(ex,ey,.7+(i%3)*.26,0,tau);c.fill();
    }
    c.restore();
    if(hearth){
      const leveled=actor.hearthLevel===2;
      const chimney=this.art.offset(actor.art,leveled?.79:.80,.035,s*actor.width!,s*actor.height!);
      const chimneyX=p.x+chimney.x,chimneyY=p.y+chimney.y;
      for(let i=0;i<6;i++){
        const f=(tick*.013+i/6)%1;
        ovalGlow(c,chimneyX+s*(f*.37+Math.sin(f*6+tick*.03)*.12),chimneyY-s*f*.75,
          s*(.12+f*.22),s*(.078+f*.14),`rgba(144,170,177,${.23*(1-f)})`,'rgba(144,170,177,0)');
      }
    }
  }
}

interface HullBounds { x:number; y:number; w:number; d:number }
