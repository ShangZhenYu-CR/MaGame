import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser,type Page } from 'playwright';
import { countItem } from '../src/sim/ark';
import { CAVE_BLUEPRINT,CAVE_TECH,activeCave,caveChestTaken,caveGuard } from '../src/sim/cave';
import { serializeWorld } from '../src/sim/save';
import type { WorldState } from '../src/sim/types';
import { outsideCave } from './p2-cave-fixture';
import { exportWorld } from './p2-hook-e2e';

async function load(p:Page,w:WorldState){
 await p.keyboard.press('i');
 await p.locator('#save-file').setInputFiles({name:'cave-expedition.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
 await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor({state:'attached'});
 await p.keyboard.press('Escape');
}
async function walkUntil(p:Page,key:string,done:(w:WorldState)=>boolean){
 await p.keyboard.down(key);
 try{
  const until=Date.now()+16000;
  while(Date.now()<until){
    const w=await exportWorld(p);
    if(done(w))return w;
    await p.waitForTimeout(86);
  }
  throw Error('The real cave route did not reach its destination: '+key);
 }finally{await p.keyboard.up(key);}
}
export async function runP2Caves(browser:Browser,url:string,dir:string,errors:string[]){
 for(const tier of [2,3,4]){
  const p=await browser.newPage({viewport:{width:1440,height:900}});
  p.on('pageerror',e=>errors.push('P2-21 cave page: '+e.message));
  p.on('console',m=>{if(m.type()==='error')errors.push('P2-21 cave console: '+m.text());});
  p.on('response',r=>{if(r.status()===404)errors.push('P2-21 cave 404: '+r.url());});
  try{
   const shot=(label:string)=>p.screenshot({path:resolve(dir,'P2-21-'+label+'.png')});
   await p.goto(url,{waitUntil:'networkidle'});
   const canvas=p.locator('#game-canvas[data-art-ready=true]');
   await canvas.waitFor();
   const {w}=outsideCave(tier-1);
   await load(p,w);
   await p.locator('#expedition-context[data-action=cave-enter]').waitFor();
   await shot('T'+tier+'-entrance');
   await p.keyboard.press('e');
   await p.locator('#game-canvas[data-scene=cave]').waitFor();
   const d=await exportWorld(p),pocket=activeCave(d)!;
   assert.equal(pocket.tier,tier);
   assert.ok((caveGuard(d)?.hp??0)>0);
   assert.ok(await p.locator('#expedition-context[data-action=cave-exit] kbd').isVisible());
   if(tier===2){
    await shot('01-cave-interior');
    await p.keyboard.press('h');
    const nearGuard=await walkUntil(p,'d',w=>{
      const g=caveGuard(w);return !!g&&Math.hypot(w.player.x-g.x,w.player.y-g.y)<1.65;
    });
    await p.keyboard.press('h');
    const guard=caveGuard(nearGuard)!;
    assert.ok(guard.hp>=92);
    await shot('02-elite-guard');
    await p.reload({waitUntil:'networkidle'});
    await p.locator('#game-canvas[data-scene=cave]').waitFor();
    assert.equal(Math.ceil(caveGuard(await exportWorld(p))!.hp),Math.ceil(guard.hp));
    for(let attempt=0;attempt<12;attempt++){
      if((caveGuard(await exportWorld(p))?.hp??0)<=0)break;
      await p.keyboard.press('f');
      await p.waitForTimeout(660);
    }
    await p.locator('#game-canvas[data-cave-guard-hp="0"]').waitFor();
    await walkUntil(p,'d',w=>w.player.x>=pocket.chest.x-1.08);
    await p.locator('#expedition-context[data-action=cave-chest]').waitFor();
    await p.keyboard.press('e');
    await p.getByText('获得冰窟稀有图纸与物资。',{exact:true}).waitFor();
    const loot=await exportWorld(p);
    assert.equal(countItem(loot,CAVE_BLUEPRINT),1);
    assert.ok(loot.unlockedTech.includes(CAVE_TECH));
    assert.equal(caveChestTaken(loot),true);
    await shot('03-chest-blueprint');
    await walkUntil(p,'a',w=>w.player.x<=pocket.exit.x+1.05);
   }
   await p.locator('#expedition-context[data-action=cave-exit]').waitFor();
   await p.keyboard.press('e');
   await p.locator('#game-canvas[data-scene=surface]').waitFor();
   const back=await exportWorld(p);
   assert.equal(activeCave(back),null);
   assert.equal(back.activeIsland?.nodeId,d.activeIsland?.nodeId);
   if(tier===2){assert.equal(countItem(back,CAVE_BLUEPRINT),1);await shot('04-returned-surface');}
  }finally{await p.close();}
 }
 console.log('[e2e:P2-21] OK: three routes and exits, T2 real floor trek/guard fight, live mid-cave reload, blueprint chest and same surface position');
}
if(process.argv[1]?.endsWith('/p2-cave-e2e.ts')||process.argv[1]==='scripts/p2-cave-e2e.ts'){
 const dir=resolve('artifacts/p2-s4');mkdirSync(dir,{recursive:true});
 const b=await chromium.launch(),errors:string[]=[];
 try{await runP2Caves(b,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}
 finally{await b.close();}
}
