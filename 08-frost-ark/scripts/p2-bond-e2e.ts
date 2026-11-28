import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser } from 'playwright';
import { beastBond } from '../src/sim/beast-bond';
import { serializeWorld } from '../src/sim/save';
import { countItem } from '../src/sim/ark';
import { bondFixture } from './p2-bond-fixture';
import { exportWorld } from './p2-hook-e2e';

export async function runP2Bond(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1440,height:900}});
 p.on('pageerror',e=>errors.push('P2-28 bond page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('P2-28 bond console: '+m.text());});
 p.on('response',r=>{if(r.status()===404)errors.push('P2-28 bond 404: '+r.url());});
 try{
  await p.goto(url,{waitUntil:'networkidle'});
  await p.locator('#game-canvas[data-art-ready=true]').waitFor();
  const {w,a,b}=bondFixture();
  await p.keyboard.press('i');
  await p.locator('#save-file').setInputFiles({name:'cloud-beast-care.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
  await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor({state:'attached'});
  await p.keyboard.press('Escape');
  await p.locator('#game-canvas[data-primary-interaction=pet]').waitFor({timeout:6000});
  const labels=await p.locator('kbd:visible:not(.key-note kbd)').allTextContents();
  assert.equal(labels.filter(x=>x==='E').length,1);
  await p.keyboard.press('e');
  await p.locator('#game-canvas[data-beast-moods*="heart"]').waitFor();
  const care=await exportWorld(p);
  assert.equal(beastBond(care,a.id),52);
  assert.equal(beastBond(care,b.id),48);
  await p.screenshot({path:resolve(dir,'P2-28-01-pet-heart-and-hunger.png')});
  await p.keyboard.press('v');
  const card=p.locator('#beast-roster [data-beast-id="'+a.id+'"]');
  await card.locator('[data-beast-bond-feed]').click();
  const fed=await exportWorld(p);
  assert.equal(beastBond(fed,a.id),63);
  assert.equal(countItem(fed,'beast_feed'),countItem(care,'beast_feed')-1);
  const hungry=p.locator('#beast-roster [data-beast-id="'+b.id+'"][data-mood=hungry]');
  await hungry.waitFor();
  await p.screenshot({path:resolve(dir,'P2-28-02-bond-and-stop-reason.png')});
  await p.reload({waitUntil:'networkidle'});
  await p.keyboard.press('v');
  await card.waitFor();assert.equal(beastBond(await exportWorld(p),a.id),63);
  console.log('[e2e:P2-28] OK: unique E pet, rendered affection and hunger, actual food transaction, persistent affection');
 }finally{await p.close();}
}
if(process.argv[1]?.endsWith('/p2-bond-e2e.ts')||process.argv[1]==='scripts/p2-bond-e2e.ts'){
 const dir=resolve('artifacts/p2-s5');mkdirSync(dir,{recursive:true});
 const b=await chromium.launch(),errors:string[]=[];
 try{await runP2Bond(b,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}finally{await b.close();}
}
