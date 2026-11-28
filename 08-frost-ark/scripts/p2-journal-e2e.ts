import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser } from 'playwright';
import { countItem } from '../src/sim/ark';
import { journalView } from '../src/sim/journal';
import { exportWorld } from './p2-hook-e2e';

export async function runP2Journal(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1280,height:720}}),log=p.locator('#voyage-journal');
 p.on('pageerror',e=>errors.push('P2-39 journal page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('P2-39 journal console: '+m.text());});
 p.on('response',r=>{if(r.status()===404)errors.push('P2-39 journal 404: '+r.url());});
 const shot=(n:string)=>p.screenshot({path:resolve(dir,'P2-39-'+n+'.png')});
 try{
  await p.goto(url,{waitUntil:'networkidle'});
  await p.locator('#voyage-title').waitFor();
  await p.locator('#voyage-seed').fill('202608');await p.locator('#voyage-start').click();
  await p.locator('#voyage-title').waitFor({state:'hidden'});
  await p.keyboard.press('l');await log.waitFor();
  await log.getByText(/现在：点亮余烬/).waitFor();
  assert.equal(await log.locator('[data-chapter]').count(),8);await shot('01-new-voyage-guide');
  let first=await exportWorld(p);
  for(let j=0;j<18&&!journalView(first).rows[0].complete;j++){
   await p.keyboard.press('r');
   await p.waitForTimeout(890);first=await exportWorld(p);
  }
  assert.equal(journalView(first).rows[0].complete,true);
  const take=log.locator('[data-chapter=fuel] button');await take.click();
  assert.equal(countItem(await exportWorld(p),'driftwood'),countItem(first,'driftwood')+2);
  await log.getByText(/现在：初试抛钩/).waitFor();
  await shot('02-next-goal-and-claimed-reward');
  await p.keyboard.press('Escape');await log.waitFor({state:'hidden'});
  await p.locator('#journal-toggle').click();await log.waitFor();
  await p.locator('#journal-close').click();await log.waitFor({state:'hidden'});
  await p.reload({waitUntil:'networkidle'});
  await p.keyboard.press('l');await log.waitFor();
  assert.ok(journalView(await exportWorld(p)).rows[0].claimed);
  console.log('[e2e:P2-39] OK: fresh game guidance, actual refueling, paid chapter and next objective; collapse and reload');
 }finally{await p.close();}
}
if(process.argv[1]?.endsWith('/p2-journal-e2e.ts')||process.argv[1]==='scripts/p2-journal-e2e.ts'){
 const dir=resolve('artifacts/p2-s8');mkdirSync(dir,{recursive:true});const b=await chromium.launch(),errors:string[]=[];
 try{await runP2Journal(b,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}finally{await b.close();}
}
