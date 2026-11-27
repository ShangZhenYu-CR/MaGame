import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser,type Page } from 'playwright';
import { status } from '../src/sim/elements';
import { areaAt,gangwayGeometry } from '../src/sim/island';
import { serializeWorld } from '../src/sim/save';
import { exportWorld } from './p2-hook-e2e';
import { shoreForSurvival } from './p2-rescue-e2e';

async function painted(p:Page,signal:string,path:string,act:()=>Promise<unknown>){
 await p.evaluate(kind=>{
  const canvas=document.querySelector<HTMLCanvasElement>('#game-canvas')!;
  (window as Window&{elementSnap?:Promise<string>}).elementSnap=new Promise((finish,fail)=>{
   const obs=new MutationObserver(()=>{
    if(!canvas.dataset.elemental?.split(' ').includes(kind))return;
    obs.disconnect();window.clearTimeout(timeout);
    finish(canvas.toDataURL('image/png'));
   });
   const timeout=window.setTimeout(()=>{obs.disconnect();fail(Error('Missing visible '+kind));},14000);
   obs.observe(canvas,{attributeFilter:['data-elemental']});
  });
 },signal);
 await act();
 const png=await p.evaluate(()=> (window as Window&{elementSnap?:Promise<string>}).elementSnap!);
 writeFileSync(path,Buffer.from(png.split(',')[1],'base64'));
}

export async function runP2Elements(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1280,height:720},reducedMotion:'reduce'});
 p.on('pageerror',e=>errors.push('p2 elements page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('p2 elements console: '+m.text());});
 try{
  const w=shoreForSurvival(),bridge=gangwayGeometry(w)!;
  w.player.x=bridge.x+bridge.width+5.5;
  const beast=w.wildEntities.find(e=>e.defId==='burrowback')!;
  assert.ok(beast);w.wildEntities=[beast];
  Object.assign(beast,{x:w.player.x+2.85,y:w.player.y,stunnedTicks:260});
  assert.equal(areaAt(w,beast.x,beast.y),'island');
  w.player.inventory[5]={itemId:'ice_repeater',count:1};
  w.player.inventory[6]={itemId:'fire_oil_flask',count:3};
  const files=(name:string)=>resolve(dir,'P2-10-'+name+'.png');
  await p.goto(url,{waitUntil:'networkidle'});
  const canvas=p.locator('#game-canvas[data-art-ready=true]');await canvas.waitFor();
  await p.keyboard.press('i');
  await p.locator('#save-file').setInputFiles({name:'combo-check.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
  await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor();
  await p.locator('#weapon-panel summary').click();
  await p.getByRole('button',{name:'握持寒冰连弩',exact:true}).click();
  const at=await canvas.evaluate((e,a)=>({x:Number(e.dataset.originX)+a.x*Number(e.dataset.tileScale),
    y:Number(e.dataset.originY)+a.y*Number(e.dataset.tileScale)}),{x:beast.x,y:beast.y});
  assert.equal(await p.evaluate(c=>document.elementFromPoint(c.x,c.y)?.id,at),'game-canvas');
  const shoot=()=>p.mouse.click(at.x,at.y);
  await painted(p,'chill',files('01-chilled'),shoot);
  await p.waitForFunction(()=>document.querySelector('#weapon-toggle output')?.textContent==='左键出招');
  await painted(p,'frozen',files('02-frozen'),shoot);
  await p.keyboard.press('i');
  await p.getByRole('button',{name:'握持火油投掷瓶',exact:true}).click({force:true});
  await p.waitForFunction(()=>document.querySelector('#weapon-toggle output')?.textContent==='左键出招');
  await painted(p,'melt',files('03-melt-critical'),shoot);
  const after=await exportWorld(p), hit=after.wildEntities.find(e=>e.id===beast.id)!;
  assert.ok(hit.hp<=beast.hp-38-29*1.6+1e-6);
  assert.ok(status(after,beast.id).burn>after.tick);
  await p.waitForFunction(()=>document.querySelector('#game-canvas')?.getAttribute('data-juice')?.includes('burn'));
  const later=await exportWorld(p);
  assert.ok(later.wildEntities.find(e=>e.id===beast.id)!.hp<hit.hp,'burn ticks remove actual HP');
  console.log('[e2e:P2-10] OK: same real target hit by two cold shots, then oil burst for 1.6× melt and periodic burn');
 }finally{await p.close();}
}
if(process.argv[1]?.endsWith('/p2-elements-e2e.ts')||process.argv[1]==='scripts/p2-elements-e2e.ts'){
 const dir=resolve('artifacts/p2-s2');mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch(),errors:string[]=[];
 try{await runP2Elements(browser,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}
 finally{await browser.close();}
}
