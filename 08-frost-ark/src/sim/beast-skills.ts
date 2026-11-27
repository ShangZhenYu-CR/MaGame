import { beastCooldown,beastLevel,beastAttackScale,currentLeader,gainBeastXp,startBeastCooldown } from './beast-growth';
import { traitStrike } from './beast-traits';
import { strikeWildWithWeapon } from './beasts';
import { activeCave,caveGuard,caveHurt,caveSight } from './cave';
import { finaleStatus,strikeWhaleWithWeapon } from './finale';
import { areaAt } from './island';
import { emitJuice } from './juice';
import { strikeHostileWithWeapon } from './m5';
import { healPlayer,incapacitated } from './rescue';
import { rolling } from './roll';
import type { Element } from './elements';
import { TICK_RATE,type Vec2,type WorldState } from './types';

type SkillSpec={name:string;cooldown:number;range:number;radius:number;damage:number;element:Element;style:'earth'|'flame'|'rush'|'heal'|'dive'|'gale';warm?:number;heal?:number};
export const skills:Record<string,SkillSpec>={
 burrowback:{name:'裂岩震荡',cooldown:18,range:3.4,radius:1.9,damage:29,element:'hammer',style:'earth'},
 emberfox:{name:'爆燃暖阵',cooldown:20,range:0,radius:3.6,damage:38,element:'fire',style:'flame',warm:22},
 frostyak:{name:'破冰冲锋',cooldown:18,range:4.4,radius:1.55,damage:42,element:'break',style:'rush'},
 glacierstag:{name:'回春暖域',cooldown:24,range:0,radius:3.8,damage:0,element:'ice',style:'heal',warm:28,heal:16},
 galehawk:{name:'霜翼俯冲',cooldown:16,range:5.2,radius:1.4,damage:35,element:'ice',style:'dive'},
 magmalisk:{name:'炎流吐息',cooldown:22,range:4.9,radius:2.15,damage:46,element:'fire',style:'flame'},
 tempest_wyvern:{name:'飓风俯冲',cooldown:26,range:5.0,radius:2.6,damage:55,element:'ice',style:'gale'},
};
interface SkillFx { style:SkillSpec['style'];from:Vec2;to:Vec2;radius:number;start:number;until:number }
const effects=new WeakMap<WorldState,SkillFx>();
export const activeSkillFx=(w:WorldState)=>{
 const f=effects.get(w);return f&&f.until>w.tick?f:undefined;
};
const distance=(a:Vec2,b:Vec2)=>Math.hypot(a.x-b.x,a.y-b.y);
const point=(p:Vec2):Vec2=>({x:p.x,y:p.y});
export function companionSkillStatus(w:WorldState){
 const companion=currentLeader(w),skill=companion&&skills[companion.defId];
 if(!companion||!skill)return null;
 return {companion,skill,wait:beastCooldown(w,companion),near:distance(w.player,companion)<=4,level:beastLevel(w,companion)};
}
export function castBeastSkill(w:WorldState,aim?:Vec2):{issue:string|null;label:string;hit:number;leveled?:boolean}{
 const no=(issue:string)=>({issue,label:'',hit:0});
 if(incapacitated(w)||rolling(w))return no('站稳后才可呼叫伙伴大招。');
 const s=companionSkillStatus(w);
 if(!s||!s.near)return no('需要有随行领队靠近你。');
 const {skill,companion}=s;
 if(s.wait)return no('伙伴大招还需 '+Math.ceil(s.wait/TICK_RATE)+' 秒。');
 const p=w.player,cave=activeCave(w),land=areaAt(w,p.x,p.y);
 const visible=(a:Vec2)=>!cave||caveSight(cave,p,a);
 let enemies=w.wildEntities.filter(e=>e.hp>0&&
   (land==='ark'?e.kind==='raider':land==='island'?e.kind==='boss'||e.kind==='beast'&&e.hostile:false))
   .filter(e=>distance(e,p)<=skill.range+skill.radius+.5);
 const boss=finaleStatus(w).whale,guard=caveGuard(w);
 const targets:Vec2[]=[...enemies];
 if(guard&&guard.hp>0&&visible(guard))targets.push(guard);
 if(boss&&finaleStatus(w).mode==='battle')targets.push(boss);
 const closest=targets.filter(t=>distance(t,p)<=skill.range+skill.radius).sort((a,b)=>distance(a,p)-distance(b,p))[0];
 const toward=aim&&distance(p,aim)>.24?aim:closest??{x:p.x+p.facing.x,y:p.y+p.facing.y};
 const gap=distance(p,toward),span=skill.range?(closest===toward?Math.min(skill.range,gap):gap>1.2?Math.min(skill.range,gap):skill.range):0;
 const q=gap>.002?{x:p.x+(toward.x-p.x)*span/gap,y:p.y+(toward.y-p.y)*span/gap}:point(p);
 const damage=Math.round(skill.damage*beastAttackScale(w,companion)*traitStrike(w,companion));
 const affected=(t:Vec2)=>distance(t,q)<=skill.radius&&visible(t);
 let hit=0;
 if(damage>0){
   for(const enemy of enemies)if(affected(enemy)){
    if(enemy.kind==='beast'?strikeWildWithWeapon(w,enemy,damage,skill.element):strikeHostileWithWeapon(w,enemy,damage,3,skill.element))hit++;
   }
   if(guard&&affected(guard)&&caveHurt(w,damage,skill.element))hit++;
   if(boss&&affected(boss)&&strikeWhaleWithWeapon(w,damage,skill.element))hit++;
 }
 if(damage>0&&!hit&&!skill.warm)return no('瞄准范围内的目标，伙伴未消耗大招。');
 if(skill.warm){
   const before=p.warmth;p.warmth=Math.min(p.maxWarmth,p.warmth+skill.warm);
   if(p.warmth>before)emitJuice(w,'warmth',p,p.warmth-before,{target:'player'});
 }
 if(skill.heal)healPlayer(w,skill.heal);
 startBeastCooldown(w,companion,skill.cooldown);
 const leveled=gainBeastXp(w,companion,hit?24:16);
 effects.set(w,{style:skill.style,from:point(companion),to:q,radius:skill.radius,start:w.tick,until:w.tick+39});
 return {issue:null,label:skill.name,hit,leveled};
}
