import assert from 'node:assert/strict';
import { join } from 'node:path';
import type { Browser } from 'playwright';
import { createInitialWorld } from '../src/sim/world';
import { claimSunSeed } from '../src/sim/m5';
import { expandM5Chart } from '../src/sim/m5-zones';
import { AURORA_ISLAND, attackWhale, finaleStatus, forgeSolarArk, startWhale, stepFinale } from '../src/sim/finale';
import { helmPoint, setDestination, stepNavigation, toggleCruise } from '../src/sim/sky-map';
import { areaAt, dockedIsland, gangwayGeometry, toggleGangway } from '../src/sim/island';
import { initializeHeat, primaryHearth } from '../src/sim/heatField';
import { makeBuilding, refreshBuoyancy } from '../src/sim/ark';
import { serializeWorld } from '../src/sim/save';
import { beastDefinitions } from '../src/sim/beasts';
import { ensureFauna } from '../src/sim/m4-state';

export async function runM6(browser:Browser,baseUrl:string,outDir:string,errors:string[]){
  const p=await browser.newPage({viewport:{width:1280,height:720}});
  p.on('pageerror',e=>errors.push('M6 page: '+e.message));
  p.on('console',m=>{if(m.type()==='error')errors.push('M6 console: '+m.text());});
  const shot=(id:string)=>p.screenshot({path:join(outDir,'M6-'+id+'.png')});
  const fixture=async(w:ReturnType<typeof createInitialWorld>,id:string)=>{
    await p.keyboard.press('i');
    await p.locator('#save-file').setInputFiles({name:id+'.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
    await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor();
    await p.keyboard.press('Escape');await p.locator('#inventory').waitFor({state:'hidden'});
  };
  try{
    await p.goto(baseUrl,{waitUntil:'networkidle'});
    await p.locator('#game-canvas[data-art-ready=true]').waitFor();
    await p.locator('#save-label[data-saved=true]').waitFor();
    const w=createInitialWorld(202608);
    expandM5Chart(w);
    Object.assign(w.player,helmPoint(w));
    await fixture(w,'m6-locked-route');
    await p.keyboard.press('n');
    await p.locator('[data-island-id=aurora_vault]').click();
    assert.equal(await p.locator('#sky-set-course').isDisabled(),true);
    await p.getByText('极光天穹 · 点燃太阳方舟后开放',{exact:true}).waitFor();
    await p.keyboard.press('Escape');

    primaryHearth(w)!.level=3;
    Object.assign(w.player,{x:24.5,y:25.9});
    for(let y=20;y<=27;y++)for(let x=20;x<=28;x++)w.ark.decks[y*w.ark.size+x]=1;
    const placements=[
      ['beast_den',21,22],['feed_trough',22,25],['heat_relay',26,22],['heat_relay',27,26],['buoyancy_core',21,26],
      ['greenhouse',25,25],['workbench',24,21],['frost_turret',25,21],['fire_oil_turret',22,26]
    ] as const;
    for(const [id,x,y] of placements)w.ark.buildings.push(makeBuilding(id,x,y,'m6_'+id));
    ensureFauna(w).feed=8;refreshBuoyancy(w);initializeHeat(w);
    const positions=[[22.2,24.5],[24.0,25.7],[26.6,24.4],[21.5,25.4],[23.2,22.6],[25.7,23.6],[24.5,23.2]];
    for(const [i,[id,b]] of [...beastDefinitions].entries()) {
      const [x,y]=positions[i];
      w.beasts.push({id:'m6_'+id,defId:id,name:b.name,x,y,hp:b.maxHp,maxHp:b.maxHp,warmth:85,hunger:80,
        role:i===1||i===2||i===6?'companion':i===0||i===4?'work':'rest',denBuildingId:'m6_beast_den',workCooldown:10});
    }
    for(const key of ['frostpine_gate','sulfur_reach','sulfur_furnace','permafrost_ruins'] as const){
      const n=w.sky.islands.find(i=>i.id===key)!;
      if(key==='sulfur_furnace'||key==='permafrost_ruins')n.deltas.chest_2068=1;else n.bossDefeated=true;
      assert.ok(claimSunSeed(w,key));
    }
    await fixture(w,'m6-four-seeds');
    await p.locator('#forge-solar').click();
    await p.getByText('太阳方舟点燃。极光天穹已开放。',{exact:true}).waitFor();
    await p.waitForFunction(()=>document.querySelector('#weather-status')?.textContent?.includes('Lv.4'));
    await p.locator('#action').waitFor({state:'hidden',timeout:6000});
    await shot('02-solar-ark');
    assert.equal(forgeSolarArk(w),null);

    Object.assign(w.player,helmPoint(w));
    assert.equal(setDestination(w,AURORA_ISLAND),null);assert.equal(toggleCruise(w),null);
    for(let i=0;i<7500&&w.sky.cruising;i++)stepNavigation(w);
    const g=gangwayGeometry(w)!;
    Object.assign(w.player,{x:g.x-.5,y:g.y+.5});assert.equal(toggleGangway(w),null);
    w.activeIsland=dockedIsland(w);
    const entry=g.x+g.width;
    for(let i=2;i<=7;i++)if(areaAt(w,entry+i+.5,g.y+.5)==='island'){
      Object.assign(w.player,{x:entry+i+.5,y:g.y+.5});break;
    }
    w.beasts=[]; // Keep the scene readable; companion combat also has headless coverage.
    await fixture(w,'m6-aurora-coast');
    await p.locator('#whale-start').click();
    await p.locator('#whale-context[data-phase="1"]').waitFor();

    // Use a deterministic late-phase fixture, then deliver the last strike through
    // a real key press. Headless smoke independently plays every full phase.
    assert.equal(startWhale(w),null);
    let iterations=0;
    while(finaleStatus(w).whale!.phase<2&&iterations++<2600){
      const b=finaleStatus(w).whale!;
      if(b.open){Object.assign(w.player,{x:b.x-1.5,y:b.y});attackWhale(w);}
      else if(b.warning)Object.assign(w.player,{x:b.warning.x-4.2,y:b.warning.y+.4});
      w.tick++;stepFinale(w);
      w.player.hp=100;
    }
    assert.equal(finaleStatus(w).whale?.phase,2);
    const b=finaleStatus(w).whale!;
    Object.assign(w.player,{x:b.x-1.5,y:b.y});
    while(!finaleStatus(w).whale!.warning){w.tick++;stepFinale(w);}
    const save=JSON.parse(serializeWorld(w));
    save.finaleM6.whale.hp=10;
    save.finaleM6.whale.warning.until=w.tick+150;
    await fixture(save,'m6-final-move');
    await p.locator('#whale-context[data-phase="3"]').waitFor();
    await p.getByText('冰面正在发亮，移出预警圈。',{exact:true}).waitFor();
    await p.locator('#action').waitFor({state:'hidden',timeout:5600});
    await shot('01-frost-whale');
    await p.keyboard.down('s');
    try{await p.waitForTimeout(1240);}finally{await p.keyboard.up('s');}
    await p.locator('#whale-context[data-vulnerable=true]').waitFor({timeout:6200});
    await p.keyboard.press('f');
    await p.locator('#victory-panel').waitFor();
    await shot('03-victory');
    await p.locator('#continue-endless').click();
    await p.locator('#victory-panel').waitFor({state:'hidden'});
    await p.keyboard.press('j');
    await p.locator('#codex').waitFor();
    await p.locator('#action').waitFor({state:'hidden',timeout:5600});
    assert.equal(await p.locator('#codex-list li').count(),7);
    await p.locator('#codex-buildings').click();
    assert.ok(await p.locator('#codex-list li').count()>=14);
    await shot('04-building-codex');
    await p.keyboard.press('Escape');await p.locator('#codex').waitFor({state:'hidden'});
    console.log('[e2e-visual:M6] OK: solar route lock, real forge, distinct whale phases, dodge/finishing strike, victory, endless and complete codex');
  }finally{await p.close();}
}
