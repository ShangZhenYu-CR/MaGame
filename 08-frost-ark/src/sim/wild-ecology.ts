import { activeCave } from './cave';
import { beastProfile,type BeastProfile,type TraitId } from './beast-traits';
import { islandForage,patchReady } from './forage';
import { heatAt } from './heatField';
import { areaAt } from './island';
import { islandLandmarks,landmarkLit } from './landmarks';
import { incapacitated } from './rescue';
import type { IslandNode,Vec2,WildEntity,WorldState } from './types';

type Mood='watch'|'forage'|'warm'|'flee'|'group'|'wander';
type Thought={mood:Mood;until:number;target:Vec2;season:number};
type Pack={thought:Map<string,Thought>;alarm:Map<string,number>};
const worlds=new WeakMap<WorldState,Pack>();
const moodLabel:Record<Mood,string>={watch:'保持警觉',forage:'在觅食',warm:'循着暖意',flee:'受惊逃开',group:'呼应同伴',wander:'在游荡'};
const distance=(a:Vec2,b:Vec2)=>Math.hypot(a.x-b.x,a.y-b.y);
const point=(p:Vec2)=>({x:p.x,y:p.y});
const hash=(seed:number,id:string,salt=0)=>{
 let h=Math.imul(seed^salt,0x85ebca6b);for(const ch of id)h=Math.imul(h^ch.codePointAt(0)!,16777619);
 h=Math.imul(h^(h>>>13),0xc2b2ae35);return (h^(h>>>16))>>>0;
};
function state(w:WorldState):Pack{
 let x=worlds.get(w);
 if(!x){x={thought:new Map(),alarm:new Map()};worlds.set(w,x);}
 if(x.thought.size>144){x.thought.clear();x.alarm.clear();}
 return x;
}
export function wildMind(w:WorldState,id:string):{mood:Mood;label:string;until:number}{
 const a=worlds.get(w)?.thought.get(id),mood=a?.mood??'watch';
 return {mood,label:moodLabel[mood],until:a?.until??0};
}
export function naturalAlpha(node:IslandNode,id:string):boolean{
 // The very first tutorial shore keeps its guaranteed easy-to-tame partners.
 return node.id!=='shallows_lantern'&&hash(node.seed,id,91627)%100<11;
}
export const alphaMaxHp=(base:number)=>Math.round(base*1.48);
export const alphaAttack=(e:Pick<WildEntity,'alpha'>)=>e.alpha?1.55:1;
export const alphaHue=(species:string):'aurora'|'ember'=>species==='emberfox'||species==='magmalisk'?'ember':'aurora';
const gold:readonly TraitId[]=['heavy_paws','hearth_link','thick_coat','lucky_salvage','watchful','second_wind'];
export function eliteProfile(w:WorldState,e:WildEntity):BeastProfile{
 const p=beastProfile(w,e),golden=gold[hash(w.seed,e.id,8773)%gold.length],second=p.traits.find(t=>t!==golden);
 return {traits:second?[golden,second]:[golden],stars:Math.max(4,p.stars),temperament:p.temperament,rare:golden};
}
const stillOnLand=(w:WorldState,x:number,y:number)=>areaAt(w,x,y)==='island';
function stepToward(w:WorldState,e:WildEntity,to:Vec2,speed:number,stop:number):void{
 const d=distance(e,to);if(d<=stop+.025)return;
 const r=Math.min(d-stop,speed)/d,dx=(to.x-e.x)*r,dy=(to.y-e.y)*r;
 if(stillOnLand(w,e.x+dx,e.y)&&stillOnLand(w,e.x+dx*1.3,e.y))e.x+=dx;
 if(stillOnLand(w,e.x,e.y+dy)&&stillOnLand(w,e.x,e.y+dy*1.3))e.y+=dy;
}
function chooseWander(w:WorldState,e:WildEntity):Vec2{
 const slice=Math.floor(w.tick/93),f=hash(w.seed,e.id,slice);
 for(let i=0;i<8;i++){
   const a=(f%4093)/4093*Math.PI*2+i*2.399,d=1.4+((f>>>(i%16))%11)*.24;
   const q={x:e.x+Math.cos(a)*d,y:e.y+Math.sin(a)*d};
   if(stillOnLand(w,q.x,q.y))return q;
 }
 return point(e);
}
export function stepWildEcology(w:WorldState,e:WildEntity):void{
 if(!w.activeIsland||activeCave(w)||incapacitated(w)||e.hp<=e.maxHp*.35||e.stunnedTicks||e.hostile)return;
 const s=state(w),before=s.thought.get(e.id),p=w.player,dist=distance(e,p),phase=hash(w.seed,e.id,113)%11;
 const peers=w.wildEntities.filter(x=>x!==e&&x.kind==='beast'&&x.hp>0&&x.homeIslandId===e.homeIslandId&&!x.stunnedTicks&&distance(e,x)<=6.2);
 let next=before;
 if(dist<=2.85&&Math.hypot(p.vx,p.vy)>.062&&(before?.mood!=='flee'||before.until<=w.tick)){
   const angle=Math.atan2(e.y-p.y,e.x-p.x);
   next={mood:'flee',target:{x:e.x+Math.cos(angle)*3.4,y:e.y+Math.sin(angle)*3.4},until:w.tick+50,season:w.tick};
   for(const re of peers)s.alarm.set(re.id,w.tick+57);
 }else if(!next||next.until<=w.tick||next.mood!=='flee'&&((w.tick+phase)%53===0||(s.alarm.get(e.id)??0)>w.tick&&next.mood!=='group')){
   const alarm=(s.alarm.get(e.id)??0)>w.tick;
   const warm=islandLandmarks(w).filter(m=>m.kind==='spring'||landmarkLit(w,m)>0)
     .filter(m=>distance(e,m)<=8).sort((a,b)=>distance(e,a)-distance(e,b))[0];
   const lead=peers.sort((a,b)=>distance(e,a)-distance(e,b))[0];
   const plants=islandForage(w).filter(v=>v.kind!=='crystal'&&patchReady(w,v)&&distance(e,v)<7);
   const food=plants.sort((a,b)=>distance(e,a)-distance(e,b))[0];
   if(alarm&&lead)next={mood:'group',target:point(lead),until:w.tick+50,season:w.tick};
   else if((warm||dist<4.2&&Math.hypot(p.vx,p.vy)<.028)&&heatAt(w,e.x,e.y)<12)
     next={mood:'warm',target:point(warm??p),until:w.tick+70,season:w.tick};
   else if(food)next={mood:'forage',target:point(food),until:w.tick+80,season:w.tick};
   else if(lead&&peers.length>1&&distance(e,lead)>3.6)next={mood:'group',target:point(lead),until:w.tick+60,season:w.tick};
   else next={mood:'wander',target:chooseWander(w,e),until:w.tick+81,season:w.tick};
 }
 if(!next)return;s.thought.set(e.id,next);
 const speed=next.mood==='flee'?.074:next.mood==='warm'?.033:next.mood==='group'?.035:.021;
 const stop=next.mood==='group'?1.35:next.mood==='warm'?1.12:next.mood==='forage'?.40:.15;
 stepToward(w,e,next.target,speed,stop);
}
