import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser } from 'playwright';
import { serializeWorld } from '../src/sim/save';
import type { WorldState } from '../src/sim/types';
import { motionRaid,motionWorkshop,snowWalk } from './p2-motion-fixture';

export async function runP2Motion(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1440,height:900}}),canvas=p.locator('#game-canvas');
 p.on('pageerror',e=>errors.push('P2-37 motion page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('P2-37 motion console: '+m.text());});
 p.on('response',r=>{if(r.status()===404)errors.push('P2-37 motion 404: '+r.url());});
 const shot=(n:string)=>p.screenshot({path:resolve(dir,'P2-37-'+n+'.png')});
 async function load(w:WorldState){
  await p.locator('#save-file').setInputFiles({name:'motion-workbench-scene.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
  await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor({state:'attached'});
 }
 try{
  await p.goto(url,{waitUntil:'networkidle'});await canvas.and(p.locator('[data-art-ready=true]')).waitFor();
  await load(motionWorkshop());
  await canvas.and(p.locator('[data-living-jobs=""]')).waitFor();
  await shot('01-idle-buildings');
  await load(motionWorkshop(true));
  await canvas.and(p.locator('[data-living-jobs*="forge"][data-living-jobs*="stove"][data-living-jobs*="seedling"]')).waitFor();
  await shot('02-furnace-stove-flue-and-seedlings');
  await canvas.and(p.locator('[data-living-jobs*="ripe"]')).waitFor({timeout:48000});
  await shot('03-ripe-greenhouse');
  const previous=await canvas.getAttribute('data-turret-aims');
  await load(motionRaid());
  await p.locator('#raid-alert[data-phase=active]').waitFor();
  await p.waitForFunction(before=>document.getElementById('game-canvas')?.dataset.turretAims!==before,previous);
  await shot('04-live-tracking-turret');
  const snow=snowWalk();await load(snow.w);
  await p.keyboard.down(snow.key);await p.waitForTimeout(740);await p.keyboard.up(snow.key);
  await p.waitForFunction(()=>{
   const [boot,hoof]=(document.getElementById('game-canvas')?.dataset.snowTrails??'').split('/').map(Number);return boot>0&&hoof>0;
  },null,{timeout:7000});
  await shot('05-boot-and-hoof-trails');
  await p.waitForFunction(()=>document.getElementById('game-canvas')?.dataset.snowTrails?.startsWith('0/'),null,{timeout:14500});
  console.log('[e2e:P2-37] OK: live idle/working flues, seedlings mature, cannon tracks and real boot/hoof tracks decay');
 }finally{await p.close();}
}
if(process.argv[1]?.endsWith('/p2-motion-e2e.ts')||process.argv[1]==='scripts/p2-motion-e2e.ts'){
 const dir=resolve('artifacts/p2-s7');mkdirSync(dir,{recursive:true});const b=await chromium.launch(),errors:string[]=[];
 try{await runP2Motion(b,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}finally{await b.close();}
}
