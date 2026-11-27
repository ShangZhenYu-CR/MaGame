import { Lightmap } from './lightmap';
import { makeCloudShelf, paintClouds, paintDebris, paintHearth, paintLatte, paintPlanks, paintRock, screenWeather } from './scene-art';
import { primaryHearth } from '../sim/heatField';
import { isDeckDrop } from '../sim/latte';
import { aimEnd, hookTip } from '../sim/cloud';
import type { Vec2, WorldState } from '../sim/types';
import { PALETTE as P } from './palette';
import { makeMananAtlas, MANAN_FRAME, type Direction } from './manan-atlas';

export interface Ghost { x: number; y: number; ok: boolean; torch: boolean; wall?:boolean }
export class ArkView {
  private ctx: CanvasRenderingContext2D;
  private scale = 40;
  private actorAtlas = makeMananAtlas();
  private clouds = makeCloudShelf();
  private lightmap = new Lightmap();
  private origin: Vec2 = {x:0,y:0};

  constructor(private canvas: HTMLCanvasElement) { this.ctx = canvas.getContext('2d')!; }

  resize(w: WorldState): void {
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    this.position(w);
  }

  position(w: WorldState): void {
    const center = w.ark.size / 2;
    this.scale = Math.max(20, Math.min(42, Math.floor(this.canvas.width / 16), Math.floor(this.canvas.height / 13)));
    const cx = center + .5 + Math.sign(w.player.x-center-.5)*Math.max(0,Math.abs(w.player.x-center-.5)-3);
    const cy = center + .5 + Math.sign(w.player.y-center-.5)*Math.max(0,Math.abs(w.player.y-center-.5)-3);
    this.origin = { x:Math.floor(this.canvas.width/2-cx*this.scale), y:Math.floor(this.canvas.height*.51-cy*this.scale) };
  }

  world(clientX: number, clientY: number): Vec2 {
    const b = this.canvas.getBoundingClientRect();
    return { x:(clientX-b.left-this.origin.x)/this.scale, y:(clientY-b.top-this.origin.y)/this.scale };
  }

  private pixel(x: number, y: number): Vec2 {
    return {x:Math.round(this.origin.x+x*this.scale),y:Math.round(this.origin.y+y*this.scale)};
  }

  private tile(x: number,y: number, w: number,h: number, color: string): void {
    const p = this.pixel(x,y);
    this.ctx.fillStyle=color;
    this.ctx.fillRect(p.x,p.y,Math.max(1,Math.round(w*this.scale)),Math.max(1,Math.round(h*this.scale)));
  }

  draw(w: WorldState, ghost: Ghost | null): void {
    this.position(w);
    const c=this.ctx, s=this.scale;
    paintClouds(c,this.clouds,w);
    const t=this.tile.bind(this);
    const deck=(x:number,y:number)=>x>=0&&x<w.ark.size&&y>=0&&y<w.ark.size&&w.ark.decks[y*w.ark.size+x];
    for(let y=0;y<w.ark.size;y++)for(let x=0;x<w.ark.size;x++){
      if(deck(x,y)&&!deck(x,y+1))paintRock(t,x,y,!deck(x-1,y),!deck(x+1,y));
    }
    for(let y=0;y<w.ark.size;y++)for(let x=0;x<w.ark.size;x++){
      if(deck(x,y))paintPlanks(t,x,y,!deck(x,y+1),!deck(x,y-1));
    }
    for(const b of w.ark.buildings) {
      const {gx:x,gy:y}=b;
      if (b.defId==='hearth_core') {
        paintHearth(t,x,y,b.fuel,b.level,w.tick);
      } else if (b.defId==='storage_box') {
        this.tile(x+.12,y+.44,.78,.45,P.deckWoodEdge);
        this.tile(x+.11,y+.24,.78,.27,P.deckWood);
        this.tile(x+.11,y+.45,.78,.085,P.deckIron);
        this.tile(x+.46,y+.47,.16,.2,P.hearthCore);
        this.tile(x+.15,y+.28,.09,.51,P.deckIron);
        this.tile(x+.77,y+.28,.09,.51,P.deckIron);
      } else if (b.defId==='torch_post') {
        this.tile(x+.37,y+.74,.26,.14,P.deckIron);
        this.tile(x+.46,y+.37,.1,.42,P.deckWoodEdge);
        this.tile(x+.37,y+.30,.27,.15,P.hearthGlow);
        this.tile(x+.43,y+.16+Math.sin(w.tick*.37)*.036,.13,.21,P.hearthCore);
      } else if (b.defId==='wind_wall') {
        this.tile(x+.015,y+.44,.97,.42,'#3f3835');
        this.tile(x+.04,y+.14,.91,.48,'#566a72');
        for(const k of [0,1,2,3]){
          this.tile(x+.075+k*.215,y+.17,.183,.36,k%2?'#7f674f':'#8f765a');
          this.tile(x+.09+k*.215,y+.20,.03,.315,'#b29b78');
        }
        this.tile(x+.045,y+.09,.92,.084,'#a8b6b5');
        this.tile(x+.045,y+.46,.92,.069,'#425667');
        this.tile(x+.07,y+.61,.15,.21,'#536772');this.tile(x+.78,y+.61,.15,.21,'#536772');
      }
    }
    paintLatte(t,w.latte.x,w.latte.y,w.tick,w.latte.mood);
    if (ghost) {
      c.globalAlpha=.4;
      this.tile(ghost.x,ghost.y,1,1,ghost.ok?P.uiConfirmTeal:P.uiDanger);
      c.globalAlpha=1;
      const p=this.pixel(ghost.x,ghost.y);
      c.strokeStyle=ghost.ok?P.uiConfirmTeal:P.uiDanger;
      c.lineWidth=2;c.setLineDash([5,4]);c.strokeRect(p.x+.5,p.y+.5,s-1,s-1);c.setLineDash([]);
      if (ghost.wall) this.tile(ghost.x+.07,ghost.y+.16,.85,.28,ghost.ok?P.frostFog:P.uiDanger);
      if (ghost.torch) this.tile(ghost.x+.44,ghost.y+.33,.13,.38,ghost.ok?P.hearthCore:P.uiDanger);
    }
    const g=w.player.grapple;
    for(const d of w.sky.debris) {
      if(d.x<0 || !d.loot.length) continue;
      if (isDeckDrop(d)) {
        this.tile(d.x-.23,d.y-.17,.46,.33,'#b79e70');
        this.tile(d.x-.15,d.y-.113,.30,.23,'#4f4940');
      } else paintDebris(t,d.x,d.y,d.loot[0].itemId);
      if(d.id===g.caughtDebrisId) {
        c.strokeStyle=P.hearthCore;c.lineWidth=1.5;
        const p=this.pixel(d.x,d.y);
        c.strokeRect(p.x-s*.43,p.y-s*.36,s*.86,s*.72);
      }
    }
    const pl=w.player,p=this.pixel(pl.x,pl.y);
    if(g.active || g.charging) {
      const end=g.charging?aimEnd(w,{x:g.targetX,y:g.targetY}):hookTip(w);
      const q=this.pixel(end.x,end.y);
      const gripX=p.x+Math.sign(q.x-p.x)*s*.29, gripY=p.y-s*.39;
      c.beginPath();c.moveTo(Math.round(gripX),Math.round(gripY));c.lineTo(q.x,q.y);
      c.strokeStyle=g.charging?P.hearthCore:P.uiAccentWarm;
      c.lineWidth=g.charging?2:3;c.setLineDash(g.charging?[6,7]:[]);c.stroke();c.setLineDash([]);
      c.strokeStyle=P.hearthCore;c.strokeRect(q.x-4,q.y-4,8,8);
    }
    const dir:Direction=Math.abs(pl.facing.x)>Math.abs(pl.facing.y)
      ? (pl.facing.x<0?1:2) : (pl.facing.y<0?3:0);
    const phase=pl.vx||pl.vy ? 1+Math.floor(w.tick/4)%4 : 0;
    const spriteSize=Math.min(64,Math.round(s*1.53));
    const drawX=p.x-Math.round(spriteSize/2), drawY=p.y-Math.round(spriteSize*54/64);
    this.tile(pl.x-.36,pl.y-.02,.72,.17,P.deckWoodEdge);
    c.imageSmoothingEnabled=false;
    c.drawImage(this.actorAtlas,phase*MANAN_FRAME,dir*MANAN_FRAME,MANAN_FRAME,MANAN_FRAME,
      drawX,drawY,spriteSize,spriteSize);
    this.lightmap.paint(c,w,(x,y)=>this.pixel(x,y),s);
    const fire=primaryHearth(w);
    screenWeather(c,w,fire&&fire.fuel>0?this.pixel(fire.gx+1,fire.gy+.7):null);
  }
}
