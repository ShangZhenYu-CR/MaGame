import http from 'node:http';
import {readFileSync} from 'node:fs';
import {WebSocketServer,WebSocket} from 'ws';
import {Worker} from 'node:worker_threads';
const files={'/client/socket.js':['../client/socket.js','text/javascript'],'/coverage':['../client/coverage.html','text/html'],'/SPEC-1.2.md':['../SPEC-1.2.md','text/plain'],'/spec':['../SPEC-1.2.md','text/plain'],'/':['../client/index.html','text/html'],'/client/app.js':['../client/app.js','text/javascript'],'/client/style.css':['../client/style.css','text/css'],'/data/catalog.js':['../data/catalog.js','text/javascript']};
const server=http.createServer((req,res)=>{const file=files[req.url];if(!file){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':file[1]+'; charset=utf-8','Cache-Control':'no-store'});res.end(readFileSync(new URL(file[0],import.meta.url)));});
const wss=new WebSocketServer({server,maxPayload:16384});
// Network heartbeats stay on this thread while the simulation commits SQLite.
const clients=new Map();let serial=0,worker,busy=true,failed=false;
const send=(ws,data)=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(data));};
function launch(){
 busy=true;failed=false;worker=new Worker(new URL('./simulation.js',import.meta.url));
 worker.on('message',m=>{
  if(m.type==='ready'){busy=false;for(const [id,c]of clients){worker.postMessage({type:'connect',id});if(c.auth)worker.postMessage({type:'message',id,data:c.auth});send(c.ws,{type:'storage',state:'ready'});}return;}
  if(m.type==='saving'){busy=true;for(const c of clients.values())c.saveTimer=setTimeout(()=>send(c.ws,{type:'storage',state:'saving'}),100);return;}
  if(m.type==='saved'){busy=false;for(const p of m.messages)deliver(p);for(const [id,c]of clients){clearTimeout(c.saveTimer);send(c.ws,{type:'storage',state:'ready'});if(c.held.size||c.active){worker.postMessage({type:'savedInput',id,held:[...c.held],active:c.active});c.held.clear();c.active=null;}}return;}
  deliver(m);
 });
 worker.on('error',error=>{failed=true;busy=true;console.error('保存/模拟线程停止：',error);for(const c of clients.values()){clearTimeout(c.saveTimer);c.held.clear();c.active=null;send(c.ws,{type:'storage',state:'failed',error:error.message});}});
}
function deliver(m){const c=clients.get(m.connection);if(!c)return;if(m.type==='close'){c.ws.close(4001,'角色已在另一窗口登录');return;}if(m.type==='send'){if(m.data.type==='auth')c.auth={cmd:'login',token:m.data.token};send(c.ws,m.data);}}
wss.on('connection',ws=>{
 const id=++serial,c={ws,held:new Map(),active:null,auth:null,saveTimer:null,lastSeen:performance.now(),timedOut:false};clients.set(id,c);if(!failed)worker.postMessage({type:'connect',id});
 ws.on('message',raw=>{
  c.lastSeen=performance.now();c.timedOut=false;const m=JSON.parse(raw.toString());
  if(m.cmd==='heartbeat'){send(ws,{type:'heartbeat'});if(!failed)worker.postMessage({type:'heartbeat',id});return;}
  if(m.cmd==='recoverStorage'){if(failed)launch();return;}
  if(failed){if(m.cmd==='login')c.auth=m;send(ws,{type:'storage',state:'failed',error:'执行线程已停止，请从已提交存档恢复'});return;}
  if(m.cmd==='input'&&busy){if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyV','KeyX'].includes(m.key))c.held.set(m.key,!!m.down);if(m.down&&!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(m.key))c.active=m;return;}
  if(m.cmd==='login')c.auth=m;
  worker.postMessage({type:'message',id,data:m});
 });
 ws.on('close',()=>{clearTimeout(c.saveTimer);clients.delete(id);if(!failed)worker.postMessage({type:'close',id});});
});
setInterval(()=>{for(const [id,c]of clients)if(!failed&&!c.timedOut&&performance.now()-c.lastSeen>2000){c.timedOut=true;worker.postMessage({type:'timeout',id});}},250);
launch();
server.listen(8765,'127.0.0.1',()=>console.log('马楠 · 鬼剑传 http://127.0.0.1:8765'));
