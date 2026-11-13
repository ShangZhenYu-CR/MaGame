import {parentPort} from 'node:worker_threads';
import {db,createAccount,login,account,saveAccount,publicAccount,allOrders,expireOrders,request} from './store.js';
import {newRun,input,tick,retry,finish,view,training} from './combat.js';
import {items} from '../data/catalog.js';
const sessions=new Map(),runs=new Map(),connections=new Map();
let saving=false,saveStart=0,outbox=[];
function begin(){saving=true;saveStart=performance.now();parentPort.postMessage({type:'saving',active:true});db.exec('BEGIN IMMEDIATE');}
function commit(){db.exec('COMMIT');nextFrame+=performance.now()-saveStart;saving=false;parentPort.postMessage({type:'saved',messages:outbox});outbox=[];}

const lastHeartbeat=Number(db.prepare("SELECT value FROM meta WHERE key='heartbeat'").get()?.value||Date.now());
for(const row of db.prepare('SELECT * FROM runs').all()){const g=JSON.parse(row.data);g.paused=true;g.pauseReason='恢复存档，请继续';g.disconnectDeadline=Math.min(g.disconnectDeadline||Infinity,lastHeartbeat+600000);g.keys={};g.input=[];runs.set(row.account,g);}
const send=(ws,data)=>{const packet={type:'send',connection:ws.id,data};if(saving)outbox.push(packet);else parentPort.postMessage(packet);};
const persist=(id,g)=>db.prepare('INSERT OR REPLACE INTO runs VALUES(?,?)').run(id,JSON.stringify(g));
function refresh(ws){send(ws,{type:'account',account:publicAccount(account(ws.account)),orders:allOrders()});}
function message(ws,m){
  if(m.cmd==='login'||m.cmd==='create'){
   if(ws.account)return;begin();const a=m.cmd==='create'&&typeof m.name==='string'&&m.name.trim().length>0&&m.name.length<=20?createAccount(m.name.trim()):m.cmd==='login'?login(m.token):null;
   if(!a){send(ws,{type:'result',error:'角色名或角色钥匙无效'});commit();return;}const old=sessions.get(a.id);if(old)send(old,{type:'control',active:false});ws.account=a.id;sessions.set(a.id,ws);send(ws,{type:'auth',token:a.token,created:m.cmd==='create'});const g=runs.get(a.id);if(g){if(g.disconnectDeadline&&Date.now()>=g.disconnectDeadline){if(!g.terminal)g.terminal='failed';finish(g,a);saveAccount(a);runs.delete(a.id);db.prepare('DELETE FROM runs WHERE account=?').run(a.id);}else{g.disconnectDeadline=null;g.paused=true;g.pauseReason='已接管存档，请继续';g.keys={};g.input=[];g.buffer=null;persist(a.id,g);}}refresh(ws);send(ws,runs.has(a.id)?{type:'game',game:view(runs.get(a.id))}:{type:'leave'});commit();return;
  }
  if(!ws.account)return;const id=ws.account,g=runs.get(id);if(sessions.get(id)!==ws&&['input','enter','exit','retry','pause','resume','step','train','resetTraining'].includes(m.cmd)){if(m.cmd!=='input')send(ws,{type:'result',error:'此窗口只管理城镇与市场；刷新页面可接管战斗'});return;}
  if(m.cmd==='heartbeat'){send(ws,{type:'heartbeat'});return;}
  if(m.cmd==='input'){if(g&&(!g.paused||g.mode==='training')&&typeof m.key==='string'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyX','KeyZ','KeyA','KeyS','KeyD','KeyF','KeyG','KeyQ','KeyV','KeyC','Space','Digit1','Digit2','Digit3','Digit4'].includes(m.key))input(g,m.key,!!m.down);return;}
  if(m.cmd==='refresh'){refresh(ws);return;}
  begin();expireOrders();const a=account(id);let result={ok:true};
  if(m.cmd==='enter'){
   if(g)result={error:'请先结束当前副本'};else if(!a.inventory.some(x=>x.id===a.equipped[0]&&items[x.type].slot===0))result={error:'请先装备大剑，可在城镇免费补领训练剑'};else if(!['normal','challenge','training'].includes(m.mode)||m.mode==='challenge'&&!a.challenge)result={error:'副本未解锁'};else{const n=newRun(a,m.mode);runs.set(id,n);saveAccount(a);persist(id,n);}
  }else if(m.cmd==='exit'){
   if(g){finish(g,a);saveAccount(a);runs.delete(id);db.prepare('DELETE FROM runs WHERE account=?').run(id);send(ws,{type:'leave'});}
  }else if(m.cmd==='retry'){if(g){result=retry(g,a);if(g.terminal&&!g.settled){finish(g,a);saveAccount(a);}persist(id,g);}}
  else if(m.cmd==='pause'||m.cmd==='resume'){if(g&&!g.dead&&!g.terminal){g.paused=m.cmd==='pause';g.pauseReason=g.paused?'已暂停':'';if(m.reason==='blur')g.buffer=null;if(!g.paused)g.disconnectDeadline=null;g.keys={};g.input=[];persist(id,g);}}
  else if(m.cmd==='step'){if(g?.mode==='training'){g.paused=false;tick(g,a);g.paused=true;g.pauseReason='逐帧暂停';persist(id,g);}}
  else if(m.cmd==='train'){if(g)result=training(g,m.data);}
  else if(m.cmd==='resetTraining'){if(g?.mode==='training'){const n=newRun(a,'training');runs.set(id,n);persist(id,n);}}
  else result=request(a,m.id,m.cmd,m.data||{});
  send(ws,{type:'result',id:m.id,...result});refresh(ws);commit();
}
function disconnected(ws){if(sessions.get(ws.account)!==ws)return;sessions.delete(ws.account);const g=runs.get(ws.account);if(g){begin();g.paused=true;g.pauseReason='连接断开，战斗已暂停';g.disconnectDeadline=Date.now()+600000;g.keys={};g.input=[];g.buffer=null;persist(ws.account,g);commit();}}
parentPort.on('message',m=>{
 if(m.type==='connect'){connections.set(m.id,{id:m.id,lastSeen:performance.now()});return;}
 const ws=connections.get(m.id);
 if(m.type==='close'){disconnected(ws);connections.delete(m.id);return;}
 if(m.type==='timeout'){const g=runs.get(ws.account);if(g&&sessions.get(ws.account)===ws&&!g.disconnectDeadline){begin();g.paused=true;g.pauseReason='连接超时';g.disconnectDeadline=Date.now()+600000;g.keys={};g.input=[];g.buffer=null;persist(ws.account,g);commit();}return;}
 if(m.type==='heartbeat'){ws.lastSeen=performance.now();return;}
 if(m.type==='savedInput'){const g=runs.get(ws.account);if(g&&sessions.get(ws.account)===ws&&!g.paused&&!g.terminal){for(const [key,down]of m.held)g.keys[key]=down;g.input=[];if(m.active)g.input.push(m.active.key);}return;}
 if(m.type==='message'){ws.lastSeen=performance.now();message(ws,m.data);}
});
let frame=0,nextFrame=performance.now();
setInterval(()=>{const now=performance.now();if(now<nextFrame)return;if(now-nextFrame>250){for(const g of runs.values())if(!g.paused){g.paused=true;g.pauseReason='性能不足，模拟已暂停，请确认后继续';g.keys={};g.input=[];}nextFrame=now;}nextFrame+=1000/60;frame++;for(const [id,g]of runs){const ws=sessions.get(id);if(g.disconnectDeadline&&Date.now()>=g.disconnectDeadline){begin();const a=account(id);if(!g.terminal)g.terminal='failed';finish(g,a);saveAccount(a);db.prepare('DELETE FROM runs WHERE account=?').run(id);runs.delete(id);commit();if(ws){send(ws,{type:'leave'});refresh(ws);}continue;}if(!ws)continue;const a=account(id);tick(g,a);if(g.dirty||frame%60===0){begin();if(g.terminal&&!g.settled)finish(g,a);saveAccount(a);persist(id,g);g.dirty=false;commit();}if(frame%3===0)send(ws,{type:'game',game:view(g)});if(frame%120===0)refresh(ws);}if(frame%60===0){begin();expireOrders();db.prepare("INSERT OR REPLACE INTO meta VALUES('heartbeat',?)").run(String(Date.now()));commit();}},1);

parentPort.postMessage({type:'ready'});
