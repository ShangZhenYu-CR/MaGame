import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser,type Page } from 'playwright';
import { beastCooldown,beastLevel } from '../src/sim/beast-growth';
import { serializeWorld } from '../src/sim/save';
import { stageSkillGuardian } from './p2-skills-fixture';
import { exportWorld } from './p2-hook-e2e';

export async function runP2Skills(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1440,height:900}});
 p.on('pageerror',e=>errors.push('P2-25 skill page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('P2-25 skill console: '+m.text());});
 p.on('response',r=>{if(r.status()===404)errors.push('P2-25 skill 404: '+r.url());});
 try{
  await p.goto(url,{waitUntil:'networkidle'});
  const stage=p.locator('#game-canvas[data-art-ready=true]'),skill=p.locator('#companion-skill');
  await stage.waitFor();
  const {w,leader,healer,foe}=stageSkillGuardian();
  await p.keyboard.press('i');
  await p.locator('#save-file').setInputFiles({name:'battle-companions.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
  await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor({state:'attached'});
  await p.keyboard.press('Escape');
  await p.locator('#companion-skill[data-ready=true]').waitFor();
  assert.equal(await skill.locator('img').evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>=32),true);
  const before=await exportWorld(p);
  const originalHP=before.wildEntities.find(x=>x.id===foe.id)?.hp;
  assert.ok(originalHP&&originalHP>0);
  await p.keyboard.press('g');
  await p.getByText(/^炎流吐息 · 命中/).waitFor();
  await p.screenshot({path:resolve(dir,'P2-25-01-live-flame-strike.png')});
  const after=await exportWorld(p);
  assert.ok((after.wildEntities.find(x=>x.id===foe.id)?.hp??0)<originalHP);
  const grew=after.beasts.find(b=>b.id===leader.id)!;
  assert.equal(beastLevel(after,grew),2);
  assert.ok(grew.maxHp>leader.maxHp);
  assert.ok(beastCooldown(after,grew)>0);
  assert.equal(await skill.isDisabled(),true);
  await p.keyboard.press('v');
  const roster=p.locator('#beast-roster');
  const elk=roster.locator('[data-beast-id="'+healer.id+'"]');
  await elk.locator('[data-beast-leader]').click();
  await p.getByText(healer.name+'已带队。',{exact:true}).waitFor();
  await p.screenshot({path:resolve(dir,'P2-25-02-trained-roster.png')});
  await p.keyboard.press('Escape');
  await p.locator('#companion-skill[data-ready=true]').getByText('回春暖域',{exact:true}).waitFor();
  const chills=await exportWorld(p);
  await p.keyboard.press('g');
  await p.locator('#action').filter({hasText:/^回春暖域/}).waitFor();
  await p.screenshot({path:resolve(dir,'P2-25-03-restorative-field.png')});
  const warmed=await exportWorld(p);
  assert.ok(warmed.player.warmth>=Math.min(100,chills.player.warmth+23)-1);
  assert.ok(warmed.player.hp>=Math.min(100,chills.player.hp+13)-1);
  assert.ok(beastCooldown(warmed,healer)>0&&beastCooldown(warmed,leader)>0);
  await p.reload({waitUntil:'networkidle'});
  await p.locator('#companion-skill[data-ready=false]').getByText('回春暖域',{exact:true}).waitFor();
  const resumed=await exportWorld(p);
  assert.equal(beastLevel(resumed,grew),2);
  console.log('[e2e:P2-25] OK: real G damage and combat level-up, independent healer cooldown, health and warmth, reload preserves lead and skills');
 }finally{await p.close();}
}
if(process.argv[1]?.endsWith('/p2-skills-e2e.ts')||process.argv[1]==='scripts/p2-skills-e2e.ts'){
 const dir=resolve('artifacts/p2-s5');mkdirSync(dir,{recursive:true});
 const b=await chromium.launch(),errors:string[]=[];
 try{await runP2Skills(b,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}
 finally{await b.close();}
}
