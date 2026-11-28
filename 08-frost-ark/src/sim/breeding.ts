import { recordLife } from './life';
import beastData from '../data/beasts.json';
import { inventoryChange,countItem,hasBuildingContact,isDeck } from './ark';
import { beastBond } from './beast-bond';
import { beastProfile,inheritProfile,traitList,type BeastProfile,type TraitId } from './beast-traits';
import { heatAt } from './heatField';
import { areaAt } from './island';
import { ensureFauna } from './m4-state';
import { incapacitated } from './rescue';
import { TICK_RATE,type BeastEntity,type BuildingInstance,type WorldState } from './types';

export const EGG_ITEM='cloud_egg';
export const INCUBATION=16*TICK_RATE;
export const BREED_BOND=68;
const BROOD_REST=180*TICK_RATE, YOUNG_TIME=170*TICK_RATE;
export type Variant='aurora'|'ember';
type Egg={id:string;species:string;parents:[string,string];profile:BeastProfile;variant:Variant|null};
type Nest={egg:Egg;progress:number};
type Offspring={variant:Variant|null;born:number;parents:[string,string]};
type Records={serial:number;eggs:Egg[];nests:Record<string,Nest>;cool:Record<string,number>;children:Record<string,Offspring>};
type Save=WorldState&{breedingP2?:Records};
const record=(w:WorldState)=>(w as Save).breedingP2;
const get=(w:WorldState)=>((w as Save).breedingP2??={serial:0,eggs:[],nests:{},cool:{},children:{}});
const defs=new Map(beastData.map(d=>[d.id,d]));
const point=(b:BuildingInstance)=>({x:b.gx+(b.defId==='beast_den'?1:.5),y:b.gy+(b.defId==='beast_den'?1:.5)});
const close=(w:WorldState,b:BuildingInstance)=>Math.hypot(w.player.x-point(b).x,w.player.y-point(b).y)<=2.48;
const onDeck=(w:WorldState)=>!incapacitated(w)&&areaAt(w,w.player.x,w.player.y)==='ark';
const warmth=(w:WorldState,b:BuildingInstance)=>{const p=point(b);return heatAt(w,p.x,p.y);};
const seed=(w:WorldState,id:string)=>{
 let h=Math.imul(w.seed^0xa64371,0x85ebca6b);
 for(const ch of id)h=Math.imul(h^ch.codePointAt(0)!,16777619);
 h=Math.imul(h^(h>>>13),0xc2b2ae35);return (h^(h>>>16))>>>0;
};
export function inheritedMorph(w:WorldState,id:string){
 const a=record(w)?.children[id];
 return {variant:a?.variant??null,young:!!a&&w.tick-a.born<YOUNG_TIME,parents:a?.parents??null};
}
export const incubatorOccupied=(w:WorldState,id:string)=>!!record(w)?.nests[id];
const adult=(w:WorldState,b:BeastEntity)=>!inheritedMorph(w,b.id).young;
function nearby(w:WorldState,id:string,kind:'incubator'|'beast_den'){
 return onDeck(w)?w.ark.buildings.find(b=>b.id===id&&b.defId===kind&&close(w,b)):undefined;
}
function parentsIssue(w:WorldState,den:BuildingInstance,a:BeastEntity,b:BeastEntity):string|null{
 if(a===b||a.defId!==b.defId||a.denBuildingId!==den.id||b.denBuildingId!==den.id||a.role!=='rest'||b.role!=='rest')
  return '让两只同种云兽在同一暖窝休整。';
 if(!adult(w,a)||!adult(w,b))return '等幼兽长大后再配对。';
 if(a.hunger<61||b.hunger<61||a.warmth<55||b.warmth<55||Math.min(a.hp,b.hp)<15)return '两只亲兽需暖和、饱腹并有体力。';
 if(beastBond(w,a.id)<BREED_BOND||beastBond(w,b.id)<BREED_BOND)return '两只亲兽的羁绊都需要达到 '+BREED_BOND+'。';
 if(warmth(w,den)<15)return '兽窝温度至少 15°C。';
 if([a,b].some(v=>(record(w)?.cool[v.id]??0)>w.tick))return '亲兽需要休息一会儿，还不能再次配对。';
 return null;
}
function eggProfile(w:WorldState,id:string,a:BeastEntity,b:BeastEntity):{profile:BeastProfile;variant:Variant|null}{
 const one=beastProfile(w,a),two=beastProfile(w,b),r=seed(w,id+'|'+[a.id,b.id].sort().join('|'));
 const elite=one.rare?one:two.rare?two:one.stars>=two.stars?one:two;
 const first=elite.rare??elite.traits[0],other=[...new Set([...one.traits,...two.traits])].filter(x=>x!==first);
 const second=other.length?other[(r>>>9)%other.length]:undefined;
 const uplift=(r>>>12)%8===0?1:0,stars=Math.min(5,Math.max(one.stars,two.stars)+uplift);
 const variant=(r%100)<10?((r>>>11)%2===0?'aurora':'ember'):null;
 return {profile:{traits:second?[first,second]:[first],stars,temperament:elite.temperament, ...(elite.rare===first?{rare:first}:{})},variant};
}
export function breedBeasts(w:WorldState,denId:string,first:string,second:string):string|null{
 const den=nearby(w,denId,'beast_den');if(!den)return '到暖窝旁配对。';
 const a=w.beasts.find(x=>x.id===first),b=w.beasts.find(x=>x.id===second);
 if(!a||!b)return '没有选中两只亲兽。';
 const issue=parentsIssue(w,den,a,b);if(issue)return issue;
 const state=get(w),id='clutch_'+(state.serial+1);
 if(state.eggs.length>=128)return '先孵化现有的蛋。';
 if(!inventoryChange(w,[],[{itemId:EGG_ITEM,count:1}]))return '背包空间不足，亲兽未消耗体力。';
 state.serial++;state.eggs.push({id,species:a.defId,parents:[a.id,b.id],...eggProfile(w,id,a,b)});
 state.cool[a.id]=state.cool[b.id]=w.tick+BROOD_REST;
 a.hunger-=10;b.hunger-=10;return null;
}
export function startIncubating(w:WorldState,id:string):string|null{
 const b=nearby(w,id,'incubator');if(!b)return '走到孵化巢旁再放蛋。';
 const s=get(w);if(s.nests[id])return '这座窝已经在孵化。';
 if(!s.eggs.length||!countItem(w,EGG_ITEM))return '请把配对获得的云兽蛋带在背包里。';
 if(!inventoryChange(w,[{itemId:EGG_ITEM,count:1}],[]))return '背包中没有可孵化的蛋。';
 s.nests[id]={egg:s.eggs.shift()!,progress:0};return null;
}
export function takeIncubating(w:WorldState,id:string):string|null{
 const b=nearby(w,id,'incubator'),s=record(w),occupied=s?.nests[id];
 if(!b||!s||!occupied)return '靠近正在使用的孵化巢。';
 if(!inventoryChange(w,[],[{itemId:EGG_ITEM,count:1}]))return '背包空间不足，蛋仍在巢里。';
 s.eggs.unshift(occupied.egg);delete s.nests[id];return null;
}
export function stepBreeding(w:WorldState):void{
 const s=record(w);if(!s||!Object.keys(s.nests).length)return;
 for(const b of w.ark.buildings){
  if(b.defId!=='incubator')continue;
  const n=s.nests[b.id];if(!n)continue;
  const t=warmth(w,b);
  if(t>=20&&t<=45&&b.hp>0)n.progress=Math.min(INCUBATION,n.progress+1);
  if(n.progress<INCUBATION||w.beasts.length>=18)continue;
  const definition=defs.get(n.egg.species);if(!definition)continue;
  const bed=[{x:b.gx+.56,y:b.gy+1.24},{x:b.gx+1.25,y:b.gy+.76},
    {x:b.gx-.25,y:b.gy+.76},{x:b.gx+.55,y:b.gy-.24}].find(v=>
      isDeck(w,Math.floor(v.x),Math.floor(v.y))&&!hasBuildingContact(w,v.x,v.y));
  if(!bed)continue; // ready eggs are never placed in void or inside furniture
  const id='born_'+n.egg.id;
  const stamp=(n.egg.variant==='aurora'?'极光 ':n.egg.variant==='ember'?'余烬 ':'')+definition.name+'幼兽';
  w.beasts.push({id,defId:definition.id,name:stamp,x:bed.x,y:bed.y,
    hp:definition.maxHp,maxHp:definition.maxHp,warmth:72,hunger:90,role:'rest',denBuildingId:null,workCooldown:4*TICK_RATE});
  ensureFauna(w);inheritProfile(w,id,n.egg.profile);
  recordLife(w,'hatched');if(n.egg.variant)recordLife(w,'variants');
  s.children[id]={variant:n.egg.variant,born:w.tick,parents:n.egg.parents};delete s.nests[b.id];
 }
}
export function breedPanel(w:WorldState){
 const data=record(w),rest=w.beasts.filter(b=>b.role==='rest'),eggs=countItem(w,EGG_ITEM);
 const pairs=w.ark.buildings.filter(b=>b.defId==='beast_den'&&close(w,b)).flatMap(den=>{
  const animals=rest.filter(b=>b.denBuildingId===den.id);
  return animals.flatMap((a,i)=>animals.slice(i+1).filter(b=>b.defId===a.defId).map(b=>({den:den.id,a,b,issue:onDeck(w)?parentsIssue(w,den,a,b):'回到方舟再配对。'})));
 });
 return {pairs,eggs,nests:w.ark.buildings.filter(b=>b.defId==='incubator').map(b=>{
  const n=data?.nests[b.id];return {id:b.id,temp:warmth(w,b),progress:n?.progress??0,egg:n&&defs.get(n.egg.species)?.name,
   near:onDeck(w)&&close(w,b),running:!!n&&warmth(w,b)>=20&&warmth(w,b)<=45};
 })};
}
export function validBreedingArchive(w:WorldState):boolean{
 const s=record(w);if(s===undefined)return true;
 const obj=(v:unknown)=>!!v&&typeof v==='object'&&!Array.isArray(v);
 if(!obj(s)||!Array.isArray(s.eggs)||s.eggs.length>128||!obj(s.nests)||!obj(s.children)||!obj(s.cool)||
    !Number.isSafeInteger(s.serial)||s.serial<0||Object.keys(s.children).length>18||
    Object.keys(s.cool).length>18||Object.keys(s.nests).length>120)return false;
 const beasts=new Map(w.beasts.map(b=>[b.id,b])),pairs=(a:unknown)=>Array.isArray(a)&&a.length===2&&a[0]!==a[1]&&a.every(v=>typeof v==='string'&&beasts.has(v));
 const variant=(v:unknown)=>v===null||v==='aurora'||v==='ember';
 const egg=(e:Egg)=>obj(e)&&typeof e.id==='string'&&/^clutch_\d+$/.test(e.id)&&Number(e.id.slice(7))<=s.serial&&defs.has(e.species)&&
   pairs(e.parents)&&e.parents.every(id=>beasts.get(id)?.defId===e.species)&&variant(e.variant)&&obj(e.profile)&&
   Number.isSafeInteger(e.profile.stars)&&e.profile.stars>=1&&e.profile.stars<=5&&Array.isArray(e.profile.traits)&&
   e.profile.traits.length>=1&&e.profile.traits.length<=2&&e.profile.traits.every(k=>Object.hasOwn(traitList,k as TraitId));
 if(!s.eggs.every(egg)||!Object.entries(s.nests).every(([id,n])=>w.ark.buildings.some(b=>b.id===id&&b.defId==='incubator')&&obj(n)&&egg(n.egg)&&
     Number.isSafeInteger(n.progress)&&n.progress>=0&&n.progress<=INCUBATION))return false;
 const keys=[...s.eggs.map(e=>e.id),...Object.values(s.nests).map(n=>n.egg.id)];
 return new Set(keys).size===keys.length&&Object.entries(s.cool).every(([id,t])=>beasts.has(id)&&Number.isSafeInteger(t)&&t>=0&&t<=w.tick+BROOD_REST)&&
  Object.entries(s.children).every(([id,v])=>beasts.has(id)&&obj(v)&&pairs(v.parents)&&variant(v.variant)&&Number.isSafeInteger(v.born)&&v.born>=0&&v.born<=w.tick);
}
