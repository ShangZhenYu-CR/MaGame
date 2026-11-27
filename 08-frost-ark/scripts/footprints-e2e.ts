import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Browser } from 'playwright';
import type { WorldState } from '../src/sim/types';

export async function runFootprints(browser:Browser,url:string,out:string,errors:string[]){
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  page.on('pageerror',e=>errors.push('footprints page: '+e.message));
  page.on('console',e=>{if(e.type()==='error')errors.push('footprints console: '+e.text());});
  try {
    await page.goto(url,{waitUntil:'networkidle'});
    const cv=page.locator('#game-canvas[data-art-ready=true]');
    await cv.waitFor();
    await page.locator('#save-label[data-saved=true]').waitFor();
    const at=async(x:number,y:number)=>cv.evaluate((e,{x,y})=>{
      const b=e.getBoundingClientRect(),s=Number(e.dataset.tileScale);
      return {x:b.left+Number(e.dataset.originX)+x*s,y:b.top+Number(e.dataset.originY)+y*s};
    },{x,y});
    const place=async(x:number,y:number)=>{
      const p=await at(x,y);
      await page.mouse.click(p.x,p.y);
    };
    const read=async():Promise<WorldState>=>{
      await page.keyboard.press('i');
      const dl=page.waitForEvent('download');
      await page.getByRole('button',{name:'导出 JSON'}).click();
      const value=JSON.parse(readFileSync((await (await dl).path())!,'utf8')) as WorldState;
      await page.keyboard.press('Escape');
      return value;
    };
    const hold=async(key:string,ms:number)=>{
      await page.keyboard.down(key);
      try { await page.waitForTimeout(ms); }
      finally { await page.keyboard.up(key); }
    };
    await page.keyboard.press('i');
    await page.getByRole('button',{name:'制作 ×2'}).click();
    await page.keyboard.press('Escape');
    await page.keyboard.press('2');
    await place(23.5,26.5);
    await page.getByText('防风火把已点亮。',{exact:true}).waitFor();
    await page.keyboard.press('b');
    await page.locator('[data-build-kind=workbench]').click();
    await place(22.5,26.5);
    await page.getByText('木工台已放好。',{exact:true}).waitFor();
    await page.keyboard.press('q');

    const before=await read();
    assert.ok(before.ark.buildings.some(b=>b.defId==='torch_post'&&b.gx===23&&b.gy===26));
    assert.ok(before.ark.buildings.some(b=>b.defId==='workbench'&&b.gx===22&&b.gy===26));
    // This is a real walk from a clean game, not a position fixture or game API call.
    // Frame rate is not fixed in headless runs. Measure the exported position
    // between real key holds instead of assuming elapsed wall time is game time.
    const travel=async(key:string,done:(p:WorldState['player'])=>boolean)=>{
      let snapshot=await read();
      for(let i=0;i<6&&!done(snapshot.player);i++){
        const previous=snapshot.player;
        await hold(key,610);
        snapshot=await read();
        if(previous.x===snapshot.player.x&&previous.y===snapshot.player.y)break;
      }
      return snapshot;
    };
    const left=await travel('a',p=>p.x<21.9);
    assert.ok(left.player.x<21.9&&left.player.y>26&&left.player.y<26.24,
      `pass behind both buildings in the same row: ${left.player.x},${left.player.y}`);
    await page.screenshot({path:join(out,'footprints-01-behind.png')});
    const south=await travel('s',p=>p.y>27.04);
    assert.ok(south.player.y>27.04,'reach the lane in front');
    const front=await travel('d',p=>p.x>24.15);
    assert.ok(front.player.x>24.15&&front.player.y>27.02,
      `walk back across the front lane: ${front.player.x},${front.player.y}`);
    await page.screenshot({path:join(out,'footprints-02-front.png')});
    // Autosave records movement on the next three-second tick, not on key-up.
    await page.waitForTimeout(5100);
    await page.reload({waitUntil:'networkidle'});
    await cv.waitFor();
    const resumed=await read();
    assert.ok(Math.abs(resumed.player.x-front.player.x)<.01);
    assert.ok(resumed.ark.buildings.some(b=>b.defId==='workbench'&&b.gx===22&&b.gy===26));
    console.log('[e2e-visual:footprints] OK: crafted, built, walked behind / in front, reloaded fresh-game save');
  }finally{await page.close();}
}
