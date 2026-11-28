import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser } from 'playwright';
import { achievementView } from '../src/sim/achievements';
import { exportWorld } from './p2-hook-e2e';

export async function runP2Achievements(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1440,height:900}}),canvas=p.locator('#game-canvas');
 p.on('pageerror',e=>errors.push('P2-40 medals page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('P2-40 medals console: '+m.text());});
 p.on('response',r=>{if(r.status()===404)errors.push('P2-40 medals 404: '+r.url());});
 const shot=(n:string)=>p.screenshot({path:resolve(dir,'P2-40-'+n+'.png')});
 const earned=(id:string)=>p.locator('#achievement-toast[data-medal="'+id+'"]');
 try{
  await p.goto(url,{waitUntil:'networkidle'});
  await p.locator('#voyage-title').waitFor();
  await p.locator('#voyage-seed').fill('202608');await p.locator('#voyage-start').click();
  await p.locator('#voyage-title').waitFor({state:'hidden'});
  await canvas.and(p.locator('[data-art-ready=true]')).waitFor();
  for(let j=0;j<19&&!(await earned('spark').isVisible());j++){
   await p.keyboard.press('r');await p.waitForTimeout(800);
  }
  await earned('spark').waitFor();await shot('01-spark-earned');
  await p.keyboard.press('1');
  for(const x of [24,25,26]){
   const pt=await canvas.evaluate((el,x)=>{
    const c=el as HTMLCanvasElement,r=c.getBoundingClientRect(),s=Number(c.dataset.tileScale);
    return {x:r.left+(Number(c.dataset.originX)+(x+.5)*s)*r.width/c.width,y:r.top+(Number(c.dataset.originY)+28.5*s)*r.height/c.height};
   },x);
   await p.mouse.click(pt.x,pt.y);
  }
  await earned('deck').waitFor({timeout:5500});await shot('02-deck-earned');
  await p.keyboard.press('q');await p.keyboard.press('Space');
  await earned('roll').waitFor({timeout:5500});await shot('03-dodge-earned');
  await p.keyboard.press('o');const wall=p.locator('#achievement-panel');await wall.waitFor();
  assert.equal(await wall.locator('[data-medal]').count(),24);
  assert.equal(await wall.locator('[data-earned=true]').count(),3);
  const images=await wall.locator('li img').evaluateAll(async nodes=>{
   await Promise.all(nodes.map(x=>(x as HTMLImageElement).decode()));
   return nodes.every(x=>(x as HTMLImageElement).naturalWidth===72);
  });
  assert.equal(images,true);await shot('04-full-24-medal-wall');
  const saved=achievementView(await exportWorld(p));
  assert.deepEqual(saved.rows.filter(x=>x.unlocked).map(x=>x.id),['spark','deck','roll']);
  assert.equal(saved.stats.find(([name])=>name==='新建甲板')?.[1],3);
  await p.reload({waitUntil:'networkidle'});
  await p.keyboard.press('o');await wall.waitFor();
  assert.equal(await wall.locator('[data-earned=true]').count(),3);
  console.log('[e2e:P2-40] OK: 24 decoded medals, three true keyboard/mouse awards with toasts, three new tiles in persistent lifetime stats');
 }finally{await p.close();}
}
if(process.argv[1]?.endsWith('/p2-achievements-e2e.ts')||process.argv[1]==='scripts/p2-achievements-e2e.ts'){
 const dir=resolve('artifacts/p2-s8');mkdirSync(dir,{recursive:true});const b=await chromium.launch(),errors:string[]=[];
 try{await runP2Achievements(b,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}finally{await b.close();}
}
