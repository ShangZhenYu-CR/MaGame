import { contourHull, HULL_NORTH, HULL_EAST, HULL_SOUTH, HULL_WEST, type HullProfile } from '../sim/hull';
import { GROUND_FOOTPRINTS } from '../sim/ground-footprint';
import { Lightmap } from './lightmap';
import { ArtLibrary } from './art-library';
import { clamp, cloudscape, ovalGlow, WeatherFinish } from './atmosphere';
import { primaryHearth } from '../sim/heatField';
import { finaleStatus } from '../sim/finale';
import { incapacitated, RESCUE_TICKS, rescuePoint } from '../sim/rescue';
import { isDeckDrop } from '../sim/latte';
import { buildingDefs } from '../sim/ark';
import { getIndustrySave } from '../sim/m2-state';
import { dockedIsland, gangwayGeometry, islandNodes, islandNodeRemaining } from '../sim/island';
import { helmPoint } from '../sim/sky-map';
import { ISLAND_ART, islandActor, islandCameraExtent, paintGangway, paintIsland } from './island-view';
import { BEAST_ART, BeastScene, paintBeastCues } from './beast-view';
import { HOSTILE_ART, m5Actors, paintAttackTell, paintHostileBar, paintM5CombatEffects } from './combat-view';
import { aimEnd, hookTip } from '../sim/cloud';
import type { Vec2, WorldState } from '../sim/types';
import { PALETTE as P } from './palette';

export interface Ghost { x:number; y:number; ok:boolean; defId?:string; torch?:boolean; wall?:boolean }
const deckIds=['deck-1','deck-2','deck-3','deck-4'];
interface BuildingVisual { art:string; width:number; height:number; shadow:number }
const buildingVisuals:Readonly<Record<string,BuildingVisual>>={
  storage_box:{art:'storage',width:1.26,height:1.23,shadow:.51},
  wind_wall:{art:'wall',width:1.18,height:1.24,shadow:.57},
  torch_post:{art:'torch',width:.82,height:1.31,shadow:.26},
  workbench:{art:'building-workbench',width:1.20,height:1.14,shadow:.54},
  furnace:{art:'building-smelter',width:1.25,height:1.42,shadow:.51},
  stove:{art:'building-stove',width:1.20,height:1.33,shadow:.50},
  heat_relay:{art:'building-heat-relay',width:1.22,height:1.5,shadow:.45},
  catch_net:{art:'building-net',width:1.23,height:1.20,shadow:.45},
  sorter_arm:{art:'building-sorter',width:1.20,height:1.46,shadow:.47},
  greenhouse:{art:'building-greenhouse',width:2.26,height:2.17,shadow:.98},
  warm_wall:{art:'building-insulated-wall',width:1.18,height:1.25,shadow:.55},
  frost_turret:{art:'building-frost-arrow-turret',width:1.29,height:1.52,shadow:.59},
  fire_oil_turret:{art:'building-fire-oil-turret',width:1.33,height:1.53,shadow:.62},
  beast_den:{art:'building-beast-den',width:2.28,height:2.15,shadow:1.01},
  feed_trough:{art:'building-feed-trough',width:1.20,height:1.00,shadow:.54},
  buoyancy_core:{art:'building-buoyancy-core',width:1.20,height:1.38,shadow:.50},
};
const ironDeck='building-iron-deck';
const required=[
  ...deckIds,'boss-frost-whale-1','boss-frost-whale-2','boss-frost-whale-3','solar-hearth','aurora-crystal','manan-south','manan-north','manan-west','manan-east','latte-sleep','latte-alert','latte-walk','latte-walk-alt',
  'hearth-1','hearth-2','rail','corner','rock','icicles',ironDeck,...Object.values(buildingVisuals).map(v=>v.art),
  'debris-wood','debris-iron','debris-rope','debris-heavy','clouds','rail-side','rock-side','frost-frame',...ISLAND_ART,...BEAST_ART,...HOSTILE_ART,
] as const;
interface Cell { x:number; y:number; hash:number; iron:boolean; temperature:number; left:boolean; right:boolean; front:boolean; back:boolean }
interface Actor {
  x:number;y:number;art:string;shadow:number;
  width?:number;height?:number;rotation?:number;scale?:number;flip?:boolean;float?:number;fire?:'hearth'|'torch'|'forge'|'stove'|'relay';hearthLevel?:number;
}
function dataHull(canvas:HTMLCanvasElement,hull:HullProfile):void{
  canvas.dataset.hullCones=String(hull.cones.reduce((n,x)=>n+x,0));
  canvas.dataset.hullInnerCorners=String(hull.corners.filter(x=>x.inside).length);
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
  private beastScene=new BeastScene();
  private weather=new WeatherFinish();
  private hull:HullProfile|null=null;
  private hullSignature='';
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
    let cx=center+Math.sign(w.player.x-center)*Math.max(0,Math.abs(w.player.x-center)-deadzoneX);
    let cy=center+Math.sign(w.player.y-center)*Math.max(0,Math.abs(w.player.y-center)-deadzoneY);
    const island=dockedIsland(w);
    let yFraming=.414;
    if(island){
      const bounds=islandCameraExtent(island);
      const connection=gangwayGeometry(w);
      // Reveal the shore from the deck and track the player over the same world
      // coordinates. Neither zoom nor crossing relocates the camera namespace.
      const landWeight=clamp((w.player.x-(connection?.x??bounds.left)+1.1)/5.2);
      const shoreNudge=clamp((bounds.left-center)*.40,1.7,4.1);
      const landX=clamp(w.player.x+.7,center+shoreNudge,bounds.right-1.65);
      const landY=clamp(w.player.y,bounds.top+1.4,bounds.bottom-1.55);
      cx=(cx+shoreNudge)*(1-landWeight)+landX*landWeight;
      cy=cy*(1-landWeight)+landY*landWeight;
      yFraming+=landWeight*.064;
    }
    this.origin={x:Math.round(width/2-cx*this.scale),y:Math.round(height*yFraming+clamp((680-height)*.15,0,24)-cy*this.scale)};
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
    const signature=w.ark.decks.join('');
    if(!this.hull||signature!==this.hullSignature){
      this.hullSignature=signature;
      this.hull=contourHull(w.ark);
      dataHull(this.canvas,this.hull);
    }
    const hull=this.hull;
    const cells:Cell[]=[];
    const a=this.worldBounds();
    for(let y=a.top;y<=a.bottom;y++) for(let x=a.left;x<=a.right;x++){
      if(!deck(x,y))continue;
      const i=y*w.ark.size+x,mask=hull.edges[i];
      cells.push({x,y,hash:hash(x,y),iron:w.ark.decks[i]===2,temperature:w.ark.heatGrid[i]??w.ambientTemp,
        left:!!(mask&HULL_WEST),right:!!(mask&HULL_EAST),front:!!(mask&HULL_SOUTH),back:!!(mask&HULL_NORTH)});
    }

    // L0: Parallax cloud ocean and high-altitude haze.
    cloudscape(c,this.art.image('clouds'),w,{
      x:this.origin.x+w.sky.x*3.5,y:this.origin.y+w.sky.y*1.9,
    });
    // Free-floating scrap belongs to the lower air lane. Hull silhouettes can
    // occlude it; deck drops only enter the foreground after a grab/placement.
    const pl=w.player,g=pl.grapple;
    const held=w.sky.debris.find(d=>d.id===g.caughtDebrisId);
    const deckDrops:Actor[]=[];
    for(const d of w.sky.debris){
      if(d.x<0||!d.loot.length)continue;
      const pos=project(d.x,d.y);
      if(pos.x< -s||pos.x>width+s||pos.y< -s||pos.y>height+s)continue;
      const drop=isDeckDrop(d),id=d.loot[0].itemId;
      const art=d.heavy?'debris-heavy':id==='frost_iron_scrap'?'debris-iron':id==='rope'?'debris-rope':'debris-wood';
      if(drop){deckDrops.push({x:d.x,y:d.y+.14,art,shadow:.24,width:.60,height:.60}); continue;}
      const fy=pos.y+s*(.17-.075*Math.sin(w.tick*.10+d.x));
      c.save();c.globalAlpha=.92;
      this.art.paint(c,art,pos.x,fy,s,{width:d.heavy?1.05:.78,height:d.heavy?1.05:.78,rotation:.048*Math.sin(w.tick*.052+d.y)});
      c.restore();
      ovalGlow(c,pos.x+s*.07,fy-s*.12,s*.55,s*.13,'rgba(159,192,211,.19)','rgba(159,192,211,0)');
    }
    // L1: Both traversable surfaces and the physical gangway share one
    // projection and one scenery pass, including the space between them.
    const island=dockedIsland(w), gangway=gangwayGeometry(w);
    if(island?.nodeId==='aurora_vault'){
      c.save();c.globalCompositeOperation='screen';
      for(let i=0;i<6;i++){
        const top=height*(.08+i*.019);
        const sky=c.createLinearGradient(0,0,width,0);
        sky.addColorStop(0,'rgba(40,101,127,0)');sky.addColorStop(.35,'rgba(90,194,186,.23)');
        sky.addColorStop(.70,'rgba(123,190,212,.12)');sky.addColorStop(1,'rgba(39,122,146,0)');
        c.strokeStyle=sky;c.lineWidth=5+i;
        c.beginPath();c.moveTo(0,top+s*.8);
        c.bezierCurveTo(width*.32,top-s*.75,width*.76,top+s*1.3,width,top-s*.32);c.stroke();
      }
      c.restore();
    }
    if(island)paintIsland(c,this.art,island,project,s,w.tick);
    const b=this.deckStructure(c,cells,w,hull);
    if(gangway?.deployed)paintGangway(c,this.art,gangway,project,s);
    const actors:Actor[]=[...this.edgeActors(cells,w,ghost,gangway,hull),...deckDrops];
    if(island){
      for(const node of islandNodes(w)){
        const p=project(node.x,node.y);
        if(p.x< -s*2||p.x>width+s*2||p.y< -s*2||p.y>height+s*3)continue;
        const actor=islandActor(node,islandNodeRemaining(w,node),island.biomeId);
        if(actor)actors.push(actor);
      }
    }
    if(island?.nodeId==='aurora_vault'&&gangway?.deployed){
      const start=gangway.x+gangway.width;
      for(const [dx,dy] of [[4,-3],[9,4],[11,-3]]){
        const x=start+dx+.5,y=gangway.y+dy+.5;
        const i=(Math.floor(y)-island.offsetY)*island.size+Math.floor(x)-island.offsetX;
        if(island.tiles[i])actors.push({x,y,art:'aurora-crystal',width:1.25,height:1.26,shadow:.36});
      }
    }
    const finale=finaleStatus(w), whale=finale.atAurora?finale.whale:null;
    if(whale){
      actors.push({x:whale.x,y:whale.y,art:whale.art,width:4.0,height:3.64,shadow:1.27,
        float:s*(.35+.10*Math.sin(w.tick*.085)),rotation:.017*Math.sin(w.tick*.042)});
      if(whale.warning){
        const {warning,radius}=whale;
        for(const [spot,r] of [[warning,radius],[warning.echo,radius*.87]] as const){
          if(!spot)continue;
          const at=project(spot.x,spot.y), pulse=.26+.06*Math.sin(w.tick*.43);
          ovalGlow(c,at.x,at.y,s*r,s*r,`rgba(235,162,100,${pulse})`,'rgba(242,134,66,.02)');
          c.save();c.strokeStyle='rgba(255,207,155,.86)';c.lineWidth=2.4;
          c.setLineDash([7,5]);c.lineDashOffset=-w.tick*.62;c.beginPath();c.arc(at.x,at.y,s*r,0,Math.PI*2);c.stroke();c.restore();
        }
      }
    }
    const helm=helmPoint(w);
    actors.push({...helm,art:'ark-helm',width:.98,height:1.24,shadow:.38,
      rotation:w.sky.cruising?Math.sin(w.tick*.085)*.017:0});
    const beasts=this.beastScene.actors(w,s).filter(b=>{
      const p=project(b.x,b.y);
      return p.x> -s*3&&p.x<width+s*3&&p.y> -s*3&&p.y<height+s*4;
    });
    actors.push(...beasts);
    const hostiles=m5Actors(w);
    for(const hostile of hostiles)paintAttackTell(c,project(hostile.x,hostile.y),hostile,s,w.tick);
    actors.push(...hostiles);
    const fire=primaryHearth(w);
    for(const bld of w.ark.buildings){
      const {gx,gy}=bld;
      if(bld.defId==='hearth_core')actors.push({x:gx+1,y:gy+GROUND_FOOTPRINTS.hearth_core!.anchorY,art:bld.level>=4?'solar-hearth':bld.level>=2?'hearth-2':'hearth-1',
        width:2.65,height:2.43,shadow:1.15,fire:bld.fuel>0?'hearth':undefined,hearthLevel:bld.level});
      const visuals=buildingVisuals[bld.defId];
      if(!visuals)continue;
      const [spanX,spanY]=buildingDefs.get(bld.defId)?.size??[1,1];
      const working=getIndustrySave(w)?.stations[bld.id]?.job;
      const effect=bld.defId==='torch_post'?'torch':bld.defId==='heat_relay'?'relay':
        working?(bld.defId==='furnace'?'forge':bld.defId==='stove'?'stove':undefined):undefined;
      actors.push({...visuals,x:gx+spanX*.5,y:gy+(GROUND_FOOTPRINTS[bld.defId]?.anchorY??spanY*.80),fire:effect});
    }
    const latte=w.latte;
    const catWalking=fire?Math.hypot(latte.x-fire.gx-2.4,latte.y-fire.gy-2.4)>.23:false;
    actors.push({x:latte.x,y:latte.y,art:catWalking?(Math.floor(w.tick/7)%2?'latte-walk':'latte-walk-alt'):latte.mood==='cozy'?'latte-sleep':'latte-alert',
      width:.94*.65,height:.94*.65,shadow:.32*.65,scale:1+(.5+.5*Math.sin(w.tick*.12))*.03,rotation:catWalking?Math.sin(w.tick*.45)*.026:0});
    const dir=Math.abs(pl.facing.x)>Math.abs(pl.facing.y)?(pl.facing.x<0?'west':'east'):(pl.facing.y<0?'north':'south');
    const down=incapacitated(w), walking=!!(pl.vx||pl.vy), age=w.tick-(pl.rescue.startedAt??w.tick);
    const land=w.activeIsland||!deck(Math.floor(pl.x),Math.floor(pl.y));
    const pull=down&&!land?clamp((age-RESCUE_TICKS*.55)/(RESCUE_TICKS*.45)):0;
    const target=pull?rescuePoint(w):pl;
    const actorX=pl.x+(target.x-pl.x)*pull,actorY=pl.y+(target.y-pl.y)*pull;
    const player:Actor={x:actorX,y:actorY,art:`manan-${dir}`,width:1.43,height:1.43,shadow:.34,scale:walking?1:1+(.5+.5*Math.sin(w.tick*.115))*.03,
      rotation:down?clamp(age/14)*1.49:walking?Math.sin(w.tick*.42)*Math.PI/72:0,float:walking?Math.abs(Math.sin(w.tick*.31))*s*.04:0};
    actors.push(player);

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
    if(g.active)this.paintHook(c,w,held);
    // L4 and L5: Night/fire composite, then screen particles and hypothermia.
    const lens=this.art.offset(player.art,dir==='south'?.135:dir==='north'?.865:dir==='east'?.46:.54,.73,s*1.43,s*1.43);
    const feet=project(pl.x,pl.y);
    this.lightmap.paint(c,w,project,s,{x:feet.x+lens.x,y:feet.y+lens.y-(player.float??0)});
    if(b && w.weather!=='clear')this.lowClouds(c,b,w.tick,true);
    this.weather.paint(c,w,this.art.image('frost-frame'));
    paintM5CombatEffects(c,w,project,s);
    for(const hostile of hostiles)paintHostileBar(c,project(hostile.x,hostile.y),hostile,s);
    for(const b of beasts)paintBeastCues(c,project(b.x,b.y),b,s,w.tick);
    // Aiming is a control cue, not world geometry. Keep it above night tint,
    // snow and frost so a reachable endpoint stays visible in all weather.
    if(g.charging)this.paintGrapplePreview(c,w);
    if(this.canvas.dataset.artReady!=='true')this.canvas.dataset.artReady='true';
  }

  private worldBounds():{left:number;top:number;right:number;bottom:number}{
    const {width,height}=this.canvas,s=this.scale;
    return {left:Math.max(0,Math.floor(-this.origin.x/s)-3),right:Math.ceil((width-this.origin.x)/s)+3,
      top:Math.max(0,Math.floor(-this.origin.y/s)-5),bottom:Math.ceil((height-this.origin.y)/s)+2};
  }

  private deckStructure(c:CanvasRenderingContext2D,cells:Cell[],w:WorldState,hull:HullProfile):HullBounds|null{
    if(!cells.length)return null;
    const s=this.scale;
    const {minX,minY,maxX,maxY}=hull;
    const p=this.screen((minX+maxX)/2,maxY);
    const b:HullBounds={x:p.x,y:p.y,w:(maxX-minX)*s,d:(maxY-minY)*s};
    ovalGlow(c,p.x+s*.17,p.y+s*.79,b.w*.66,b.d*.26,'rgba(12,31,46,.48)');
    this.lowClouds(c,b,w.tick,false);

    const rim=cells.filter(t=>t.left||t.right);
    for(const t of rim){
      for(const side of [t.left?-1:0,t.right?1:0]){
        if(!side)continue;
        const point=this.screen(t.x+(side<0?0:1),t.y+.5);
        // Thin side cross-sections are kept near the wood line, never a tall
        // hanging cone. Mirroring keeps the visible cut face outside on both sides.
        this.art.paint(c,'rock-side',point.x+side*s*.025,point.y+s*.02,s,
          {width:.31,height:1.05,flip:side>0});
      }
    }
    // Long cones and icicles only belong to the ground-facing front contour.
    for(const t of cells.filter(t=>t.front)){
      const p=this.screen(t.x+.5,t.y+1);
      if(!hull.cones[t.y*w.ark.size+t.x]){
        this.art.paint(c,'rock',p.x,p.y+s*.23,s,{width:1.10,height:.32,flip:!!(t.hash%2)});
        continue;
      }
      const height=1.42+((t.hash>>>5)%5)*.17;
      this.art.paint(c,'rock',p.x,p.y+s*height*.73,s,{width:1.46,height,flip:!!(t.hash%2)});
      this.art.paint(c,'icicles',p.x+s*(t.hash%2===0?-.24:.27),p.y+s*(.53+((t.hash>>>6)%4)*.13),s,
        {width:.69,height:.65+((t.hash>>>13)%5)*.12,flip:!!(t.hash%2)});
      if(t.hash%3!==1){
        c.save();c.globalCompositeOperation='screen';
        ovalGlow(c,p.x+s*.17,p.y+s*.47,s*.18,s*.22,'rgba(64,155,172,.18)','rgba(64,155,172,0)');
        c.restore();
      }
    }
    for(const t of cells){
      const p=this.screen(t.x,t.y);
      const id=t.iron?ironDeck:deckIds[t.hash%4];
      this.art.paintTile(c,id,p.x,p.y,s,s);
      this.frost(c,t,p);
      for(const side of [t.left?-1:0,t.right?1:0]){
        if(!side)continue;
        c.save();
        c.translate(p.x+(side<0?.052:.948)*s,p.y+s*.5);
        c.rotate(Math.PI/2);
        c.filter='brightness(1.23) saturate(.85)';
        this.art.paintTile(c,id,-s*.5,-s*.052,s,s*.104);
        c.restore();
      }
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

  private edgeActors(cells:Cell[],w:WorldState,ghost:Ghost|null,gangway:ReturnType<typeof gangwayGeometry>,hull:HullProfile):Actor[]{
    const trims:Actor[]=[];
    const put=(x:number,y:number,art:string,width:number,height:number,flip=false)=>
      trims.push({x,y,art,width,height,shadow:art==='corner'?.17:.26,flip});
    const center=w.ark.size/2;
    const hasGhost=(x:number,y:number)=>!!ghost&&ghost.x===x&&ghost.y===y&&ghost.ok&&
      (!ghost.defId||ghost.defId==='wood_deck')&&!ghost.torch&&!ghost.wall;
    const hasNet=(x:number,y:number)=>w.ark.buildings.some(b=>b.defId==='catch_net'&&b.gx===x&&b.gy===y);
    const isLaunchPort=(x:number,y:number,side:string)=>
      (side==='north'&&x===center&&y===center-3)||(side==='south'&&x===center&&y===center+3)||
      (side==='west'&&x===center-3&&y===center-1)||(side==='east'&&x===center+3&&y===center-1);
    for(const t of cells){
      const {x,y}=t;
      if(hasNet(x,y))continue;
      const bridgeExit=!!gangway?.deployed&&x+1===gangway.x&&y<gangway.y+gangway.height&&y+1>gangway.y;
      const bowGap=isLaunchPort(x,y,'north'),sternGap=isLaunchPort(x,y,'south');
      if(t.back&&!hasGhost(x,y-1)){
        if(!bowGap)put(x+.5,y+.10,'rail',1.18,.54);
        else{put(x+.16,y+.1,'corner',.34,.46);put(x+.87,y+.1,'corner',.34,.46,true);}
      }
      if(t.front&&!hasGhost(x,y+1)){
        if(!sternGap)put(x+.5,y+.97,'rail',1.14,.55);
        else{put(x+.16,y+1,'corner',.34,.46);put(x+.87,y+1,'corner',.34,.46,true);}
      }
      if(t.left&&!hasGhost(x-1,y)&&!isLaunchPort(x,y,'west'))put(x+.08,y+1.02,'rail-side',.405,1.11);
      if(t.right&&!bridgeExit&&!hasGhost(x+1,y)&&!isLaunchPort(x,y,'east'))put(x+.92,y+1.02,'rail-side',.405,1.11,true);
    }
    const visible=this.worldBounds();
    for(const corner of hull.corners){
      const {x,y,dx,dy,inside}=corner;
      if(x<visible.left||x>visible.right+1||y<visible.top||y>visible.bottom+1)continue;
      if(gangway?.deployed&&x===gangway.x&&y>gangway.y&&y<gangway.y+gangway.height)continue;
      if(hasGhost(x+(dx>0?-1:0),y+(dy>0?-1:0)))continue;
      put(x+dx*(inside?.06:.11),y+(dy>0?.11:-.015),'corner',inside?.34:.43,inside?.47:.58,dx>0);
    }
    return trims;
  }

  private paintGhost(c:CanvasRenderingContext2D,ghost:Ghost):void {
    const p=this.screen(ghost.x,ghost.y),s=this.scale;
    c.save();
    const id=ghost.defId??(ghost.wall?'wind_wall':ghost.torch?'torch_post':'wood_deck');
    const [spanX,spanY]=buildingDefs.get(id)?.size??[1,1];
    const visual=buildingVisuals[id];
    c.globalAlpha=ghost.ok?.57:.30;
    if(visual){
      this.art.paint(c,visual.art,p.x+s*spanX*.5,p.y+s*(GROUND_FOOTPRINTS[id]?.anchorY??spanY*.80),s,visual);
    }else if(id==='wood_deck'||id==='iron_deck'){
      this.art.paintTile(c,id==='iron_deck'?ironDeck:deckIds[hash(ghost.x,ghost.y)%4],p.x,p.y,s,s);
    }
    c.globalAlpha=.96;c.strokeStyle=ghost.ok?P.uiConfirmTeal:P.uiDanger;
    c.fillStyle=ghost.ok?'rgba(56,168,157,.12)':'rgba(217,91,91,.14)';
    c.fillRect(p.x,p.y,s*spanX,s*spanY);
    c.lineWidth=2;c.setLineDash([5,4]);c.strokeRect(p.x+.5,p.y+.5,s*spanX-1,s*spanY-1);
    c.lineWidth=1;c.globalAlpha=.46;
    c.beginPath();
    for(let j=1;j<spanX;j++){c.moveTo(p.x+s*j,p.y);c.lineTo(p.x+s*j,p.y+s*spanY);}
    for(let j=1;j<spanY;j++){c.moveTo(p.x,p.y+s*j);c.lineTo(p.x+s*spanX,p.y+s*j);}
    c.stroke();
    c.restore();
  }

  private paintGrapplePreview(c:CanvasRenderingContext2D,w:WorldState):void{
    const p=w.player,g=p.grapple,s=this.scale;
    const origin=this.screen(p.x,p.y);
    const tip=aimEnd(w,{x:g.targetX,y:g.targetY});
    const q=this.screen(tip.x,tip.y);
    const dx=q.x-origin.x,dy=q.y-origin.y,len=Math.hypot(dx,dy);
    const direction=len>.01?dx/len:0;
    const x=origin.x+direction*s*.28,y=origin.y-s*.40;
    c.save();
    c.lineCap='round';
    c.beginPath();c.moveTo(x,y);c.lineTo(q.x,q.y);
    c.strokeStyle='rgba(9,24,36,.92)';c.lineWidth=5;c.stroke();
    c.setLineDash([8,5]);c.strokeStyle='#ffe8b3';c.lineWidth=2.6;c.stroke();
    c.setLineDash([]);
    const r=7+g.charge*3;
    c.beginPath();c.arc(q.x,q.y,r,0,tau);
    c.strokeStyle='rgba(9,24,36,.92)';c.lineWidth=4.4;c.stroke();
    c.strokeStyle='#ffe8b3';c.lineWidth=2;c.stroke();
    c.beginPath();c.arc(q.x,q.y,2.1,0,tau);c.fillStyle='#fff3d1';c.fill();
    c.restore();
  }

  private paintHook(c:CanvasRenderingContext2D,w:WorldState,held:Vec2|undefined):void{
    const s=this.scale;
    const p=this.screen(w.player.x,w.player.y);
    const worldTip=hookTip(w);
    const q=this.screen(worldTip.x,worldTip.y);
    if(held)q.y-=s*.19;
    c.save();
    const x=p.x+Math.sign(q.x-p.x)*s*.29,y=p.y-s*.40;
    c.beginPath();c.moveTo(x,y);c.quadraticCurveTo((x+q.x)/2,(y+q.y)/2+6,q.x,q.y);
    c.strokeStyle='rgba(20,35,43,.74)';c.lineWidth=4;c.stroke();
    c.strokeStyle=P.uiAccentWarm;
    c.lineWidth=2;c.stroke();
    c.beginPath();c.moveTo(q.x-4,q.y-3);c.lineTo(q.x,q.y+3);c.lineTo(q.x+6,q.y-4);
    c.strokeStyle=P.hearthCore;c.stroke();
    if(held){c.beginPath();c.ellipse(q.x,q.y,s*.35,s*.25,0,0,tau);c.strokeStyle='rgba(255,208,138,.58)';c.stroke();}
    c.restore();
  }

  private paintFire(c:CanvasRenderingContext2D,actor:Actor,p:Vec2,tick:number):void {
    const hearth=actor.fire==='hearth',s=this.scale;
    const sourceV=hearth?.79:actor.fire==='forge'?.74:actor.fire==='relay'?.53:actor.fire==='stove'?.69:.17;
    const anchor=this.art.offset(actor.art,hearth?.48:actor.fire==='stove'?.58:.50,sourceV,s*actor.width!,s*actor.height!);
    const x=p.x+anchor.x,y=p.y+anchor.y;
    const r=s*(hearth?.30:actor.fire==='stove'?.09:.14),up=r*(1.12+Math.sin(tick*.29)*.16+Math.sin(tick*.73)*.07);
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
    c.restore();
    this.paintSparks(c,x,y,r,tick,hearth?17:8,hearth?3.36:3.0);
    if(hearth){
      const leveled=actor.hearthLevel===2;
      const chimney=this.art.offset(actor.art,leveled?.79:.80,.035,s*actor.width!,s*actor.height!);
      const chimneyX=p.x+chimney.x,chimneyY=p.y+chimney.y;
      this.paintSparks(c,chimneyX,chimneyY,r*.73,tick+37,7,2.8);
      for(let i=0;i<6;i++){
        const f=(tick*.013+i/6)%1;
        ovalGlow(c,chimneyX+s*(f*.37+Math.sin(f*6+tick*.03)*.12),chimneyY-s*f*.75,
          s*(.12+f*.22),s*(.078+f*.14),`rgba(144,170,177,${.23*(1-f)})`,'rgba(144,170,177,0)');
      }
    }
  }

  private paintSparks(c:CanvasRenderingContext2D,x:number,y:number,r:number,tick:number,n:number,rise:number):void{
    c.save();c.globalCompositeOperation='screen';c.lineCap='round';
    for(let i=0;i<n;i++){
      const speed=.014+(i%5)*.0032, f=(tick*speed+i*.179)%1;
      const dx=(i%2?-1:1)*r*(f*.96+Math.sin(f*5+i*1.8)*.26);
      const ex=x+dx,ey=y-f*r*rise;
      c.globalAlpha=Math.min(1,f*9)*(1-f)*(.76+(i%3)*.10);
      c.strokeStyle=i%2?'#f7a64c':'#ffe2a6';c.lineWidth=.65+(i%4)*.24;
      c.beginPath();c.moveTo(ex,ey);c.lineTo(ex-dx*.028,ey+r*(.06+(i%3)*.04));c.stroke();
    }
    c.restore();
  }
}

interface HullBounds { x:number; y:number; w:number; d:number }
