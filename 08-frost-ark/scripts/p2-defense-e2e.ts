import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser } from 'playwright';
import { serializeWorld } from '../src/sim/save';
import { storageContents } from '../src/sim/storage-box';
import type { WorldState } from '../src/sim/types';
import { defenseFixture,defenseSites,defenseWave } from './p2-defense-fixture';
import { exportWorld } from './p2-hook-e2e';

export async function runP2Defense(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1440,height:900}}),canvas=p.locator('#game-canvas');
 p.on('pageerror',e=>errors.push('P2-30 defenses page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('P2-30 defenses console: '+m.text());});
 p.on('response',r=>{if(r.status()===404)errors.push('P2-30 defenses 404: '+r.url());});
 async function load(w:WorldState){
  await p.locator('#save-file').setInputFiles({name:'defense-wave.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
  await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor({state:'attached'});
 }
 const shot=(name:string)=>p.screenshot({path:resolve(dir,'P2-30-'+name+'.png')});
 try{
  await p.goto(url,{waitUntil:'networkidle'});
  await canvas.and(p.locator('[data-art-ready=true]')).waitFor();
  await load(defenseFixture());
  for(const [id,x,y] of defenseSites){
   await p.keyboard.press('b');
   const card=p.locator('[data-build-kind="'+id+'"]');
   await card.waitFor();
   const art=await card.locator('img').evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth===64);
   assert.equal(art,true);
   await card.click();
   const point=await canvas.evaluate((el,[x,y])=>{
    const c=el as HTMLCanvasElement,r=c.getBoundingClientRect(),s=Number(c.dataset.tileScale);
    return {x:r.left+(Number(c.dataset.originX)+(x+.5)*s)*r.width/c.width,y:r.top+(Number(c.dataset.originY)+(y+.5)*s)*r.height/c.height};
   },[x,y]);
   await p.mouse.click(point.x,point.y);
  }
  await p.keyboard.press('q');
  const built=await exportWorld(p);
  for(const [id,x,y] of defenseSites)assert.ok(built.ark.buildings.some(b=>b.defId===id&&b.gx===x&&b.gy===y),id);
  await shot('01-four-built-defenses');
  const fixture=defenseWave(built);
  const damagedId=fixture.damaged.id,hp=fixture.damaged.hp,raiders=fixture.raiders.map(e=>[e.id,e.hp] as const);
  await load(built);
  await p.locator('#raid-alert[data-phase=active]').waitFor();
  await p.locator('#game-canvas[data-defense-fx*="reveal"]').waitFor();
  await shot('02-searchlight-reveal-and-spikes');
  await p.locator('#game-canvas[data-defense-fx*="blast"]').waitFor({timeout:6000});
  await shot('03-mortar-impact');
  const done=await exportWorld(p);
  assert.ok(done.ark.buildings.find(b=>b.id===damagedId)!.hp>hp);
  assert.ok((storageContents(done).find(s=>s.itemId==='driftwood')?.count??0)<3);
  for(const [id,start] of raiders){
   const target=done.wildEntities.find(e=>e.id===id);
   assert.ok((target?.hp??0)<start,JSON.stringify({target,start,initial:fixture.raiders.find(e=>e.id===id),tick:done.tick}));
  }
  console.log('[e2e:P2-30] OK: 4 paid construction interactions, live cold wave reveal/spike/mortar, true damage and locker-stocked repair');
 }finally{await p.close();}
}
if(process.argv[1]?.endsWith('/p2-defense-e2e.ts')||process.argv[1]==='scripts/p2-defense-e2e.ts'){
 const dir=resolve('artifacts/p2-s6');mkdirSync(dir,{recursive:true});
 const b=await chromium.launch(),errors:string[]=[];
 try{await runP2Defense(b,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}finally{await b.close();}
}
