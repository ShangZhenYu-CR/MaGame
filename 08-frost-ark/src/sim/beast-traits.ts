import { incapacitated } from './rescue';
import type { BeastEntity,WorldState } from './types';

export const traitList={
 thick_coat:{name:'厚绒耐寒',text:'寒冷掉温减慢 32%。'},
 heavy_paws:{name:'天生神力',text:'随行伤害 +18%，工作修复和补热量增加。'},
 hearth_link:{name:'炉火亲和',text:'移动暖圈更广，同时加快自身回温。'},
 gust_feathers:{name:'疾风羽翼',text:'移动速度 +22%，随行巡航略快。'},
 diligent_digger:{name:'勤劳掘进',text:'工作快 25%；矿工的随行采掘也更勤。'},
 iron_belly:{name:'铁胃省粮',text:'日常饥饿消耗减少 36%。'},
 lucky_salvage:{name:'幸运寻宝',text:'打捞有机会多带回一份残骸中的物资。'},
 watchful:{name:'敏锐察敌',text:'随行攻击更快，遇敌反击加成。'},
 dawn_worker:{name:'晨曦勤务',text:'白昼基地工作节奏加快 20%。'},
 snow_stride:{name:'踏雪轻捷',text:'移动更快，雪地掉温减少。'},
 good_mender:{name:'疗愈亲和',text:'暖窝休息恢复更快，鹿的随行疗愈更强。'},
 second_wind:{name:'百折不挠',text:'低血量时加快行动，也能持续多撑一阵。'},
} as const;
const names=Object.keys(traitList) as TraitId[];
export type TraitId=keyof typeof traitList;
const temperaments=['沉稳','好奇','爱贴炉','大胆','勤快','慢热','机警','温驯'] as const;
type Temperament=(typeof temperaments)[number];
export interface BeastProfile { traits:readonly TraitId[];stars:number;temperament:Temperament;rare?:TraitId }
type ProfileSave=WorldState&{traitOverridesP2?:Record<string,BeastProfile>};
const record=(w:WorldState)=>(w as ProfileSave).traitOverridesP2;
const cache=new WeakMap<WorldState,Map<string,BeastProfile>>();
const idLike=(s:string)=>/^[a-z0-9_-]{1,120}$/i.test(s)&&s!=='__proto__'&&s!=='constructor';
const hash=(seed:number,id:string,salt:number)=>{
 let h=Math.imul(seed^salt,0x85ebca6b);
 for(const letter of id)h=Math.imul(h^letter.codePointAt(0)!,16777619);
 h=Math.imul(h^(h>>>13),0xc2b2ae35);
 return (h^(h>>>16))>>>0;
};
export function beastProfile(w:WorldState,b:{id:string;defId:string}):BeastProfile{
 const fixed=record(w)?.[b.id];if(fixed&&Object.hasOwn(record(w)!,b.id))return fixed;
 let known=cache.get(w);if(!known){known=new Map();cache.set(w,known);}
 const key=b.id+'~'+b.defId,result=known.get(key);if(result)return result;
 const a=hash(w.seed,key,273),j=hash(w.seed,key,769),k=hash(w.seed,key,1279);
 const trait1=names[a%names.length],trait2=names[((a%names.length)+1+j%(names.length-1))%names.length];
 const odds=k%100,stars=odds<8?5:odds<24?4:odds<58?3:odds<84?2:1;
 const p={traits:j%5>=2?[trait1,trait2]:[trait1],stars,temperament:temperaments[hash(w.seed,key,2579)%temperaments.length]};
 if(known.size>=384)known.delete(known.keys().next().value!);
 known.set(key,p);return p;
}
const has=(p:BeastProfile,t:TraitId)=>p.traits.includes(t);
export function traitWorkRate(w:WorldState,b:BeastEntity):number{
 const p=beastProfile(w,b);
 return (has(p,'diligent_digger')?1.25:1)*(has(p,'dawn_worker')&&w.timeOfDay<.59?1.2:1);
}
export function traitTravel(w:WorldState,b:BeastEntity):number{
 const p=beastProfile(w,b);
 return (has(p,'gust_feathers')?1.22:1)*(has(p,'snow_stride')?1.15:1)*(has(p,'second_wind')&&b.hp<b.maxHp*.4?1.16:1);
}
export function traitStrike(w:WorldState,b:BeastEntity):number{
 const p=beastProfile(w,b);
 return (has(p,'heavy_paws')?1.18:1)*(has(p,'watchful')?1.10:1);
}
export function traitSupport(w:WorldState,b:BeastEntity){
 const p=beastProfile(w,b);
 return {
  cold:(has(p,'thick_coat')?.68:1)*(has(p,'snow_stride')?.84:1)*(has(p,'second_wind')&&b.hp<b.maxHp*.4?.72:1),
  gain:has(p,'hearth_link')?1.22:1,
  radius:has(p,'hearth_link')?1.22:1,
  food:has(p,'iron_belly')?.64:1,
  heal:has(p,'good_mender')?1.25:1,
  force:has(p,'heavy_paws')?1.18:1,
 };
}
export const traitWatchful=(w:WorldState,b:BeastEntity)=>has(beastProfile(w,b),'watchful');
export const traitTailwind=(w:WorldState,b:BeastEntity)=>has(beastProfile(w,b),'gust_feathers');
export const luckyParcel=(w:WorldState,b:BeastEntity,id:string)=>has(beastProfile(w,b),'lucky_salvage')&&hash(w.seed,id+'~'+b.id,3751)%5===0;

export function renameBeast(w:WorldState,id:string,value:string):string|null{
 if(incapacitated(w))return '先恢复意识。';
 const b=w.beasts.find(v=>v.id===id);
 if(!b)return '这只云兽尚未加入。';
 const name=value.normalize('NFKC').trim();
 if(!name||Array.from(name).length>16||/[\p{Cc}\p{Cf}]/u.test(name))return '请输入 1–16 个可见字符。';
 b.name=name;return null;
}
export function inheritProfile(w:WorldState,id:string,p:BeastProfile):void{
 ((w as ProfileSave).traitOverridesP2??={})[id]=p;
}
export function validTraitArchive(w:WorldState):boolean{
 const data=record(w);if(data===undefined)return true;
 if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).length>2048)return false;
 return Object.entries(data).every(([id,p])=>idLike(id)&&!!p&&typeof p==='object'&&!Array.isArray(p)&&
   Number.isSafeInteger(p.stars)&&p.stars>=1&&p.stars<=5&&temperaments.includes(p.temperament)&&
   Array.isArray(p.traits)&&p.traits.length>0&&p.traits.length<=2&&new Set(p.traits).size===p.traits.length&&
   p.traits.every(x=>Object.hasOwn(traitList,x))&&(p.rare===undefined||p.traits.includes(p.rare)));
}
