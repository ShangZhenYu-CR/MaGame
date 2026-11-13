import {items,recipes,enchants,slots,panel} from '../data/catalog.js';
export const uid=()=>crypto.randomUUID();
export const gear=type=>({id:uid(),type,upgrade:0,enchant:null});
export const bagSlots=a=>a.inventory.length+['potion','boundPotion','cleanse'].reduce((n,k)=>n+Math.ceil((a.materials[k]||0)/9999),0);
export function receive(a,type,n){if(n===0)return;if(['potion','boundPotion','cleanse'].includes(type)&&bagSlots(a)-Math.ceil((a.materials[type]||0)/9999)+Math.ceil(((a.materials[type]||0)+n)/9999)>120)deliver(a,{type,n});else a.materials[type]=(a.materials[type]||0)+n;}
export function createAccount(name){const inventory=slots.map((_,i)=>gear('training'+i));const a={id:uid(),name,token:uid()+uid(),gold:0,pendingGold:0,tax:0,xp:0,pity:0,first:false,challenge:false,title:false,inventory,warehouse:[],equipped:inventory.map(x=>x.id),materials:{},pending:[],branches:{},presets:[null,null,null],history:[],settings:{},locked:[],active:false};return a;}
export function credit(a,n){const add=Math.min(1e12-a.gold,n);a.gold+=add;a.pendingGold+=n-add;}
export function deliver(a,goods){a.pending.push({id:uid(),...goods});}
export function publicAccount(a){const {token,...data}=a;return {...data,panel:panel(a)};}
export function removeGear(a,id){a.inventory=a.inventory.filter(x=>x.id!==id);for(const pre of a.presets)if(pre&&pre.equipped.includes(id)){pre.equipped=pre.equipped.map(x=>x===id?null:x);pre.missing=true;}}
const costOK=(a,cost)=>Object.entries(cost).every(([k,n])=>(k==='gold'?a.gold:(a.materials[k]||0))>=n);
function pay(a,cost){for(const [k,n]of Object.entries(cost))if(k==='gold')a.gold-=n;else a.materials[k]-=n;}
export function inventoryAction(a,cmd,d){
 if(cmd==='settings'){for(const k of ['healCount','cleanseCount'])if(d[k]!==undefined&&(!Number.isInteger(d[k])||d[k]<0||d[k]>3))return {error:'药包数量必须为0至3'};if(d.quickSlots!==undefined&&(!Array.isArray(d.quickSlots)||d.quickSlots.length!==4||d.quickSlots.some(x=>!['','potion','cleanse'].includes(x))))return {error:'快捷栏品种无效'};a.settings=d;return {ok:true};}
 if(cmd==='reorder'){const from=a.inventory.findIndex(x=>x.id===d.id),to=a.inventory.findIndex(x=>x.id===d.before);if(from<0||to<0)return {error:'装备不在背包'};const item=a.inventory.splice(from,1)[0];a.inventory.splice(to,0,item);return {ok:true};}
 if(cmd==='deposit'||cmd==='withdraw'){if(a.locked.includes(d.id))return {error:'该装备被当前副本锁定'};const from=cmd==='deposit'?a.inventory:a.warehouse,to=cmd==='deposit'?a.warehouse:a.inventory,limit=cmd==='deposit'?240:120;const i=from.findIndex(x=>x.id===d.id);if(i<0||a.equipped.includes(d.id))return {error:'装备不存在或仍在穿戴'};if((cmd==='withdraw'?bagSlots(a):to.length)>=limit)return {error:'目标空间已满'};to.push(from.splice(i,1)[0]);return {ok:true};}
 if(cmd==='craft'){if(a.active)return {error:'请先结束副本并回城'};const recipe=recipes[d.recipe];if(!recipe)return {error:'配方不存在'};if(!costOK(a,recipe.cost))return {error:'金币或材料不足'};pay(a,recipe.cost);if(recipe.gear){const g=gear(recipe.gear);if(bagSlots(a)<120)a.inventory.push(g);else deliver(a,{gear:g});}else receive(a,recipe.material,1);}
 else if(cmd==='npcPotion'){if(a.active||a.gold<30)return {error:'需要回城且持有30金币'};a.gold-=30;receive(a,'boundPotion',1);}
 else if(cmd==='training'){if(a.active)return {error:'请回城'};const type='training'+Number(d.slot);if(!items[type])return {error:'无此部位'};if([...a.inventory,...a.warehouse].some(g=>g.type===type))return {error:'已经拥有该训练部位'};if(bagSlots(a)>=120)return {error:'背包已满'};a.inventory.push(gear(type));}
 else if(cmd==='equip'){if(a.active)return {error:'入场装备锁定'};const g=a.inventory.find(g=>g.id===d.id);if(!g)return {error:'装备不存在'};if(panel(a).level<(items[g.type].level||1))return {error:'等级不足'};a.equipped[items[g.type].slot]=g.id;}
 else if(cmd==='unequip'){if(a.active)return {error:'入场装备锁定'};if(!Number.isInteger(d.slot)||d.slot<0||d.slot>11)return {error:'部位无效'};a.equipped[d.slot]=null;}
 else if(cmd==='upgrade'||cmd==='enchant'||cmd==='sell'||cmd==='dismantle'){
  if(a.locked.includes(d.id))return {error:'该装备被当前副本锁定'};const g=a.inventory.find(x=>x.id===d.id);if(!g)return {error:'装备不存在'};const def=items[g.type];
  if(def.bound)return {error:'训练装不可强化、附魔、出售或分解'};
  if(cmd==='upgrade'){if(def.slot>5||g.upgrade>=5||(!def.atk&&!def.def))return {error:'不可强化'};const c={gold:50*(g.upgrade+1),iron:2*(g.upgrade+1)};if(!costOK(a,c))return {error:'强化材料不足'};pay(a,c);g.upgrade++;}
  if(cmd==='enchant'){const e=enchants[d.enchant];if(!e||!e.slots.includes(def.slot))return {error:'附魔部位不符'};if(!costOK(a,e.cost))return {error:'附魔材料不足'};pay(a,e.cost);g.enchant=d.enchant;}
  if(cmd==='sell'||cmd==='dismantle'){if(a.equipped.includes(g.id))return {error:'先卸下装备'};removeGear(a,g.id);if(cmd==='sell')credit(a,10);else a.materials.rough=(a.materials.rough||0)+Math.floor((def.cost.rough||0)/2);}
 }
 else if(cmd==='branch'){if(a.active)return {error:'仅城镇可切换分支'};const levels={up:2,slam:2,zone:2,tri:4,wave:4,ult:4};if(!levels[d.skill]||panel(a).level<levels[d.skill])return {error:'分支尚未解锁'};a.branches[d.skill]=!!d.enabled;}
 else if(cmd==='savePreset'){if(a.active||![0,1,2].includes(d.index))return {error:'仅城镇保存三个预设'};a.presets[d.index]={equipped:[...a.equipped],branches:{...a.branches},quickSlots:a.settings.quickSlots||['potion','cleanse','',''],missing:false};}
 else if(cmd==='loadPreset'){if(a.active)return {error:'仅城镇切换预设'};const pre=a.presets[d.index];if(!pre||pre.missing||pre.equipped.some(id=>id&&![...a.inventory,...a.warehouse].some(g=>g.id===id)))return {error:'预设缺件，整套未应用'};const moved=a.warehouse.filter(g=>pre.equipped.includes(g.id));if(bagSlots(a)+moved.length>120)return {error:'背包空间不足，整套未应用'};a.inventory.push(...moved);a.warehouse=a.warehouse.filter(g=>!pre.equipped.includes(g.id));a.equipped=[...pre.equipped];a.branches={...pre.branches};a.settings.quickSlots=pre.quickSlots;}
 else if(cmd==='claimGold'){const n=Math.min(a.pendingGold,1e12-a.gold);a.pendingGold-=n;a.gold+=n;}
 else if(cmd==='claim'){
  const x=a.pending.find(x=>x.id===d.id);if(!x)return {error:'已领取或不存在'};if(x.gear&&bagSlots(a)>=120)return {error:'背包已满'};if(!x.gear&&['potion','boundPotion','cleanse'].includes(x.type)&&bagSlots(a)-Math.ceil((a.materials[x.type]||0)/9999)+Math.ceil(((a.materials[x.type]||0)+x.n)/9999)>120)return {error:'药剂背包格不足'};if(x.gear)a.inventory.push(x.gear);else a.materials[x.type]=(a.materials[x.type]||0)+x.n;a.pending=a.pending.filter(v=>v.id!==x.id);
 }
 else return null;
 return {ok:true};
}
