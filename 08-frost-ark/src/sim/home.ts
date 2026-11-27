import type { BuildingInstance,Vec2,WorldState } from './types';
import { inventoryChange,countItem } from './ark';
import { indoor } from './rooms';
import { emitJuice } from './juice';
import { incapacitated } from './rescue';

const decorations={warm_cot:2.9,tea_table:1.65,latte_climber:1.5,water_purifier:1,wall_lamp:1.4} as const;
const near=(p:Vec2,b:BuildingInstance)=>Math.hypot(p.x-b.gx-.5,p.y-b.gy-.5)<2.05;
const position=(b:BuildingInstance)=>({x:b.gx+.5,y:b.gy+.5});
const cardinals=[[1,0],[-1,0],[0,1],[0,-1]] as const;

function roomAt(w:WorldState,p:Vec2){
 const {size}=w.ark,x=Math.floor(p.x),y=Math.floor(p.y);
 return x>=0&&x<size&&y>=0&&y<size?indoor(w).room[y*size+x]:0;
}
export function roomComfort(w:WorldState,p=w.player):number{
 if(w.activeIsland)return 0;
 const id=roomAt(w,p);
 if(!id)return 0;
 const ground=indoor(w),temp=w.ark.heatGrid[Math.floor(p.y)*w.ark.size+Math.floor(p.x)];
 if(temp<3)return 0;
 let score=Math.min(5,Math.sqrt(ground.roomAreas[id]??0));
 const copies=new Map<string,number>();
 for(const b of w.ark.buildings){
  const k=b.defId as keyof typeof decorations;
  if(!Object.hasOwn(decorations,k)||b.hp<=1)continue;
  const p=position(b),same=roomAt(w,p)===id||
    (k==='wall_lamp'&&cardinals.some(([x,y])=>roomAt(w,{x:p.x+x,y:p.y+y})===id));
  if(!same)continue;
  const n=copies.get(k)??0;
  score+=decorations[k]*Math.pow(.36,n);copies.set(k,n+1);
 }
 return score>=12?5:score>=9?4:score>=6.6?3:score>=4?2:1;
}
export function catPerch(w:WorldState){
 return w.ark.buildings.find(b=>b.defId==='latte_climber'&&b.hp>1&&roomAt(w,position(b))>0);
}
export function restIssue(w:WorldState,b:BuildingInstance):string|null{
 if(b.defId!=='warm_cot'||!near(w.player,b))return '走近行军暖床';
 if(incapacitated(w))return '清醒后才能休息';
 if(w.weather==='whiteout'||(w.day%5===0&&w.timeOfDay>=.74))return '大寒潮正在逼近，不能跳过这一夜。';
 if(w.wildEntities.some(e=>e.kind==='raider'&&e.hp>0)||w.sky.cruising)return '先停船并排除仍在场的敌袭';
 if(w.timeOfDay<.66)return '等到傍晚以后才可过夜';
 if(roomAt(w,position(b))!==roomAt(w,w.player)||roomComfort(w)<1)return '床和马楠都须在同一间封闭、有热源的暖室里';
 return null;
}
export function sleepToDawn(w:WorldState,b:BuildingInstance):string|null{
 const issue=restIssue(w,b);if(issue)return issue;
 const p=w.player,before=p.warmth;
 w.day++;w.timeOfDay=.025;w.weather='clear';w.ambientTemp=-4;
 p.warmth=Math.max(p.warmth,78);p.hunger=Math.max(1,p.hunger-8);
 p.roll.stamina=100;p.roll.startedAt=null;p.roll.restUntil=w.tick;
 emitJuice(w,'warmth',p,p.warmth-before,{target:'player'});return null;
}
export function brewTea(w:WorldState,b:BuildingInstance):string|null{
 if(b.defId!=='tea_table'||!near(w.player,b)||incapacitated(w))return '靠近茶桌才能喝茶';
 if(!inventoryChange(w,[{itemId:'fresh_water',count:1}],[]))return '先用融冰净水器准备一份净水';
 const p=w.player,was=p.warmth;
 p.warmth=Math.min(p.maxWarmth,p.warmth+10);p.roll.stamina=Math.min(100,p.roll.stamina+14);
 emitJuice(w,'warmth',p,p.warmth-was,{target:'player'});return null;
}
export function homePanel(w:WorldState,b:BuildingInstance){
 if(b.defId==='warm_cot')return {action:'sleep',issue:restIssue(w,b),level:roomComfort(w)};
 if(b.defId==='tea_table')return {action:'tea',issue:countItem(w,'fresh_water')?null:'需要一份净水',level:roomComfort(w)};
 return null;
}
