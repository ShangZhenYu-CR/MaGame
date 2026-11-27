import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser,type Page } from 'playwright';
import { itemNames,countItem } from '../src/sim/ark';
import { createInitialWorld,stepWorld } from '../src/sim/world';
import { areaAt,dockedIsland,gangwayGeometry,toggleGangway } from '../src/sim/island';
import { helmPoint,setDestination,toggleCruise } from '../src/sim/sky-map';
import { weaponRecipe,weaponSpecs } from '../src/sim/weapons';
import { serializeWorld } from '../src/sim/save';
import type { WorldState } from '../src/sim/types';
import { exportWorld } from './p2-hook-e2e';
import { shoreForSurvival } from './p2-rescue-e2e';

async function load(p:Page,w:WorldState){
 await p.keyboard.press('i');
 await p.locator('#save-file').setInputFiles({name:'weapon-review.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
 await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor();
 await p.keyboard.press('Escape');
}
function guardianFixture(){
 const w=createInitialWorld();
 stepWorld(w);Object.assign(w.player,helmPoint(w));
 assert.equal(setDestination(w,'frostpine_gate'),null);assert.equal(toggleCruise(w),null);
 for(let n=0;n<180&&!w.ark.anchoredIslandId;n++)stepWorld(w,16);
 const g=gangwayGeometry(w)!;
 assert.ok(g&&w.ark.anchoredIslandId==='frostpine_gate');
 Object.assign(w.player,{x:g.x-.5,y:g.y+.5});assert.equal(toggleGangway(w),null);
 w.activeIsland=dockedIsland(w);
 Object.assign(w.player,{x:g.x+g.width+8.4,y:g.y+.50});stepWorld(w);
 const boss=w.wildEntities.find(e=>e.kind==='boss')!;
 assert.ok(boss);Object.assign(w.player,{x:boss.x-6.1,y:boss.y});
 return {w,id:boss.id};
}

export async function runP2Weapons(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1440,height:900}});
 p.on('pageerror',e=>errors.push('weapons page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('weapons console: '+m.text());});
 try{
  await p.goto(url,{waitUntil:'networkidle'});
  await p.locator('#game-canvas[data-art-ready=true]').waitFor();
  const w=createInitialWorld(),costs=new Map<string,number>();
  for(const d of weaponSpecs)for(const q of weaponRecipe(d.id)!.inputs)costs.set(q.itemId,(costs.get(q.itemId)??0)+q.count);
  let i=3;for(const [id,count] of costs)w.player.inventory[i++]={itemId:id,count};
  await load(p,w);await p.keyboard.press('i');await p.locator('#weapon-panel summary').click();
  for(const d of weaponSpecs)await p.getByRole('button',{name:'制作'+itemNames.get(d.id),exact:true}).click();
  assert.ok(await p.locator('#weapon-recipes img').evaluateAll(imgs=>imgs.length===5&&imgs.every(e=>e instanceof HTMLImageElement&&e.complete&&e.naturalWidth>=48)));
  const made=await exportWorld(p);
  for(const d of weaponSpecs)assert.ok(countItem(made,d.id)>0);
  await p.locator('#weapon-panel summary').scrollIntoViewIfNeeded();
  await p.screenshot({path:resolve(dir,'P2-07-01-crafted-armory.png')});
  await p.keyboard.press('Escape');
  const distances={thrust:2.3,sweep:1.45,bolt:6.1,throw:4.6,flame:3.25};
  for(const d of weaponSpecs){
   const {w:trial,id}=d.style==='bolt'?guardianFixture():(()=>{
     const w=shoreForSurvival(),g=gangwayGeometry(w)!;
     w.player.x=g.x+g.width+5.4;
     const enemy=w.wildEntities.find(e=>e.kind==='beast')!;
     assert.ok(enemy);w.wildEntities=[enemy];
     Object.assign(enemy,{x:w.player.x+distances[d.style],y:w.player.y,stunnedTicks:210});
     assert.equal(areaAt(w,enemy.x,enemy.y),'island');
     return {w,id:enemy.id};
   })();
   trial.player.inventory=structuredClone(made.player.inventory);
   trial.player.weapon=null;await load(p,trial);
   await p.keyboard.press('i');
   if(!await p.locator('#weapon-panel').evaluate(e=>(e as HTMLDetailsElement).open))await p.locator('#weapon-panel summary').click();
   await p.getByRole('button',{name:'握持'+itemNames.get(d.id),exact:true}).click();
   const view=p.locator('#game-canvas[data-mode=weapon]');await view.waitFor();
   const before=await exportWorld(p),enemy=before.wildEntities.find(e=>e.id===id)!;
   assert.ok(enemy&&enemy.hp>0);
   const cursor=await view.evaluate((e,a)=>({x:Number(e.dataset.originX)+a.x*Number(e.dataset.tileScale),
     y:Number(e.dataset.originY)+a.y*Number(e.dataset.tileScale)}),{x:enemy.x,y:enemy.y});
   // Record the first genuinely painted attack frame on the normal client.
   // Arm the recorder before the real mouse input so parallel slow frames
   // cannot skip fast slashes or the arrow's whole flight.
   await p.bringToFront();
   const pointed=await p.evaluate(c=>document.elementFromPoint(c.x,c.y)?.id,cursor);
   assert.equal(pointed,'game-canvas',`mouse target was covered for ${d.style}: ${pointed}`);
   console.log('[e2e:P2-07] aiming',d.style,cursor);
   await view.evaluate((node,style)=>{
     const canvas=node as HTMLCanvasElement;
     (window as Window&{shotCapture?:Promise<string>}).shotCapture=new Promise((resolve,reject)=>{
       const start=performance.now();
       const sampler=window.setInterval(()=>{
         const seen=canvas.dataset.weaponImpact===style||(style==='bolt'&&canvas.dataset.weaponFlight===style);
         if(seen){
           window.clearInterval(sampler);
           try{resolve(canvas.toDataURL('image/png'));}catch(error){reject(error);}
         }else if(performance.now()-start>8000){
           window.clearInterval(sampler);reject(new Error('No painted frame for '+style));
         }
       },22);
     });
   },d.style);
   await p.mouse.click(cursor.x,cursor.y);
   const capture=await p.evaluate(()=> (window as Window&{shotCapture?:Promise<string>}).shotCapture!);
   writeFileSync(resolve(dir,'P2-07-'+d.style+'-combat.png'),Buffer.from(capture.split(',')[1],'base64'));
   await p.waitForTimeout(900);
   const later=await exportWorld(p),result=later.wildEntities.find(e=>e.id===id);
   assert.ok((result?.hp??0)<enemy.hp,`${d.id} did not damage the forward target`);
   if(d.style==='throw')assert.equal(countItem(later,d.id),countItem(made,d.id)-1);
   console.log('[e2e:P2-07] hit',d.id,enemy.hp,result?.hp??0);
   await p.keyboard.press('q');
  }
  await p.keyboard.press('i');
  if(!await p.locator('#weapon-panel').evaluate(e=>(e as HTMLDetailsElement).open))await p.locator('#weapon-panel summary').click();
  await p.getByRole('button',{name:'卸下熔核喷射器',exact:true}).click();
  assert.equal((await exportWorld(p)).player.weapon,null);
  console.log('[e2e:P2-07] OK: all five crafted and fired, including a real guardian projectile hit and cleanly unequipping');
 }finally{await p.close();}
}

if(process.argv[1]?.endsWith('/p2-weapons-e2e.ts')||process.argv[1]==='scripts/p2-weapons-e2e.ts'){
 const dir=resolve('artifacts/p2-s2');mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch(),errors:string[]=[];
 try{await runP2Weapons(browser,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}
 finally{await browser.close();}
}
