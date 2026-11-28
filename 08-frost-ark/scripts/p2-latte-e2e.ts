import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser,type Page } from 'playwright';
import { countItem } from '../src/sim/ark';
import { areaAt } from '../src/sim/island';
import { islandLandmarks } from '../src/sim/landmarks';
import { latteProfile } from '../src/sim/latte-growth';
import { serializeWorld } from '../src/sim/save';
import type { WorldState } from '../src/sim/types';
import { coastFixture } from './p2-coast-fixture';
import { exportWorld } from './p2-hook-e2e';
import { latteFixture } from './p2-latte-fixture';

export async function runP2Latte(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1440,height:900}}),canvas=p.locator('#game-canvas');
 p.on('pageerror',e=>errors.push('P2-29 latte page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('P2-29 latte console: '+m.text());});
 p.on('response',r=>{if(r.status()===404)errors.push('P2-29 latte 404: '+r.url());});
 async function load(w:WorldState){
  await p.locator('#save-file').setInputFiles({name:'reachable-latte-care.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
  await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor({state:'attached'});
 }
 const outfit=(kind:string)=>p.locator('[data-latte-outfit="'+kind+'"]');
 const shot=(name:string)=>p.screenshot({path:resolve(dir,'P2-29-'+name+'.png')});
 try{
  await p.goto(url,{waitUntil:'networkidle'});
  await canvas.and(p.locator('[data-art-ready=true]')).waitFor();
  const base=latteFixture();await load(base);
  await p.locator('#latte-status').click();await p.locator('#latte-care').waitFor();
  assert.ok(await outfit('cape').isDisabled());
  assert.ok((await canvas.getAttribute('data-latte-find'))?.match(/^[1-9]/));
  for(const [id,name] of [['scarf','01-scarf-and-gold-signal'],['goggles','02-goggles']] as const){
   await outfit(id).click();await p.locator('[data-latte-draw^="latte-'+id+'-"]').waitFor();
   await shot(name);
  }
  await p.locator('#latte-feed').click();
  await p.getByText('Lv.4 · 成长已满',{exact:true}).waitFor();
  await outfit('cape').click();
  await p.locator('[data-latte-draw^="latte-cape-"]').waitFor();
  assert.equal(countItem(await exportWorld(p),'cloud_fish'),countItem(base,'cloud_fish')-1);
  await shot('03-cape');
  await p.keyboard.press('Escape');
  await p.locator('#latte-care').waitFor({state:'hidden'});
  const cape=await exportWorld(p);
  cape.day=5;cape.timeOfDay=.81;cape.weather='whiteout';cape.ambientTemp=-55;
  cape.player.hp=55;cape.player.warmth=42;
  await load(cape);
  await p.locator('#latte-status').filter({hasText:'暖心喵鸣'}).waitFor();
  const recovered=await exportWorld(p);
  assert.ok(recovered.player.hp>60&&recovered.player.warmth>48);
  await shot('04-whiteout-boon');
  await p.reload({waitUntil:'networkidle'});
  await p.locator('[data-latte-draw^="latte-cape-"]').waitFor();
  assert.equal(latteProfile(await exportWorld(p)).outfit,'cape');
  const island=coastFixture('frostpine_cove',202608);
  // Preserve earned profile, place the dock test player at the legal landing.
  Object.assign(island,{latteGrowthP2:(base as unknown as Record<string,unknown>).latteGrowthP2});
  island.tick=Math.max(island.tick,base.tick);
  const relic=islandLandmarks(island).find(m=>m.kind==='obelisk')!;
  const watch=[{x:relic.x-4.2,y:relic.y},{x:relic.x+4.2,y:relic.y},{x:relic.x,y:relic.y-4.2}]
   .find(pos=>areaAt(island,pos.x,pos.y)==='island');
  assert.ok(watch);
  Object.assign(island.player,watch);
  await load(island);
  await p.locator('#game-canvas[data-latte-find$="/1"]').waitFor();
  await shot('05-relic-signal');
  console.log('[e2e:P2-29] OK: three hand-painted outfits in game, earned and persistent Lv.4, distant cargo and relic indicators, real cold wave healing');
 }finally{await p.close();}
}
if(process.argv[1]?.endsWith('/p2-latte-e2e.ts')||process.argv[1]==='scripts/p2-latte-e2e.ts'){
 const dir=resolve('artifacts/p2-s5');mkdirSync(dir,{recursive:true});
 const b=await chromium.launch(),errors:string[]=[];
 try{await runP2Latte(b,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}finally{await b.close();}
}
