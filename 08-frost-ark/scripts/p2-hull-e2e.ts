import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser,type Page } from 'playwright';
import { createInitialWorld } from '../src/sim/world';
import { build } from '../src/sim/ark';
import { serializeWorld } from '../src/sim/save';
import type { WorldState } from '../src/sim/types';

async function load(p:Page,w:WorldState){
 await p.keyboard.press('i');
 await p.locator('#save-file').setInputFiles({name:'p2-hull-test.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
 await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor();
 await p.keyboard.press('Escape');
}

export async function runP2Hull(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1440,height:900}});
 p.on('pageerror',e=>errors.push('p2 hull page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('p2 hull console: '+m.text());});
 try{
  await p.goto(url,{waitUntil:'networkidle'});
  const c=p.locator('#game-canvas');
  await c.and(p.locator('[data-art-ready=true][data-hull-cones="7"]')).waitFor();
  await p.keyboard.press('1');
  const point=await c.evaluate(e=>({x:Number(e.dataset.originX)+20.5*Number(e.dataset.tileScale),y:Number(e.dataset.originY)+24.5*Number(e.dataset.tileScale)}));
  await p.mouse.move(point.x,point.y);
  await p.locator('#build-note[data-valid=true]').waitFor();
  await p.mouse.click(point.x,point.y);
  await p.getByText('甲板已拼接，可以走上去。',{exact:true}).waitFor();
  await p.keyboard.press('q');
  assert.equal(await c.getAttribute('data-hull-cones'),'7');
  assert.equal(await c.getAttribute('data-hull-inner-corners'),'2');
  await p.screenshot({path:resolve(dir,'P2-04-01-single-cell-no-icicle.png')});
  // Build a legal T/cross profile with the same sim placement API, then
  // pan and zoom the actual browser scene; tip classification must not change.
  const hull=createInitialWorld();
  hull.player.inventory[1]={itemId:'driftwood',count:50};
  for(const [x,y] of [[20,24],[19,24],[28,24],[29,24],[24,20],[24,19],[24,28],[24,29],[25,28],[23,29]]){
    assert.ok(build(hull,'wood_deck',x,y),'fixture tile can only be placed by legal adjacency and float budget');
  }
  await load(p,hull);await c.and(p.locator('[data-hull-inner-corners="10"]')).waitFor();
  const original=await c.getAttribute('data-hull-cones');
  await p.mouse.move(720,400);
  for(let i=0;i<3;i++){
   const before=Number(await c.getAttribute('data-tile-scale'));
   await p.mouse.wheel(0,120);
   await p.waitForFunction(scale=>Number(document.querySelector<HTMLCanvasElement>('#game-canvas')!.dataset.tileScale)<scale,before);
  }
  await p.waitForFunction(()=>Number(document.querySelector<HTMLCanvasElement>('#game-canvas')!.dataset.tileScale)<=56);
  const zoomedOut=Number(await c.getAttribute('data-tile-scale'));
  await p.screenshot({path:resolve(dir,'P2-04-02-irregular-hull.png')});
  await p.mouse.wheel(0,-120);
  await p.waitForFunction(scale=>Number(document.querySelector<HTMLCanvasElement>('#game-canvas')!.dataset.tileScale)>scale,zoomedOut);
  assert.equal(await c.getAttribute('data-hull-cones'),original);
  assert.equal(await c.getAttribute('data-hull-inner-corners'),'10');
  console.log('[e2e:P2-04] OK: actual side placement, no extra tall cone, continuous irregular rails, stable when zoomed');
 }finally{await p.close();}
}

if(process.argv[1]?.endsWith('/p2-hull-e2e.ts')||process.argv[1]==='scripts/p2-hull-e2e.ts'){
 const dir=resolve('artifacts/p2-s1');mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch(),errors:string[]=[];
 try{await runP2Hull(browser,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}
 finally{await browser.close();}
}
