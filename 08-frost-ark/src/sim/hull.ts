import type { ArkState } from './types';

export const HULL_NORTH=1,HULL_EAST=2,HULL_SOUTH=4,HULL_WEST=8;
export interface HullCorner { x:number;y:number; dx:number;dy:number; inside:boolean }
export interface HullProfile {
  edges: Uint8Array;
  cones: Uint8Array;
  corners: HullCorner[];
  minX:number;minY:number;maxX:number;maxY:number;
}

export function contourHull({size,decks}:Pick<ArkState,'size'|'decks'>):HullProfile{
  const edges=new Uint8Array(size*size),cones=new Uint8Array(size*size),corners:HullCorner[]=[];
  const lastSouth=new Int16Array(size).fill(-1);
  let minX=size,minY=size,maxX=0,maxY=0;
  const occupied=(x:number,y:number)=>x>=0&&x<size&&y>=0&&y<size&&Boolean(decks[y*size+x]);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    if(!occupied(x,y))continue;
    minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x+1);maxY=Math.max(maxY,y+1);
    lastSouth[x]=y;
    edges[y*size+x]=(!occupied(x,y-1)?HULL_NORTH:0)|(!occupied(x+1,y)?HULL_EAST:0)|
      (!occupied(x,y+1)?HULL_SOUTH:0)|(!occupied(x-1,y)?HULL_WEST:0);
  }
  for(let x=minX;x<maxX;x++){
    const y=lastSouth[x];
    // Only the visible, backed south profile supports a full rock cone.
    // A notch, side appendage or isolated surface tip gets a thin skirt even
    // if the tile happens to expose a south-facing lip.
    if(y>0&&occupied(x,y-1))cones[y*size+x]=1;
  }
  const quadrants=[[-1,-1],[1,-1],[-1,1],[1,1]] as const;
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
    const around=quadrants.map(([dx,dy])=>occupied(x+(dx<0?-1:0),y+(dy<0?-1:0)));
    const n=around.filter(Boolean).length;
    if(n===3){
      const [dx,dy]=quadrants[around.indexOf(false)];
      corners.push({x,y,dx:-dx,dy:-dy,inside:true});
    }else if(n===1||(n===2&&around[0]===around[3])){
      for(let i=0;i<4;i++)if(around[i]){
        const [dx,dy]=quadrants[i];corners.push({x,y,dx,dy,inside:false});
      }
    }
  }
  return {edges,cones,corners,minX,minY,maxX,maxY};
}
