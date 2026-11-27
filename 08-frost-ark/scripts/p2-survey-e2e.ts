import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser,type Page } from 'playwright';
import { proceduralIsland } from '../src/sim/expansion';
import { serializeWorld } from '../src/sim/save';
import { helmPoint } from '../src/sim/sky-map';
import type { WorldState } from '../src/sim/types';
import { createInitialWorld } from '../src/sim/world';
import { exportWorld } from './p2-hook-e2e';

async function load(p:Page,w:WorldState){
 await p.keyboard.press('i');
 await p.locator('#save-file').setInputFiles({name:'survey-sky.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
 await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor({state:'attached'});
 await p.keyboard.press('Escape');
}

export async function runP2Survey(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1280,height:720}});
 p.on('pageerror',e=>errors.push('P2-23 survey page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('P2-23 survey console: '+m.text());});
 p.on('response',r=>{if(r.status()===404)errors.push('P2-23 survey 404: '+r.url());});
 try{
  await p.goto(url,{waitUntil:'networkidle'});
  const canvas=p.locator('#game-canvas[data-art-ready=true]'),map=p.locator('#sky-map');
  await canvas.waitFor();
  const w=createInitialWorld(271128);Object.assign(w.player,helmPoint(w));
  await load(p,w);
  await p.keyboard.press('n');
  await p.locator('#sky-island-list button[data-generated=false]').last().waitFor({state:'attached'});
  assert.equal(await p.locator('#sky-island-list button[data-generated=false]').count(),8);
  const radar=map.locator('#sky-new-scan');await radar.click();
  await p.getByText('发现 2 处新远征信号。',{exact:true}).first().waitFor();
  const a=map.locator('#sky-island-list button[data-generated=true]');
  assert.equal(await a.count(),2);
  assert.equal(await radar.isDisabled(),true);
  const newId=await a.first().getAttribute('data-island-id');assert.ok(newId?.startsWith('exp1_'));
  await a.first().click();
  await p.screenshot({path:resolve(dir,'P2-23-01-new-signals.png')});
  await map.locator('#sky-set-course').click();await map.locator('#sky-cruise').click();
  await map.locator('#sky-nav-status[data-nav-state=docked]').waitFor({timeout:52000});
  await p.keyboard.press('Escape');
  const arrived=await exportWorld(p);
  assert.equal(arrived.ark.anchoredIslandId,newId);
  assert.equal(arrived.sky.islands.filter(proceduralIsland).length,2);
  assert.equal(arrived.sky.islands.filter(n=>!proceduralIsland(n)).length,8);
  await p.screenshot({path:resolve(dir,'P2-23-02-new-island-docked.png')});
  await p.setViewportSize({width:1440,height:900});
  for(const [index,[zone,x]] of ([['cloud_shallows',1],['frostpine_isles',17],['sulfur_rift',29],['aurora_zenith',46]] as const).entries()){
    const s=createInitialWorld(202608);s.sky.x=x;s.timeOfDay=.24;
    await load(p,s);
    await p.locator('#game-canvas[data-wind-zone="'+zone+'"]').waitFor();
    await p.locator('#action[data-shown=false]').waitFor({state:'attached'});
    await p.screenshot({path:resolve(dir,'P2-23-0'+(index+3)+'-'+zone+'.png')});
  }
  console.log('[e2e:P2-23] OK: actual two new on-demand chart signals, successful cruise and docking, 8 named anchors intact and four viewport wind-region treatments');
 }finally{await p.close();}
}
if(process.argv[1]?.endsWith('/p2-survey-e2e.ts')||process.argv[1]==='scripts/p2-survey-e2e.ts'){
 const dir=resolve('artifacts/p2-s4');mkdirSync(dir,{recursive:true});
 const b=await chromium.launch(),errors:string[]=[];
 try{await runP2Survey(b,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}
 finally{await b.close();}
}
