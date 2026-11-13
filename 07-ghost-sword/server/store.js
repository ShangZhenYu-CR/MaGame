import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {items,materials} from '../data/catalog.js';
import {uid,createAccount as newAccount,credit,deliver,bagSlots,removeGear,inventoryAction} from '../shared/inventory.js';
export {uid,gear,bagSlots,receive,credit,deliver,publicAccount} from '../shared/inventory.js';
mkdirSync(new URL('../runtime/',import.meta.url),{recursive:true});
export const db=new DatabaseSync(new URL('../runtime/ghostsword.sqlite',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'));
db.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY,token TEXT UNIQUE,data TEXT); CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,data TEXT); CREATE TABLE IF NOT EXISTS requests(account TEXT,id TEXT,params TEXT,result TEXT,PRIMARY KEY(account,id)); CREATE TABLE IF NOT EXISTS runs(account TEXT PRIMARY KEY,data TEXT); CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT);');
db.exec("UPDATE accounts SET data=json_insert(data,'$.warehouse',json('[]')) WHERE json_type(data,'$.warehouse') IS NULL");
db.exec('CREATE TABLE IF NOT EXISTS run_results(id TEXT PRIMARY KEY,account TEXT,data TEXT)');
export function createAccount(name){const a=newAccount(name);db.prepare('INSERT INTO accounts VALUES(?,?,?)').run(a.id,a.token,JSON.stringify(a));return a;}
export const account=id=>JSON.parse(db.prepare('SELECT data FROM accounts WHERE id=?').get(id).data);
export function login(token){const row=db.prepare('SELECT data FROM accounts WHERE token=?').get(token);return row?JSON.parse(row.data):null;}
export const saveAccount=a=>db.prepare('UPDATE accounts SET data=? WHERE id=?').run(JSON.stringify(a),a.id);
export const allOrders=()=>db.prepare('SELECT data FROM orders').all().map(r=>JSON.parse(r.data));
export const saveOrder=o=>db.prepare('INSERT OR REPLACE INTO orders VALUES(?,?)').run(o.id,JSON.stringify(o));
export const active=o=>(o.status==='active'||o.status==='partial')&&o.expires>Date.now();
function trade(seller,buyer,o,n,total){const q=seller.tax+total*2,tax=Math.floor(q/100);seller.tax=q%100;seller.pendingGold+=total-tax;deliver(buyer,o.gear?{gear:o.gear}:{type:o.type,n});const record={id:uid(),order:o.id,time:Date.now(),item:o.gear?items[o.gear.type].name:materials[o.type],type:o.type,gear:o.gear,n,total,tax,buyer:buyer.name,seller:seller.name};seller.history.push(record);buyer.history.push(record);o.trades.push(record);o.n-=n;o.status=o.n?'partial':'sold';return record;}
export function expireOrders(){for(const o of allOrders()){if(o.status!=='active'&&o.status!=='partial')continue;if(o.expires>Date.now())continue;const a=account(o.seller);if(o.mode==='bid'&&o.bid){const b=account(o.bid.account);trade(a,b,o,1,o.bid.amount);saveAccount(b);}else{deliver(a,o.gear?{gear:o.gear}:{type:o.type,n:o.n});o.status=o.mode==='bid'?'unsold':'expired';}saveAccount(a);saveOrder(o);}}
export function economy(a,cmd,d){const inventory=inventoryAction(a,cmd,d);if(inventory){if(!inventory.error)saveAccount(a);return inventory;}let response={ok:true};
 if(cmd==='list'){
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
 else return {error:'未知经济操作'};
 saveAccount(a);return response;
}
export function request(a,id,cmd,data){if(typeof id!=='string'||id.length>100)return {error:'请求号无效'};const params=JSON.stringify({cmd,data}),old=db.prepare('SELECT params,result FROM requests WHERE account=? AND id=?').get(a.id,id);if(old)return old.params===params?JSON.parse(old.result):{error:'相同请求号不能改变参数'};const result=economy(a,cmd,data);db.prepare('INSERT INTO requests VALUES(?,?,?,?)').run(a.id,id,params,JSON.stringify(result));return result;}
