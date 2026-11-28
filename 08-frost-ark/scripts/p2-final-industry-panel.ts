import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium,type Browser } from 'playwright';
import { createInitialWorld } from '../src/sim/world';
import { build,buildCosts,inventoryChange } from '../src/sim/ark';
import { serializeWorld } from '../src/sim/save';
export async function checkIndustryPanel(browser:Browser,url:string,out:string,allErrors:string[]){
 const result=[];
 mkdirSync(out,{recursive:true});
 for(const [width,height] of [[1280,720],[1920,1080]]){
  const p=await browser.newPage({viewport:{width,height}}),w=createInitialWorld(202608);
  const errors:string[]=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('console',e=>{if(e.type()==='error')errors.push(e.text())});
  assert.ok(inventoryChange(w,[],buildCosts.workbench));
  assert.ok(build(w,'workbench',22,24));Object.assign(w.player,{x:22.6,y:23.72});
  await p.goto(url,{waitUntil:'networkidle'});
  await p.locator('#game-canvas[data-art-ready=true]').waitFor();
  await p.locator('#save-file').setInputFiles({name:'workbench-ui.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
  await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor();
  await p.keyboard.press('e');
  const panel=p.locator('#industry-panel[data-def-id=workbench]');await panel.waitFor();
  const a=await panel.boundingBox(),b=await p.locator('.sector').boundingBox();assert.ok(a&&b);
  const gap=a.y-(b.y+b.height);result.push({width,height,gap,errors});allErrors.push(...errors);
  await p.screenshot({path:resolve(out,'Industry-panel-'+width+'x'+height+'.png')});
  await p.close();
 }
 writeFileSync(resolve(out,'industry-gap.json'),JSON.stringify(result,null,2));
 assert.ok(result.every(r=>r.gap>=6&&!r.errors.length),JSON.stringify(result));
 console.log('[final-QA:industry] workbench leaves sector controls clear at both desktop sizes');
}
if(process.argv[1]?.endsWith('p2-final-industry-panel.ts')){
 const browser=await chromium.launch(),errors:string[]=[];
 try{await checkIndustryPanel(browser,process.argv[2],resolve(process.argv[3]??'artifacts/final-industry'),errors);assert.deepEqual(errors,[]);}
 finally{await browser.close();}
}
