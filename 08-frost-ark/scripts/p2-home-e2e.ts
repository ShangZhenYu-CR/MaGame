import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser,type Page } from 'playwright';
import { countItem } from '../src/sim/ark';
import { roomComfort } from '../src/sim/home';
import { serializeWorld } from '../src/sim/save';
import type { WorldState } from '../src/sim/types';
import { exportWorld } from './p2-hook-e2e';
import { cozyHome } from './p2-home-fixture';

async function load(p:Page,w:WorldState){
 await p.keyboard.press('i');
 await p.locator('#save-file').setInputFiles({name:'comfort-room.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
 await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor();
 await p.keyboard.press('Escape');
}
export async function runP2Home(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1280,height:720}});
 p.on('pageerror',e=>errors.push('p2 home page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('p2 home console: '+m.text());});
 try{
  await p.goto(url,{waitUntil:'networkidle'});
  await p.locator('#game-canvas[data-art-ready=true]').waitFor();
  const shots=(suffix:string)=>resolve(dir,'P2-16-'+suffix+'.png');
  await load(p,cozyHome(false));
  await p.locator('[data-buff=comfort]').getByText('舒适 Lv.2',{exact:true}).waitFor();
  await p.screenshot({path:shots('01-bare-heated-room')});
  const home=cozyHome();
  await load(p,home);
  await p.locator('[data-buff=comfort]').getByText('舒适 Lv.5',{exact:true}).waitFor();
  await p.keyboard.press('e');
  await p.locator('#industry-panel[data-def-id=warm_cot]').waitFor();
  await p.screenshot({path:shots('02-furnished-and-bed')});
  await p.getByRole('button',{name:'睡到天亮',exact:true}).click();
  await p.getByText('睡到清晨，体力已回满。',{exact:true}).waitFor();
  const slept=await exportWorld(p);
  assert.equal(slept.day,3);assert.ok(slept.timeOfDay<.08);assert.equal(slept.player.roll.stamina,100);
  await p.keyboard.press('Escape');
  await p.locator('#game-canvas[data-cat-perched=true]').waitFor({timeout:12000});
  await p.screenshot({path:shots('03-dawn-and-latte')});
  Object.assign(slept.player,{x:26.64,y:24.06});
  await load(p,slept);
  await p.keyboard.press('e');await p.locator('#industry-panel[data-def-id=water_purifier]').waitFor();
  await p.getByRole('button',{name:'开始 净水',exact:true}).click();
  await p.locator('#industry-output').getByText('净水',{exact:true}).waitFor();
  await p.locator('#industry-collect').click();
  const watered=await exportWorld(p);assert.equal(countItem(watered,'fresh_water'),2);
  await p.keyboard.press('Escape');
  Object.assign(watered.player,{x:25.23,y:23.23});
  await load(p,watered);await p.keyboard.press('e');
  await p.locator('#industry-panel[data-def-id=tea_table]').waitFor();
  await p.getByRole('button',{name:'喝一杯热茶',exact:true}).click();
  assert.equal(countItem(await exportWorld(p),'fresh_water'),1);
  await p.screenshot({path:shots('04-hot-tea')});
  await p.keyboard.press('Escape');
  await load(p,cozyHome(true,true));await p.keyboard.press('e');
  await p.locator('#industry-panel[data-def-id=warm_cot]').waitFor();
  await p.getByText(/大寒潮正在逼近/).waitFor();
  assert.equal(await p.getByRole('button',{name:'睡到天亮',exact:true}).isDisabled(),true);
  const unsafe=await exportWorld(p);
  assert.equal(unsafe.day,5);assert.equal(roomComfort(unsafe),5);
  await p.screenshot({path:shots('05-whiteout-rest-locked')});
  console.log('[e2e:P2-16] OK: same room Lv.2→5, real bed to dawn, cat perch, filtered water and tea, whiteout sleep locked');
 }finally{await p.close();}
}
if(process.argv[1]?.endsWith('/p2-home-e2e.ts')||process.argv[1]==='scripts/p2-home-e2e.ts'){
 const dir=resolve('artifacts/p2-s3');mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch(),errors:string[]=[];
 try{await runP2Home(browser,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}
 finally{await browser.close();}
}
