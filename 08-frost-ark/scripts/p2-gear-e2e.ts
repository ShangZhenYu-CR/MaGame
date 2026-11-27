import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser } from 'playwright';
import { createInitialWorld,stepWorld } from '../src/sim/world';
import { initializeHeat } from '../src/sim/heatField';
import { serializeWorld } from '../src/sim/save';
import { equipment,equipmentCost } from '../src/sim/equipment';
import { exportWorld } from './p2-hook-e2e';
import { itemNames } from '../src/sim/ark';

export async function runP2Gear(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1440,height:900}});
 p.on('pageerror',e=>errors.push('gear page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('gear console: '+m.text());});
 try{
   await p.goto(url,{waitUntil:'networkidle'});
   await p.locator('#game-canvas[data-art-ready=true]').waitFor();
   const w=createInitialWorld();
   const materials=new Map<string,number>();
   for(const d of equipment)for(const cost of equipmentCost(d.id))materials.set(cost.itemId,(materials.get(cost.itemId)??0)+cost.count);
   let at=3;for(const [itemId,count] of materials)w.player.inventory[at++]={itemId,count};
   await p.keyboard.press('i');
   await p.locator('#save-file').setInputFiles({name:'p2-gear-materials.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
   await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor();
   await p.locator('#gear-panel summary').click();
   for(const d of equipment){
    const craft=p.getByRole('button',{name:'制作'+itemNames.get(d.id),exact:true});
    await craft.click();
    await p.getByRole('button',{name:'装备'+itemNames.get(d.id),exact:true}).click();
    await p.locator('[data-gear-slot='+d.slot+']').getByText(itemNames.get(d.id)!,{exact:true}).waitFor();
   }
   assert.equal(await p.locator('#gear-recipes article').count(),6);
   assert.ok(await p.locator('#gear-recipes img').evaluateAll(imgs=>imgs.every(e=>e instanceof HTMLImageElement&&e.complete&&e.naturalWidth>=48)));
   const snapshot=await exportWorld(p);
   assert.deepEqual(snapshot.player.gear,{outer:'aurora_mithril_cloak',guard:'frost_scale_armor',charm:'magnetic_salvage_buckle'});
   await p.locator('#gear-slots').scrollIntoViewIfNeeded();
   await p.screenshot({path:resolve(dir,'P2-06-01-three-equipment-slots.png')});
   await p.reload({waitUntil:'networkidle'});await p.locator('#save-label[data-saved=true]').waitFor();
   await p.keyboard.press('i');await p.locator('#gear-panel summary').click();
   await p.locator('[data-gear-slot=outer]').getByText('极光秘银披风',{exact:true}).waitFor();
   await p.getByRole('button',{name:'装备暖绒防风衣',exact:true}).click();
   await p.locator('[data-gear-slot=outer]').getByText('暖绒防风衣',{exact:true}).waitFor();
   await p.locator('#gear-slots').scrollIntoViewIfNeeded();
   await p.screenshot({path:resolve(dir,'P2-06-02-wind-coat-replaced-and-persisted.png')});
   await p.keyboard.press('Escape');
   const cooling=async (coat:boolean)=>{
    const cold=createInitialWorld();
    Object.assign(cold.player,{x:27.5,y:27.5});
    cold.timeOfDay=.82;cold.ark.buildings[0].fuel=0;stepWorld(cold);initializeHeat(cold);
    if(coat){cold.player.inventory[3]={itemId:'warm_wind_coat',count:1};cold.player.gear.outer='warm_wind_coat';}
    await p.keyboard.press('i');
    await p.locator('#save-file').setInputFiles({name:'cold-gear-comparison.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(cold))});
    await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor();
    await p.keyboard.press('Escape');
    await p.locator('#local-temp').getByText(/脚下 -22°C/).waitFor();
    const before=await exportWorld(p);
    await p.waitForTimeout(2200);
    const after=await exportWorld(p);
    assert.ok(after.tick-before.tick>=20&&after.player.hp>0&&before.player.warmth>after.player.warmth);
    await p.screenshot({path:resolve(dir,coat?'P2-06-04-coat-in-blizzard.png':'P2-06-03-unprotected-blizzard.png')});
    return (before.player.warmth-after.player.warmth)/(after.tick-before.tick);
   };
   const without=await cooling(false), withCoat=await cooling(true);
   assert.ok(withCoat<without*.84,`measured live cold loss per tick: ${without} vs ${withCoat}`);
   console.log('[e2e:P2-06] OK: craft and equip 4 clothing tiers and 2 accessories, reload, and measured blizzard protection',without,withCoat);
 }finally{await p.close();}
}

if(process.argv[1]?.endsWith('/p2-gear-e2e.ts')||process.argv[1]==='scripts/p2-gear-e2e.ts'){
 const dir=resolve('artifacts/p2-s2');mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch(),errors:string[]=[];
 try{await runP2Gear(browser,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}
 finally{await browser.close();}
}
