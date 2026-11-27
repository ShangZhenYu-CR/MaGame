import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Browser } from 'playwright';
import type { WorldState } from '../src/sim/types';
import { ensureNavigationState } from '../src/sim/m3-state';
import { createInitialWorld } from '../src/sim/world';

export async function runDeckMovement(browser:Browser,url:string,out:string,errors:string[]){
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  page.on('pageerror',e=>errors.push('deck movement page: '+e.message));
  page.on('console',e=>{if(e.type()==='error')errors.push('deck movement console: '+e.text());});
  const read=async():Promise<WorldState>=>{
    await page.keyboard.press('i');
    const download=page.waitForEvent('download');
    await page.getByRole('button',{name:'导出 JSON'}).click();
    const w=JSON.parse(readFileSync((await (await download).path())!,'utf8')) as WorldState;
    await page.keyboard.press('Escape');
    return w;
  };
  const walk=async(key:string,done:(p:WorldState['player'])=>boolean,ms=480,attempts=12)=>{
    let state=await read();
    for(let i=0;i<attempts&&!done(state.player);i++){
      const before=state.player;
      await page.keyboard.down(key);
      try{await page.waitForTimeout(ms);}finally{await page.keyboard.up(key);}
      state=await read();
      // Short holds can span no simulation frame in a slow browser; allow
      // subsequent holds rather than confusing that with a wall.
      if(ms>=400&&before.x===state.player.x&&before.y===state.player.y)break;
    }
    return state;
  };
  try {
    await page.goto(url,{waitUntil:'networkidle'});
    const cv=page.locator('#game-canvas[data-art-ready=true]');
    await cv.waitFor();
    await page.locator('#save-label[data-saved=true]').waitFor();
    // Reconstruct the screenshot by walking from the unmodified new game.
    assert.ok((await walk('d',p=>p.x>27.55)).player.x>27.55,'walk across the locker front from the spawn');
    assert.ok((await walk('w',p=>p.y<24.4)).player.y<24.4,'right rail beside the locker is walkable');
    const behind=await walk('a',p=>p.x<26.68,95,25);
    assert.ok(behind.player.x>26.2&&behind.player.x<26.68,`align with the back of the locker: ${behind.player.x}`);
    await page.screenshot({path:join(out,'deck-movement-01-chest-approach.png')});
    const contact=await walk('s',p=>p.y>25.216);
    assert.ok(contact.player.y>25.215&&contact.player.y<=25.221,`north approach stops only at the ground contact: ${contact.player.y}`);
    await page.screenshot({path:join(out,'deck-movement-02-chest-contact.png')});
    assert.ok((await walk('d',p=>p.x>27.55)).player.x>27.55,'turn away from the chest without a dead corner');
    assert.ok((await walk('s',p=>p.y>26.26)).player.y>26.26,'get around the side of the chest');
    await page.screenshot({path:join(out,'deck-movement-03-chest-bypass.png')});
    // The bypass can finish farther south when a held key spans extra frames.
    // Walk back into the actual 1.7-tile interaction range before pressing E.
    const reachable=await walk('w',p=>p.y<26.45,135,14);
    assert.ok(Math.hypot(reachable.player.x-26.5,reachable.player.y-25.5)<=1.7,'return to chest interaction range after bypass');
    await page.keyboard.press('e');
    await page.locator('#storage-panel').waitFor();
    await page.keyboard.press('Escape');

    // Use the built-in import UI to set up the exact sub-tile stow condition.
    // Crossing, stowing and recovery below all use real gameplay keys.
    const fixture=createInitialWorld();
    const nodeId=fixture.sky.islands[0].id;
    fixture.ark.anchoredIslandId=nodeId;
    ensureNavigationState(fixture).dock={nodeId,gx:27,gy:24,deployed:true};
    fixture.player.x=27.96;fixture.player.y=24.5;
    const importSave=async()=>{
      await page.keyboard.press('i');
      await page.locator('input[type=file]').setInputFiles({name:'deck-movement.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
      await page.waitForFunction(()=>document.querySelector('#expedition-context')?.getAttribute('data-anchored')==='true');
      await page.keyboard.press('Escape');
    };
    await importSave();
    await page.keyboard.press('e');
    await page.getByText('跳板已收回。',{exact:true}).waitFor();
    assert.ok((await read()).player.x<27.79,'stow at the seam puts feet on the deck');
    assert.ok((await walk('a',p=>p.x<27.48,150)).player.x<27.48,'walk away after stowing at the seam');
    await page.keyboard.press('e');
    await page.getByText('跳板已搭好，沿跳板走上浮岛。',{exact:true}).waitFor();
    await page.screenshot({path:join(out,'deck-movement-04-gangway.png')});
    assert.ok((await walk('d',p=>p.x>32.25)).activeIsland,'cross the deployed gangway to the island on real controls');
    const back=await walk('a',p=>p.x<27.60,225,45);
    assert.ok(back.activeIsland===null&&back.player.x>26.2&&back.player.x<27.60);
    await page.keyboard.press('e');
    await page.getByText('跳板已收回。',{exact:true}).waitFor();
    const resumed=await read();
    assert.equal(ensureNavigationState(resumed).dock?.deployed,false);
    console.log('[e2e-visual:deck movement] OK: new-game chest, visible rail aisle, surface-preserving bridge stow and off/on-ship walking');
  }finally{await page.close();}
}
