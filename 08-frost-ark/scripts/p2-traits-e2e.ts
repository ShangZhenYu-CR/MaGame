import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser,type Page } from 'playwright';
import { traitWorkRate } from '../src/sim/beast-traits';
import { serializeWorld } from '../src/sim/save';
import type { WorldState } from '../src/sim/types';
import { traitsFixture } from './p2-traits-fixture';
import { exportWorld } from './p2-hook-e2e';

async function load(p:Page,w:WorldState){
 await p.keyboard.press('i');
 await p.locator('#save-file').setInputFiles({name:'individual-traits.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
 await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor({state:'attached'});
 await p.keyboard.press('Escape');
}
export async function runP2Traits(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1280,height:720}});
 p.on('pageerror',e=>errors.push('P2-24 trait page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('P2-24 trait console: '+m.text());});
 p.on('response',r=>{if(r.status()===404)errors.push('P2-24 trait 404: '+r.url());});
 try{
  await p.goto(url,{waitUntil:'networkidle'});
  await p.locator('#game-canvas[data-art-ready=true]').waitFor();
  const {w,rapid,normal}=traitsFixture();
  await load(p,w);
  await p.keyboard.press('v');
  const roster=p.locator('#beast-roster'),a=roster.locator('[data-beast-id="'+rapid.id+'"]'),b=roster.locator('[data-beast-id="'+normal.id+'"]');
  await a.waitFor();await b.waitFor();
  const noOverlap=()=>p.waitForFunction(()=>{
   const a=document.querySelector('#beast-roster')!.getBoundingClientRect(),weather=document.querySelector('.sector')!.getBoundingClientRect(),bar=document.querySelector('.quickdock')!.getBoundingClientRect();
   return a.top>=weather.bottom+6&&a.bottom<bar.top+1;
  });
  await noOverlap();
  assert.equal(await a.getAttribute('data-species'),await b.getAttribute('data-species'));
  await a.locator('[data-trait=diligent_digger]').waitFor();
  assert.equal(await a.locator('[data-beast-work-rate]').textContent(),'工作 '+Math.round(traitWorkRate(w,rapid)*100)+'%');
  assert.equal(await b.locator('[data-beast-work-rate]').textContent(),'工作 100%');
  assert.notDeepEqual(await a.locator('[data-trait]').allTextContents(),await b.locator('[data-trait]').allTextContents());
  const at=await exportWorld(p),fast=at.beasts.find(v=>v.id===rapid.id)!,slow=at.beasts.find(v=>v.id===normal.id)!;
  assert.ok(fast.workCooldown>0&&fast.workCooldown+28<slow.workCooldown);
  await p.screenshot({path:resolve(dir,'P2-24-01-same-species-individual-traits.png')});
  await a.getByText('改名',{exact:true}).click();
  const input=a.getByRole('textbox',{name:'云兽昵称'});
  await input.fill('松铃');
  await input.press('End');await input.pressSequentially('WASD');
  assert.equal(await input.inputValue(),'松铃WASD');
  await p.keyboard.press('Escape');
  assert.equal(await input.isVisible(),false);
  await roster.waitFor();
  await a.getByText('改名',{exact:true}).click();
  await input.fill('松铃');await input.press('Enter');
  await a.getByText('松铃',{exact:true}).waitFor();
  await p.screenshot({path:resolve(dir,'P2-24-02-renamed-frost-yak.png')});
  await p.reload({waitUntil:'networkidle'});
  await p.locator('#game-canvas[data-art-ready=true]').waitFor();
  await p.keyboard.press('v');
  await a.getByText('松铃',{exact:true}).waitFor();await a.locator('[data-trait=diligent_digger]').waitFor();
  await p.setViewportSize({width:1920,height:1080});
  await noOverlap();
  await p.screenshot({path:resolve(dir,'P2-24-03-name-persists-1080p.png')});
  console.log('[e2e:P2-24] OK: same species 2 trait patterns and timed work stats, typing does not move player, Esc subpanel, rename persists');
 }finally{await p.close();}
}
if(process.argv[1]?.endsWith('/p2-traits-e2e.ts')||process.argv[1]==='scripts/p2-traits-e2e.ts'){
 const dir=resolve('artifacts/p2-s5');mkdirSync(dir,{recursive:true});
 const b=await chromium.launch(),errors:string[]=[];
 try{await runP2Traits(b,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}
 finally{await b.close();}
}
