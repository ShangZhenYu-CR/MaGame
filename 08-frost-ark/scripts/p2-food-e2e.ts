import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, type Browser } from 'playwright';
import { serializeWorld } from '../src/sim/save';
import { shoreForSurvival } from './p2-rescue-e2e';

export async function runP2Food(browser:Browser,url:string,dir:string,errors:string[]):Promise<void>{
 const p=await browser.newPage({viewport:{width:1280,height:720}});
 p.on('pageerror',e=>errors.push('food page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('food console: '+m.text());});
 try{
   const w=shoreForSurvival();
   Object.assign(w.player,{warmth:38,hp:58,hunger:42});
   w.player.inventory[5]={itemId:'warm_berry_soup',count:2};
   await p.goto(url,{waitUntil:'networkidle'});
   await p.locator('#game-canvas[data-art-ready=true]').waitFor();
   await p.keyboard.press('i');
   await p.locator('#save-file').setInputFiles({name:'before-soup.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
   await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor();
   const quick=p.getByRole('button',{name:'快捷食用暖莓汤',exact:true});
   await quick.waitFor();
   assert.equal(await p.locator('#expedition-context').getAttribute('data-area'),'island');
   await p.getByRole('button',{name:'设为快捷食物：暖莓汤',exact:true}).click();
   const beforeWarmth=await p.locator("#warmth-meter").evaluate(e=>(e as HTMLMeterElement).value);
   await p.getByRole('button',{name:'食用暖莓汤',exact:true}).click();
   const buff=p.locator('#meal-buff');
   await buff.waitFor();
   assert.ok(await buff.getByText('暖胃抗寒').isVisible());
   const separated=await p.evaluate(()=>document.querySelector('#meal-buff')!.getBoundingClientRect().bottom<=document.querySelector('#m5-seed-count')!.getBoundingClientRect().top);
   assert.ok(separated,'fire seed counter stays below the meal buff');
   assert.ok(await buff.locator('img').evaluate(e=>(e as HTMLImageElement).complete&&(e as HTMLImageElement).naturalWidth>=48));
   assert.ok(await p.locator('#hunger-meter').evaluate(e=>(e as HTMLMeterElement).value)>65);
   assert.ok(await p.locator('#life-meter').evaluate(e=>(e as HTMLMeterElement).value)>67);
   assert.ok(await p.locator('#warmth-meter').evaluate(e=>(e as HTMLMeterElement).value)>beforeWarmth+16);
   assert.equal(await quick.locator('output').textContent(),'×1');
   await p.screenshot({path:resolve(dir,'P2-02-01-eat-in-bag.png')});
   await p.keyboard.press('Escape');
   await p.keyboard.press('h');
   await quick.waitFor({state:'hidden'});
   assert.ok(await buff.isVisible());
   await p.screenshot({path:resolve(dir,'P2-02-02-warm-meal-wilderness.png')});
   console.log('[e2e:P2-02] OK: edible soup in the pack and on H, real stock depletion and visible warmth buff on an island');
 }finally{await p.close();}
}

if(process.argv[1]?.endsWith('/p2-food-e2e.ts')||process.argv[1]==='scripts/p2-food-e2e.ts'){
 const dir=resolve('artifacts/p2-s1');mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch(),errors:string[]=[];
 try{await runP2Food(browser,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}
 finally{await browser.close();}
}
