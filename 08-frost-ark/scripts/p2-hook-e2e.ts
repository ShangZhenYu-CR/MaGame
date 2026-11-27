import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser,type Page } from 'playwright';
import { countItem } from '../src/sim/ark';
import { nearestStorage } from '../src/sim/storage-box';
import { gangwayGeometry,toggleGangway } from '../src/sim/island';
import { FROST_GRAPPLE } from '../src/sim/grapple-tools';
import { deserializeWorld,serializeWorld } from '../src/sim/save';
import { createInitialWorld } from '../src/sim/world';
import type { WorldState } from '../src/sim/types';
import { shoreForSurvival } from './p2-rescue-e2e';

async function load(p:Page,w:WorldState){
 await p.keyboard.press('i');
 await p.locator('#save-file').setInputFiles({name:'p2-hook-check.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
 await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor();
 await p.keyboard.press('Escape');
}
async function exportWorld(p:Page){
 const raw=await p.evaluate(async()=>{
   const create=URL.createObjectURL,click=HTMLAnchorElement.prototype.click;
   let data:Promise<string>|null=null;
   URL.createObjectURL=function(blob){if(blob instanceof Blob&&blob.type==='application/json')data=blob.text();return create.call(URL,blob);};
   HTMLAnchorElement.prototype.click=function(){if(this.download==='frost-ark-save.json')return;return click.call(this);};
   try{document.getElementById('export')!.click();}finally{URL.createObjectURL=create;HTMLAnchorElement.prototype.click=click;}
   if(!data)throw Error('Missing save export');
   return await data;
 });
 return deserializeWorld(raw);
}

export async function runP2Hook(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1440,height:900}});
 p.on('pageerror',e=>errors.push('p2 hook page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('p2 hook console: '+m.text());});
 try{
  await p.goto(url,{waitUntil:'networkidle'});
  await p.locator('#game-canvas[data-art-ready=true]').waitFor();
  const docked=shoreForSurvival(),g=gangwayGeometry(docked)!;
  docked.activeIsland=null;Object.assign(docked.player,{x:g.x-.66,y:g.y+.61});
  assert.equal(toggleGangway(docked),null);assert.ok(nearestStorage(docked));
  await load(p,docked);
  await p.locator('#game-canvas[data-primary-interaction=expedition]').waitFor();
  const action=p.locator('#expedition-interact');
  await action.getByText('搭跳板',{exact:true}).waitFor();
  assert.equal(await action.locator('kbd').isVisible(),true);
  assert.doesNotMatch(await p.locator('#hint').textContent()??'',/按 E/);
  await p.keyboard.press('e');
  await action.getByText('收跳板',{exact:true}).waitFor();
  assert.equal(await p.locator('#storage-panel').isVisible(),false);
  await p.screenshot({path:resolve(dir,'P2-03-01-single-gangway-interaction.png')});
  await p.mouse.move(650,320);
  await p.keyboard.press('n');
  await p.locator('#sky-map[open]').waitFor();
  await p.keyboard.press('n');
  await p.locator('#sky-map[open]').waitFor({state:'hidden'});
  await p.waitForTimeout(800);
  assert.equal(await p.locator('#ui-tip').isVisible(),false);
  assert.equal(await p.locator('#sky-map-toggle').evaluate(e=>document.activeElement===e),true);
  const boat=createInitialWorld();
  boat.player.x=26.25;boat.player.y=26.60;
  boat.player.inventory[0]=null;boat.player.inventory[3]={itemId:'frost_iron_scrap',count:2};
  boat.player.inventory[4]={itemId:'frost_iron_ingot',count:2};
  boat.player.inventory[2]={itemId:'rope',count:6};
  boat.sky.debris=[{id:'p2_heavy_browser',x:boat.player.x-10.4,y:boat.player.y,vx:0,vy:0,heavy:true,
    loot:[{itemId:'frost_iron_scrap',count:5}]}];
  await load(p,boat);
  await p.keyboard.press('i');
  await p.locator('#craft-grapple').click();
  await p.getByText('手制完成：云海抓钩。',{exact:true}).waitFor();
  await p.locator('#craft-frost-grapple').click();
  await p.getByRole('button',{name:'霜铁强化抓钩',exact:true}).waitFor();
  assert.equal(countItem(await exportWorld(p),FROST_GRAPPLE),1);
  await p.keyboard.press('Escape');
  const canvas=p.locator('#game-canvas');
  const x=boat.player.x-12.6,y=boat.player.y;
  const target=await canvas.evaluate((e,{x,y})=>({x:Math.max(8, Number(e.dataset.originX)+x*Number(e.dataset.tileScale)),
     y:Number(e.dataset.originY)+y*Number(e.dataset.tileScale)}),{x,y});
  await p.mouse.move(target.x,target.y);await p.mouse.down();
  try{
   await p.getByText('抓钩蓄力 100%',{exact:true}).waitFor();
   await p.screenshot({path:resolve(dir,'P2-03-02-extended-hook-preview.png')});
  }finally{await p.mouse.up();}
  await p.getByText('正在拉回：冻铁废件',{exact:true}).waitFor({timeout:5000});
  await p.getByText('已回收入包：冻铁废件 ×5',{exact:true}).waitFor();
  assert.equal(countItem(await exportWorld(p),'frost_iron_scrap'),5);
  await p.screenshot({path:resolve(dir,'P2-03-03-heavy-crate-recovered.png')});
  console.log('[e2e:P2-03] OK: unambiguous E, clean chart focus return, both hook recipes and heavy crate outside base range');
 }finally{await p.close();}
}

if(process.argv[1]?.endsWith('/p2-hook-e2e.ts')||process.argv[1]==='scripts/p2-hook-e2e.ts'){
 const dir=resolve('artifacts/p2-s1');mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch(),errors:string[]=[];
 try{await runP2Hook(browser,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}
 finally{await browser.close();}
}
