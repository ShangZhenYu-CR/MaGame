import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser,type Page } from 'playwright';
import { serializeWorld } from '../src/sim/save';
import { countItem } from '../src/sim/ark';
import { landmarkLit } from '../src/sim/landmarks';
import type { WorldState } from '../src/sim/types';
import { exportWorld } from './p2-hook-e2e';
import { landmarkFixture } from './p2-landmark-fixture';

async function load(p:Page,w:WorldState){
 await p.keyboard.press('i');
 await p.locator('#save-file').setInputFiles({name:'landmark-trek.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
 await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor({state:'attached'});
 await p.keyboard.press('Escape');
}
export async function runP2Landmarks(browser:Browser,url:string,dir:string,errors:string[]){
 let warmed=0,heated=0;
 for(const [n,zone,kind] of [[0,0,'camp'],[1,0,'spring'],[2,1,'obelisk'],[3,2,'vent'],[4,3,'wreck']] as const){
  const p=await browser.newPage({viewport:{width:1440,height:900}});
  p.on('console',m=>{if(m.type()==='error')errors.push('P2-19 landmark console: '+m.text());});
  p.on('pageerror',e=>errors.push('P2-19 landmark page: '+e.message));
  p.on('response',r=>{if(r.status()===404)errors.push('P2-19 landmark 404: '+r.url());});
  try{
   const {w,mark,approach}=landmarkFixture(zone,kind,kind==='vent');
   if(kind==='vent')Object.assign(w.player,{x:mark.x,y:mark.y+1.75});
   const shot=(suffix:string)=>p.screenshot({path:resolve(dir,'P2-19-'+n+'-'+suffix+'.png')});
   await p.goto(url,{waitUntil:'networkidle'});
   const canvas=p.locator('#game-canvas[data-art-ready=true]');
   const ctx=p.locator('#expedition-context[data-landmark="'+kind+'"]');
   await canvas.waitFor();await load(p,w);
   if(kind!=='vent'){
    await p.keyboard.down(approach.take);
    try{await ctx.waitFor();if(kind==='spring'||kind==='obelisk')await p.waitForTimeout(360);}
    finally{await p.keyboard.up(approach.take);}
   }else await ctx.waitFor();
   if(kind==='camp'||kind==='obelisk'||kind==='wreck'){
    assert.equal(await ctx.locator('#expedition-interact kbd').isVisible(),true);
    assert.equal(await p.locator('#game-canvas').getAttribute('data-primary-interaction'),'expedition');
   }
   if(kind==='camp'){
    await p.keyboard.press('e');
    await p.getByText('已取得航海残页与补给。',{exact:true}).waitFor();
    await p.getByText(/航海残页·拾荒者：/).first().waitFor();
    await shot('camp-paper');
    const first=await exportWorld(p);
    await p.keyboard.press('e');
    const second=await exportWorld(p);
    assert.equal(countItem(first,'driftwood'),countItem(w,'driftwood')+5);
    assert.equal(countItem(first,'driftwood'),countItem(second,'driftwood'));
   }else if(kind==='spring'){
    const a=await exportWorld(p);
    await p.waitForTimeout(2200);
    const b=await exportWorld(p);warmed=b.player.warmth-a.player.warmth;
    assert.ok(warmed>4,'the same player warms up by standing in the pool: '+warmed);
    await shot('geothermal-temperature');
   }else if(kind==='obelisk'){
    await shot('obelisk-unlit');
    const a=await exportWorld(p);
    await p.keyboard.press('e');
    await p.getByText('冰晶点亮方尖碑，暖圈持续 45 秒。',{exact:true}).waitFor();
    await p.waitForTimeout(1950);
    const b=await exportWorld(p);heated=b.player.warmth-a.player.warmth;
    assert.equal(countItem(b,'ice_shard'),countItem(a,'ice_shard')-1);
    assert.ok(heated>4,'the actual lit field raises body temperature: '+heated);
    assert.ok(landmarkLit(b,mark)>0);
    await shot('obelisk-lit-and-warm');
    await p.reload({waitUntil:'networkidle'});
    await ctx.getByText(/暖圈剩/).waitFor();
    assert.ok(landmarkLit(await exportWorld(p),mark)>0);
   }else if(kind==='vent'){
    await ctx.getByText(/岩圈发亮/).waitFor({timeout:16000});
    await shot('vent-warning');
    const a=await exportWorld(p);
    await ctx.getByText(/正在喷发/).waitFor({timeout:14000});
    await shot('vent-burst');
    await p.waitForTimeout(640);
    const b=await exportWorld(p);
    assert.ok(a.player.hp>b.player.hp,'real sulfur vent damages the player inside the warning radius');
   }else{
    await p.keyboard.press('e');
    await p.getByText('已回收残骸中的补给。',{exact:true}).waitFor();
    const after=await exportWorld(p);
    assert.equal(countItem(after,'sky_mithril'),countItem(w,'sky_mithril')+2);
    await shot('aurora-wreck');
   }
  }finally{await p.close();}
 }
 console.log('[e2e:P2-19] OK: navigation page, camp supplies, spring +'+warmed.toFixed(1)+', obelisk +'+heated.toFixed(1)+' and reload, sulfur warning/damage, Aurora salvage');
}
if(process.argv[1]?.endsWith('/p2-landmark-e2e.ts')||process.argv[1]==='scripts/p2-landmark-e2e.ts'){
 const dir=resolve('artifacts/p2-s4');mkdirSync(dir,{recursive:true});
 const b=await chromium.launch(),errors:string[]=[];
 try{await runP2Landmarks(b,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}
 finally{await b.close();}
}
