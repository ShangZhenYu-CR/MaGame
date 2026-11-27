import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser,type Page } from 'playwright';
import { countItem } from '../src/sim/ark';
import { areaAt,gangwayGeometry } from '../src/sim/island';
import { heldTool,shortcuts } from '../src/sim/hotbar';
import { serializeWorld } from '../src/sim/save';
import { createInitialWorld } from '../src/sim/world';
import type { WorldState } from '../src/sim/types';
import { exportWorld } from './p2-hook-e2e';
import { shoreForSurvival } from './p2-rescue-e2e';

async function load(p:Page,w:WorldState){
 await p.keyboard.press('i');
 await p.locator('#save-file').setInputFiles({name:'hotbar-e2e.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
 await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor();
 await p.keyboard.press('Escape');
}
export async function runP2Hotbar(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1280,height:720}});
 p.on('pageerror',e=>errors.push('p2 hotbar page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('p2 hotbar console: '+m.text());});
 try{
  const w=createInitialWorld();Object.assign(w.player,{hp:80,warmth:58,hunger:68});
  w.player.inventory[4]={itemId:'frost_iron_spear',count:1};
  w.player.inventory[5]={itemId:'baked_root',count:4};
  w.player.inventory[6]={itemId:'wood_axe',count:1,durability:8};
  w.player.inventory[7]={itemId:'mining_pick',count:1,durability:8};
  w.player.inventory[8]={itemId:'warm_wind_coat',count:1};
  w.player.gear.outer='warm_wind_coat';
  w.player.rescue.shieldUntil=w.tick+300;
  await p.goto(url,{waitUntil:'networkidle'});
  const canvas=p.locator('#game-canvas[data-art-ready=true]');await canvas.waitFor();
  await load(p,w);
  const slot=(n:number)=>p.locator('[data-quick-slot="'+n+'"]');
  assert.equal(await p.locator('[data-quick-slot]').count(),9);
  const choose=async (k:string,mode:string)=>{
   await p.keyboard.press(k);
   await p.locator('#game-canvas[data-mode="'+mode+'"]').waitFor();
  };
  await choose('1','wood_deck');await choose('2','torch_post');await choose('3','wind_wall');
  await choose('4','weapon');
  assert.equal((await exportWorld(p)).player.weapon,'frost_iron_spear');
  await p.keyboard.press('5');
  assert.equal(countItem(await exportWorld(p),'baked_root'),3);
  await p.locator('#meal-buff').waitFor();
  await choose('6','hook');
  await p.keyboard.press('7');assert.equal(heldTool(await exportWorld(p)),'wood_axe');
  await p.keyboard.press('8');assert.equal(heldTool(await exportWorld(p)),'mining_pick');
  await p.keyboard.press('9');assert.equal(await canvas.getAttribute('data-mode'),'tool');
  await p.locator('[data-buff=cold]').waitFor();
  await p.screenshot({path:resolve(dir,'P2-11-01-nine-slot-hud-1280.png')});
  await p.keyboard.press('i');
  await p.getByText('编排 1–9 快捷栏',{exact:true}).click();
  await p.getByLabel('绑定快捷键 9',{exact:true}).selectOption('baked_root');
  assert.equal(shortcuts(await exportWorld(p))[8],'baked_root');
  await p.locator('[data-quick-bind="9"]').press('Escape');
  await p.locator('#inventory').waitFor({state:'visible'});
  assert.equal(await p.locator('#quickbar-editor').evaluate(e=>(e as HTMLDetailsElement).open),false);
  await p.keyboard.press('Escape');await p.locator('#inventory').waitFor({state:'hidden'});
  await slot(9).dragTo(slot(1));
  assert.equal(shortcuts(await exportWorld(p))[0],'baked_root');
  assert.equal(shortcuts(await exportWorld(p))[8],'wood_deck');
  await p.keyboard.press('1');
  assert.equal(countItem(await exportWorld(p),'baked_root'),2,'rebinding number 1 eats rather than entering building mode');
  await choose('9','wood_deck');
  await p.setViewportSize({width:1920,height:1080});
  await p.keyboard.press('Escape');
  await p.screenshot({path:resolve(dir,'P2-11-02-reordered-1080p.png')});
  for(const viewport of [{width:1280,height:720},{width:1920,height:1080}]){
   await p.setViewportSize(viewport);
   const boxes=await p.locator('[data-quick-slot]').evaluateAll(nodes=>nodes.map(n=>{
    const b=n.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom};
   }));
   boxes.forEach((b,i)=>{
    assert.ok(b.left>=0&&b.right<=viewport.width&&b.top>=0&&b.bottom<=viewport.height);
    if(i)assert.ok(b.left>=boxes[i-1].right,'adjacent slot bounds overlap');
   });
  }
  const shore=shoreForSurvival(),bridge=gangwayGeometry(shore)!;
  shore.player.x=bridge.x+bridge.width+5.4;
  shore.player.inventory[4]={itemId:'frost_iron_spear',count:1};
  const enemy=shore.wildEntities.find(e=>e.kind==='beast')!;shore.wildEntities=[enemy];
  Object.assign(enemy,{x:shore.player.x+2.3,y:shore.player.y,stunnedTicks:210});
  assert.equal(areaAt(shore,enemy.x,enemy.y),'island');
  await load(p,shore);await choose('4','weapon');
  const cursor=await canvas.evaluate((e,q)=>({x:Number(e.dataset.originX)+q.x*Number(e.dataset.tileScale),
   y:Number(e.dataset.originY)+q.y*Number(e.dataset.tileScale)}),{x:enemy.x,y:enemy.y-.46});
  await p.mouse.move(cursor.x,cursor.y);
  await p.locator('#game-canvas[data-aim-locked=true]').waitFor();
  await p.screenshot({path:resolve(dir,'P2-11-03-melee-target.png')});
  await p.mouse.click(cursor.x,cursor.y);
  assert.ok((await exportWorld(p)).wildEntities[0].hp<enemy.hp);
  console.log('[e2e:P2-11] OK: nine actual keys, tool selection, meal, drag and editor, Escape stack, two viewport bounds and melee assist');
 }finally{await p.close();}
}
if(process.argv[1]?.endsWith('/p2-hotbar-e2e.ts')||process.argv[1]==='scripts/p2-hotbar-e2e.ts'){
 const dir=resolve('artifacts/p2-s2');mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch(),errors:string[]=[];
 try{await runP2Hotbar(browser,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}
 finally{await browser.close();}
}
