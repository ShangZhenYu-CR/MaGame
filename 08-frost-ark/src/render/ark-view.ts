import { aimEnd, hookTip } from '../sim/cloud';
import type { Vec2, WorldState } from '../sim/types';
import { PALETTE as P } from './palette';
import { makeMananAtlas, MANAN_FRAME, type Direction } from './manan-atlas';

export interface Ghost { x: number; y: number; ok: boolean; torch: boolean; wall?:boolean }
export class ArkView {
  private ctx: CanvasRenderingContext2D;
  private scale = 40;
  private actorAtlas = makeMananAtlas();
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

  private sky(tick: number): void {
    const c = this.ctx, {width:w,height:h} = this.canvas;
    c.globalAlpha=1;
    c.fillStyle=P.skyDeep; c.fillRect(0,0,w,h);
    for (let band=0; band<7; band++) {
      for (let j=0;j<11;j++) {
        const len=74+((j*71+band*31)%170);
        const x=((j*193+band*279+tick*(.16+band*.038))%(w+350))-230;
        const y=h*(.035+band*.143)+((j*37+band*47)%70)-34;
        c.globalAlpha=.19+((j+band)%4)*.075;
        c.fillStyle=P.skyMist;
        c.fillRect(Math.floor(x/6)*6,Math.floor(y/6)*6,len,13+(j%4)*6);
        c.fillRect(Math.floor((x+23)/6)*6,Math.floor((y-9)/6)*6,len*.65,9);
      }
    }
    c.fillStyle=P.frostFog;
    for (let i=0;i<120;i++) {
      c.globalAlpha=.09+(i%5)*.028;
      const x=(i*127.31+tick*(.34+i%4*.19))%w;
      const y=(i*69.32+tick*.13)%h;
      c.fillRect(Math.floor(x),Math.floor(y),i%6===0?4:2,i%6===0?2:1);
    }
    c.globalAlpha=1;
  }

  draw(w: WorldState, ghost: Ghost | null): void {
    this.position(w);
    const c=this.ctx, s=this.scale;
    this.sky(w.tick);
    const deck=(x:number,y:number)=>x>=0&&x<w.ark.size&&y>=0&&y<w.ark.size&&w.ark.decks[y*w.ark.size+x];
    for (let y=0;y<w.ark.size;y++) for (let x=0;x<w.ark.size;x++) {
      if (!deck(x,y)) continue;
      if (!deck(x,y+1)) {
        this.tile(x+.015,y+.92,.97,.29,P.skyMist);
        this.tile(x+.04,y+.98,.58,.16,P.deckIron);
        this.tile(x+.66,y+.96,.28,.22,P.skyDeep);
        this.tile(x+.02,y+1.03,.36,.055,P.frostFog);
      }
      this.tile(x+.01,y+.015,.98,.97,P.deckWoodEdge);
      for(let slat=0;slat<4;slat++) {
        const off=.06+((x*13+y*7+slat*17)%7)*.019;
        this.tile(x+off,y+.055+.233*slat,.9-off,.193,P.deckWood);
        c.globalAlpha=.3;
        this.tile(x+off+.08,y+.085+.233*slat,.37,.025,P.hearthCore);
        c.globalAlpha=1;
      }
      if (!deck(x,y-1)) this.tile(x+.02,y+.025,.96,.045,P.frostFog);
      if (!deck(x-1,y)) this.tile(x+.02,y+.04,.045,.9,P.deckIron);
      this.tile(x+.07,y+.15,.055,.05,P.deckIron);
      this.tile(x+.87,y+.86,.052,.05,P.deckIron);
    }
    for(const b of w.ark.buildings) {
      const {gx:x,gy:y}=b;
      if (b.defId==='hearth_core') {
        const p=this.pixel(x+1,y+1);
        const r=s*(3.02+.1*Math.sin(w.tick*.09));
        const glow=c.createRadialGradient(p.x,p.y,s*.24,p.x,p.y,r);
        glow.addColorStop(0,'rgba(255,208,138,.58)');
        glow.addColorStop(.48,'rgba(234,122,48,.26)');
        glow.addColorStop(1,'rgba(234,122,48,0)');
        if (b.fuel>0) { c.fillStyle=glow; c.fillRect(p.x-r,p.y-r,2*r,2*r); }
        this.tile(x+.11,y+.19,1.78,1.71,P.deckWoodEdge);
        this.tile(x+.18,y+.13,1.64,1.51,P.deckIron);
        this.tile(x+.29,y+.23,1.42,1.25,P.uiPanel);
        for(const i of [0,1,2,3]) {
          this.tile(x+.24+i*.41,y+.19,.15,.16,P.frostFog);
          this.tile(x+.24+i*.41,y+1.42,.15,.13,P.frostFog);
        }
        this.tile(x+.44,y+.42,1.12,.75,P.emberDark);
        if(b.fuel>0) {
          this.tile(x+.54,y+.65,.92,.38,P.hearthGlow);
          this.tile(x+.68,y+.57,.56,.37,P.hearthCore);
          this.tile(x+.86,y+.43+Math.sin(w.tick*.32)*.06,.25,.24,P.hearthCore);
          for(let i=0;i<8;i++) {
            const k=(w.tick*.021+i*.132)%1;
            c.globalAlpha=(1-k)*.9;
            this.tile(x+.60+i*.105-k*.42,y+.72-k*1.15,.045,.052,i%2?P.hearthCore:P.hearthGlow);
          }
          c.globalAlpha=1;
        }
        this.tile(x+.67,y+1.56,.66,.14,P.emberDark);
      } else if (b.defId==='storage_box') {
        this.tile(x+.12,y+.44,.78,.45,P.deckWoodEdge);
        this.tile(x+.11,y+.24,.78,.27,P.deckWood);
        this.tile(x+.11,y+.45,.78,.085,P.deckIron);
        this.tile(x+.46,y+.47,.16,.2,P.hearthCore);
        this.tile(x+.15,y+.28,.09,.51,P.deckIron);
        this.tile(x+.77,y+.28,.09,.51,P.deckIron);
      } else if (b.defId==='torch_post') {
        const p=this.pixel(x+.5,y+.49);
        const g=c.createRadialGradient(p.x,p.y,1,p.x,p.y,s*1.55);
        g.addColorStop(0,'rgba(255,208,138,.46)');g.addColorStop(1,'rgba(234,122,48,0)');
        c.fillStyle=g;c.fillRect(p.x-s*1.55,p.y-s*1.55,s*3.1,s*3.1);
        this.tile(x+.37,y+.74,.26,.14,P.deckIron);
        this.tile(x+.46,y+.37,.1,.42,P.deckWoodEdge);
        this.tile(x+.37,y+.30,.27,.15,P.hearthGlow);
        this.tile(x+.43,y+.16+Math.sin(w.tick*.37)*.036,.13,.21,P.hearthCore);
      }
    }
    if (ghost) {
      c.globalAlpha=.4;
      this.tile(ghost.x,ghost.y,1,1,ghost.ok?P.uiConfirmTeal:P.uiDanger);
      c.globalAlpha=1;
      const p=this.pixel(ghost.x,ghost.y);
      c.strokeStyle=ghost.ok?P.uiConfirmTeal:P.uiDanger;
      c.lineWidth=2;c.setLineDash([5,4]);c.strokeRect(p.x+.5,p.y+.5,s-1,s-1);c.setLineDash([]);
      if (ghost.torch) this.tile(ghost.x+.44,ghost.y+.33,.13,.38,ghost.ok?P.hearthCore:P.uiDanger);
    }
    const g=w.player.grapple;
    for(const d of w.sky.debris) {
      if(d.x<0 || !d.loot.length) continue;
      const x=d.x-.28,y=d.y-.21, id=d.loot[0].itemId;
      if (id==='driftwood') {
        this.tile(x-.08,y-.02,.72,.53,P.deckWoodEdge);
        this.tile(x-.02,y-.06,.59,.42,P.deckWood);
        for(const a of [.03,.39]) this.tile(x+a,y-.05,.085,.53,P.deckIron);
        this.tile(x+.18,y+.09,.19,.055,P.hearthCore);
      } else if(id==='rope') {
        for(const k of [0,1,2]) this.tile(x+.04+k*.11,y+.028+k*.055,.32,.25,k%2?P.emberDark:P.deckWood);
        this.tile(x+.18,y+.16,.22,.09,P.hearthCore);
      } else {
        this.tile(x-.03,y+.08,.62,.34,P.deckIron);
        this.tile(x+.13,y-.04,.29,.26,P.frostFog);
        this.tile(x+.2,y+.03,.21,.08,P.snowHighlight);
      }
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
  }
}
