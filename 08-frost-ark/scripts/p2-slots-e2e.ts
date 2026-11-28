import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser } from 'playwright';
import { countItem } from '../src/sim/ark';
import { daySpeed,difficultyOf,type Difficulty } from '../src/sim/challenge';
import { exportWorld } from './p2-hook-e2e';

export async function runP2Slots(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1280,height:720}}),title=p.locator('#voyage-title');
 p.on('pageerror',e=>errors.push('P2-38 slots page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('P2-38 slots console: '+m.text());});
 p.on('response',r=>{if(r.status()===404)errors.push('P2-38 slots 404: '+r.url());});
 const shot=(n:string)=>p.screenshot({path:resolve(dir,'P2-38-'+n+'.png')});
 const choose=(n:number)=>p.locator(`[data-save-slot="${n}"]`).click();
 const manage=async()=>{await p.keyboard.press('k');await p.locator('#voyage-slot-toggle').click();await title.waitFor();};
 const create=async(n:number,seed:number,diff:Difficulty)=>{
  await choose(n);await p.locator('#voyage-difficulty').selectOption(diff);
  await p.locator('#voyage-seed').fill(String(seed));
  await p.locator('#voyage-start').click();await title.waitFor({state:'hidden'});
  await p.locator(`#save-label[data-slot="${n}"]`).waitFor({state:'attached'});
  const world=await exportWorld(p);assert.equal(world.seed,seed);assert.equal(difficultyOf(world),diff);return world;
 };
 try{
  await p.goto(url,{waitUntil:'networkidle'});await title.waitFor();
  assert.equal(await title.locator('[data-filled=false]').count(),3);
  await shot('01-fresh-title-three-slots');
  const first=await create(1,19001,'relaxed');
  const wood=countItem(first,'driftwood');
  await p.keyboard.press('g');
  assert.equal(countItem(await exportWorld(p),'driftwood'),wood-1);
  await manage();await create(2,19002,'hardcore');
  assert.equal(countItem(await exportWorld(p),'driftwood'),wood);
  await p.keyboard.press('k');
  await p.locator('#day-pace').selectOption('2');
  const shake=p.locator('#settings-shake');
  await shake.uncheck();
  await p.locator('#music-volume').fill('43');
  await shot('02-settings-and-pace');
  await p.keyboard.press('Escape');
  assert.equal(daySpeed(await exportWorld(p)),2);
  await p.reload({waitUntil:'networkidle'});
  await p.locator('#save-label[data-slot="2"]').waitFor({state:'attached'});
  await p.keyboard.press('k');
  assert.equal(await p.locator('#day-pace').inputValue(),'2');
  assert.equal(await p.locator('#music-volume').inputValue(),'43');
  assert.equal(await p.locator('#settings-shake').isChecked(),false);
  await p.locator('#voyage-slot-toggle').click();await title.waitFor();
  await create(3,19003,'standard');
  await manage();
  assert.equal(await title.locator('[data-filled=true]').count(),3);
  await shot('03-three-filled-isolated');
  await choose(1);await p.locator('#voyage-resume').click();await title.waitFor({state:'hidden'});
  const back=await exportWorld(p);
  assert.equal(back.seed,19001);assert.equal(difficultyOf(back),'relaxed');
  assert.equal(countItem(back,'driftwood'),wood-1);assert.equal(daySpeed(back),1);
  await p.locator('#save-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{invalid')});
  await p.getByText(/导入失败/).waitFor({state:'attached'});
  assert.equal((await exportWorld(p)).seed,19001);
  await p.reload({waitUntil:'networkidle'});await p.locator('#save-label[data-slot="1"]').waitFor({state:'attached'});
  assert.equal((await exportWorld(p)).seed,19001);
  console.log('[e2e:P2-38] OK: 3 isolated seeds and independent worlds, custom difficulty & pace, persisted mix/shake, safe invalid import');
 }finally{await p.close();}
}
if(process.argv[1]?.endsWith('/p2-slots-e2e.ts')||process.argv[1]==='scripts/p2-slots-e2e.ts'){
 const dir=resolve('artifacts/p2-s7');mkdirSync(dir,{recursive:true});const b=await chromium.launch(),errors:string[]=[];
 try{await runP2Slots(b,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}finally{await b.close();}
}
