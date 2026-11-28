import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser } from 'playwright';
import { inventoryChange } from '../src/sim/ark';
import { skillCompanion } from './p2-skills-fixture';
import { codexEntries,tabs } from '../src/sim/codex';
import { serializeWorld } from '../src/sim/save';
import { raiderArrival } from './p2-raiders-fixture';

export async function runP2Codex(browser:Browser,url:string,dir:string,errors:string[]){
 for(const [width,height] of [[1280,720],[1920,1080]]){
  const p=await browser.newPage({viewport:{width,height}});
  p.on('pageerror',e=>errors.push('P2-35 codex page: '+e.message));
  p.on('console',m=>{if(m.type()==='error')errors.push('P2-35 codex console: '+m.text());});
  p.on('response',r=>{if(r.status()===404)errors.push('P2-35 codex 404: '+r.url());});
  try{
   await p.goto(url,{waitUntil:'networkidle'});
   await p.locator('#game-canvas[data-art-ready=true]').waitFor();
   const preview=raiderArrival(5).w;
   skillCompanion(preview,"emberfox");skillCompanion(preview,"galehawk",1);
   assert.ok(inventoryChange(preview,[],[{itemId:'warm_wind_coat',count:1},{itemId:'baked_root',count:4}]));
   await p.locator('#save-file').setInputFiles({name:'discovered-foes.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(preview))});
   await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor({state:'attached'});
   await p.keyboard.press('j');await p.locator('#codex').waitFor();
   for(const [i,page] of tabs.entries()){
    await p.locator('#codex-'+page).click();
    const results=await p.locator('#codex').evaluate(async(el)=>{
      const region=el.getBoundingClientRect(),nodes=[...el.querySelectorAll<HTMLImageElement>('li img')];
      await Promise.all(nodes.map(n=>n.decode()));
      const metrics=el.querySelector<HTMLProgressElement>('progress')!;
      return {count:nodes.length,loaded:nodes.every(v=>v.naturalWidth>=48),
        silhouette:[...el.querySelectorAll<HTMLImageElement>('[data-discovered=false] img')].every(x=>getComputedStyle(x).filter.includes('brightness')),
        progress:metrics.max,seen:metrics.value,
        inView:region.left>=0&&region.top>=0&&region.right<=innerWidth&&region.bottom<=innerHeight&&el.scrollWidth<=el.clientWidth+2,
        fits:[...el.querySelectorAll<HTMLElement>('li')].every(x=>x.scrollWidth<=x.clientWidth+2),
        details:[...el.querySelectorAll('[data-discovered=true] small')].every(x=>x.textContent?.startsWith('马楠记：'))};
    });
    assert.equal(results.count,codexEntries.filter(e=>e.tab===page).length);
    assert.equal(results.progress,results.count);
    assert.ok(results.loaded&&results.silhouette&&results.inView&&results.fits&&results.details,JSON.stringify(results));
    assert.ok(results.seen>0,page);
    await p.screenshot({path:resolve(dir,`P2-35-0${i+1}-${page}-${height}.png`)});
   }
   await p.keyboard.press('Escape');await p.locator('#codex').waitFor({state:'hidden'});
  }finally{await p.close();}
 }
 console.log('[e2e:P2-35] OK: 5 tabs and 139 decoded painted thumbnails, unknown silhouettes, progress and all cards inside 720p and 1080p');
}
if(process.argv[1]?.endsWith('/p2-codex-e2e.ts')||process.argv[1]==='scripts/p2-codex-e2e.ts'){
 const dir=resolve('artifacts/p2-s7');mkdirSync(dir,{recursive:true});const b=await chromium.launch(),errors:string[]=[];
 try{await runP2Codex(b,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}finally{await b.close();}
}
