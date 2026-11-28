import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser } from 'playwright';
import { countItem } from '../src/sim/ark';
import { endlessView,isBountyEnemy } from '../src/sim/endless';
import { serializeWorld } from '../src/sim/save';
import type { WorldState } from '../src/sim/types';
import { clearedVoyage,reachHunt } from './p2-endless-fixture';
import { exportWorld } from './p2-hook-e2e';

export async function runP2Endless(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1440,height:900}}),canvas=p.locator('#game-canvas');
 p.on('pageerror',e=>errors.push('P2-34 endless page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('P2-34 endless console: '+m.text());});
 p.on('response',r=>{if(r.status()===404)errors.push('P2-34 endless 404: '+r.url());});
 const hud=p.locator('#deep-voyage'),shot=(n:string)=>p.screenshot({path:resolve(dir,'P2-34-'+n+'.png')});
 async function load(w:WorldState){
  await p.locator('#save-file').setInputFiles({name:'deep-sea-checkpoint.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
  await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor({state:'attached'});
 }
 try{
  await p.goto(url,{waitUntil:'networkidle'});await canvas.and(p.locator('[data-art-ready=true]')).waitFor();
  await load(clearedVoyage());
  await p.locator('#continue-endless').click();
  await hud.and(p.locator('[data-depth="1"][data-bounty=offered]')).waitFor();
  await shot('01-depth-and-offer');
  await hud.locator('#deep-action').click();await hud.and(p.locator('[data-bounty=active]')).waitFor();
  const hunt=await exportWorld(p);
  const job=reachHunt(hunt);
  await load(hunt);
  await p.getByText(/远古.*$/, {exact:false}).filter({visible:true}).first().waitFor();
  let before=await exportWorld(p);
  for(let t=0;t<12&&!before.wildEntities.some(isBountyEnemy);t++){
   await p.keyboard.down('d');await p.waitForTimeout(165);await p.keyboard.up('d');before=await exportWorld(p);
  }
  assert.ok(before.wildEntities.some(isBountyEnemy));
  await shot('02-ancient-encounter');
  await p.keyboard.press('4');
  await canvas.and(p.locator('[data-mode=weapon]')).waitFor();
  for(let j=0;j<12;j++){
   const v=await exportWorld(p),a=v.wildEntities.find(e=>isBountyEnemy(e)&&e.hp>0);
   if(!a)break;
   if(Math.hypot(a.x-v.player.x,a.y-v.player.y)>6){
    await p.keyboard.down('d');await p.waitForTimeout(240);await p.keyboard.up('d');
   }else if(Math.hypot(a.x-v.player.x,a.y-v.player.y)<.65){
    await p.keyboard.down('a');await p.waitForTimeout(290);await p.keyboard.up('a');
   }
   const pt=await canvas.evaluate((el,{x,y})=>{
    const c=el as HTMLCanvasElement,r=c.getBoundingClientRect(),s=Number(c.dataset.tileScale);
    return {x:r.left+(Number(c.dataset.originX)+x*s)*r.width/c.width,y:r.top+(Number(c.dataset.originY)+y*s)*r.height/c.height};
   },a);
   await p.mouse.click(pt.x,pt.y);await p.waitForTimeout(950);
  }
  await hud.and(p.locator('[data-bounty=reward]')).waitFor({timeout:7500});
  await shot('03-bounty-ready');
  const pre=await exportWorld(p);
  await p.getByRole('button',{name:'领取悬赏',exact:true}).click();
  const after=await exportWorld(p);
  assert.ok(countItem(after,'sky_mithril')>countItem(pre,'sky_mithril'));
  assert.ok(endlessView(after)!.points>=endlessView(pre)!.points+60);
  assert.equal(endlessView(after)?.cleared,1);
  await shot('04-prize-and-rating');
  await p.reload({waitUntil:'networkidle'});
  await hud.waitFor();assert.equal(endlessView(await exportWorld(p))?.cleared,1);
  console.log('[e2e:P2-34] OK: endless entered after win, board accept, real ancient combat, reward and increased rating persisted for '+job.island);
 }finally{await p.close();}
}
if(process.argv[1]?.endsWith('/p2-endless-e2e.ts')||process.argv[1]==='scripts/p2-endless-e2e.ts'){
 const dir=resolve('artifacts/p2-s6');mkdirSync(dir,{recursive:true});const b=await chromium.launch(),errors:string[]=[];
 try{await runP2Endless(b,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}finally{await b.close();}
}
