import assert from 'node:assert/strict';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser,type Page } from 'playwright';

export async function checkBenchmark(browser:Browser,entry:string,dir:string,errors:string[],full=false){
 const ctx=await browser.newContext({viewport:{width:1920,height:1080},acceptDownloads:true});
 const p=await ctx.newPage();
 p.on('pageerror',e=>errors.push(e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 p.on('response',r=>{if(r.status()===404)errors.push(r.url())});
 const readSave=(p:Page)=>p.evaluate(async()=>{
  const all=await indexedDB.databases();
  if(!all.some(e=>e.name==='manan-frost-ark'))return null;
  return await new Promise<string|null>((success,fail)=>{
   const req=indexedDB.open('manan-frost-ark',1);
   req.onerror=()=>fail(req.error);
   req.onsuccess=()=>{
    const db=req.result,r=db.transaction('saves').objectStore('saves').get('world-M0');
    r.onerror=()=>{db.close();fail(r.error)};
    r.onsuccess=()=>{db.close();success(r.result??null);};
   };
  });
 });
 try{
  await p.goto(entry,{waitUntil:'networkidle'});
  await p.locator('#game-canvas[data-art-ready=true]').waitFor();
  await p.locator('#save-label[data-saved=true]').waitFor();
  const before=await readSave(p);assert.ok(before);
  await p.goto(new URL('benchmark.html',entry).href,{waitUntil:'networkidle'});
  await p.locator('.ship-benchmark').waitFor();
  assert.ok(p.url().endsWith('#benchmark'));
  await p.getByRole('button',{name:'开始压测',exact:true}).click();
  const c=p.locator('#game-canvas');
  await c.and(p.locator('[data-tile-scale="32"]')).waitFor();
  await p.waitForFunction(()=>JSON.parse(document.querySelector<HTMLCanvasElement>('#game-canvas')!.dataset.performance??'{}').deck===576);
  const counts=JSON.parse((await c.getAttribute('data-performance'))!);
  assert.deepEqual([counts.deck,counts.buildings,counts.beasts],[576,50,12]);
  assert.equal(await readSave(p),before);
  if(full){
   await p.waitForFunction(()=>Number(document.querySelector<HTMLElement>('#raid-alert')?.dataset.wave)===3,{},{timeout:65000});
   await p.screenshot({path:resolve(dir,'P2-41-02-benchmark-wave3.png')});
   const result=p.getByRole('button',{name:'下载结果',exact:true});
   await result.waitFor({timeout:125000});
   const [file]=await Promise.all([p.waitForEvent('download'),result.click()]);
   const stats=JSON.parse(readFileSync((await file.path())!,'utf8'));
   assert.ok(stats.averageFPS>0&&stats.logic.samples>=2000);
   assert.equal(stats.wave,3);
   assert.deepEqual([stats.deck,stats.buildings,stats.beasts],[576,50,12]);
   assert.equal(await readSave(p),before);
   writeFileSync(resolve(dir,'P2-41-benchmark.json'),JSON.stringify(stats,null,2));
   await p.screenshot({path:resolve(dir,'P2-41-03-benchmark-result.png')});
   console.log('[e2e:P2-41] observed FPS '+stats.averageFPS.toFixed(2)+', tick P99 '+stats.logic.p99+', max '+stats.logic.max+'; not a hardware acceptance claim.');
  }
  await Promise.all([p.waitForURL(u=>u.hash!== '#benchmark'),p.getByRole('link',{name:'回到正常游戏'}).click()]);
  assert.ok(await p.locator('.ship-benchmark').count()===0);
  assert.deepEqual(errors,[]);
  console.log('[e2e:P2-41] benchmark starts by click, actual 576/50/12 and original save unchanged');
 }finally{await ctx.close();}
}

if(process.argv[1]?.endsWith('p2-benchmark-entry-e2e.ts')){
 const dir=resolve('artifacts/p2-s8');mkdirSync(dir,{recursive:true});
 const b=await chromium.launch(),errors:string[]=[];
 try{await checkBenchmark(b,pathToFileURL(resolve('index.html')).href,dir,errors,true);}finally{await b.close();}
}
