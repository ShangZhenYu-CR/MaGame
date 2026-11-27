import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser,type Page } from 'playwright';
import { createInitialWorld } from '../src/sim/world';
import { serializeWorld } from '../src/sim/save';
import { claimSunSeed } from '../src/sim/m5';
import { expandM5Chart } from '../src/sim/m5-zones';
import type { WorldState } from '../src/sim/types';
import { exportWorld } from './p2-hook-e2e';

async function load(p:Page,w:WorldState){
 await p.keyboard.press('i');
 await p.locator('#save-file').setInputFiles({name:'s1-hearth.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
 await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor();
 await p.keyboard.press('Escape');
}

export async function runP2Hearth(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1440,height:900}});
 p.on('pageerror',e=>errors.push('p2 hearth page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('p2 hearth console: '+m.text());});
 try{
  await p.goto(url,{waitUntil:'networkidle'});
  const c=p.locator('#game-canvas');
  await c.and(p.locator('[data-art-ready=true]')).waitFor();
  const start=createInitialWorld();
  Object.assign(start.player,{x:24.5,y:25.40});
  start.player.inventory[4]={itemId:'frost_iron_scrap',count:2};
  start.player.inventory[5]={itemId:'frost_iron_ingot',count:2};
  start.player.inventory[6]={itemId:'sulfur_ore',count:2};
  await load(p,start);
  const stages=['hearth-1','hearth-2','hearth-3','solar-hearth'];
  async function stage(n:number){
   await c.and(p.locator('[data-hearth-art='+stages[n-1]+']')).waitFor();
   await p.waitForFunction(n=>document.querySelector('#weather-status')?.textContent?.includes('Lv.'+n),n);
   await p.screenshot({path:resolve(dir,`P2-05-0${n}-hearth-Lv${n}.png`)});
  }
  await stage(1);
  await p.keyboard.press('u');await stage(2);
  await p.keyboard.press('u');await stage(3);
  const saved=await exportWorld(p);
  assert.equal(saved.ark.buildings[0].level,3);
  assert.equal(saved.ark.buoyancyMax,88);
  saved.day=5;saved.timeOfDay=.78;
  await load(p,saved);
  await p.getByText('大寒潮 · 主炉 Lv.3 硫磺高压炉',{exact:false}).waitFor();
  await p.waitForFunction(()=>document.querySelector('#raid-alert')!.getBoundingClientRect().top>document.querySelector('#action')!.getBoundingClientRect().bottom+4);
  await p.screenshot({path:resolve(dir,'P2-05-05-pressure-hearth-whiteout.png')});
  saved.day=2;saved.timeOfDay=.27;
  expandM5Chart(saved);
  for(const id of ['frostpine_gate','sulfur_reach','sulfur_furnace','permafrost_ruins'] as const){
   const island=saved.sky.islands.find(x=>x.id===id)!;
   if(id==='frostpine_gate'||id==='sulfur_reach')island.bossDefeated=true;else island.deltas.chest_2068=1;
   assert.ok(claimSunSeed(saved,id));
  }
  await load(p,saved);
  await p.locator('#forge-solar').click();
  await stage(4);
  console.log('[e2e:P2-05] OK: four distinct live hearths, real upgrade UI and pressurized furnace in whiteout');
 }finally{await p.close();}
}

if(process.argv[1]?.endsWith('/p2-hearth-e2e.ts')||process.argv[1]==='scripts/p2-hearth-e2e.ts'){
 const dir=resolve('artifacts/p2-s1');mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch(),errors:string[]=[];
 try{await runP2Hearth(browser,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}
 finally{await browser.close();}
}
