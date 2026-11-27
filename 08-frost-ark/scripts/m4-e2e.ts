import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Browser } from 'playwright';
import { build, countItem, inventoryChange } from '../src/sim/ark';
import { beastPanel, nearestWildBeast } from '../src/sim/beasts';
import { areaAt, dockedIsland, gangwayGeometry, toggleGangway } from '../src/sim/island';
import { deserializeWorld } from '../src/sim/save';
import { helmPoint, setDestination, toggleCruise } from '../src/sim/sky-map';
import type { WorldState } from '../src/sim/types';
import { createInitialWorld,stepWorld } from '../src/sim/world';

export async function runM4(browser:Browser,baseUrl:string,outDir:string,errors:string[]):Promise<void>{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 page.on('console',msg=>{if(msg.type()==='error')errors.push('M4 console.error: '+msg.text());});
 page.on('pageerror',err=>errors.push('M4 pageerror: '+err.message));
 const shot=(name:string)=>page.screenshot({path:resolve(outDir,`M4-${name}.png`)});
 const bag=page.locator('#inventory');
 async function importWorld(w:WorldState,name:string){
  if(!await bag.isVisible())await page.keyboard.press('i');
  await page.locator('#save-file').setInputFiles({name:name+'.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
  await page.getByText('已载入 JSON 存档。',{exact:true}).waitFor();
  await page.keyboard.press('Escape');await bag.waitFor({state:'hidden'});
 }
 async function exportWorld(){
  await page.keyboard.press('i');
  const event=page.waitForEvent('download');
  await page.getByRole('button',{name:'导出 JSON'}).click();
  const save=deserializeWorld(readFileSync((await (await event).path())!,'utf8'));
  await page.keyboard.press('Escape');await bag.waitFor({state:'hidden'});
  return save;
 }
 try{
  await page.goto(baseUrl,{waitUntil:'networkidle'});
  await page.locator('#save-label[data-saved=true]').waitFor();
  await page.locator('#game-canvas[data-art-ready=true]').waitFor({timeout:9000});
  const setup=createInitialWorld(202608),helm=helmPoint(setup);
  setup.player.x=helm.x;setup.player.y=helm.y;
  const t1=setup.sky.islands.find(i=>i.tier===1)!;
  assert.equal(setDestination(setup,t1.id),null);assert.equal(toggleCruise(setup),null);
  stepWorld(setup,300);
  const g=gangwayGeometry(setup);assert.ok(g);
  setup.player.x=g.x-.5;setup.player.y=g.y+.5;assert.equal(toggleGangway(setup),null);
  setup.activeIsland=dockedIsland(setup);assert.ok(setup.activeIsland);
  setup.player.x=g.x+g.width+.9;stepWorld(setup,10);
  const encounter=beastPanel(setup).wild.find(b=>b.defId==='burrowback');
  assert.ok(encounter,'first island reliably has a rock burrowback');
  const at=[[.9,0],[-.9,0],[0,.85],[0,-.85],[0,0]].map(([x,y])=>[encounter.x+x,encounter.y+y]).find(([x,y])=>{
   if(areaAt(setup,x,y)!=='island')return false;
   return nearestWildBeast({...setup,player:{...setup.player,x,y}})?.id===encounter.id;
  });
  assert.ok(at);
  setup.player.x=at[0];setup.player.y=at[1];
  assert.ok(inventoryChange(setup,[],[
   {itemId:'paralysis_net',count:2},{itemId:'beast_trap',count:1},
   {itemId:encounter.preferredBait,count:encounter.feedsRequired},{itemId:'beast_feed',count:3},
  ]));
  await importWorld(setup,'m4-encounter');
  const wild=page.locator('#wild-encounter[data-species=burrowback]');
  await wild.waitFor();
  assert.equal(await wild.getAttribute('data-weakened'),'false');
  await page.locator('#wild-net').click();
  await wild.and(page.locator('[data-weakened=true]')).waitFor();
  await page.keyboard.press('e');
  const progress=page.locator('#tame-progress');
  await page.waitForFunction(()=>Number((document.getElementById('tame-progress') as HTMLProgressElement)?.value)>0);
  assert.equal(await progress.evaluate((v:HTMLProgressElement)=>v.value),1);
  await page.mouse.move(665,450);
  await shot('01-island-taming');
  for(let i=1;i<encounter.feedsRequired;i++)await page.locator('#wild-feed').click();
  await wild.waitFor({state:'hidden'});
  const tamed=await exportWorld();
  assert.equal(countItem(tamed,'paralysis_net'),1);
  assert.equal(countItem(tamed,encounter.preferredBait),0);
  const resident=tamed.beasts.find(b=>b.defId==='burrowback');assert.ok(resident);
  // Move the party into the deck fixture without changing the live tamed animal.
  tamed.player.x=22.5;tamed.player.y=25.2;tamed.activeIsland=null;
  tamed.unlockedTech.push('tier2_automation');
  assert.ok(inventoryChange(tamed,[],[{itemId:'driftwood',count:12},{itemId:'rope',count:6},{itemId:'frost_iron_scrap',count:7}]));
  assert.ok(build(tamed,'beast_den',23,25));
  assert.ok(build(tamed,'feed_trough',21,25));
  await importWorld(tamed,'m4-home');
  await page.keyboard.press('v');
  const roster=page.locator('#beast-roster');await roster.waitFor();
  const card=roster.locator('[data-beast-id="'+resident.id+'"]');
  await card.getByText('岩甲鼹',{exact:true}).waitFor();
  await page.locator('#beast-feed-load').click();
  await page.getByText('已添加云兽饲料。',{exact:true}).waitFor();
  const role=(id:string)=>card.locator('[data-beast-role="'+id+'"]');
  for(const id of ['work','rest','companion','work']){
   await role(id).click();
   await role(id).and(page.locator('[aria-pressed=true]')).waitFor();
  }
  await page.mouse.move(620,290);
  await page.locator('#action').waitFor({state:'hidden',timeout:5600});
  await shot('03-beast-roster');
  await page.keyboard.press('Escape');await roster.waitFor({state:'hidden'});
  await page.waitForTimeout(450);
  await shot('02-beasts-at-work');
  const saved=await exportWorld();
  assert.equal(saved.beasts.find(b=>b.id===resident.id)?.role,'work');
  assert.equal(countItem(saved,'beast_feed'),2);
  console.log('[e2e-visual:M4] OK: real contextual stun, multiple matching feeds, tame save, warm den, feed trough, work/rest/follow role switching, 3 screenshots');
 }finally{await page.close();}
}
