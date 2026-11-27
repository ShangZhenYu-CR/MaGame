import type { BuildingInstance,Vec2,WorldState } from './types';
import { TICK_RATE } from './types';
import { PLAYER_FOOT_RADIUS } from './ground-footprint';

export const isDoor=(id:string)=>id==='wind_door'||id==='frost_airlock';
export const doorOpen=(b:BuildingInstance)=>isDoor(b.defId)&&b.door?.open===true;
export const doorCenter=(b:BuildingInstance)=>({x:b.gx+.5,y:b.gy+.65});
const touches=(b:BuildingInstance,p:Vec2,r=PLAYER_FOOT_RADIUS)=>
  p.x+r>b.gx&&p.x-r<b.gx+1&&p.y+r>b.gy+.49&&p.y-r<b.gy+.81;
const walls=new Set(['wind_wall','warm_wall']);
export const envelope=(id:string)=>walls.has(id)||isDoor(id);
export function doorBlocksFeet(b:BuildingInstance,p:Vec2,r=PLAYER_FOOT_RADIUS):boolean{
 if(!isDoor(b.defId)||!touches(b,p,r))return false;
 return !doorOpen(b)||p.x-r<b.gx+.11||p.x+r>b.gx+.89;
}
export interface IndoorSpan{x:number;y:number;width:number}
interface RoomMask{inside:Uint8Array;spans:IndoorSpan[];tiles:number}
const cache=new WeakMap<WorldState,RoomMask>();
export const invalidateRoomTopology=(w:WorldState)=>cache.delete(w);
export function nearestManualDoor(w:WorldState):BuildingInstance|undefined{
 if(w.activeIsland||w.player.hp<=0)return undefined;
 let best:BuildingInstance|undefined,range=1.48;
 for(const b of w.ark.buildings){
  if(b.defId!=='wind_door')continue;
  const p=doorCenter(b),dist=Math.hypot(p.x-w.player.x,p.y-w.player.y);
  if(dist<=range){best=b;range=dist;}
 }
 return best;
}
function occupied(w:WorldState,b:BuildingInstance):boolean{
 return touches(b,w.player)||w.beasts.some(p=>p.hp>0&&touches(b,p,.23))||touches(b,w.latte,.14);
}
function setDoor(w:WorldState,b:BuildingInstance,open:boolean):void{
 const state=b.door??={open:false,nearbyUntil:0};
 if(state.open!==open){state.open=open;invalidateRoomTopology(w);}
}
export function operateWindDoor(w:WorldState,id:string):string|null{
 const b=nearestManualDoor(w);
 if(!b||b.id!==id)return '走近防风门后再操作。';
 if(doorOpen(b)&&occupied(w,b))return '门口还有人或伙伴，先让开。';
 setDoor(w,b,!doorOpen(b));return null;
}
export function stepAirlocks(w:WorldState):void{
 for(const b of w.ark.buildings){
  if(b.defId!=='frost_airlock')continue;
  const state=b.door??={open:false,nearbyUntil:0},spot=doorCenter(b);
  const near=(p:Vec2)=>Math.hypot(p.x-spot.x,p.y-spot.y)<1.14;
  const friendly=(w.player.hp>0&&!w.activeIsland&&near(w.player))||w.beasts.some(p=>p.hp>0&&near(p));
  if(friendly){state.nearbyUntil=w.tick+Math.ceil(TICK_RATE*.4);setDoor(w,b,true);}
  else if(w.tick>=state.nearbyUntil&&!occupied(w,b))setDoor(w,b,false);
 }
}
export function indoor(w:WorldState):RoomMask{
 const existing=cache.get(w);
 if(existing)return existing;
 const {size,decks,buildings}=w.ark,total=size*size;
 const inside=new Uint8Array(total),barrier=new Uint8Array(total);
 const envelopes=buildings.filter(b=>walls.has(b.defId)||isDoor(b.defId)&&!doorOpen(b));
 if(envelopes.length<4){
  const empty={inside,spans:[],tiles:0};cache.set(w,empty);return empty;
 }
 for(const b of envelopes)barrier[b.gy*size+b.gx]=1;
 const outside=new Uint8Array(total),queue=new Int32Array(total);
 let head=0,tail=0;
 function visit(i:number){
  if(decks[i]&&!barrier[i]&&!outside[i]){outside[i]=1;queue[tail++]=i;}
 }
 for(let i=0;i<total;i++){
  if(!decks[i]||barrier[i])continue;
  const x=i%size,y=Math.floor(i/size);
  if(x===0||y===0||x===size-1||y===size-1||!decks[i-1]||!decks[i+1]||!decks[i-size]||!decks[i+size])visit(i);
 }
 while(head<tail){
  const i=queue[head++],x=i%size,y=Math.floor(i/size);
  if(x>0)visit(i-1);if(x<size-1)visit(i+1);
  if(y>0)visit(i-size);if(y<size-1)visit(i+size);
 }
 const spans:IndoorSpan[]=[];
 let tiles=0;
 for(let y=0;y<size;y++){
  let run=-1;
  for(let x=0;x<=size;x++){
   const i=y*size+x,yes=x<size&&decks[i]&&!barrier[i]&&!outside[i];
   if(yes){inside[i]=1;tiles++;if(run<0)run=x;}
   else if(run>=0){spans.push({x:run,y,width:x-run});run=-1;}
  }
 }
 const mask={inside,spans,tiles};cache.set(w,mask);return mask;
}
export function indoorsAt(w:WorldState,p:Vec2):boolean{
 const x=Math.floor(p.x),y=Math.floor(p.y),size=w.ark.size;
 return x>=0&&y>=0&&x<size&&y<size&&indoor(w).inside[y*size+x]===1;
}
