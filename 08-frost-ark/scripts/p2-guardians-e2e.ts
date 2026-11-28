import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser } from 'playwright';
import { guardianLoot } from '../src/sim/guardians-p2';
import { countItem } from '../src/sim/ark';
import { serializeWorld } from '../src/sim/save';
import { guardians,guardianFixture } from './p2-guardians-fixture';
import { exportWorld } from './p2-hook-e2e';

export async function runP2Guardians(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1440,height:900}}),canvas=p.locator('#game-canvas');
 p.on('pageerror',e=>errors.push('P2-32 guard page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('P2-32 guard console: '+m.text());});
 p.on('response',r=>{if(r.status()===404)errors.push('P2-32 guard 404: '+r.url());});
 const shot=(name:string)=>p.screenshot({path:resolve(dir,'P2-32-'+name+'.png')});
 try{
  await p.goto(url,{waitUntil:'networkidle'});await canvas.and(p.locator('[data-art-ready=true]')).waitFor();
  for(const spec of guardians){
   const {w}=guardianFixture(spec);
   await p.locator('#save-file').setInputFiles({name:spec.boss+'.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
   await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor({state:'attached'});
   const hud=p.locator('#island-guardian[data-guardian="'+spec.boss+'"]');
   for(const what of spec.skills){
    await hud.and(p.locator('[data-guardian-move="'+what+'"]')).waitFor({timeout:16000});
    await shot(spec.boss+'-'+what);
   }
   if(spec.boss==='rift_carapace')await hud.and(p.locator('[data-guardian-move=overheat]')).waitFor();
   await p.keyboard.press('4');
   await p.locator('#game-canvas[data-mode=weapon]').waitFor({timeout:4500});
   for(let j=0;j<11&&await hud.isVisible();j++){
    const state=await exportWorld(p);
    const target=state.wildEntities.find(e=>e.id==='boss_'+spec.node&&e.hp>0);
    if(!target)break;
    if(Math.hypot(target.x-state.player.x,target.y-state.player.y)<.68){
     await p.keyboard.down('d');await p.waitForTimeout(300);await p.keyboard.up('d');
    }
    const pnt=await canvas.evaluate((el,{x,y})=>{
     const c=el as HTMLCanvasElement,r=c.getBoundingClientRect(),s=Number(c.dataset.tileScale);
     return {x:r.left+(Number(c.dataset.originX)+x*s)*r.width/c.width,y:r.top+(Number(c.dataset.originY)+y*s)*r.height/c.height};
    },target);
    await p.mouse.click(pnt.x,pnt.y);await p.waitForTimeout(950);
   }
   await hud.waitFor({state:'hidden',timeout:4000});
   await p.locator('#m5-seed-count[data-seeds="1"]').waitFor();
   await p.keyboard.press('q');
   const result=await exportWorld(p);
   const loot=guardianLoot(result)!;
   for(let j=0;j<10&&!(await p.locator('#expedition-context[data-action=guardian-loot]').isVisible());j++){
    const {player}=await exportWorld(p),dx=loot.x-player.x,dy=loot.y-player.y;
    const key=Math.abs(dx)>Math.abs(dy)?dx>0?'d':'a':dy>0?'s':'w';
    await p.keyboard.down(key);await p.waitForTimeout(200);await p.keyboard.up(key);
   }
   await p.locator('#expedition-context[data-action=guardian-loot]').waitFor({timeout:4000});
   await p.keyboard.press('e');
   const claimed=await exportWorld(p);
   assert.equal(countItem(claimed,spec.blueprint),1);
   await p.keyboard.press('i');
   if(await p.locator("#gear-panel").getAttribute("open")===null)await p.locator("#gear-panel > summary").click();
   await p.locator('[data-gear-id="'+spec.gear+'"][data-gear-action=craft]').click();
   assert.equal(countItem(await exportWorld(p),spec.gear),1);
   await shot(spec.boss+'-gear-crafted');
   await p.keyboard.press('Escape');
  }
  console.log('[e2e:P2-32] OK: two distinct live telegraphs per boss, defeat by combat, contextual blueprint pickups and both gear crafts');
 }finally{await p.close();}
}
if(process.argv[1]?.endsWith('/p2-guardians-e2e.ts')||process.argv[1]==='scripts/p2-guardians-e2e.ts'){
 const dir=resolve('artifacts/p2-s6');mkdirSync(dir,{recursive:true});
 const b=await chromium.launch(),errors:string[]=[];
 try{await runP2Guardians(b,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}finally{await b.close();}
}
