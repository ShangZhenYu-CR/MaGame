import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser,type Page } from 'playwright';
import { doorOpen, indoorsAt } from '../src/sim/rooms';
import { fitsOnDeck } from '../src/sim/ark';
import { serializeWorld } from '../src/sim/save';
import type { WorldState } from '../src/sim/types';
import { exportWorld } from './p2-hook-e2e';
import { warmRoom } from './p2-room-fixture';

async function load(p:Page,w:WorldState){
 await p.keyboard.press('i');
 await p.locator('#save-file').setInputFiles({name:'room-test.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
 await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor();
 await p.keyboard.press('Escape');
}
export async function runP2Room(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1440,height:900}});
 p.on('pageerror',e=>errors.push('p2 warm room page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('p2 warm room console: '+m.text());});
 // Observe the actual Canvas clipping path used on strokes, not an exposed
 // game-state debug flag. No e2e code is present in the shipped client.
 await p.addInitScript(()=>{
  const original=CanvasRenderingContext2D.prototype.clip as (...args:unknown[])=>void;
  CanvasRenderingContext2D.prototype.clip=function(this:CanvasRenderingContext2D,...a:unknown[]){
   if(this.canvas.id==='game-canvas'&&a[0] instanceof Path2D&&a[1]==='evenodd'){
    const data=this.canvas.dataset,s=Number(data.tileScale),x=Number(data.originX),y=Number(data.originY);
    const hits=[{x:24.5,y:25.5},{x:24.5,y:27.45}].map(q=>this.isPointInPath(a[0] as Path2D,x+s*q.x,y+s*q.y,'evenodd'));
    data.testWeatherMask=hits.join(',');
   }
   original.apply(this,a);
  } as typeof CanvasRenderingContext2D.prototype.clip;
 });
 try{
  const {w}=warmRoom();
  await p.goto(url,{waitUntil:'networkidle'});
  const c=p.locator('#game-canvas[data-art-ready=true]');
  await c.waitFor();
  await load(p,w);
  await p.locator('#game-canvas[data-primary-interaction=door][data-indoor-tiles="20"][data-test-weather-mask="false,true"]').waitFor();
  await p.getByText('室内暖室 · 关门挡雪',{exact:true}).waitFor();
  const first=Number((await p.locator('#local-temp').textContent())?.match(/-?\d+/)?.[0]);
  assert.ok(Number.isFinite(first));
  await p.locator('#action').waitFor({state:'hidden',timeout:6000});
  await p.screenshot({path:resolve(dir,'P2-12-01-sealed-whiteout.png')});
  await p.keyboard.press('e');
  await p.getByText('防风门已打开。',{exact:true}).waitFor();
  await p.locator('#game-canvas[data-indoor-tiles="0"]').waitFor();
  await p.waitForFunction(before=>{
   const current=document.getElementById('local-temp')?.textContent?.match(/-?\d+/)?.[0];
   return current!==undefined&&Number(current)<=before-4;
  },first);
  const second=Number((await p.locator('#local-temp').textContent())?.match(/-?\d+/)?.[0]);
  await p.screenshot({path:resolve(dir,'P2-12-02-open-whiteout.png')});
  await p.keyboard.press('e');
  await p.getByText('防风门已关上。',{exact:true}).waitFor();
  await p.locator('#game-canvas[data-indoor-tiles="20"][data-test-weather-mask="false,true"]').waitFor();
  await p.screenshot({path:resolve(dir,'P2-12-03-resealed.png')});
  await p.keyboard.press('e');
  await p.locator('#game-canvas[data-indoor-tiles="0"]').waitFor();
  await p.keyboard.down('s');
  try{await p.keyboard.press('Space');}
  finally{await p.keyboard.up('s');}
  await p.locator('#game-canvas[data-roll=ready]').waitFor();
  const passed=await exportWorld(p);
  assert.ok(passed.player.y>26.9&&fitsOnDeck(passed,passed.player.x,passed.player.y));
  assert.ok(!indoorsAt(passed,passed.player));
  const {w:auto}=warmRoom('frost_airlock');
  Object.assign(auto.player,{x:24.5,y:25.6});
  await load(p,auto);
  await p.locator('#game-canvas[data-indoor-tiles="0"]').waitFor();
  assert.ok(doorOpen((await exportWorld(p)).ark.buildings.find(b=>b.defId==='frost_airlock')!));
  await p.screenshot({path:resolve(dir,'P2-12-04-airlock-open.png')});
  await p.keyboard.down('w');
  try{await p.getByText('室内暖室 · 关门挡雪',{exact:true}).waitFor({timeout:12000});}
  finally{await p.keyboard.up('w');}
  await p.locator('#game-canvas[data-indoor-tiles="20"]').waitFor();
  const reClosed=await exportWorld(p);
  assert.ok(!doorOpen(reClosed.ark.buildings.find(b=>b.defId==='frost_airlock')!));
  assert.ok(reClosed.player.y<25.5,'auto airlock closed after the same live player left its sensor');
  await p.screenshot({path:resolve(dir,'P2-12-05-airlock-closed.png')});
  console.log('[e2e:P2-12] OK: closed/open/reclosed; actual weather clip excludes inside but not outside; '+first+'→'+second+'°C; Space crossed threshold; automatic airlock');
 }finally{await p.close();}
}
if(process.argv[1]?.endsWith('/p2-room-e2e.ts')||process.argv[1]==='scripts/p2-room-e2e.ts'){
 const dir=resolve('artifacts/p2-s3');mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch(),errors:string[]=[];
 try{await runP2Room(browser,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}
 finally{await browser.close();}
}
