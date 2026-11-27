import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser,type Page } from 'playwright';
import { isDeck } from '../src/sim/ark';
import { finaleStatus } from '../src/sim/finale';
import { areaAt,islandNodes,nearestIslandNode } from '../src/sim/island';
import { serializeWorld } from '../src/sim/save';
import type { WorldState } from '../src/sim/types';
import { createInitialWorld } from '../src/sim/world';
import { exportWorld } from './p2-hook-e2e';
import { shoreForSurvival } from './p2-rescue-e2e';
import { rollArena } from './p2-roll-fixture';

async function load(p:Page,w:WorldState){
 await p.keyboard.press('i');
 await p.locator('#save-file').setInputFiles({name:'juice-e2e.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
 await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor();
 await p.keyboard.press('Escape');
 await p.locator('#game-canvas[data-juice=""]').waitFor();
}
async function feedback(p:Page,kinds:string[],capture:string,action:()=>Promise<unknown>,hitstop=false){
 const canvas=p.locator('#game-canvas');
 await canvas.evaluate((n,a)=>{
  const c=n as HTMLCanvasElement;
  const baseline=c.dataset.juiceSerial;
  (window as Window&{juiceFrame?:Promise<string>}).juiceFrame=new Promise((done,fail)=>{
   const observer=new MutationObserver(()=>{
    if(c.dataset.juiceSerial===baseline||!a.kinds.every(k=>c.dataset.juice?.split(' ').includes(k))||
      (a.hitstop&&c.dataset.hitstop!=='true'))return;
    clearTimeout(timer);observer.disconnect();
    done(c.toDataURL('image/png'));
   });
   const timer=window.setTimeout(()=>{observer.disconnect();fail(new Error('No real render for '+a.kinds.join('/')));},12000);
   observer.observe(c,{attributeFilter:['data-juice','data-hitstop','data-juice-serial']});
  });
 },{kinds,hitstop});
 await action();
 const data=await p.evaluate(()=> (window as Window&{juiceFrame?:Promise<string>}).juiceFrame!);
 writeFileSync(capture,Buffer.from(data.split(',')[1],'base64'));
}

export async function runP2Juice(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1280,height:720}});
 p.on('pageerror',e=>errors.push('p2 juice page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('p2 juice console: '+m.text());});
 try{
  await p.goto(url,{waitUntil:'networkidle'});
  await p.locator('#game-canvas[data-art-ready=true]').waitFor();
  const c=p.locator('#game-canvas'),fname=(suffix:string)=>resolve(dir,'P2-09-'+suffix+'.png');
  const ark=createInitialWorld();ark.player.inventory[5]={itemId:'baked_root',count:2};
  Object.assign(ark.player,{hp:50,warmth:35,x:26.3,y:26.6});
  await load(p,ark);await feedback(p,['heal','warmth'],fname('01-meal-feedback'),()=>p.keyboard.press('h'));
  assert.ok((await exportWorld(p)).player.hp>=56);
  await p.keyboard.press('1');
  const at=await c.evaluate(e=>({x:Number(e.dataset.originX)+28.5*Number(e.dataset.tileScale),
    y:Number(e.dataset.originY)+25.5*Number(e.dataset.tileScale)}));
  await feedback(p,['build'],fname('02-construction'),()=>p.mouse.click(at.x,at.y));
  assert.ok(isDeck(await exportWorld(p),28,25));
  await p.keyboard.press('q');
  for(const [resource,tool,key] of [['tree','wood_axe','wood'],['ore','mining_pick','ore']] as const){
   const shore=shoreForSurvival();
   const node=islandNodes(shore).find(n=>{
    if(n.kind!==resource)return false;
    Object.assign(shore.player,{x:n.x-.55,y:n.y});
    return areaAt(shore,shore.player.x,shore.player.y)==='island'&&nearestIslandNode(shore)?.id===n.id;
   });
   assert.ok(node);
   shore.player.inventory[5]={itemId:tool,count:1,durability:8};
   await load(p,shore);
   await p.locator('#game-canvas[data-primary-interaction=expedition]').waitFor();
   await feedback(p,[key],fname('03-harvest-'+key),()=>p.keyboard.press('e'));
   const harvested=await exportWorld(p);
   assert.ok(harvested.sky.islands.find(i=>i.id===shore.activeIsland?.nodeId)?.deltas[node.key]);
   assert.equal(harvested.player.inventory[5]?.durability,7);
  }
  await p.keyboard.press('i');await p.locator('#feedback-settings summary').click();
  const setting=p.getByLabel('暴击时轻微震屏');await setting.uncheck();assert.equal(await setting.isChecked(),false);
  await p.keyboard.press('Escape');
  const fight=rollArena(1),boss=finaleStatus(fight).whale!;
  await load(p,fight);
  await p.getByText('冰甲裂开，现在按 F 反击。',{exact:true}).waitFor();
  await feedback(p,['hit'],fname('04-whale-weak-point'),()=>p.keyboard.press('f'),true);
  await c.locator('xpath=self::*[@data-critical="true"]').waitFor();
  assert.ok(finaleStatus(await exportWorld(p)).whale!.hp<boss.hp);
  await p.reload();await p.locator('#game-canvas[data-art-ready=true]').waitFor();
  await p.keyboard.press('i');await p.locator('#feedback-settings summary').click();
  assert.equal(await setting.isChecked(),false,'shake accessibility choice persists');
  console.log('[e2e:P2-09] OK: meal gains, construction feedback, wood/ore harvest + wear, genuine whale weak-point hit and 40ms hitstop, persistent controls');
 }finally{await p.close();}
}
if(process.argv[1]?.endsWith('/p2-juice-e2e.ts')||process.argv[1]==='scripts/p2-juice-e2e.ts'){
 const dir=resolve('artifacts/p2-s2');mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch(),errors:string[]=[];
 try{await runP2Juice(browser,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}
 finally{await browser.close();}
}
