import { partOfDay } from '../sim/heatField';
import type { Vec2, WorldState } from '../sim/types';
import { PALETTE as P } from './palette';

export const clamp=(v:number,lo=0,hi=1)=>Math.min(hi,Math.max(lo,v));
const tau=Math.PI*2;
const fract=(n:number)=>n-Math.floor(n);
const seeded=(n:number)=>fract(Math.sin(n*78.233+17.17)*43758.5453);
const wrap=(v:number,d:number)=>((v%d)+d)%d;

let skyRaster:HTMLCanvasElement|undefined;
// The cloud plate contains only broad soft forms. Composite it as one smaller,
// opaque pass; keep the playable scenery and foreground at output resolution.
export function cloudscape(target:CanvasRenderingContext2D,clouds:HTMLImageElement,w:WorldState,origin:Vec2):void{
  const layer=skyRaster??(skyRaster=document.createElement('canvas'));
  const {width,height}=target.canvas,W=Math.ceil(width/2),H=Math.ceil(height/2);
  if(layer.width!==W||layer.height!==H){layer.width=W;layer.height=H;}
  const c=layer.getContext('2d',{alpha:false})!;
  const t=w.tick*.5, night=partOfDay(w.timeOfDay)==='暴雪夜';
  const sky=c.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,night?'#2c5263':'#436878');
  sky.addColorStop(.43,night?'#5a7a8b':'#839fae');
  sky.addColorStop(1,night?P.skyDeep:'#304d61');
  c.fillStyle=sky;c.fillRect(0,0,W,H);
  c.save();
  const baseW=Math.max(340,W*1.06);
  // Wide horizontally repeating sheets. Taper each band's upper/lower edges into the sky.
  const cloudBands=[
    {y:-.25, h:.72, wid:.96, speed:.022, shift:.026, opacity:.93},
    {y:.14, h:.72, wid:1.31, speed:.075, shift:.064, opacity:.68},
    {y:.59, h:.63, wid:1.56, speed:.174, shift:.11, opacity:.46},
  ];
  if(night){
    for(let i=0;i<15;i++){
      const x=seeded(i+308)*W-H*.1, y=(.17+seeded(i+61)*.13)*H, s=(.026+seeded(i+209)*.051)*H;
      c.fillStyle=i%2?'rgba(14,40,55,.35)':'rgba(67,98,113,.48)';
      c.beginPath(); c.moveTo(x-s,y+s*.42);c.lineTo(x-s*.26,y-s*.56);c.lineTo(x+s*.12,y-s);
      c.lineTo(x+s*.56,y-s*.61);c.lineTo(x+s,y+s*.20);c.lineTo(x+s*.19,y+s*.71);c.closePath();c.fill();
    }
  }
  for(const [i,b] of cloudBands.entries()){
    const imW=baseW*b.wid, h=H*b.h;
    const x=-wrap(t*b.speed+origin.x*b.shift*.5+i*86.5,imW*2);
    const y=H*b.y+clamp(origin.y*b.shift*.5,-17.5,17.5);
    // Edge feathering of the broad, independent parallax image bands, not the art itself.
    const layer=bandCanvas(i, Math.ceil(imW), Math.ceil(h));
    const ctx=layer.getContext('2d')!;
    if(!layer.dataset.painted){
      ctx.drawImage(clouds,0,0,layer.width,layer.height);
      const fade=ctx.createLinearGradient(0,0,0,layer.height);
      fade.addColorStop(0,'rgba(255,255,255,0)');
      fade.addColorStop(.19,'rgba(255,255,255,1)');
      fade.addColorStop(.77,'rgba(255,255,255,1)');
      fade.addColorStop(1,'rgba(255,255,255,0)');
      ctx.globalCompositeOperation='destination-in';ctx.fillStyle=fade;
      ctx.fillRect(0,0,layer.width,layer.height);ctx.globalCompositeOperation='source-over';
      layer.dataset.painted='yes';
    }
    c.globalAlpha=b.opacity;
    for(let xx=x,k=0;xx<W;xx+=imW,k++){
      if(xx+imW<0)continue;
      // Reflect adjacent strips so baked-edge values meet instead of stepping.
      if(k%2){
        c.save();c.translate(xx+imW,y);c.scale(-1,1);
        c.drawImage(layer,0,0,imW,h);c.restore();
      }else c.drawImage(layer,xx,y,imW,h);
    }
  }
  c.globalAlpha=1;
  if(night){
    c.globalCompositeOperation='screen';
    const pole=c.createLinearGradient(0,H*.045,0,H*.36);
    pole.addColorStop(0,'rgba(31,108,105,0)');pole.addColorStop(.49,'rgba(76,163,157,.48)');
    pole.addColorStop(1,'rgba(36,119,117,0)');
    c.fillStyle=pole;
    for(let i=0;i<4;i++){
      const phase=t*.005+i*.45;
      c.globalAlpha=.45-i*.086;
      c.beginPath();c.moveTo(-20,H*.26+i*6);
      c.bezierCurveTo(W*.18,H*.11+Math.sin(phase)*18,W*.32,H*.29,W*.46,H*.186);
      c.bezierCurveTo(W*.58,H*.059,W*.70,H*.33,W*.93,H*.104+i*5);
      c.lineTo(W*.93,H*.18+i*10);
      c.bezierCurveTo(W*.70,H*.35,W*.58,H*.153,W*.46,H*.226);
      c.bezierCurveTo(W*.32,H*.35,W*.18,H*.24,-20,H*.32+i*7);
      c.fill();
    }
  }
  c.restore();
  const air=c.createLinearGradient(0,0,0,H);
  air.addColorStop(0,night?'rgba(15,49,68,.36)':'rgba(26,59,77,.34)');
  air.addColorStop(.4,'rgba(112,159,181,0)');
  air.addColorStop(.73,'rgba(44,82,105,.1)');
  air.addColorStop(1,night?'rgba(6,24,40,.49)':'rgba(12,38,62,.36)');
  c.fillStyle=air;c.fillRect(0,0,W,H);
  target.save();target.imageSmoothingQuality='low';
  target.drawImage(layer,0,0,width,height);target.restore();
}
const cloudCache:HTMLCanvasElement[]=[];
function bandCanvas(index:number,w:number,h:number):HTMLCanvasElement {
  const layer=cloudCache[index]??(cloudCache[index]=document.createElement('canvas'));
  if(layer.width!==w||layer.height!==h){
    layer.width=w;layer.height=h;
    delete layer.dataset.painted;
  }
  return layer;
}

const glowAtlas=new Map<string,HTMLCanvasElement>();
export function ovalGlow(c:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,color:string,outer='rgba(12,30,45,0)'):void {
  if(!(rx>0&&ry>0))return;
  const key=color+'|'+outer;
  let patch=glowAtlas.get(key);
  if(!patch){
    patch=document.createElement('canvas');patch.width=patch.height=96;
    const layer=patch.getContext('2d')!,g=layer.createRadialGradient(48,48,0,48,48,48);
    g.addColorStop(0,color);g.addColorStop(.42,color);g.addColorStop(1,outer);
    layer.fillStyle=g;layer.fillRect(0,0,96,96);
    if(glowAtlas.size>=96)glowAtlas.delete(glowAtlas.keys().next().value!);
    glowAtlas.set(key,patch);
  }
  c.drawImage(patch,x-rx,y-ry,rx*2,ry*2);
}

const snow=Array.from({length:360},(_,i)=>({u:seeded(i*5+1000),v:seeded(i*5+2000),s:seeded(i*5+3000)}));
function paintSnow(c:CanvasRenderingContext2D,w:WorldState,W:number,H:number):void{
  const t=w.tick;
  const depth=w.weather==='whiteout'?1.65:1;
  const drift=1+w.sky.windX*.18;
  const margin=55, dx=.788,dy=.616;
  c.save();
  for(const layer of [0,1,2]){
    const n=Math.min(snow.length,Math.round([244,116,27][layer]*depth));
    const velocity=[.47,2.04,4.50][layer]*depth*drift;
    for(let i=0;i<n;i++){
      const p=snow[(i+layer*31)%snow.length], phase=t*velocity*(.70+p.s*.77);
      const x=wrap(p.u*(W+2*margin)+phase*dx,W+2*margin)-margin;
      const y=wrap(p.v*(H+2*margin)+phase*dy,H+2*margin)-margin;
      if(layer===0){
        c.globalAlpha=.19+p.s*.33;c.fillStyle=P.snowHighlight;
        c.beginPath();c.arc(x,y,.48+p.s*.85,0,tau);c.fill();
      }else if(layer===1){
        const length=7+p.s*15*depth;
        c.strokeStyle=P.snowHighlight;c.globalAlpha=.13+p.s*.33;
        c.lineWidth=.55+p.s*.8;c.lineCap='round';
        c.beginPath();c.moveTo(x,y);c.lineTo(x-dx*length,y-dy*length);c.stroke();
      }else{
        const r=8+p.s*17;
        c.globalAlpha=.16+p.s*.24;
        c.save();c.translate(x,y);c.rotate(.663);ovalGlow(c,0,0,r,r*.41,'rgba(186,215,231,.46)','rgba(186,215,231,0)');c.restore();
      }
    }
  }
  c.restore();
}

export class WeatherFinish {
  private warmPulse=0;
  private frozen=0;
  private lastTick=-1;
  private particles=document.createElement('canvas');

  paint(c:CanvasRenderingContext2D,w:WorldState,frostFrame:HTMLImageElement,openAir?:Path2D):void{
    const {width:W,height:H}=c.canvas;
    if(w.weather!=='clear'){
      const snow=this.particles,sw=Math.ceil(W*.75),sh=Math.ceil(H*.75);
      if(snow.width!==sw||snow.height!==sh){snow.width=sw;snow.height=sh;}
      const layer=snow.getContext('2d')!;
      layer.setTransform(1,0,0,1,0,0);layer.clearRect(0,0,sw,sh);
      layer.scale(sw/W,sh/H);paintSnow(layer,w,W,H);
      c.save();if(openAir)c.clip(openAir,'evenodd');
      c.imageSmoothingQuality='low';c.drawImage(snow,0,0,W,H);c.restore();
    }
    const cold=clamp((45-w.player.warmth)/45);
    if(w.tick!==this.lastTick){
      if(this.frozen>.025 && cold<this.frozen && w.player.warmth>32)
        this.warmPulse=Math.max(this.warmPulse,clamp((this.frozen-cold)*8));
      this.warmPulse*=.928;this.frozen=cold;this.lastTick=w.tick;
    }
    if(cold===0&&this.warmPulse<.006)return;
    const intensity=cold*(.91+Math.sin(w.tick*.15)*.09);
    c.save();
    c.translate(W/2,H/2);c.scale(W/2,H/2);
    const fog=c.createRadialGradient(0,0,.27,0,0,1.34);
    fog.addColorStop(0,'rgba(96,151,186,0)');
    fog.addColorStop(.64,`rgba(103,161,193,${intensity*.065})`);
    fog.addColorStop(.92,`rgba(111,173,209,${intensity*.26})`);
    fog.addColorStop(1,`rgba(173,211,229,${intensity*.66})`);
    c.fillStyle=fog;c.fillRect(-1,-1,2,2);
    if(this.warmPulse>.006){
      const bloom=c.createRadialGradient(0,0,.75,0,0,1.4);
      bloom.addColorStop(0,'rgba(244,153,78,0)');
      bloom.addColorStop(1,`rgba(244,153,78,${this.warmPulse*.19})`);
      c.fillStyle=bloom;c.fillRect(-1,-1,2,2);
    }
    c.restore();
    if(cold>.006){
      c.save();
      c.globalAlpha=clamp(intensity*.88);
      // The transparent painted frame fades toward the center, so the frame
      // can scale with the viewport without UI-sized repeated snowflake stamps.
      c.drawImage(frostFrame,0,0,W,H);
      c.restore();
    }
  }
}
