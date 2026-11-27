import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Browser } from 'playwright';
import { build,inventoryChange } from '../src/sim/ark';
import { dockedIsland } from '../src/sim/island';
import { ensureNavigationState } from '../src/sim/m3-state';
import { m5Status,stepM5 } from '../src/sim/m5';
import { deserializeWorld } from '../src/sim/save';
import { createInitialWorld,stepWorld } from '../src/sim/world';
import type { WorldState } from '../src/sim/types';

export async function runM5(browser:Browser,baseUrl:string,outDir:string,errors:string[]):Promise<void>{
 const page=await browser.newPage({viewport:{width:1280,height:720}});const bag=page.locator('#inventory');
 page.on('console',msg=>{if(msg.type()==='error')errors.push('M5 console.error: '+msg.text());});
 page.on('pageerror',err=>errors.push('M5 pageerror: '+err.message));
 const shot=(name:string)=>page.screenshot({path:resolve(outDir,'M5-'+name+'.png')});
 async function fixture(w:WorldState,name:string){
  if(!await bag.isVisible())await page.keyboard.press('i');
  await page.locator('#save-file').setInputFiles({name:name+'.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
  await page.getByText('已载入 JSON 存档。',{exact:true}).waitFor();
  await page.keyboard.press('Escape');await bag.waitFor({state:'hidden'});
 }
 async function exportWorld(){
  await page.keyboard.press('i');const dl=page.waitForEvent('download');
  await page.getByRole('button',{name:'导出 JSON'}).click();
  const w=deserializeWorld(readFileSync((await (await dl).path())!,'utf8'));
  await page.keyboard.press('Escape');await bag.waitFor({state:'hidden'});return w;
 }
 try{
  await page.goto(baseUrl,{waitUntil:'networkidle'});
  await page.locator('#save-label[data-saved=true]').waitFor();
  await page.locator('#game-canvas[data-art-ready=true]').waitFor({timeout:9000});
  const deck=createInitialWorld(202608);
  deck.unlockedTech.push('tier3_fortress');
  assert.ok(inventoryChange(deck,[],[{itemId:'frost_iron_ingot',count:7},{itemId:'sulfur_ore',count:3}]));
  assert.ok(build(deck,'frost_turret',24,21));assert.ok(build(deck,'fire_oil_turret',25,21));
  deck.day=5;deck.timeOfDay=.67;stepWorld(deck,1);
  await fixture(deck,'m5-warning');
  await page.locator('#raid-alert[data-phase=warning]').waitFor();
  await page.keyboard.press('b');
  await page.locator('[data-build-kind=frost_turret] img').waitFor();
  await page.locator('[data-build-kind=fire_oil_turret] img').waitFor();
  await page.keyboard.press('Escape');
  deck.timeOfDay=.74;stepWorld(deck,1);
  await fixture(deck,'m5-raid');
  await page.locator('#raid-alert[data-phase=active][data-wave="1"]').waitFor();
  await page.locator('#weather-status').getByText(/大寒潮/).waitFor();
  await shot('01-whiteout-defense');
  await page.keyboard.press('n');await page.locator('#sky-map[open]').waitFor();
  for(const id of ['sulfur_reach','permafrost_ruins'])await page.locator('[data-island-id="'+id+'"]').waitFor({state:'attached'});
  await shot('02-four-wind-zones');await page.keyboard.press('Escape');
  const trip=createInitialWorld(202608),node='sulfur_reach';
  stepWorld(trip,1);trip.ark.anchoredIslandId=node;
  ensureNavigationState(trip).dock={nodeId:node,gx:27,gy:24,deployed:true};
  trip.activeIsland=dockedIsland(trip)!;assert.ok(trip.activeIsland);
  trip.player.x=trip.activeIsland.offsetX+24.45;trip.player.y=trip.activeIsland.offsetY+32.5;
  stepM5(trip);
  const enemy=m5Status(trip).bosses.find(b=>b.defId==='rift_carapace');assert.ok(enemy);
  await fixture(trip,'m5-guardian');
  await page.locator('#island-guardian[data-guardian=rift_carapace]').waitFor();
  await page.locator('#m5-attack-prompt[data-target=rift_carapace]').waitFor();
  await shot('03-rift-guardian');
  const hp=page.locator('#guardian-health'),before=await hp.evaluate((n:HTMLMeterElement)=>n.value);
  await page.keyboard.press('f');
  await page.waitForFunction(n=>(document.getElementById('guardian-health') as HTMLMeterElement).value<n,before);
  enemy.hp=10;await fixture(trip,'m5-guardian-final');
  await page.locator('#m5-attack').click();
  await page.locator('#island-guardian').waitFor({state:'hidden'});
  await page.locator('#m5-seed-count[data-seeds="1"]').waitFor();
  const saved=await exportWorld();
  assert.equal(saved.skyheartCores,1);assert.ok(saved.sky.islands.find(i=>i.id===node)?.bossDefeated);
  const sulfur=createInitialWorld(202608);
  stepWorld(sulfur,1);sulfur.ark.anchoredIslandId='sulfur_furnace';
  ensureNavigationState(sulfur).dock={nodeId:'sulfur_furnace',gx:27,gy:24,deployed:true};
  sulfur.activeIsland=dockedIsland(sulfur)!;
  sulfur.player.x=sulfur.activeIsland.offsetX+13.5;sulfur.player.y=sulfur.activeIsland.offsetY+33.5;
  stepWorld(sulfur,1);
  const lizard=sulfur.wildEntities.find(e=>e.kind==='beast'&&e.defId==='magmalisk');
  assert.ok(lizard,'T3 sulfur islands seed the local Magmalisk encounter');
  sulfur.player.x=lizard.x-1;sulfur.player.y=lizard.y;
  await fixture(sulfur,'m5-sulfur-wildlife');
  await page.locator('#wild-encounter[data-species=magmalisk]').waitFor();
  await page.locator('#action').waitFor({state:'hidden',timeout:5700});
  await shot('04-sulfur-magmalisk');
  console.log('[e2e-visual:M5] OK: day-five warning/raid, high-tier map, rival guardian, player counterstrike and unique core save');
 }finally{await page.close();}
}
