import { raiderConcealed } from '../sim/defenses-p2';
import combat from '../data/combat_m5.json';
import { m5CombatEffects, m5Telegraph } from '../sim/m5';
import type { Vec2, WorldState } from '../sim/types';
import { clamp, ovalGlow } from './atmosphere';

const hostileArt={
  froststalker:{art:'enemy-frost-stalker',width:1.46,height:1.25,shadow:.44},
  icebreaker_beast:{art:'enemy-ice-breaker',width:1.68,height:1.75,shadow:.64},
  frostmane_lord:{art:'boss-frost-mane',width:2.46,height:2.31,shadow:.94},
  rift_carapace:{art:'boss-rift-armor',width:2.63,height:2.34,shadow:1.03},
};
type HostileId=keyof typeof hostileArt;
export const HOSTILE_ART=Object.values(hostileArt).map(x=>x.art);
export type CombatActor=typeof hostileArt[HostileId]&{x:number;y:number;flip:boolean;scale:number;rotation:number;
  id:string;telegraph:boolean;reach:number;hp:number;boss:boolean;name:string};

export function m5Actors(w:WorldState):CombatActor[]{
  return w.wildEntities.flatMap(e=>{
    if(!(e.kind==='boss'||e.kind==='raider')||!Object.hasOwn(hostileArt,e.defId)||e.hp<=0)return [];
    if(e.kind==='boss'&&!w.activeIsland||raiderConcealed(w,e))return [];
    const id=e.defId as HostileId;
    const def=combat.hostiles[id], charge=m5Telegraph(w,e.id);
    const motion=w.tick*.11+e.x*.9+e.y*.6;
    return [{...hostileArt[id],id:e.id,x:e.x,y:e.y,telegraph:charge,reach:def.range,
      hp:clamp(e.hp/Math.max(1,e.maxHp)),boss:e.kind==='boss',name:def.name,flip:w.player.x>e.x,
      scale:charge?1.035:1+Math.sin(motion)*.014,rotation:charge?Math.sin(w.tick*.46)*.021:0}];
  });
}

export function paintAttackTell(
  c:CanvasRenderingContext2D,p:Vec2,actor:CombatActor,tile:number,tick:number,
):void{
  if(!actor.telegraph)return;
  const r=tile*actor.reach;
  const beat=.55+.22*Math.sin(tick*.48);
  ovalGlow(c,p.x,p.y,r,r*.72,`rgba(234,111,77,${beat*.39})`,'rgba(188,65,46,0)');
  c.save();c.beginPath();c.ellipse(p.x,p.y,r*.98,r*.72,0,0,Math.PI*2);
  c.lineWidth=actor.boss?2.5:1.6;c.strokeStyle=`rgba(255,156,111,${beat})`;
  c.setLineDash([tile*.11,tile*.075]);c.lineDashOffset=-tick*.66;c.stroke();c.restore();
}

export function paintHostileBar(c:CanvasRenderingContext2D,p:Vec2,actor:CombatActor,tile:number):void{
  const width=tile*(actor.boss?1.36:.61), height=actor.boss?6:4;
  const x=p.x-width/2,y=p.y-tile*(actor.height*.96+.11);
  c.save();
  c.beginPath();c.roundRect(x-1,y-1,width+2,height+2,3);c.fillStyle='rgba(15,28,37,.92)';c.fill();
  c.beginPath();c.roundRect(x,y,width*actor.hp,height,2);c.fillStyle=actor.telegraph?'#ef9b6b':'#d97364';c.fill();
  if(actor.boss){
    c.font='bold 12px system-ui,sans-serif';c.textAlign='center';
    c.strokeStyle='rgba(9,24,36,.90)';c.lineWidth=3;
    c.strokeText(actor.name,p.x,y-6);c.fillStyle='#efe0d2';c.fillText(actor.name,p.x,y-6);
  }
  c.restore();
}

export function paintM5CombatEffects(c:CanvasRenderingContext2D,w:WorldState,
  project:(x:number,y:number)=>Vec2,tile:number):void{
  c.save();c.lineCap='round';
  for(const fx of m5CombatEffects(w)){
    const from=project(fx.from.x,fx.from.y),to=project(fx.to.x,fx.to.y);
    const fade=clamp((fx.expires-w.tick)/8);
    const x=from.x,y=from.y-tile*(fx.kind==='strike'?.38:.69);
    const tx=to.x,ty=to.y-tile*.53;
    if(fx.kind==='arrow'){
      const g=c.createLinearGradient(x,y,tx,ty);
      g.addColorStop(0,'rgba(148,188,220,0)');g.addColorStop(1,'rgba(224,239,245,.95)');
      c.globalAlpha=fade;c.lineWidth=2.2;c.strokeStyle=g;
      c.beginPath();c.moveTo(x,y);c.lineTo(tx,ty);c.stroke();
    }else if(fx.kind==='fire'){
      c.globalAlpha=fade;
      const g=c.createLinearGradient(x,y,tx,ty);
      g.addColorStop(0,'rgba(247,196,113,.77)');g.addColorStop(.64,'rgba(236,114,62,.68)');
      g.addColorStop(1,'rgba(203,77,42,0)');
      c.strokeStyle=g;c.lineWidth=tile*.21;c.beginPath();c.moveTo(x,y);c.lineTo(tx,ty);c.stroke();
      ovalGlow(c,tx,ty,tile*.70,tile*.45,'rgba(255,160,85,.62)','rgba(218,102,52,0)');
    }else{
      const angle=Math.atan2(ty-y,tx-x);
      c.globalAlpha=fade;c.lineWidth=2.6;c.strokeStyle='#f7c287';
      c.beginPath();c.ellipse(tx,ty,tile*.34,tile*.47,angle,Math.PI*.63,Math.PI*1.4);c.stroke();
    }
    c.globalAlpha=fade*.86;c.fillStyle=fx.kind==='arrow'?'#cfe7f3':'#ffd4a3';
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3+w.tick*.08, r=tile*(.06+(1-fade)*(.22+i%3*.035));
      c.beginPath();c.arc(tx+Math.cos(a)*r,ty+Math.sin(a)*r,1+i%3*.31,0,Math.PI*2);c.fill();
    }
  }
  c.restore();
}
