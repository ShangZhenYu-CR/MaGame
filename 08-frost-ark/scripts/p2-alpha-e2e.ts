import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser,type Page } from 'playwright';
import { areaAt } from '../src/sim/island';
import { countItem } from '../src/sim/ark';
import { beastProfile } from '../src/sim/beast-traits';
import { serializeWorld } from '../src/sim/save';
import { alphaFixture } from './p2-alpha-fixture';
import { exportWorld } from './p2-hook-e2e';

export async function runP2Alpha(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1440,height:900}});
 p.on('pageerror',e=>errors.push('P2-27 alpha page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('P2-27 alpha console: '+m.text());});
 p.on('response',r=>{if(r.status()===404)errors.push('P2-27 alpha 404: '+r.url());});
 try{
  await p.goto(url,{waitUntil:'networkidle'});
  await p.locator('#game-canvas[data-art-ready=true]').waitFor();
  const {w,elite,def}=alphaFixture();
  const before={x:elite.x,y:elite.y};
  await p.keyboard.press('i');
  await p.locator('#save-file').setInputFiles({name:'naturally-occurring-elite.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
  await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor({state:'attached'});
  await p.keyboard.press('Escape');
  const ctx=p.locator('#wild-encounter[data-alpha=true]');
  await ctx.waitFor();await p.locator('#game-canvas[data-alpha-visible="1"]').waitFor();
  // Use the visible observation card, not a direct simulation action.
  await ctx.locator('#wild-lock').click({timeout:5000});
  await p.locator('#wild-encounter[data-locked=true]').waitFor();
  await p.waitForTimeout(440);
  const moving=await exportWorld(p),roamed=moving.wildEntities.find(e=>e.id===elite.id)!;
  assert.ok(roamed.maxHp>def.maxHp);
  assert.notEqual(await ctx.getAttribute('data-behavior'),'watch');
  assert.ok(Math.hypot(roamed.x-before.x,roamed.y-before.y)>.09);
  const read=async()=>{
   const world=await exportWorld(p);
   const entity=world.wildEntities.find(b=>b.id===elite.id)!;
   return {world,entity,gap:Math.hypot(entity.x-world.player.x,entity.y-world.player.y)};
  };
  const move=async (limit:number,retreat=false)=>{
   const dirs=[['a',-1,0],['d',1,0],['w',0,-1],['s',0,1],['aw',-.707,-.707],['dw',.707,-.707],['as',-.707,.707],['ds',.707,.707]] as const;
   for(let attempt=0;attempt<60;attempt++){
    const {world,entity,gap}=await read();
    if(retreat?gap>=limit:gap<=limit)return;
    const pos=world.player;
    const options=dirs.map(([keys,x,y])=>({keys,end:{x:pos.x+x*.62,y:pos.y+y*.62}}))
     .filter(({end})=>areaAt(world,end.x,end.y)==='island')
     .map(({keys,end})=>({keys,d:Math.hypot(end.x-entity.x,end.y-entity.y)}))
     .sort((a,b)=>retreat?b.d-a.d:a.d-b.d);
    assert.ok(options[0],'No traversable keyboard direction');
    const keys=options[0].keys.split('');
    for(const key of keys)await p.keyboard.down(key);
    await p.waitForTimeout(185);
    for(const key of keys)await p.keyboard.up(key);
   }
   throw Error(`Could not ${retreat?'retreat':'approach'} via playable movement: gap ${(await read()).gap.toFixed(2)}`);
  };
  await move(3.05,true);
  assert.equal(await ctx.getAttribute('data-wild-id'),elite.id);
  assert.equal(await ctx.getAttribute('data-locked'),'true');
  await p.getByText(/请靠近.*麻痹网 2.8 格/).waitFor();
  assert.ok(await ctx.locator('#wild-net').isDisabled());
  assert.ok(await ctx.locator('#wild-feed').isDisabled());
  await p.screenshot({path:resolve(dir,'P2-27-01-alpha-halo-and-behavior.png')});
  await p.keyboard.down('Shift');
  try{await move(1.5);}finally{await p.keyboard.up('Shift');}
  const netBefore=countItem((await read()).world,'paralysis_net');
  await ctx.locator('#wild-net').click({timeout:5000});
  const netted=await read();
  assert.equal(countItem(netted.world,'paralysis_net'),netBefore-1);
  assert.ok(netted.entity.stunnedTicks>0,'The original locked head must be stunned');
  await ctx.locator('#wild-feed').waitFor();
  for(let i=0;i<def.tameFeedsRequired;i++)await ctx.locator('#wild-feed').click();
  await p.getByText(new RegExp(def.name+'已成为方舟伙伴')).waitFor();
  const after=await exportWorld(p),known=after.beasts.find(b=>b.id===elite.id)!;
  assert.ok(known);assert.ok(beastProfile(after,known).rare);
  await p.keyboard.press('v');
  const roster=p.locator('#beast-roster [data-beast-id="'+elite.id+'"] [data-rare=true]');
  await roster.waitFor();
  await p.screenshot({path:resolve(dir,'P2-27-02-tamed-gold-trait.png')});
  await p.reload({waitUntil:'networkidle'});await p.keyboard.press('v');
  await roster.waitFor();assert.ok(beastProfile(await exportWorld(p),known).rare);
  console.log('[e2e:P2-27] OK: naturally seeded wild alpha movement and luminous cue, actual net and feed tames it, visible gold trait persists');
 }finally{await p.close();}
}
if(process.argv[1]?.endsWith('/p2-alpha-e2e.ts')||process.argv[1]==='scripts/p2-alpha-e2e.ts'){
 const dir=resolve('artifacts/p2-s5');mkdirSync(dir,{recursive:true});
 const b=await chromium.launch(),errors:string[]=[];
 try{await runP2Alpha(b,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}
 finally{await b.close();}
}
