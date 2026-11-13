import {createAccount,inventoryAction,publicAccount} from '../shared/inventory.js';
import {newRun,input,tick,retry,finish,view,training} from '../shared/combat.js';
import {items} from '../data/catalog.js';
let db,records,a=null,g=null,busy=false,ready=false,nextFrame=performance.now();
const commands=[],held=new Map();let activeInput=null;
const post=data=>self.postMessage(data);
self.addEventListener('unhandledrejection',e=>{post({type:'storage',state:'failed',error:e.reason.message});self.close();});
async function save(){
 const start=performance.now();post({type:'storage',state:'saving'});
 await new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').put(records,'slot');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});
 nextFrame+=performance.now()-start;post({type:'storage',state:'ready'});
}
function publish(){post({type:'account',account:publicAccount(a),orders:[]});post(g?{type:'game',game:view(g)}:{type:'leave'});}
function clearInput(){g.keys={};g.input=[];g.buffer=null;held.clear();activeInput=null;}
function settle(){if(g.terminal&&!g.settled)finish(g,a);g.dirty=false;}
async function message(m){
 if(m.cmd==='create'||m.cmd==='login'){
  if(a)return;
  if(m.cmd==='create'){
   if(typeof m.name!=='string'||!m.name.trim()||m.name.length>20){post({type:'result',error:'角色名需要1至20个字'});return;}
   a=createAccount(m.name.trim());records.accounts[a.id]=a;
  }else a=records.accounts[m.token];
  if(!a){a=null;post({type:'result',error:'该浏览器中没有此角色，请选择本地角色或新建'});return;}
  g=records.runs[a.id]||null;if(g){g.paused=true;g.pauseReason='浏览器存档已恢复，请继续';clearInput();}
  await save();post({type:'auth',token:a.id,created:m.cmd==='create'});publish();nextFrame=performance.now();return;
 }
 if(!a)return;let result={ok:true};
 if(m.cmd==='refresh'){publish();return;}
 if(m.cmd==='enter'){
  if(g)result={error:'请先结束当前副本'};
  else if(!a.inventory.some(x=>x.id===a.equipped[0]&&items[x.type].slot===0))result={error:'请先装备大剑，可在城镇免费补领训练剑'};
  else if(!['normal','challenge','training'].includes(m.mode)||m.mode==='challenge'&&!a.challenge)result={error:'副本未解锁'};
  else{g=newRun(a,m.mode);records.runs[a.id]=g;}
 }else if(m.cmd==='exit'){if(g){finish(g,a);delete records.runs[a.id];g=null;}}
 else if(m.cmd==='retry'){if(g)result=retry(g,a);}
 else if(m.cmd==='pause'||m.cmd==='resume'){if(g&&!g.dead&&!g.terminal){g.paused=m.cmd==='pause';g.pauseReason=g.paused?'已暂停':'';clearInput();nextFrame=performance.now();}}
 else if(m.cmd==='step'){if(g?.mode==='training'){g.paused=false;tick(g,a);g.paused=true;g.pauseReason='逐帧暂停';}}
 else if(m.cmd==='train'){if(g)result=training(g,m.data);}
 else if(m.cmd==='resetTraining'){if(g?.mode==='training'){g=newRun(a,'training');records.runs[a.id]=g;}}
 else{
  if(typeof m.id!=='string'||m.id.length>100)result={error:'请求号无效'};
  else{
   const key=a.id+':'+m.id,params=JSON.stringify({cmd:m.cmd,data:m.data||{}}),old=records.requests[key];
   if(old)result=old.params===params?old.result:{error:'相同请求号不能改变参数'};
   else{result=inventoryAction(a,m.cmd,m.data||{});if(!result)result={error:'网页试玩版不开放跨玩家交易；完整市场保留在开发版'};records.requests[key]={params,result};}
  }
 }
 if(g)settle();await save();post({type:'result',id:m.id,...result});publish();
}
self.onmessage=({data:m})=>{
 if(m.cmd==='input'){
  if(!g||g.terminal||g.paused&&g.mode!=='training')return;
  if(busy){held.set(m.key,!!m.down);if(m.down&&!m.key.startsWith('Arrow'))activeInput=m.key;}
  else input(g,m.key,!!m.down);
 }else commands.push(m);
};
async function frame(){
 if(!ready||busy)return;busy=true;
 if(commands.length){await message(commands.shift());busy=false;return;}
 const now=performance.now();if(now<nextFrame){busy=false;return;}
 if(now-nextFrame>250){if(g&&!g.paused){g.paused=true;g.pauseReason='性能不足，模拟已暂停，请确认后继续';clearInput();g.dirty=true;}nextFrame=now;}
 nextFrame+=1000/60;
 if(g){
  if(held.size){for(const [key,down]of held)g.keys[key]=down;g.input=[];if(activeInput)g.input.push(activeInput);held.clear();activeInput=null;}
  if(!g.paused&&!g.terminal){tick(g,a);if(g.dirty||g.frame%60===0){settle();await save();publish();}else if(g.frame%3===0)post({type:'game',game:view(g)});}
  else if(g.dirty){settle();await save();publish();}
 }
 busy=false;
}
navigator.locks.request('ghostsword-pages-v1',{ifAvailable:true},async lock=>{
 if(!lock){post({type:'storage',state:'failed',error:'另一标签页正在使用试玩存档。请关闭另一游戏页，再点击恢复。'});self.close();return;}
 db=await new Promise((resolve,reject)=>{const req=indexedDB.open('ghostsword-pages-v1',1);req.onupgradeneeded=()=>req.result.createObjectStore('state');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
 records=await new Promise((resolve,reject)=>{const req=db.transaction('state').objectStore('state').get('slot');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
 if(records===undefined)records={accounts:{},runs:{},requests:{}};
 ready=true;nextFrame=performance.now();post({type:'profiles',profiles:Object.values(records.accounts).map(x=>({id:x.id,name:x.name}))});post({type:'connection',state:'ready'});setInterval(frame,1);
 await new Promise(()=>{});
});
