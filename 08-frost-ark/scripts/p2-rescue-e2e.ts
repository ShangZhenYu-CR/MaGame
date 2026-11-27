import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { chromium, type Browser } from 'playwright';
import { createInitialWorld,stepWorld } from '../src/sim/world';
import { helmPoint,setDestination,toggleCruise } from '../src/sim/sky-map';
import { areaAt,gangwayGeometry,toggleGangway } from '../src/sim/island';
import { serializeWorld } from '../src/sim/save';

export async function runP2Rescue(browser:Browser,url:string,dir:string,errors:string[]):Promise<void>{
 const p=await browser.newPage({viewport:{width:1280,height:720}});
 p.on('pageerror',e=>errors.push('rescue page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('rescue console: '+m.text());});
 try{
   const w=createInitialWorld(),helm=helmPoint(w);
   Object.assign(w.player,helm);
   assert.equal(setDestination(w,'shallows_lantern'),null);
   assert.equal(toggleCruise(w),null);
   stepWorld(w,600);
   const g=gangwayGeometry(w)!;
   Object.assign(w.player,{x:g.x-.5,y:g.y+.5});
   assert.equal(toggleGangway(w),null);
   for(let n=0;n<100&&!w.activeIsland;n++)stepWorld(w,1,{x:1,y:0});
   assert.equal(areaAt(w,w.player.x,w.player.y),'island');
   // Shorten setup, not the damage path. The browser's real climate must
   // drive the player to zero; do not import an already unconscious player.
   Object.assign(w.player,{warmth:1,hp:2});
   await p.goto(url,{waitUntil:'networkidle'});
   await p.locator('#game-canvas[data-art-ready=true]').waitFor();
   await p.keyboard.press('i');
   await p.locator('#save-file').setInputFiles({name:'before-fall.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
   await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor();
   await p.keyboard.press('Escape');
   await p.locator('#game-canvas[data-player-state=down]').waitFor();
   await p.getByText('马楠失去意识',{exact:true}).waitFor();
   await p.keyboard.press('e');await p.keyboard.press('b');
   assert.equal(await p.locator('#build-catalog').isVisible(),false);
   await p.screenshot({path:resolve(dir,'P2-01-01-unconscious.png')});
   await p.locator('#game-canvas[data-player-state=shield]').waitFor();
   await p.getByText('复苏护盾',{exact:true}).waitFor();
   assert.ok(await p.locator('#life-meter').evaluate(e=>(e as HTMLMeterElement).value)>0);
   assert.equal(await p.locator('#expedition-context').getAttribute('data-area'),'ark');
   await p.screenshot({path:resolve(dir,'P2-01-02-rescued.png')});
   console.log('[e2e:P2-01] OK: actual cold triggers fall, locks actions, emergency return and recovery HUD');
 }finally{await p.close();}
}

if(process.argv[1]?.endsWith('/p2-rescue-e2e.ts')||process.argv[1]==='scripts/p2-rescue-e2e.ts'){
 const dir=resolve('artifacts/p2-s1');mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch(),errors:string[]=[];
 try{await runP2Rescue(browser,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}
 finally{await browser.close();}
}
