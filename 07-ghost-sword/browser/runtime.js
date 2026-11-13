export const isBrowser=true,storageKey='ghostsword-pages-v1',coverageURL='./client/coverage.html';
let worker,receive,saveTimer;
function launch(){
 worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
 worker.onmessage=({data})=>{
  if(data.type==='storage'){
   clearTimeout(saveTimer);
   if(data.state==='saving'){saveTimer=setTimeout(()=>receive(data),100);return;}
  }
  receive(data);
 };
 worker.onerror=e=>{worker.terminate();clearTimeout(saveTimer);receive({type:'storage',state:'failed',error:e.message});};
}
export function connect(listener){receive=listener;launch();}
export function send(data){
 if(data.cmd==='heartbeat'){receive({type:'heartbeat'});return;}
 if(data.cmd==='recoverStorage'){worker.terminate();launch();return;}
 worker.postMessage(data);
}
