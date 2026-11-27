// Original pixel art, rasterized onto a native 64×64 frame grid. No scaled source sprite.
export const MANAN_FRAME = 64;
export const MANAN_POSES = 5; // idle, passing left, left stride, passing right, right stride
export type Direction = 0 | 1 | 2 | 3; // south, west, east, north
const C = {
  edge:0x111923, black:0x202932, coat:0x303941, coatLit:0x48565e, seam:0x65737a,
  pant:0x222a32, pocket:0x374149, skinDeep:0x7c5042, skin:0xb87e62, skinLit:0xd69d78,
  hair:0x292522, bristle:0x42382f, shoe:0xc4d1d7, sole:0x899aa9,
  clasp:0xb9c5c9, amber:0xffd08a, flame:0xea7a30, tint:0x8a5b37,
};
type Pixel = readonly [number,number];
export function mananPixels(dir: Direction, phase: number): Uint8ClampedArray {
  const out=new Uint8ClampedArray(MANAN_FRAME*MANAN_FRAME*4);
  const west=dir===1,north=dir===3,profile=dir===1||dir===2;
  const put=(x:number,y:number,rgb:number)=>{
    if(x<0||y<0||x>=64||y>=64)return;
    const k=(y*64+(west?63-x:x))*4;
    out[k]=rgb>>>16;out[k+1]=(rgb>>>8)&255;out[k+2]=rgb&255;out[k+3]=255;
  };
  const rect=(x:number,y:number,w:number,h:number,rgb:number)=>{
    for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)put(i,j,rgb);
  };
  const poly=(pts:readonly Pixel[],rgb:number,offY=0)=>{
    for(let y=0;y<64;y++){
      const hits:number[]=[];
      for(let i=0;i<pts.length;i++){
        const [ax,ay]=pts[i], [bx,by]=pts[(i+1)%pts.length], q=y+.5-offY;
        if((ay<=q&&by>q)||(by<=q&&ay>q))hits.push(ax+(bx-ax)*(q-ay)/(by-ay));
      }
      hits.sort((a,b)=>a-b);
      for(let i=0;i+1<hits.length;i+=2)for(let x=Math.ceil(hits[i]-.5);x<hits[i+1]-.5;x++)put(x,y,rgb);
    }
  };
  const bob=[0,1,0,1,0][phase]??0;
  const stride=[0,2,6,-2,-6][phase]??0;
  const leg=(x:number,y:number,dx:number,dy:number,lit:boolean)=>{
    poly([[x-5,y],[x+5,y],[x+dx+5,y+14+dy],[x+dx+3,y+17+dy],[x+dx-4,y+17+dy],[x+dx-5,y+13+dy]],C.edge);
    poly([[x-4,y],[x+4,y],[x+dx+3,y+14+dy],[x+dx-3,y+14+dy]],lit?C.pocket:C.pant);
    rect(x+dx-3,y+8+dy,6,3,C.pant);
    const toe=profile?3:(north?0:1);
    rect(x+dx-5,y+14+dy,10+toe,5,C.edge);
    rect(x+dx-4,y+14+dy,8+toe,3,lit?C.shoe:C.sole);
    rect(x+dx-4,y+17+dy,8+toe,1,C.sole);
    rect(x+dx-1+toe,y+14+dy,3,1,C.clasp);
  };
  if(profile){
    leg(30,38,Math.round(-stride*.52),-Math.round(Math.abs(stride)*.22),false);
    leg(33,39,Math.round(stride*.74),-Math.round(Math.abs(stride)*.12),true);
  }else{
    leg(26,37,0,Math.round(-stride*.48),stride<0);
    leg(37,37,0,Math.round(stride*.48),stride>=0);
  }
  const p=(pts:readonly Pixel[],rgb:number)=>poly(pts,rgb,bob);
  const r=(x:number,y:number,w:number,h:number,rgb:number)=>rect(x,y+bob,w,h,rgb);
  if(profile){
    p([[28,20],[35,20],[40,25],[42,36],[39,42],[27,43],[22,39],[23,28]],C.edge);
    p([[28,23],[34,22],[39,27],[40,37],[37,41],[26,41],[24,37],[25,28]],C.coat);
    p([[25,21],[30,20],[34,24],[32,30],[26,29],[22,26]],C.black);
    p([[25,22],[29,22],[31,25],[29,27],[25,26]],C.coatLit);
    const arm=Math.round(-stride*.52);
    p([[29,25],[35,24],[38+arm,30],[40+arm,39],[36+arm,41],[31+arm,37],[28,30]],C.edge);
    p([[29,25],[34,25],[36+arm,30],[38+arm,37],[34+arm,38],[30,31]],C.coatLit);
    r(35+arm,37,4,3,C.skinDeep);r(36+arm,38,3,2,C.skin);
    p([[29,5],[36,5],[41,9],[41,14],[43,17],[40,18],[39,21],[34,23],[29,21],[26,17],[25,11]],C.edge);
    p([[29,7],[36,6],[40,10],[40,15],[42,17],[39,18],[38,20],[34,22],[29,20],[27,16],[27,11]],C.skin);
    p([[27,9],[29,6],[36,6],[39,8],[39,11],[34,11],[32,14],[28,14],[28,17],[26,15]],C.hair);
    r(29,8,6,1,C.bristle);r(36,13,4,1,C.skinDeep);r(38,14,2,1,C.edge);
    r(39,16,2,1,C.skinLit);r(35,19,4,1,C.skinDeep);r(29,14,2,3,C.skinLit);
  }else{
    p([[24,21],[39,21],[45,25],[49,32],[48,40],[43,42],[40,40],[39,44],[24,44],[23,40],[19,42],[14,39],[15,30],[19,24]],C.edge);
    p([[24,23],[39,23],[43,25],[46,31],[47,38],[43,40],[40,37],[39,42],[24,42],[22,38],[18,39],[16,37],[17,31],[20,26]],C.coat);
    p([[20,25],[24,25],[24,30],[21,36],[17,36],[18,30]],C.coatLit);
    p([[40,24],[43,26],[46,32],[46,36],[43,36],[41,31]],C.coatLit);
    const handL=Math.round(stride*.25), handR=-handL;
    r(17,36+handL,5,3,C.black);r(17,38+handL,5,3,C.skinDeep);r(18,38+handL,3,2,C.skin);
    r(43,36+handR,5,3,C.black);r(43,38+handR,5,3,C.skinDeep);r(44,38+handR,3,2,C.skin);
    p([[22,28],[27,26],[31,28],[38,26],[42,29],[38,34],[33,35],[27,34]],C.black);
    if(north){
      p([[25,24],[38,24],[41,28],[38,32],[33,34],[28,33],[24,29]],C.coatLit);
      p([[27,25],[36,25],[38,28],[35,31],[29,31],[26,28]],C.coat);
      r(31,33,2,7,C.pocket);r(25,40,13,2,C.black);
    }else{
      p([[23,26],[28,27],[31,31],[28,31],[24,30]],C.coatLit);
      p([[40,26],[35,27],[32,31],[35,31],[39,30]],C.coatLit);
      r(31,30,1,11,C.seam);r(32,30,1,11,C.black);r(31,31,2,2,C.clasp);
      r(24,36,4,2,C.black);r(35,36,5,2,C.black);r(23,41,17,1,C.black);
      // Pale embroidered A on the chest, drawn at the native pixel density.
      r(36,30,2,1,C.clasp);r(35,31,1,4,C.clasp);r(38,31,1,4,C.clasp);r(36,33,2,1,C.clasp);
    }
    p([[26,5],[37,5],[42,9],[42,17],[40,21],[35,24],[28,24],[23,20],[22,15],[22,10]],C.edge);
    p([[26,7],[37,7],[40,10],[40,17],[38,21],[34,23],[29,23],[25,20],[24,16],[24,11]],north?C.hair:C.skin);
    p([[24,11],[26,7],[37,7],[40,10],[40,13],[38,15],[37,12],[34,12],[32,13],[27,13],[26,16],[24,15]],C.hair);
    r(27,8,9,2,C.bristle);r(28,8,5,1,C.coat);
    if(north){
      r(26,19,2,2,C.skinDeep);r(37,19,2,2,C.skinDeep);r(29,21,7,3,C.skinDeep);r(29,21,6,1,C.bristle);
    }else{
      r(23,15,2,4,C.skinDeep);r(40,15,2,3,C.skinDeep);r(27,14,4,1,C.skinDeep);r(34,14,4,1,C.skinDeep);
      r(27,15,3,1,C.edge);r(35,15,3,1,C.edge);r(31,15,2,3,C.skinLit);r(26,17,3,2,C.skinLit);
      r(35,17,3,1,C.skinLit);r(30,19,5,1,C.skinDeep);r(32,20,2,1,C.skinLit);r(29,22,6,1,C.skinDeep);
    }
  }
  const lanternX=profile?37+Math.round(-stride*.52):43;
  const lanternY=43+(north?-2:0)+(profile?0:Math.round(-stride*.21));
  r(lanternX+(profile?1:2),lanternY-4,2,4,C.tint);
  r(lanternX,lanternY-1,8,8,C.edge);
  r(lanternX+1,lanternY,6,5,C.flame);
  r(lanternX+2,lanternY+1,4,3,C.amber);
  r(lanternX+1,lanternY+5,6,1,C.tint);
  return out;
}

export function makeMananAtlas(): HTMLCanvasElement {
  const atlas=document.createElement('canvas');
  atlas.width=MANAN_FRAME*MANAN_POSES; atlas.height=MANAN_FRAME*4;
  const ctx=atlas.getContext('2d')!;
  for(let dir=0;dir<4;dir++)for(let i=0;i<MANAN_POSES;i++){
    const tile=ctx.createImageData(MANAN_FRAME,MANAN_FRAME);
    tile.data.set(mananPixels(dir as Direction,i));
    ctx.putImageData(tile,i*MANAN_FRAME,dir*MANAN_FRAME);
  }
  return atlas;
}
