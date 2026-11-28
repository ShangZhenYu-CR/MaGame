import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser } from 'playwright';
import { heatAt } from '../src/sim/heatField';
import { serializeWorld } from '../src/sim/save';
import type { WorldState } from '../src/sim/types';
import { exportWorld } from './p2-hook-e2e';
import { raiderArrival,raiderWarning } from './p2-raiders-fixture';

export async function runP2Raiders(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1440,height:900}}),canvas=p.locator('#game-canvas');
 p.on('pageerror',e=>errors.push('P2-31 raider page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('P2-31 raider console: '+m.text());});
 p.on('response',r=>{if(r.status()===404)errors.push('P2-31 raider 404: '+r.url());});
 async function load(w:WorldState){
  await p.locator('#save-file').setInputFiles({name:'day-'+w.day+'-raid.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
  await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor({state:'attached'});
 }
 const shot=(n:string)=>p.screenshot({path:resolve(dir,'P2-31-'+n+'.png')});
 try{
  await p.goto(url,{waitUntil:'networkidle'});await canvas.and(p.locator('[data-art-ready=true]')).waitFor();
  for(const day of [5,10]){
   await load(raiderWarning(day));
   const preview=p.locator('#raid-alert[data-phase=warning] #raid-preview');
   await preview.waitFor();
   const tips=await preview.innerText();
   for(const word of ['第 1 波','第 2 波','第 3 波','霜刺飞蝠','寒渊吸热灵','冰雾祭司'])assert.ok(tips.includes(word),word);
   if(day===5)await shot('01-wave-preview');
   const {w,wraith}=raiderArrival(day);
   const warm=heatAt(w,wraith.x,wraith.y);
   await load(w);
   await p.locator('#raid-alert[data-phase=active][data-wave="3"]').waitFor();
   await p.waitForTimeout(1400);
   const saved=await exportWorld(p);
   for(const id of ['frostspike_bat','heatwraith','mist_priest'])assert.ok(saved.wildEntities.some(v=>v.defId===id),id);
   assert.ok(heatAt(saved,wraith.x,wraith.y)<warm-3,`day ${day}: ${warm} -> ${heatAt(saved,wraith.x,wraith.y)}`);
   await shot(day===5?'02-five-cold-wave':'03-ten-thermal-siphon');
  }
  console.log('[e2e:P2-31] OK: forecast names & honest spawn set on Day 5 and Day 10, realized heat sink reductions');
 }finally{await p.close();}
}
if(process.argv[1]?.endsWith('/p2-raiders-e2e.ts')||process.argv[1]==='scripts/p2-raiders-e2e.ts'){
 const dir=resolve('artifacts/p2-s6');mkdirSync(dir,{recursive:true});
 const b=await chromium.launch(),errors:string[]=[];
 try{await runP2Raiders(b,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}finally{await b.close();}
}
