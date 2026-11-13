import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {items,recipes,enchants,slots,materials,panel} from '../data/catalog.js';
mkdirSync(new URL('../runtime/',import.meta.url),{recursive:true});
export const db=new DatabaseSync(new URL('../runtime/ghostsword.sqlite',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'));
db.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY,token TEXT UNIQUE,data TEXT); CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,data TEXT); CREATE TABLE IF NOT EXISTS requests(account TEXT,id TEXT,params TEXT,result TEXT,PRIMARY KEY(account,id)); CREATE TABLE IF NOT EXISTS runs(account TEXT PRIMARY KEY,data TEXT); CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT);');
db.exec("UPDATE accounts SET data=json_insert(data,'$.warehouse',json('[]')) WHERE json_type(data,'$.warehouse') IS NULL");
db.exec('CREATE TABLE IF NOT EXISTS run_results(id TEXT PRIMARY KEY,account TEXT,data TEXT)');
export const uid=()=>randomUUID();
export const gear=type=>({id:uid(),type,upgrade:0,enchant:null});
export const bagSlots=a=>a.inventory.length+['potion','boundPotion','cleanse'].reduce((n,k)=>n+Math.ceil((a.materials[k]||0)/9999),0);
export function receive(a,type,n){if(n===0)return;if(['potion','boundPotion','cleanse'].includes(type)&&bagSlots(a)-Math.ceil((a.materials[type]||0)/9999)+Math.ceil(((a.materials[type]||0)+n)/9999)>120)deliver(a,{type,n});else a.materials[type]=(a.materials[type]||0)+n;}
export function createAccount(name){const inventory=slots.map((_,i)=>gear('training'+i));const a={id:uid(),name,token:uid()+uid(),gold:0,pendingGold:0,tax:0,xp:0,pity:0,first:false,challenge:false,title:false,inventory,warehouse:[],equipped:inventory.map(x=>x.id),materials:{},pending:[],branches:{},presets:[null,null,null],history:[],settings:{},locked:[],active:false};db.prepare('INSERT INTO accounts VALUES(?,?,?)').run(a.id,a.token,JSON.stringify(a));return a;}
export const account=id=>JSON.parse(db.prepare('SELECT data FROM accounts WHERE id=?').get(id).data);
export function login(token){const row=db.prepare('SELECT data FROM accounts WHERE token=?').get(token);return row?JSON.parse(row.data):null;}
export const saveAccount=a=>db.prepare('UPDATE accounts SET data=? WHERE id=?').run(JSON.stringify(a),a.id);
export const allOrders=()=>db.prepare('SELECT data FROM orders').all().map(r=>JSON.parse(r.data));
export const saveOrder=o=>db.prepare('INSERT OR REPLACE INTO orders VALUES(?,?)').run(o.id,JSON.stringify(o));
export function credit(a,n){const add=Math.min(1e12-a.gold,n);a.gold+=add;a.pendingGold+=n-add;}
export const active=o=>(o.status==='active'||o.status==='partial')&&o.expires>Date.now();
export function deliver(a,goods){a.pending.push({id:uid(),...goods});}
export function publicAccount(a){const {token,...data}=a;return {...data,panel:panel(a)};}
function removeGear(a,id){a.inventory=a.inventory.filter(x=>x.id!==id);for(const pre of a.presets)if(pre&&pre.equipped.includes(id)){pre.equipped=pre.equipped.map(x=>x===id?null:x);pre.missing=true;}}
const costOK=(a,cost)=>Object.entries(cost).every(([k,n])=>(k==='gold'?a.gold:(a.materials[k]||0))>=n);
function pay(a,cost){for(const [k,n]of Object.entries(cost))if(k==='gold')a.gold-=n;else a.materials[k]-=n;}
function trade(seller,buyer,o,n,total){const q=seller.tax+total*2,tax=Math.floor(q/100);seller.tax=q%100;seller.pendingGold+=total-tax;deliver(buyer,o.gear?{gear:o.gear}:{type:o.type,n});const record={id:uid(),order:o.id,time:Date.now(),item:o.gear?items[o.gear.type].name:materials[o.type],type:o.type,gear:o.gear,n,total,tax,buyer:buyer.name,seller:seller.name};seller.history.push(record);buyer.history.push(record);o.trades.push(record);o.n-=n;o.status=o.n?'partial':'sold';return record;}
export function expireOrders(){for(const o of allOrders()){if(o.status!=='active'&&o.status!=='partial')continue;if(o.expires>Date.now())continue;const a=account(o.seller);if(o.mode==='bid'&&o.bid){const b=account(o.bid.account);trade(a,b,o,1,o.bid.amount);saveAccount(b);}else{deliver(a,o.gear?{gear:o.gear}:{type:o.type,n:o.n});o.status=o.mode==='bid'?'unsold':'expired';}saveAccount(a);saveOrder(o);}}
export function economy(a,cmd,d){let response={ok:true};
 if(cmd==='settings'){for(const k of ['healCount','cleanseCount'])if(d[k]!==undefined&&(!Number.isInteger(d[k])||d[k]<0||d[k]>3))return {error:'药包数量必须为0至3'};if(d.quickSlots!==undefined&&(!Array.isArray(d.quickSlots)||d.quickSlots.length!==4||d.quickSlots.some(x=>!['','potion','cleanse'].includes(x))))return {error:'快捷栏品种无效'};a.settings=d;saveAccount(a);return {ok:true};}
 if(cmd==='reorder'){const from=a.inventory.findIndex(x=>x.id===d.id),to=a.inventory.findIndex(x=>x.id===d.before);if(from<0||to<0)return {error:'装备不在背包'};const item=a.inventory.splice(from,1)[0];a.inventory.splice(to,0,item);saveAccount(a);return {ok:true};}
 if(cmd==='deposit'||cmd==='withdraw'){if(a.locked.includes(d.id))return {error:'该装备被当前副本锁定'};const from=cmd==='deposit'?a.inventory:a.warehouse,to=cmd==='deposit'?a.warehouse:a.inventory,limit=cmd==='deposit'?240:120;const i=from.findIndex(x=>x.id===d.id);if(i<0||a.equipped.includes(d.id))return {error:'装备不存在或仍在穿戴'};if((cmd==='withdraw'?bagSlots(a):to.length)>=limit)return {error:'目标空间已满'};to.push(from.splice(i,1)[0]);saveAccount(a);return {ok:true};}
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
 else if(cmd==='list'){
  const n=Number(d.n),price=Number(d.price),hours=Number(d.hours);if(!Number.isSafeInteger(n)||n<1||n>9999||!Number.isSafeInteger(price)||price<1||price*n>1e9||![24,48].includes(hours))return {error:'数量、价格或期限无效'};
  if(allOrders().filter(o=>o.seller===a.id&&active(o)).length>=20)return {error:'最多20个活跃订单'};
  let g=null;if(d.gear){g=a.inventory.find(g=>g.id===d.gear);if(!g||items[g.type].bound||a.equipped.includes(g.id)||a.locked.includes(g.id)||n!==1)return {error:'该装备不可上架'};}
  else if(!materials[d.type]||d.type==='boundPotion'||(a.materials[d.type]||0)<n)return {error:'可交易材料数量不足'};
  if(d.mode==='bid'&&!g)return {error:'竞拍仅装备'};if(!['fixed','bid'].includes(d.mode))return {error:'交易模式无效'};
  const o={id:uid(),seller:a.id,sellerName:a.name,type:g?g.type:d.type,gear:g,n,price,mode:d.mode,status:'active',created:Date.now(),expires:Date.now()+(d.mode==='bid'?24:hours)*3600000,bid:null,trades:[]};if(g)removeGear(a,g.id);else a.materials[d.type]-=n;saveOrder(o);response.order=o.id;
 }
 else if(cmd==='buy'){
  const o=allOrders().find(o=>o.id===d.id),n=Number(d.n);if(!o||!active(o)||o.mode!=='fixed'||o.seller===a.id)return {error:'订单不可购买'};if(!Number.isInteger(n)||n<1||n>o.n||d.price!==o.price)return {error:'余量或价格已变化'};const total=n*o.price;if(a.gold<total)return {error:'金币不足'};const seller=account(o.seller);a.gold-=total;response.trade=trade(seller,a,o,n,total).id;response.total=total;response.remaining=o.n;saveAccount(seller);saveOrder(o);
 }
 else if(cmd==='bulk'){
  const n=Number(d.n),price=Number(d.price),budget=Number(d.budget);if(!Number.isSafeInteger(n)||n<1||!Number.isSafeInteger(price)||price<1||!Number.isSafeInteger(budget)||budget<0)return {error:'数量、限价或预算无效'};
  const os=allOrders().filter(o=>active(o)&&o.mode==='fixed'&&!o.gear&&o.type===d.type&&o.seller!==a.id&&o.price<=price).sort((a,b)=>a.price-b.price||a.created-b.created||a.id.localeCompare(b.id));let left=n,total=0;const picks=[];for(const o of os.slice(0,20)){const take=Math.min(left,o.n);picks.push({o,take});total+=take*o.price;left-=take;if(!left)break;}if(!picks.length)return {ok:true,bought:0,remaining:n,total:0,trades:[]};if(left&&!d.partial)return {error:'不足目标数量，未购买'};if(total>budget||total>a.gold)return {error:'实际匹配超过预算或金币，整笔未成交'};a.gold-=total;const sellers={},trades=[];for(const {o,take}of picks){const s=sellers[o.seller]||(sellers[o.seller]=account(o.seller));trades.push(trade(s,a,o,take,take*o.price).id);saveOrder(o);}for(const s of Object.values(sellers))saveAccount(s);saveAccount(a);return {ok:true,bought:n-left,remaining:left,total,trades};
 }
 else if(cmd==='bid'){
  const o=allOrders().find(o=>o.id===d.id),amount=Number(d.amount);if(!o||!active(o)||o.mode!=='bid'||o.seller===a.id)return {error:'不可竞拍'};const minimum=o.bid?o.bid.amount+Math.max(1,Math.ceil(o.bid.amount*.05)):o.price;if(!Number.isSafeInteger(amount)||amount<minimum||amount>1e9)return {error:'最低出价 '+minimum+'，上限10亿'};const own=o.bid?.account===a.id,payable=amount-(own?o.bid.amount:0);if(a.gold<payable)return {error:'金币不足'};a.gold-=payable;if(o.bid&&!own){const prev=account(o.bid.account);credit(prev,o.bid.amount);saveAccount(prev);}o.bid={account:a.id,name:a.name,amount};saveOrder(o);
 }
 else if(cmd==='cancel'){
  const o=allOrders().find(o=>o.id===d.id);if(!o||o.seller!==a.id||!active(o)||o.bid)return {error:'不能撤销该订单'};deliver(a,o.gear?{gear:o.gear}:{type:o.type,n:o.n});o.status='cancelled';saveOrder(o);
 }
 else if(cmd==='claimGold'){const n=Math.min(a.pendingGold,1e12-a.gold);a.pendingGold-=n;a.gold+=n;}
 else if(cmd==='claim'){
  const x=a.pending.find(x=>x.id===d.id);if(!x)return {error:'已领取或不存在'};if(x.gear&&bagSlots(a)>=120)return {error:'背包已满'};if(!x.gear&&['potion','boundPotion','cleanse'].includes(x.type)&&bagSlots(a)-Math.ceil((a.materials[x.type]||0)/9999)+Math.ceil(((a.materials[x.type]||0)+x.n)/9999)>120)return {error:'药剂背包格不足'};if(x.gear)a.inventory.push(x.gear);else a.materials[x.type]=(a.materials[x.type]||0)+x.n;a.pending=a.pending.filter(v=>v.id!==x.id);
 }
 else return {error:'未知经济操作'};
 saveAccount(a);return response;
}
export function request(a,id,cmd,data){if(typeof id!=='string'||id.length>100)return {error:'请求号无效'};const params=JSON.stringify({cmd,data}),old=db.prepare('SELECT params,result FROM requests WHERE account=? AND id=?').get(a.id,id);if(old)return old.params===params?JSON.parse(old.result):{error:'相同请求号不能改变参数'};const result=economy(a,cmd,data);db.prepare('INSERT INTO requests VALUES(?,?,?,?)').run(a.id,id,params,JSON.stringify(result));return result;}
