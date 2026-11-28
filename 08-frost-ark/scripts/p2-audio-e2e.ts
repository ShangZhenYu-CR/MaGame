import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser } from 'playwright';
import { serializeWorld } from '../src/sim/save';
import { createInitialWorld } from '../src/sim/world';
import type { WorldState } from '../src/sim/types';
import { raiderArrival } from './p2-raiders-fixture';

export async function runP2Audio(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1280,height:720}}),canvas=p.locator('#game-canvas');
 p.on('pageerror',e=>errors.push('P2-36 audio page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('P2-36 audio console: '+m.text());});
 p.on('response',r=>{if(r.status()===404)errors.push('P2-36 audio 404: '+r.url());});
 const screen=(n:string)=>p.screenshot({path:resolve(dir,'P2-36-'+n+'.png')});
 async function load(w:WorldState){
  await p.locator('#save-file').setInputFiles({name:'audio-scene.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
  await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor({state:'attached'});
 }
 const metrics=async()=>JSON.parse(await canvas.getAttribute('data-audio-proof')??'{}');
 try{
  await p.goto(url,{waitUntil:'networkidle'});await canvas.and(p.locator('[data-art-ready=true]')).waitFor();
  assert.equal(await canvas.getAttribute('data-audio-running'),'false');
  await p.locator('#audio-mix-toggle').click();
  await canvas.and(p.locator('[data-audio-running=true][data-audio-track=day]')).waitFor();
  await p.waitForTimeout(900);
  let state=await metrics();
  assert.ok(state.tally.day>1&&state.tally.battle===0&&state.tally.blizzard===0&&state.peak>.0001&&state.peak<.88);
  await p.locator('#music-volume').fill('35');
  await p.locator('#effects-volume').fill('61');
  await p.locator('#music-mute').check();
  assert.equal(await p.locator('#effects-mute').isChecked(),false);
  await screen('01-independent-mix');
  await p.locator('#music-mute').uncheck();
  await p.keyboard.press('Escape');
  const night=createInitialWorld(202608);night.timeOfDay=.81;night.weather='snow';night.ambientTemp=-22;
  await load(night);
  await canvas.and(p.locator('[data-audio-track=blizzard]')).waitFor();
  await p.waitForTimeout(1250);state=await metrics();
  assert.ok(state.tally.blizzard>0&&state.tally.battle===0&&state.fade>0&&state.peak<.88);
  const battle=raiderArrival(5).w;await load(battle);
  await canvas.and(p.locator('[data-audio-track=battle]')).waitFor();
  await p.waitForTimeout(800);const combat=await metrics();
  assert.ok(combat.tally.battle>2&&combat.fade>state.fade&&combat.peak<.88&&combat.peak>.0001);
  await p.keyboard.press('k');
  await p.locator('#audio-mix-scene').getByText(/战斗鼓点/).waitFor();
  await screen('02-battle-score');
  await p.locator('#effects-mute').check();
  await p.reload({waitUntil:'networkidle'});await p.locator('#audio-mix-toggle').click();
  assert.equal(await p.locator('#music-volume').inputValue(),'35');
  assert.equal(await p.locator('#effects-volume').inputValue(),'61');
  assert.equal(await p.locator('#effects-mute').isChecked(),true);
  assert.equal(await p.locator('#music-mute').isChecked(),false);
  console.log('[e2e:P2-36] OK: real Web Audio unlock, three actual scheduled score layers, meter below clipping, independent persisted volume and mutes');
 }finally{await p.close();}
}
if(process.argv[1]?.endsWith('/p2-audio-e2e.ts')||process.argv[1]==='scripts/p2-audio-e2e.ts'){
 const dir=resolve('artifacts/p2-s7');mkdirSync(dir,{recursive:true});const b=await chromium.launch(),errors:string[]=[];
 try{await runP2Audio(b,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}finally{await b.close();}
}
