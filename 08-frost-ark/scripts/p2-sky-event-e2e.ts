import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser,type Page } from 'playwright';
import { countItem } from '../src/sim/ark';
import { activeSkyEvent } from '../src/sim/sky-events';
import { serializeWorld } from '../src/sim/save';
import { helmPoint } from '../src/sim/sky-map';
import type { WorldState } from '../src/sim/types';
import { createInitialWorld } from '../src/sim/world';
import { eventFixture } from './p2-sky-event-fixture';
import { exportWorld } from './p2-hook-e2e';

async function load(p:Page,w:WorldState){
 await p.keyboard.press('i');
 await p.locator('#save-file').setInputFiles({name:'event-trial.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
 await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor({state:'attached'});
 await p.keyboard.press('Escape');
}
export async function runP2SkyEvents(browser:Browser,url:string,dir:string,errors:string[]){
 const get=async()=>{
  const p=await browser.newPage({viewport:{width:1440,height:900}});
  p.on('pageerror',e=>errors.push('P2-22 sky events page: '+e.message));
  p.on('console',m=>{if(m.type()==='error')errors.push('P2-22 sky events console: '+m.text());});
  p.on('response',r=>{if(r.status()===404)errors.push('P2-22 sky events 404: '+r.url());});
  await p.goto(url,{waitUntil:'networkidle'});
  await p.locator('#game-canvas[data-art-ready=true]').waitFor();
  return p;
 };
 const p=await get();
 try{
  const w=createInitialWorld(202608);Object.assign(w.player,helmPoint(w));await load(p,w);
  const map=p.locator('#sky-map'),trader=p.locator('#sky-trader');
  await p.keyboard.press('n');
  await map.locator('[data-island-id=shallows_lantern]').click();
  await map.locator('#sky-set-course').click();
  await map.locator('#sky-cruise').click();
  await p.keyboard.press('Escape');
  await p.locator('#sky-event-brief[data-event=merchant]').waitFor({timeout:20000});
  const moving=await exportWorld(p);
  assert.equal(moving.sky.cruising,true);
  assert.ok(activeSkyEvent(moving)!.started>=70);
  await p.keyboard.press('e');
  await p.locator('#game-canvas[data-primary-interaction=trader]').waitFor();
  assert.equal(await p.locator('#expedition-interact kbd').isVisible(),false);
  await p.screenshot({path:resolve(dir,'P2-22-01-merchant-moor.png')});
  await p.keyboard.press('e');
  await trader.waitFor();
  await trader.locator('button[data-offer=bait]').click();
  await p.getByText('交易完成：暖莓汤 ×1',{exact:true}).waitFor();
  assert.equal(await trader.locator('button[data-offer=bait]').isDisabled(),true);
  await p.screenshot({path:resolve(dir,'P2-22-02-real-barter.png')});
  await p.keyboard.press('Escape');await trader.waitFor({state:'hidden'});
  const bought=await exportWorld(p);
  assert.equal(countItem(bought,'driftwood'),countItem(w,'driftwood')-3);
  assert.equal(countItem(bought,'warm_berry_soup'),1);
  await p.reload({waitUntil:'networkidle'});
  await p.locator('#game-canvas[data-primary-interaction=trader]').waitFor();
  await p.keyboard.press('e');
  await trader.waitFor();
  assert.equal(await trader.locator('button[data-offer=bait]').isDisabled(),true);
  await p.keyboard.press('Escape');
 }finally{await p.close();}
 for(const kind of ['salvage','warm','thunder','pirates'] as const){
   const view=await get();
   try{
     const {w,e}=(()=>{const data=eventFixture(kind);return{w:data.w,e:data.event};})();
     w.sky.cruising=false;
     if(kind==='thunder')w.tick=e.started+94;
     await load(view,w);
     await view.locator('#sky-event-brief[data-event="'+kind+'"]').waitFor();
     const now=await exportWorld(view);
     if(kind==='salvage')assert.equal(now.sky.debris.filter(d=>d.id.startsWith(e.id+'_cache_')).length,3);
     if(kind==='warm')assert.ok(now.ambientTemp>=12);
     if(kind==='thunder')assert.ok(now.ambientTemp<=-17);
     if(kind==='pirates')assert.ok(now.wildEntities.some(enemy=>enemy.id.startsWith('skyraid_')&&enemy.hp>0));
     await view.screenshot({path:resolve(dir,'P2-22-03-'+kind+'.png')});
   }finally{await view.close();}
 }
 console.log('[e2e:P2-22] OK: actual normal cruising encountered and moored to merchant, successful barter and reload, all four other in-game encounters');
}
if(process.argv[1]?.endsWith('/p2-sky-event-e2e.ts')||process.argv[1]==='scripts/p2-sky-event-e2e.ts'){
 const dir=resolve('artifacts/p2-s4');mkdirSync(dir,{recursive:true});
 const b=await chromium.launch(),errors:string[]=[];
 try{await runP2SkyEvents(b,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}
 finally{await b.close();}
}
