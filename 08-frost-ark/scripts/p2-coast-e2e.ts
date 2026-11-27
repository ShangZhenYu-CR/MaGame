import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser } from 'playwright';
import { areaAt } from '../src/sim/island';
import { serializeWorld } from '../src/sim/save';
import { exportWorld } from './p2-hook-e2e';
import { coastFixture,terrainZones } from './p2-coast-fixture';

export async function runP2Coasts(browser:Browser,url:string,dir:string,errors:string[],view='after'){
 for(const [i,id] of terrainZones.entries()){
 const p=await browser.newPage({viewport:{width:1600,height:900}});
 p.on('console',m=>{if(m.type()==='error')errors.push('P2-18 coast console: '+m.text());});
 p.on('pageerror',e=>errors.push('P2-18 coast page: '+e.message));
 p.on('response',r=>{if(r.status()===404)errors.push('P2-18 coast 404: '+r.url());});
 try{
  await p.goto(url,{waitUntil:'networkidle'});
  const c=p.locator('#game-canvas[data-art-ready=true]');
  await c.waitFor();
    const w=coastFixture(id);
    await p.keyboard.press('i');
    await p.locator('#save-file').setInputFiles({name:'terrain-reference-'+id+'.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
    await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor({state:'attached'});
    await p.keyboard.press('Escape');
    await p.locator('#expedition-context[data-area=island]').waitFor();
    await p.locator('#action[data-shown=false]').waitFor({state:'attached'});
    await p.screenshot({path:resolve(dir,'P2-18-T'+(i+1)+'-'+view+'.png')});
    if(view==='before')continue;
    await p.keyboard.down('s');await p.keyboard.down('d');
    try{await p.keyboard.press('Space');await p.waitForTimeout(550);}
    finally{await p.keyboard.up('d');await p.keyboard.up('s');}
    const moved=await exportWorld(p);
    assert.equal(areaAt(moved,moved.player.x,moved.player.y),'island',id+' coast land');
    assert.ok(Math.hypot(moved.player.x-w.player.x,moved.player.y-w.player.y)>.6,id+' movement across textured ground');
 }finally{await p.close();}
 }
  console.log('[e2e:P2-18] OK: same-seed four coastal samples ('+view+')'+(view==='before'?'':', regular movement in each'));
}
if(process.argv[1]?.endsWith('/p2-coast-e2e.ts')||process.argv[1]==='scripts/p2-coast-e2e.ts'){
 const dir=resolve('artifacts/p2-s4');mkdirSync(dir,{recursive:true});
 const b=await chromium.launch(),errors:string[]=[];
 try{await runP2Coasts(b,pathToFileURL(resolve(process.env.FROST_COAST_ENTRY??'index.html')).href,dir,errors,process.argv[2]);assert.deepEqual(errors,[]);}
 finally{await b.close();}
}
