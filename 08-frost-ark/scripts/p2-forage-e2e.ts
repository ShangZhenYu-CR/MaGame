import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser,type Page } from 'playwright';
import { countItem } from '../src/sim/ark';
import { areaAt } from '../src/sim/island';
import { FISH_CHEST,islandForage } from '../src/sim/forage';
import { serializeWorld } from '../src/sim/save';
import type { WorldState } from '../src/sim/types';
import { exportWorld } from './p2-hook-e2e';
import { coastFixture,terrainZones } from './p2-coast-fixture';

async function load(p:Page,w:WorldState){
 await p.keyboard.press('i');
 await p.locator('#save-file').setInputFiles({name:'wild-food.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
 await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor({state:'attached'});
 await p.keyboard.press('Escape');
}
export async function runP2Forage(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1440,height:900}});
 p.on('console',m=>{if(m.type()==='error')errors.push('P2-20 forage console: '+m.text());});
 p.on('pageerror',e=>errors.push('P2-20 forage page: '+e.message));
 p.on('response',r=>{if(r.status()===404)errors.push('P2-20 forage 404: '+r.url());});
 try{
  const screenshot=(name:string)=>p.screenshot({path:resolve(dir,'P2-20-'+name+'.png')});
  await p.goto(url,{waitUntil:'networkidle'});
  const canvas=p.locator('#game-canvas[data-art-ready=true]');
  await canvas.waitFor();
  const f=p.locator('#fishing-hud'),track=p.locator('#fishing-track');
  await p.keyboard.press('b');
  const blue=p.locator('[data-build-kind=fishing_spot][data-affordable=true]');
  await blue.waitFor();await blue.click();
  const point=await canvas.evaluate(e=>({x:Number(e.dataset.originX)+24.5*Number(e.dataset.tileScale),y:Number(e.dataset.originY)+27.5*Number(e.dataset.tileScale)}));
  await p.mouse.move(point.x,point.y);
  await p.locator('#build-note[data-valid=true]').waitFor();
  await p.mouse.click(point.x,point.y);await p.keyboard.press('q');
  await f.waitFor();
  assert.equal(await canvas.getAttribute('data-primary-interaction'),'fishing');
  assert.equal(await p.locator('#expedition-interact kbd').isVisible(),false);
  await p.keyboard.press('e');await track.waitFor();
  await screenshot('01-line-and-timing');
  await p.keyboard.press('Escape');await track.waitFor({state:'hidden'});
  const targets=['云雾鱼','银云鲤','雾隐虾','云雾鱼','银云鲤'];
  for(const [n,fish] of targets.entries()){
   await p.keyboard.press('e');await track.waitFor();
   await p.locator('#fishing-track[data-ready=true]').waitFor({timeout:8000});
   await p.keyboard.press(n%2?'e':'Space');
   await p.getByText(new RegExp('^钓起：'+fish)).waitFor();
   if(n===4)await screenshot('02-bonus-chest');
  }
  const caught=await exportWorld(p);
  assert.equal(countItem(caught,'cloud_fish'),2);
  assert.equal(countItem(caught,'silver_cloud_carp'),2);
  assert.equal(countItem(caught,'mist_shrimp'),1);
  assert.equal(countItem(caught,FISH_CHEST),1);
  await p.keyboard.press('i');
  const open=p.getByRole('button',{name:'打开稀有漂流宝匣'});
  await open.click();
  await p.getByText('打开宝匣，获得冻铁、缆绳与冰晶。',{exact:true}).waitFor();
  const opened=await exportWorld(p);
  assert.equal(countItem(opened,FISH_CHEST),0);
  assert.equal(countItem(opened,'frost_iron_scrap'),countItem(caught,'frost_iron_scrap')+2);
  assert.equal(await p.locator('#stacks img').first().evaluate((i:HTMLImageElement)=>i.naturalWidth>0),true);
  await p.keyboard.press('Escape');
  for(const [i,kind] of (['berries','grass','tubers','crystal'] as const).entries()){
   const w=coastFixture(terrainZones[i]),patch=islandForage(w).find(n=>n.kind===kind)!;
   const dx=areaAt(w,patch.x-1.5,patch.y)==='island'?-1:1;
   Object.assign(w.player,{x:patch.x+dx*1.42,y:patch.y,warmth:62});
   assert.equal(areaAt(w,w.player.x,w.player.y),'island');
   await load(p,w);
   const ctx=p.locator('#expedition-context[data-forage="'+kind+'"][data-forage-ready=true]');
   await ctx.waitFor();
   assert.equal(await ctx.locator('#expedition-interact kbd').isVisible(),true);
   await screenshot('0'+(i+3)+'-'+kind+'-wild-site');
   await p.keyboard.press('e');
   await p.getByText(/^已采集：/).waitFor();
   await p.locator('#expedition-context[data-forage-ready=false]').waitFor();
   const bag=await exportWorld(p);
   for(const id of patch.items)assert.ok(countItem(bag,id)>countItem(w,id),id);
  }
  console.log('[e2e:P2-20] OK: default-world actual construction and five timing catches, guaranteed chest and bag opening, four biome visits and forage harvests');
 }finally{await p.close();}
}
if(process.argv[1]?.endsWith('/p2-forage-e2e.ts')||process.argv[1]==='scripts/p2-forage-e2e.ts'){
 const dir=resolve('artifacts/p2-s4');mkdirSync(dir,{recursive:true});
 const b=await chromium.launch(),errors:string[]=[];
 try{await runP2Forage(b,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}
 finally{await b.close();}
}
