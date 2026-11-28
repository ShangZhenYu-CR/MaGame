import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser } from 'playwright';
import { serializeWorld } from '../src/sim/save';
import { giantFixture } from './p2-giant-fixture';
import { exportWorld } from './p2-hook-e2e';

export async function runP2Giant(browser:Browser,entry:string,dir:string,errors:string[],seconds=120,enforce=true){
 const url=new URL(entry);url.searchParams.set('perf','1');
 const p=await browser.newPage({viewport:{width:1920,height:1080}}),canvas=p.locator('#game-canvas');
 p.on('pageerror',e=>errors.push('P2-41 giant page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('P2-41 giant console: '+m.text());});
 p.on('response',r=>{if(r.status()===404)errors.push('P2-41 giant 404: '+r.url());});
 try{
  await p.goto(url.href,{waitUntil:'networkidle'});await canvas.and(p.locator('[data-art-ready=true]')).waitFor();
  const w=giantFixture(),raw=serializeWorld(w);assert.ok(Buffer.byteLength(raw)<300000);
  await p.locator('#save-file').setInputFiles({name:'giant-ship.json',mimeType:'application/json',buffer:Buffer.from(raw)});
  await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor({state:'attached'});
  await p.mouse.move(1100,478);await p.mouse.wheel(0,1180);
  for(let i=0;i<7;i++)await p.mouse.wheel(0,120);
  await canvas.and(p.locator('[data-tile-scale="32"]')).waitFor();
  const dev=await p.context().newCDPSession(p);
  await dev.send('HeapProfiler.collectGarbage');
  const heap0=await dev.send('Runtime.getHeapUsage') as {usedSize:number};
  await p.evaluate(()=>window.dispatchEvent(new Event('frost-perf-reset')));
  const t0=Date.now(),check=()=>canvas.getAttribute('data-performance').then(a=>JSON.parse(a??'{}'));
  let wave=0,shot=false;
  while(Date.now()-t0<seconds*1000){
   await p.waitForTimeout(Math.min(1200,Math.max(150,seconds*1000-(Date.now()-t0))));
   const sample=await check();wave=Math.max(wave,sample.wave??0);
   if(wave===3&&!shot){
    shot=true;
    // Persist a real screenshot while all threats and particle passes are active.
    await p.screenshot({path:resolve(dir,'P2-41-02-giant-third-wave.png')});
   }
  }
  await p.evaluate(()=>window.dispatchEvent(new Event('frost-perf-end')));
  await dev.send('HeapProfiler.collectGarbage');
  const heap1=await dev.send('Runtime.getHeapUsage') as {usedSize:number};
  const sample=await check();
  const repeated=await exportWorld(p),bytes=Buffer.byteLength(serializeWorld(repeated));
  const renderer=await p.evaluate(()=>{
   const gl=document.createElement('canvas').getContext('webgl');
   const ext=gl?.getExtension('WEBGL_debug_renderer_info');
   return ext&&gl?String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)):'unavailable';
  });
  const utilityDockIntersection=await p.evaluate(()=>{
   const a=document.querySelector('.m2-tools')!.getBoundingClientRect(),b=document.querySelector('.quickdock')!.getBoundingClientRect();
   return Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*
          Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
  });
  const report={renderer,seconds:(Date.now()-t0)/1000,heapStart:heap0.usedSize,heapEnd:heap1.usedSize,bytes,wave,utilityDockIntersection,errors:[...errors],...sample};
  writeFileSync(resolve(dir,'P2-41-telemetry.json'),JSON.stringify(report,null,2));
  await p.screenshot({path:resolve(dir,'P2-41-03-giant-sustained.png')});
  console.log('[e2e:P2-41] measurements '+JSON.stringify(report));
  if(enforce){
   assert.ok(report.seconds>=120&&report.wave===3&&sample.deck===576&&sample.buildings>=25&&sample.beasts>=12&&sample.chunks>=9);
   assert.equal(utilityDockIntersection,0,'utility buttons must not cover numbered slots');
   assert.deepEqual(errors,[]);
   assert.ok(bytes<350000&&report.heapEnd-report.heapStart<16e6);
   assert.ok(sample.logic.p99<4&&sample.logic.max<4,`logic sample max: ${sample.logic.max}`);
   assert.ok(sample.frame.p50<18.1&&sample.frame.p95<25.5,`presentation p50/p95 ${sample.frame.p50}/${sample.frame.p95}`);
  }
 }finally{await p.close();}
}
if(process.argv[1]?.endsWith('/p2-giant-e2e.ts')||process.argv[1]==='scripts/p2-giant-e2e.ts'){
 const dir=resolve('artifacts/p2-s8');mkdirSync(dir,{recursive:true});const b=await chromium.launch(),errors:string[]=[];
 const secs=Number(process.env.FROST_PERF_SECONDS??120);
 try{await runP2Giant(b,pathToFileURL(resolve('index.html')).href,dir,errors,secs,secs>=120);assert.deepEqual(errors,[]);}finally{await b.close();}
}
