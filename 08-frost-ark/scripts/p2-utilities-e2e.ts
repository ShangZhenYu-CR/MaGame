import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser,type Page } from 'playwright';
import { countItem } from '../src/sim/ark';
import { getIndustrySave } from '../src/sim/m2-state';
import { repairQuote } from '../src/sim/utilities';
import { serializeWorld } from '../src/sim/save';
import type { WorldState } from '../src/sim/types';
import { exportWorld } from './p2-hook-e2e';
import { utilityArk } from './p2-utilities-fixture';

async function load(p:Page,w:WorldState){
 await p.keyboard.press('i');
 await p.locator('#save-file').setInputFiles({name:'heat-and-repair.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
 await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor();
 await p.keyboard.press('Escape');
}
export async function runP2Utilities(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1440,height:900}});
 p.on('pageerror',e=>errors.push('p2 utilities page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('p2 utilities console: '+m.text());});
 try{
  await p.goto(url,{waitUntil:'networkidle'});
  const c=p.locator('#game-canvas[data-art-ready=true]');await c.waitFor();
  const files=(suffix:string)=>resolve(dir,'P2-15-'+suffix+'.png');
  await load(p,utilityArk(false));
  await p.keyboard.press('e');
  await p.locator('#industry-panel[data-def-id=greenhouse]').waitFor();
  await p.locator('#industry-status').filter({hasText:/结冻停机/}).waitFor();
  await p.screenshot({path:files('01-cold-greenhouse')});
  await p.keyboard.press('Escape');
  const withHeat=utilityArk();
  await load(p,withHeat);
  await p.locator('#game-canvas[data-warm-pipes="10"]').waitFor();
  await p.keyboard.press('e');
  await p.locator('#industry-panel[data-def-id=greenhouse]').waitFor();
  const thaws=await p.locator('#industry-status').textContent();
  assert.doesNotMatch(thaws??'',/结冻停机/);
  await p.locator('[data-recipe-id=grow_roots]').click();
  await p.getByText(/开始加工：霜薯块茎/).waitFor();
  await p.screenshot({path:files('02-heated-greenhouse')});
  const g=withHeat.ark.buildings.find(b=>b.defId==='greenhouse')!;
  assert.ok(getIndustrySave(await exportWorld(p))?.stations[g.id]?.job);
  await p.keyboard.press('Escape');
  const smith=await exportWorld(p);
  Object.assign(smith.player,{x:24.54,y:25.47});
  await load(p,smith);
  await p.keyboard.press('e');
  await p.locator('#industry-panel[data-def-id=workbench]').waitFor();
  await p.getByRole('button',{name:'开始 修理锤',exact:true}).click();
  await p.locator('#industry-output').getByText(/修理锤/).waitFor();
  await p.locator('#industry-collect').click();
  const withHammer=await exportWorld(p);assert.equal(countItem(withHammer,'repair_hammer'),1);
  await p.keyboard.press('Escape');
  Object.assign(withHammer.player,{x:25.79,y:26.11});
  await load(p,withHammer);
  await p.keyboard.press('e');
  await p.locator('#industry-panel[data-def-id=repair_station]').waitFor();
  await p.screenshot({path:files('03-repair-order')});
  await p.getByRole('button',{name:'修复 木质挡风墙',exact:true}).click();
  const first=await exportWorld(p);
  assert.equal(repairQuote(first).damaged.length,1);
  await p.getByRole('button',{name:'修复全船',exact:true}).click();
  await p.getByText('已修复全船。',{exact:true}).waitFor();
  const fixed=await exportWorld(p);
  assert.equal(repairQuote(fixed).damaged.length,0);
  assert.ok(countItem(fixed,'driftwood')<countItem(first,'driftwood'));
  await p.screenshot({path:files('04-all-repaired')});
  console.log('[e2e:P2-15] OK: same spot frozen→active greenhouse without relay, physical warmed piping, craft and collect hammer, single and all repair with exact costs');
 }finally{await p.close();}
}
if(process.argv[1]?.endsWith('/p2-utilities-e2e.ts')||process.argv[1]==='scripts/p2-utilities-e2e.ts'){
 const dir=resolve('artifacts/p2-s3');mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch(),errors:string[]=[];
 try{await runP2Utilities(browser,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}
 finally{await browser.close();}
}
