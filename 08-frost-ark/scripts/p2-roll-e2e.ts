import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser,type Page } from 'playwright';
import { areaAt } from '../src/sim/island';
import { fitsOnDeck } from '../src/sim/ark';
import { createInitialWorld } from '../src/sim/world';
import { serializeWorld } from '../src/sim/save';
import type { WorldState } from '../src/sim/types';
import { exportWorld } from './p2-hook-e2e';
import { rollArena } from './p2-roll-fixture';

async function load(p:Page,w:WorldState){
 await p.keyboard.press('i');
 await p.locator('#save-file').setInputFiles({name:'roll-e2e.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
 await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor();
 await p.keyboard.press('Escape');
}

async function rollCapture(p:Page,dir:string,name:string,dirs:string[]){
  await p.evaluate(()=>{
    const canvas=document.querySelector<HTMLCanvasElement>('#game-canvas')!;
    (window as Window&{rollCapture?:Promise<string>}).rollCapture=new Promise((resolve,reject)=>{
      const observer=new MutationObserver(()=>{
        if(canvas.dataset.roll!=='guard')return;
        observer.disconnect();window.clearTimeout(timeout);
        resolve(canvas.toDataURL('image/png'));
      });
      const timeout=window.setTimeout(()=>{observer.disconnect();reject(new Error('Space did not paint a live roll'));},12000);
      observer.observe(canvas,{attributeFilter:['data-roll']});
    });
  });
  for(const key of dirs)await p.keyboard.down(key);
  try{await p.keyboard.press('Space');}
  finally{for(const key of dirs)await p.keyboard.up(key);}
  const png=await p.evaluate(()=> (window as Window&{rollCapture?:Promise<string>}).rollCapture!);
  writeFileSync(resolve(dir,name),Buffer.from(png.split(',')[1],'base64'));
  await p.locator('#game-canvas[data-roll=ready]').waitFor();
}

export async function runP2Roll(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1440,height:900}});
 p.on('pageerror',e=>errors.push('p2 roll page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('p2 roll console: '+m.text());});
 try{
  await p.goto(url,{waitUntil:'networkidle'});
  await p.locator('#game-canvas[data-art-ready=true]').waitFor();
  const corner=createInitialWorld();
  Object.assign(corner.player,{x:27.45,y:27.5});
  await load(p,corner);await rollCapture(p,dir,'P2-08-01-corner-roll.png',['d','s']);
  const edge=await exportWorld(p);
  assert.ok(fitsOnDeck(edge,edge.player.x,edge.player.y),'real diagonal roll remains fully supported at corner');
  assert.ok(edge.player.roll.stamina<100,'real roll consumes stamina');
  const fight=rollArena(165);
  await load(p,fight);
  await p.getByText('冰面正在发亮，移出预警圈。',{exact:true}).waitFor();
  const before=await exportWorld(p);
  await rollCapture(p,dir,'P2-08-02-whale-warning-roll.png',['d']);
  await p.getByText('冰甲裂开，现在按 F 反击。',{exact:true}).waitFor();
  const dodged=await exportWorld(p);
  assert.equal(areaAt(dodged,dodged.player.x,dodged.player.y),'island');
  assert.ok(dodged.player.x-before.player.x>1.7);
  assert.equal(dodged.player.hp,before.player.hp,'live whale warning is evaded with the Space input');
  await p.screenshot({path:resolve(dir,'P2-08-03-dodged-live-whale.png')});
  console.log('[e2e:P2-08] OK: Space rolls along the real corner and across whale warning circle, visible stamina and no damage');
 }finally{await p.close();}
}

if(process.argv[1]?.endsWith('/p2-roll-e2e.ts')||process.argv[1]==='scripts/p2-roll-e2e.ts'){
 const dir=resolve('artifacts/p2-s2');mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch(),errors:string[]=[];
 try{await runP2Roll(browser,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}
 finally{await browser.close();}
}
