import type { Vec2 } from './types';

export const docks={
 east:{x:1,y:0,label:'右舷',verb:'向右'},
 west:{x:-1,y:0,label:'左舷',verb:'向左'},
 south:{x:0,y:1,label:'船尾',verb:'向下'},
 north:{x:0,y:-1,label:'船首',verb:'向上'},
} as const;
export type DockSide=keyof typeof docks;
export const dockSide=(side?:DockSide):DockSide=>side??'east';

export function rotateDockPoint(side:DockSide,s:number,x:number,y:number):Vec2{
 switch(side){
  case 'east':return{x,y};
  case 'west':return{x:s-x,y:s-y};
  case 'south':return{x:s-y,y:x};
  case 'north':return{x:y,y:s-x};
 }
}
export const inverseDock=(side:DockSide):DockSide=>side==='north'?'south':side==='south'?'north':side;

export function downDock(landing:Vec2,side:DockSide,along:number,across=0):Vec2{
 const dir=docks[side];
 return {x:landing.x+dir.x*along-dir.y*across,y:landing.y+dir.y*along+dir.x*across};
}
