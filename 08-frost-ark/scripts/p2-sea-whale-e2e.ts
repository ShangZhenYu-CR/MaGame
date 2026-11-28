import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser } from 'playwright';
import { countItem } from '../src/sim/ark';
import { finaleStatus } from '../src/sim/finale';
import { primaryHearth } from '../src/sim/heatField';
import { whaleIced } from '../src/sim/whale-sea';
import { serializeWorld } from '../src/sim/save';
import { exportWorld } from './p2-hook-e2e';
import { seaWhaleFixture } from './p2-sea-whale-fixture';

export async function runP2SeaWhale(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1440,height:900}}),canvas=p.locator('#game-canvas');
 p.on('pageerror',e=>errors.push('P2-33 whale page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('P2-33 whale console: '+m.text());});
 p.on('response',r=>{if(r.status()===404)errors.push('P2-33 whale 404: '+r.url());});
 const hud=p.locator('#whale-context[data-waters=sea]'),shot=(name:string)=>p.screenshot({path:resolve(dir,'P2-33-'+name+'.png')});
 try{
  await p.goto(url,{waitUntil:'networkidle'});await canvas.and(p.locator('[data-art-ready=true]')).waitFor();
  const world=seaWhaleFixture(),ammo=countItem(world,'frost_iron_scrap');
  await p.locator('#save-file').setInputFiles({name:'approaching-aurora.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(world))});
  await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor({state:'attached'});
  await p.locator('#expedition-context[data-action=helm]').waitFor();
  await p.keyboard.press('e');await hud.waitFor({timeout:8500});
  await canvas.and(p.locator('[data-sea-whale]:not([data-sea-whale=""])')).waitFor();
  const start=(await exportWorld(p)).sky;
  assert.ok(start.x>=36&&!start.cruising);
  const first=await canvas.getAttribute('data-sea-whale');
  await p.waitForTimeout(800);assert.notEqual(await canvas.getAttribute('data-sea-whale'),first);
  await shot('01-orbit-from-the-helm');
  await p.keyboard.down('s');await p.waitForTimeout(975);await p.keyboard.up('s');
  let didSalvo=false,didRepair=false;
  for(const [i,style] of ['ram','breath','meteors'].entries()){
   const phase=i+1;
   await hud.and(p.locator('[data-phase="'+phase+'"][data-whale-strike="'+style+'"]')).waitFor({timeout:18000});
   await shot('0'+(phase+1)+'-'+style);
   if(phase!==2)await p.keyboard.press('Space');
   if(phase===2){
    await p.reload({waitUntil:'networkidle'});
    await hud.and(p.locator('[data-phase="2"]')).waitFor();
    const middle=await exportWorld(p);
    assert.equal(finaleStatus(middle).whale?.phase,1);
   }
   for(let j=0;j<7&&await hud.isVisible();j++){
    const live=await exportWorld(p),f=finaleStatus(live);
    if(!f.whale||f.whale.phase!==i)break;
    await hud.and(p.locator('[data-phase="'+phase+'"][data-vulnerable=true]')).waitFor({timeout:14000});
    if(phase===2&&!didRepair){
     const before=await exportWorld(p),h=primaryHearth(before)!;
     if(h.hp<h.maxHp&&whaleIced(before,h.gx,h.gy)&&f.nearHearth){
      await p.keyboard.press('p');
      const repaired=await exportWorld(p);
      didRepair=primaryHearth(repaired)!.hp>h.hp&&!whaleIced(repaired,h.gx,h.gy);
      assert.ok(didRepair);
      await shot('05-real-hearth-repair');
     }
    }
    await p.keyboard.press('c');
    const shots=await exportWorld(p);
    if(!didSalvo&&(shots.tick>live.tick||shots.player.inventory)&&countItem(shots,'frost_iron_scrap')<ammo){
     await canvas.and(p.locator('[data-sea-salvo]:not([data-sea-salvo="0"])')).waitFor({timeout:4000});
     didSalvo=true;await shot('06-cannon-salvo');
    }
    const what=finaleStatus(shots).whale;
    if(!what||what.phase!==i)break;
    await p.keyboard.press('f');
    await p.waitForTimeout(1820);
   }
  }
  await p.locator('#victory-panel').waitFor({timeout:15000});
  assert.ok(didSalvo&&didRepair);
  assert.ok((await exportWorld(p)).bossDefeated);
  await shot('07-victory');
  console.log('[e2e:P2-33] OK: real helm entry, visible orbit and all three sea patterns, phase 2 reload, genuine cannon and emergency repair');
 }finally{await p.close();}
}
if(process.argv[1]?.endsWith('/p2-sea-whale-e2e.ts')||process.argv[1]==='scripts/p2-sea-whale-e2e.ts'){
 const dir=resolve('artifacts/p2-s6');mkdirSync(dir,{recursive:true});const b=await chromium.launch(),errors:string[]=[];
 try{await runP2SeaWhale(b,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}finally{await b.close();}
}
