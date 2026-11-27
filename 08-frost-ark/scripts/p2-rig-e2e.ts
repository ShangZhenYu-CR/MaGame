import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser,type Page } from 'playwright';
import { serializeWorld } from '../src/sim/save';
import type { WorldState } from '../src/sim/types';
import { exportWorld } from './p2-hook-e2e';
import { rigTrial } from './p2-rig-fixture';

async function load(p:Page,w:WorldState){
 await p.keyboard.press('i');
 await p.locator('#save-file').setInputFiles({name:'sailing-compare.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
 await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor();
 await p.keyboard.press('Escape');
}
export async function runP2Rig(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1440,height:900}});
 p.on('pageerror',e=>errors.push('p2 rig page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('p2 rig console: '+m.text());});
 try{
  await p.goto(url,{waitUntil:'networkidle'});
  await p.locator('#game-canvas[data-art-ready=true]').waitFor();
  const d=p.locator('#sky-map'),sample=[];
  for(const rig of [false,true]){
   await load(p,rigTrial(rig));
   await p.keyboard.press('n');
   await d.locator('[data-island-id=shallows_lantern]').click();
   await d.locator('#sky-set-course').click();
   const before=await exportWorld(p);
   await d.locator('#sky-cruise').click();
   await d.locator('#sky-nav-status[data-nav-state=cruising]').waitFor();
   assert.match(await d.locator('#sky-nav-status').textContent()??'',/云里\/秒/);
   await p.screenshot({path:resolve(dir,'P2-14-'+(rig?'02-rig-speed':'01-bare-speed')+'.png')});
   const status=p.locator('#game-canvas');
   if(rig){
    await p.keyboard.press('Escape');
    await p.locator('#game-canvas[data-steam-jets="1"]').waitFor();
    await p.screenshot({path:resolve(dir,'P2-14-03-steam-in-motion.png')});
    await p.keyboard.press('n');
   }
   const speed=Number(await status.getAttribute('data-cruise-speed'));
   assert.ok(speed>0);
   await d.locator('#sky-nav-status[data-nav-state=docked]').waitFor({timeout:60000});
   const after=await exportWorld(p);
   assert.equal(after.ark.anchoredIslandId,'shallows_lantern');
   sample.push({ticks:after.tick-before.tick,speed});
   await p.keyboard.press('Escape');
  }
  assert.ok(sample[1].speed>sample[0].speed*1.24);
  assert.ok(sample[1].ticks<sample[0].ticks*.83);
  console.log('[e2e:P2-14] OK: actual chart controls, same adverse-wind route, '+JSON.stringify(sample)+', moving steam jets');
 }finally{await p.close();}
}
if(process.argv[1]?.endsWith('/p2-rig-e2e.ts')||process.argv[1]==='scripts/p2-rig-e2e.ts'){
 const dir=resolve('artifacts/p2-s3');mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch(),errors:string[]=[];
 try{await runP2Rig(browser,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}
 finally{await browser.close();}
}
