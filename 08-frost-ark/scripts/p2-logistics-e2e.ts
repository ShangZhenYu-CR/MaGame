import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser,type Page } from 'playwright';
import { getIndustrySave } from '../src/sim/m2-state';
import { serializeWorld } from '../src/sim/save';
import { storageContents } from '../src/sim/storage-box';
import type { WorldState } from '../src/sim/types';
import { exportWorld } from './p2-hook-e2e';
import { logisticsArk } from './p2-logistics-fixture';

async function load(p:Page,w:WorldState){
 await p.keyboard.press('i');
 await p.locator('#save-file').setInputFiles({name:'logistics-check.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
 await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor();
 await p.keyboard.press('Escape');
}
export async function runP2Logistics(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1280,height:720}});
 p.on('pageerror',e=>errors.push('p2 logistics page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('p2 logistics console: '+m.text());});
 try{
  await p.goto(url,{waitUntil:'networkidle'});
  const c=p.locator('#game-canvas[data-art-ready=true]');
  await c.waitFor();await p.bringToFront();
  const route=async (target:string)=>{
   await p.locator('#game-canvas[data-primary-interaction=station]').waitFor({timeout:8000});
   await p.keyboard.press('e');
   const input=p.getByRole('combobox',{name:'输送目标',exact:true});
   await input.waitFor();await input.selectOption(target);
   await p.getByText('输送目标已更新。',{exact:true}).waitFor();
  };
  const blocked=logisticsArk(true);
  await load(p,blocked.w);
  await route('storage_main');
  await p.waitForTimeout(3800);
  const full=await exportWorld(p),saved=getIndustrySave(full)?.stations[blocked.sorter.id];
  assert.equal(storageContents(full).find(s=>s.itemId==='rope')?.count,99);
  assert.ok(saved?.output.some(s=>s.itemId==='rope'&&s.count>=7),'valid packed full destination preserved all incoming rope at sorter');
  await p.screenshot({path:resolve(dir,'P2-13-01-full-destination.png')});
  await p.keyboard.press('Escape');
  const trial=logisticsArk();
  await load(p,trial.w);await route('auto');
  await p.screenshot({path:resolve(dir,'P2-13-02-automatic-routing.png')});
  await p.keyboard.press('Escape');
  const before=await exportWorld(p),begin=Date.now();
  await p.evaluate(()=>{
   const c=document.querySelector<HTMLCanvasElement>('#game-canvas')!;
   const win=window as Window&{networkTrace?:{tick:number}[]};
   win.networkTrace=[];
   const t=new MutationObserver(()=>{
    try{
     const sample=JSON.parse(c.dataset.logistics??'');
     if(sample.tick!==win.networkTrace!.at(-1)?.tick)win.networkTrace!.push(sample);
    }catch{}
   });
   t.observe(c,{attributeFilter:['data-logistics']});
  });
  // No inputs or injected resources during this measured live run.
  await p.waitForFunction(({started,tick})=>{
   try{
    const raw=document.querySelector('#game-canvas')?.getAttribute('data-logistics');
    const s=JSON.parse(raw??'');
    return Date.now()-started>=180000&&s.tick>=tick+5400&&s.hearthRefills>0&&s.furnaceRefills>0&&s.storage>0&&s.feed>0;
   }catch{return false;}
  },{started:begin,tick:before.tick},{timeout:440000,polling:500});
  const elapsed=Date.now()-begin;
  const after=await exportWorld(p),samples=await p.evaluate(()=> (window as Window&{networkTrace?:{tick:number;hearth:number;hearthRefills:number;furnaceRefills:number;storage:number;feed:number}[]}).networkTrace!);
  const h=after.ark.buildings.find(b=>b.defId==='hearth_core')!,f=after.ark.buildings.find(b=>b.defId==='furnace')!;
  assert.ok(h.fuel>0&&f.fuel>0);
  assert.ok((storageContents(after).find(s=>s.itemId==='rope')?.count??0)>=7);
  assert.ok((getIndustrySave(after)?.stations[f.id]?.output.find(s=>s.itemId==='frost_iron_ingot')?.count??0)>=3);
  assert.ok(samples.length>=120&&samples.at(-1)!.tick-before.tick>=5400&&elapsed>=180000);
  assert.ok(samples.some((s,i)=>i>0&&s.hearth-samples[i-1].hearth>12&&s.hearthRefills>samples[i-1].hearthRefills),'fuel trace has measured upward automatic refills');
  await p.screenshot({path:resolve(dir,'P2-13-03-real-three-minutes.png')});
  writeFileSync(resolve(dir,'P2-13-live-logistics.json'),JSON.stringify({elapsed,ticks:after.tick-before.tick,
    before:before.ark.buildings.filter(x=>x.defId==='hearth_core'||x.defId==='furnace'),
    after:[h,f],locker:storageContents(after),samples},null,2));
  console.log('[e2e:P2-13] OK: '+(elapsed/1000).toFixed(1)+' real seconds, '+(after.tick-before.tick)+' ticks; full-chest conservation, next routing, physical hearth+furnace refills, storage and feed');
 }finally{await p.close();}
}
if(process.argv[1]?.endsWith('/p2-logistics-e2e.ts')||process.argv[1]==='scripts/p2-logistics-e2e.ts'){
 const dir=resolve('artifacts/p2-s3');mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch(),errors:string[]=[];
 try{await runP2Logistics(browser,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}
 finally{await browser.close();}
}
