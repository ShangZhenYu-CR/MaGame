import { runP2Raiders } from "./p2-raiders-e2e";
import { runP2Defense } from "./p2-defense-e2e";
import { runP2Latte } from "./p2-latte-e2e";
import { runP2Bond } from "./p2-bond-e2e";
import { runP2Alpha } from "./p2-alpha-e2e";
import { runP2Breeding } from "./p2-breed-e2e";
import { runP2Skills } from "./p2-skills-e2e";
import { runP2Traits } from "./p2-traits-e2e";
import { runP2Survey } from "./p2-survey-e2e";
import { runP2SkyEvents } from "./p2-sky-event-e2e";
import { runP2Caves } from './p2-cave-e2e';
import { runP2Forage } from './p2-forage-e2e';
import { runP2Landmarks } from './p2-landmark-e2e';
import { runP2Coasts } from './p2-coast-e2e';
import { runP2Dock } from './p2-dock-e2e';
import { runP2Home } from './p2-home-e2e';
import { runP2Utilities } from './p2-utilities-e2e';
import { runP2Rig } from './p2-rig-e2e';
import { runP2Logistics } from './p2-logistics-e2e';
import { runP2Room } from './p2-room-e2e';
import { runP2Hotbar } from './p2-hotbar-e2e';
import { runP2Elements } from './p2-elements-e2e';
import { runP2Juice } from './p2-juice-e2e';
import { runP2Roll } from './p2-roll-e2e';
import { runP2Weapons } from './p2-weapons-e2e';
import { runP2Gear } from './p2-gear-e2e';
import { runP2Hearth } from './p2-hearth-e2e';
import { runP2Hull } from './p2-hull-e2e';
import { runP2Hook } from './p2-hook-e2e';
import { runP2Food } from './p2-food-e2e';
import { runP2Rescue } from './p2-rescue-e2e';
import { runDeckMovement } from './deck-movement-e2e';
import { runFootprints } from './footprints-e2e';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { chromium, type Page } from 'playwright';
import { createInitialWorld, stepWorld } from '../src/sim/world';
import { build, countItem, inventoryChange } from '../src/sim/ark';
import { areaAt,dockedIsland,gangwayGeometry,islandNodes,islandNodeRemaining,nearestIslandNode } from '../src/sim/island';
import { helmPoint, setDestination, toggleCruise } from '../src/sim/sky-map';
import { deserializeWorld } from '../src/sim/save';
import { runGrappleRange } from './grapple-range-e2e';
import { runM4 } from './m4-e2e';
import { runM6 } from './m6-e2e';
import { runM5 } from './m5-e2e';

const repoRoot = resolve(process.cwd(), '..');
const outDir = resolve(process.cwd(), 'artifacts', 'e2e');
mkdirSync(outDir, { recursive: true });

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
};

const server = createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];
  let filePath = resolve(repoRoot, '.' + decodeURIComponent(urlPath));
  if (!filePath.startsWith(repoRoot)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html');
  }
  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const mime = MIME[extname(filePath)] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  res.end(readFileSync(filePath));
});

await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
const addr = server.address();
const port = typeof addr === 'object' && addr ? addr.port : 0;
const localEntry = process.env.FROST_E2E_FILE;
const baseUrl = localEntry
  ? pathToFileURL(resolve(repoRoot, '08-frost-ark', localEntry)).href
  : `http://127.0.0.1:${port}/08-frost-ark/index.html`;

// Translate the original M0/M1 click targets to the current projection: retain the same
// simulation coordinates, wait for the measured camera, and dispatch real pointer input.
async function pointerAt(page:Page, oldX:number, oldY:number, click=false):Promise<void>{
  const x=(oldX+389)/42,y=(oldY+662)/42;
  const screen=await page.locator('#game-canvas').evaluate((el,{x,y})=>{
    const bounds=el.getBoundingClientRect(),scale=Number(el.dataset.tileScale);
    return {x:bounds.left+Number(el.dataset.originX)+x*scale,y:bounds.top+Number(el.dataset.originY)+y*scale};
  },{x,y});
  assert.ok(Number.isFinite(screen.x)&&Number.isFinite(screen.y),'camera projection must be measurable');
  if(click)await page.mouse.click(screen.x,screen.y);else await page.mouse.move(screen.x,screen.y);
}
async function assertArtHud(page:Page):Promise<void>{
  await page.locator('#game-canvas[data-art-ready=true]').waitFor({timeout:5000});
  await page.waitForFunction(()=>[...document.querySelectorAll<HTMLImageElement>('.toolbar img')].every(img=>
    img.complete && img.naturalWidth>=48 && img.src.startsWith('data:image/')));
  assert.equal(await page.locator('.toolbar img').count(),5);
  const decoded=await page.locator('.toolbar img').evaluateAll(imgs=>imgs.map(node=>{
    const img=node as HTMLImageElement,c=document.createElement('canvas');
    c.width=img.naturalWidth;c.height=img.naturalHeight;
    const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);
    const pixels=ctx.getImageData(0,0,c.width,c.height).data;
    let opaque=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>127)opaque++;
    return opaque/(c.width*c.height);
  }));
  assert.ok(decoded.every(ratio=>ratio>.045),`toolbar art must contain visible subjects: ${decoded}`);
  assert.equal(await page.locator('.toolbar img').first().evaluate(img=>img.getBoundingClientRect().width),32);
  assert.equal(await page.locator('.toolbar output').count(),5);
  assert.equal(await page.locator('#thermal-stats meter').count(),3);
}
const errors: string[] = [];
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    errors.push(`pageerror: ${err.message}`);
  });

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const shotPath = resolve(outDir, '01-boot-overview.png');
  await page.screenshot({ path: shotPath });

  const portraitOk = await page.evaluate(() => {
    const img = document.getElementById('manan-portrait') as HTMLImageElement | null;
    return Boolean(img && img.complete && img.naturalWidth > 0);
  });
  if (!portraitOk) {
    errors.push('MaNan portrait ../assets/character/head-0.png failed to load');
  }

  // M0 journey: real pointer, keyboard, storage and download actions on the built page.
  await page.locator('#save-label[data-saved=true]').waitFor();
  await page.getByRole('heading', {name:'马楠：霜云方舟'}).waitFor();
  await assertArtHud(page);
  const view=page.locator('#game-canvas');
  const scale=Number(await view.getAttribute('data-tile-scale'));
  assert.ok(scale>=56&&scale<=64,`default zoom out of band: ${scale}`);
  await page.mouse.move(645,275);await page.mouse.wheel(0,-120);
  await page.waitForFunction(original=>Number(document.getElementById('game-canvas')?.dataset.tileScale)>original,scale);
  await page.mouse.wheel(0,120);
  await page.waitForFunction(original=>Number(document.getElementById('game-canvas')?.dataset.tileScale)===original,scale);
  // Re-enter via the actual JSON importer after render/zoom checks so Chromium timing
  // cannot move the starter crate underneath the deck before the first cast.
  await page.keyboard.press('i');
  await page.locator('#save-file').setInputFiles({name:'m0-cast-fixture.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(createInitialWorld(202608)))});
  await page.getByText('已载入 JSON 存档。',{exact:true}).waitFor();
  await page.keyboard.press('Escape');
  // Aim through the starter flotsam lane, not at its former short endpoint:
  // wheel assertions and asset decoding can move the drifting crate between frames.
  await pointerAt(page,367,461.5);
  await page.mouse.down();
  await page.locator('#action').getByText('抓钩蓄力 100%', {exact:true}).waitFor();
  await page.mouse.up();
  await page.locator('#action').getByText('正在拉回：浮木板', {exact:true}).waitFor({timeout:4000});
  const shotCatch = resolve(outDir,'02-grapple-retract.png');
  await page.screenshot({path:shotCatch});
  await page.locator('#action').getByText('已回收入包：浮木板 ×3', {exact:true}).waitFor({timeout:4000});

  await page.getByRole('button',{name:'甲板'}).click();
  await pointerAt(page,807,448);
  await page.getByText('吸附就绪 · 浮木板 ×2',{exact:true}).waitFor();
  await pointerAt(page,807,448,true);
  await page.getByText('甲板已拼接，可以走上去。',{exact:true}).waitFor();
  await page.getByRole('button',{name:'背包',exact:false}).first().click();
  await page.locator('#stacks').getByText('×9',{exact:true}).waitFor();
  await page.getByRole('button',{name:'制作 ×2'}).click();
  await page.locator('#stacks').getByText('防风火把',{exact:true}).waitFor();
  await page.getByRole('button',{name:'火把',exact:false}).first().click();
  await pointerAt(page,807,448,true);
  await page.getByText('防风火把已点亮。',{exact:true}).waitFor();
  await page.getByRole('button',{name:'甲板'}).click();
  await pointerAt(page,851,448);
  await page.getByText('吸附就绪 · 浮木板 ×2',{exact:true}).waitFor();
  const shotBuild=resolve(outDir,'03-expanded-deck-and-pack.png');
  await page.screenshot({path:shotBuild});
  const downloadEvent=page.waitForEvent('download');
  await page.getByRole('button',{name:'导出 JSON'}).click();
  const download=await downloadEvent;
  assert.equal(download.suggestedFilename(),'frost-ark-save.json');
  const exported=JSON.parse(readFileSync((await download.path())!,'utf8'));
  const x=exported.ark.size/2+4,y=exported.ark.size/2+2;
  assert.equal(exported.ark.decks[y*exported.ark.size+x],1);
  assert.ok(exported.ark.buildings.some((b:{defId:string;gx:number;gy:number})=>b.defId==='torch_post'&&b.gx===x&&b.gy===y));

  // Check that the transaction actually committed before navigating, not just the starter save label.
  await page.waitForFunction(() => new Promise<boolean>((done)=>{
    const open=indexedDB.open('manan-frost-ark',1);
    open.onerror=()=>done(false);
    open.onsuccess=()=>{
      const database=open.result;
      const get=database.transaction('saves').objectStore('saves').get('world-M0');
      get.onsuccess=()=>{database.close();done(typeof get.result==='string'&&JSON.parse(get.result).ark.buildings.some((b:{defId:string})=>b.defId==='torch_post'));};
      get.onerror=()=>{database.close();done(false);};
    };
  }));
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#save-label[data-saved=true]').waitFor();
  await page.keyboard.press('i');
  await page.locator('#stacks').getByText('防风火把',{exact:true}).waitFor();
  assert.match((await page.locator('#hud-stats').textContent()) ?? '', /51\/64/);
  const invalid=Buffer.from('{"saveVersion":1}');
  await page.locator('#save-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:invalid});
  await page.getByText(/^导入失败/).waitFor();
  assert.match((await page.locator('#hud-stats').textContent()) ?? '', /51\/64/);
  await page.locator('#save-file').setInputFiles({name:'m0.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});
  await page.getByText('已载入 JSON 存档。',{exact:true}).waitFor();
  await page.keyboard.press('Escape');
  await page.locator('#inventory').waitFor({state:'hidden'});
  console.log('[e2e-visual:M0] OK: grapple + build + inventory + IndexedDB reload + JSON export/import');

  // M0 refinement: walk to the chest, persist a stack, retrieve it and import it back.
  await page.keyboard.down('d');
  await page.getByText('按 E 或点击储物箱存取物品',{exact:true}).waitFor({timeout:4000});
  await page.keyboard.up('d');
  await page.keyboard.press('e');
  await page.getByRole('heading',{name:'储物箱',exact:true}).waitFor();
  await page.getByRole('button',{name:'存入 旧缆绳',exact:true}).click();
  await page.locator('#storage-stacks').getByText('旧缆绳 ×1',{exact:true}).waitFor();
  await page.locator('#storage-deposit').getByText('旧缆绳 ×2',{exact:true}).waitFor();
  await page.screenshot({path:resolve(outDir,'04-storage-in-use.png')});
  await page.waitForFunction(()=>new Promise<boolean>(done=>{
    const request=indexedDB.open('manan-frost-ark',1);
    request.onerror=()=>done(false);
    request.onsuccess=()=>{
      const db=request.result;
      const get=db.transaction('saves').objectStore('saves').get('world-M0');
      get.onsuccess=()=>{db.close();done(typeof get.result==='string'&&JSON.parse(get.result).storageM0?.[0]?.itemId==='rope');};
      get.onerror=()=>{db.close();done(false);};
    };
  }));
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#save-label[data-saved=true]').waitFor();
  await page.keyboard.press('e');
  await page.locator('#storage-stacks').getByText('旧缆绳 ×1',{exact:true}).waitFor();
  await page.keyboard.press('Escape');
  await page.keyboard.press('i');
  const stashDownload=page.waitForEvent('download');
  await page.getByRole('button',{name:'导出 JSON'}).click();
  const stashExport=readFileSync((await (await stashDownload).path())!);
  assert.deepEqual(JSON.parse(stashExport.toString()).storageM0,[{itemId:'rope',count:1}]);
  await page.keyboard.press('e');
  await page.getByRole('button',{name:'取出 旧缆绳',exact:true}).click();
  await page.locator('#storage-stacks').getByText('箱内空着',{exact:true}).waitFor();
  await page.locator('#storage-deposit').getByText('旧缆绳 ×3',{exact:true}).waitFor();
  await page.keyboard.press('i');
  await page.locator('#save-file').setInputFiles({name:'locker.json',mimeType:'application/json',buffer:stashExport});
  await page.getByText('已载入 JSON 存档。',{exact:true}).waitFor();
  await page.keyboard.press('e');
  await page.locator('#storage-stacks').getByText('旧缆绳 ×1',{exact:true}).waitFor();
  console.log('[e2e-visual:M0-refinement] OK: walk to locker, deposit/withdraw, local reload and JSON round-trip');

  // Both extracted static launchers must render when opened directly, without custom browser flags.
  if (!localEntry) {
    for (const entry of ['index.html','dist/index.html']) {
      const direct=await browser.newPage({viewport:{width:1280,height:720}});
      try {
        direct.on('pageerror', e=>errors.push(`file:// ${entry}: ${e.message}`));
        direct.on('console', m=>{if(m.type()==='error')errors.push(`file:// ${entry}: ${m.text()}`);});
        await direct.goto(pathToFileURL(resolve(repoRoot,'08-frost-ark',entry)).href);
        await direct.locator('#save-label[data-saved=true]').waitFor({timeout:5000});
        await assertArtHud(direct);
        assert.ok(await direct.locator('#manan-portrait').evaluate(img=>img instanceof HTMLImageElement&&img.naturalWidth>0));
        assert.equal(await direct.locator('html').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(12, 21, 32)');
        assert.ok(await direct.waitForFunction(()=>{
          const el=document.getElementById('game-canvas')!;
          const cv=el as HTMLCanvasElement;
          const scale=Number(cv.dataset.tileScale),dpr=cv.width/cv.clientWidth;
          const x=(Number(cv.dataset.originX)+24*scale)*dpr,y=(Number(cv.dataset.originY)+24*scale)*dpr;
          const px=cv.getContext('2d')!.getImageData(x-32*dpr,y-50*dpr,64*dpr,80*dpr).data;
          for(let i=0;i<px.length;i+=4)if(px[i]>100&&px[i+1]>30&&px[i+1]<px[i])return true;
          return false;
        }),'Direct-open hearth must be painted');
      } finally { await direct.close(); }
    }
    console.log('[e2e-visual:local-launch] OK: both file:// entries show styled game, portrait, hearth and local save');
  }

  // M1 scenarios enter through the real saved-game importer. No production debug controls.
  const m1=await browser.newPage({viewport:{width:1280,height:720}});
  try {
    m1.on('pageerror',err=>errors.push(`M1 pageerror: ${err.message}`));
    m1.on('console',msg=>{if(msg.type()==='error')errors.push(`M1 console.error: ${msg.text()}`);});
    await m1.goto(baseUrl,{waitUntil:'networkidle'});
    await m1.locator('#save-label[data-saved=true]').waitFor();
    const mood=async(n:number)=>{
      await m1.waitForFunction(value=>{
        const img=document.getElementById('manan-portrait') as HTMLImageElement;
        return img.src.endsWith(`head-${value}.png`) && img.complete && img.naturalWidth>0;
      },n);
    };
    const importFixture=async(world:ReturnType<typeof createInitialWorld>)=>{
      await m1.keyboard.press('i');
      await m1.locator('#save-file').setInputFiles({name:'m1-fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(world))});
      await m1.getByText('已载入 JSON 存档。',{exact:true}).waitFor();
      await m1.keyboard.press('Escape');
    };
    const fresh=createInitialWorld(202608);
    await importFixture(fresh);
    await mood(0);
    await m1.locator('#weather-status').getByText(/^白昼/).waitFor();
    await m1.locator('#latte-status').getByText(/炉边打呼/).waitFor();
    await m1.screenshot({path:resolve(outDir,'M1-01-day.png')});
    const toast=m1.locator('#action');
    assert.ok(await toast.evaluate(el=>el.getBoundingClientRect().top<70),'status should be a top toast');
    await toast.waitFor({state:'hidden',timeout:3500});
    await m1.screenshot({path:resolve(outDir,'M1.5-01-day-hero.png')});
    await pointerAt(m1,405,454);await m1.mouse.down();
    await mood(2);
    await m1.keyboard.press('Escape');await m1.mouse.up();

    const night=createInitialWorld(202608);night.timeOfDay=.82;stepWorld(night,240);
    await importFixture(night);
    await m1.locator('#weather-status').getByText(/^暴雪夜/).waitFor();
    await m1.locator('#latte-status').getByText(/炸毛警戒/).waitFor();
    await m1.screenshot({path:resolve(outDir,'M1-02-snow-night.png')});
    await toast.waitFor({state:'hidden',timeout:3500});
    await m1.screenshot({path:resolve(outDir,'M1.5-02-snow-night-hero.png')});

    const cold=createInitialWorld(202608);cold.timeOfDay=.82;cold.player.x=27.3;cold.player.y=27.05;
    stepWorld(cold,180);cold.player.warmth=24;
    await importFixture(cold);
    await mood(3);
    await m1.locator('#thermal-stats[data-cold=true]').waitFor();
    await m1.screenshot({path:resolve(outDir,'M1-03-cold-warning.png')});
    assert.ok(await m1.locator('#warmth-meter').evaluate(el=>(el as HTMLMeterElement).value<=25));
    assert.ok(await m1.locator('#local-temp').getByText(/脚下 -?\d+°C/).isVisible());
    await toast.waitFor({state:'hidden',timeout:3500});
    await mood(3);
    await m1.screenshot({path:resolve(outDir,'M1.5-03-cold-vignette.png')});

    const warm=createInitialWorld(202608);warm.player.x=24.5;warm.player.y=25.5;warm.player.warmth=55;
    warm.player.inventory[3]={itemId:'frost_iron_scrap',count:2};
    warm.player.inventory[1]={itemId:'driftwood',count:12};
    warm.ark.buildings.find(b=>b.id==='hearth_main')!.fuel=79;
    await importFixture(warm);
    await mood(1);
    await m1.keyboard.press('r');await m1.getByText('已给余烬主炉添柴。',{exact:true}).waitFor();
    await m1.keyboard.press('u');await m1.locator('#weather-status').getByText(/主炉 Lv\.2/).waitFor();
    await m1.locator('#latte-status').getByText(/暖区拾取/).waitFor();
    await m1.keyboard.press('3');
    await pointerAt(m1,642,499);
    await m1.getByText('挡风墙 · 浮木板 ×3',{exact:true}).waitFor();
    await pointerAt(m1,642,499,true);
    await m1.getByText('挡风墙已放好，附近热量散得更慢。',{exact:true}).waitFor();
    await m1.keyboard.press('g');
    await m1.getByText('拿铁捡回了暖区掉落物。',{exact:true}).waitFor();
    await m1.keyboard.press('Escape');
    await m1.mouse.move(950,350);
    await m1.waitForFunction(expected=>new Promise<boolean>(done=>{
      const req=indexedDB.open('manan-frost-ark',1);
      req.onerror=()=>done(false);
      req.onsuccess=()=>{
        const db=req.result;
        const get=db.transaction('saves').objectStore('saves').get('world-M0');
        get.onerror=()=>{db.close();done(false);};
        get.onsuccess=()=>{
          db.close();if(typeof get.result!=='string'){done(false);return;}
          const w=JSON.parse(get.result);
          done(w.latte.autoLootUnlocked&&w.ark.buildings.some((b:{defId:string})=>b.defId==='wind_wall')
            &&!w.sky.debris.some((d:{id:string})=>d.id.startsWith('deckdrop_'))
            &&w.player.inventory.reduce((n:number,s:{itemId:string;count:number}|null)=>n+(s?.itemId==='driftwood'?s.count:0),0)===expected);
        };
      };
    }),countItem(warm,'driftwood')-1-4-3);
    await m1.screenshot({path:resolve(outDir,'M1-04-wall-latte.png')});
    console.log('[e2e-visual:M1.5] OK: default and wheel zoom, generated offline HUD icons, 3 survival meters, transient toast and 3 hero screenshots');
    console.log('[e2e-visual:M1] OK: day and blizzard, four decoded portraits, cold warning, wall, fuel and Latte pickup');
  } finally { await m1.close(); }

  // M2: exercise the same public game entry through actual input and imported fixtures.
  const m2 = await browser.newPage({viewport:{width:1280,height:720}});
  try {
    m2.on('pageerror',e=>errors.push('M2 pageerror: '+e.message));
    m2.on('console',m=>{if(m.type()==='error') errors.push('M2 console.error: '+m.text());});
    await m2.goto(baseUrl,{waitUntil:'networkidle'});
    await assertArtHud(m2);
    const shot=(name:string)=>m2.screenshot({path:resolve(outDir,'M2-'+name+'.png')});
    const point=(x:number,y:number,click=false)=>pointerAt(m2,x*42-389,y*42-662,click);
    const supply=()=>{
      const w=createInitialWorld(202608);
      const goods={driftwood:29,rope:20,frost_iron_scrap:24,coal_chunk:14,ice_shard:14,
        frost_iron_ingot:16,warm_fur:6,raw_root:4};
      assert.ok(inventoryChange(w,[],Object.entries(goods).map(([itemId,count])=>({itemId,count}))));
      return w;
    };
    async function loadM2(w:ReturnType<typeof createInitialWorld>,file:string) {
      if(await m2.locator('#inventory').isHidden()) await m2.keyboard.press('i');
      await m2.locator('#save-file').setInputFiles({name:file+'.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
      await m2.getByText('已载入 JSON 存档。',{exact:true}).waitFor();
      await m2.keyboard.press('Escape');
      await m2.locator('#inventory').waitFor({state:'hidden'});
      await m2.keyboard.press('q');
    }
    const toastGone=()=>m2.locator('#action').waitFor({state:'hidden',timeout:5000});
    const original=supply();
    await loadM2(original,'m2-build');
    const gauge=m2.locator('#buoyancy-gauge');
    const countFloat=()=>gauge.evaluate(v=>(v as HTMLMeterElement).value);
    assert.equal(await countFloat(),original.ark.buoyancyUsed);
    await m2.keyboard.press('b');
    const catalog=m2.locator('#build-catalog');
    const bench=catalog.locator('[data-build-kind=workbench]');
    await bench.hover();await m2.locator('#ui-tip').getByText(/研究蓝图/).waitFor();
    // Preserve the exact 13-icon assertion for the original catalog, and
    // verify the later S4 fishing station separately instead of masking any missing icon.
    assert.equal(await catalog.locator('[data-build-kind]:not([data-build-kind=fishing_spot]) img').count(),13);
    const fishingIcon=catalog.locator('[data-build-kind=fishing_spot] img');
    assert.equal(await fishingIcon.count(),1);
    assert.ok(await fishingIcon.evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>0));
    await m2.mouse.move(1000,350);await m2.locator('#ui-tip').waitFor({state:'hidden'});
    await shot('09-blueprints');await bench.click();
    await catalog.waitFor({state:'hidden'});
    await point(25.5,26.5);
    await m2.locator('#build-note[data-valid=true]').getByText(/木工台/).waitFor();
    await shot('01-construction-ghost');
    await point(25.5,26.5,true);
    await m2.getByText('木工台已放好。',{exact:true}).waitFor();
    assert.equal(await countFloat(),original.ark.buoyancyUsed+1);
    await m2.keyboard.press('b');
    await catalog.locator('[data-tech-id=tier2_automation]').click();
    await m2.getByText('已研究：拾荒与供暖拓展',{exact:true}).waitFor();
    await m2.keyboard.press('Escape');await catalog.waitFor({state:'hidden'});
    assert.equal(await m2.locator('#game-canvas').getAttribute('data-mode'),'workbench');
    await m2.keyboard.press('Escape');
    assert.equal(await m2.locator('#game-canvas').getAttribute('data-mode'),'hook');
    await m2.keyboard.press('x');await point(25.5,26.5,true);
    const undo=m2.locator('#dismantle-undo');
    await undo.waitFor();
    const undoSeconds=await m2.locator('#undo-progress').evaluate(v=>(v as HTMLProgressElement).value);
    assert.ok(undoSeconds>3&&undoSeconds<=4);
    assert.equal(await countFloat(),original.ark.buoyancyUsed);
    await m2.keyboard.press('z');await undo.waitFor({state:'hidden'});
    assert.equal(await countFloat(),original.ark.buoyancyUsed+1);
    await point(25.5,26.5,true);
    await undo.waitFor();await shot('04-dismantle-undo');
    await m2.keyboard.press('m');
    assert.equal(await m2.locator('#audio-toggle').getAttribute('aria-pressed'),'true');
    await m2.reload({waitUntil:'networkidle'});await assertArtHud(m2);
    assert.equal(await m2.locator('#audio-toggle').getAttribute('aria-pressed'),'true');

    const warmed=supply();warmed.timeOfDay=.82;warmed.unlockedTech.push('tier2_automation');
    warmed.player.x=21.4;warmed.player.y=27.4;
    const local=async()=>Number((await m2.locator('#local-temp').textContent())?.match(/-?\d+(?=°C)/)?.[0]);
    const cool=structuredClone(warmed);stepWorld(cool,420);
    await loadM2(cool,'m2-relay-before');
    const before=await local();assert.ok(Number.isFinite(before));
    assert.ok(build(warmed,'heat_relay',21,26));stepWorld(warmed,420);
    await loadM2(warmed,'m2-relay-after');
    const after=await local();
    assert.ok(after>=before+3,'relay same-position comparison: '+before+'°C → '+after+'°C');
    await toastGone();await shot('02-relay-warmth');

    const auto=supply();auto.unlockedTech.push('tier2_automation');
    auto.player.x=24.3;auto.player.y=26.4;
    assert.ok(build(auto,'furnace',22,26));assert.ok(build(auto,'catch_net',25,27));
    assert.ok(build(auto,'sorter_arm',25,26));
    auto.sky.debris.unshift({id:'m2-net-test',x:25.5,y:28.15,vx:0,vy:0,loot:[{itemId:'rope',count:2}]});
    stepWorld(auto,120);await loadM2(auto,'m2-industry');
    await point(25.5,26.5,true);await m2.locator('#industry-panel[data-def-id=sorter_arm]').waitFor();
    await m2.locator('#industry-output').getByText('旧缆绳',{exact:true}).waitFor();await shot('03-net-sorter');
    await m2.locator('#industry-collect').click();
    await m2.locator('#industry-output').getByText('暂无产出',{exact:true}).waitFor();
    await m2.keyboard.press('Escape');await m2.locator('#industry-panel').waitFor({state:'hidden'});

    const factory=supply();factory.player.x=24.4;factory.player.y=26.4;
    factory.unlockedTech.push('tier2_automation');
    assert.ok(build(factory,'furnace',23,26));assert.ok(build(factory,'catch_net',25,27));
    assert.ok(build(factory,'sorter_arm',25,26));
    stepWorld(factory,140);await loadM2(factory,'m2-smelter');
    await point(23.5,26.5,true);await m2.locator('#industry-panel[data-def-id=furnace]').waitFor();
    await m2.locator('[data-recipe-id=smelt_frost_iron]').click();
    await m2.locator('#industry-job').waitFor();await shot('05-smelter-crafting');
    await m2.locator('#industry-output').getByText('霜铁锭',{exact:true}).waitFor({timeout:20000});
    await m2.locator('#industry-collect').click();
    await m2.locator('#industry-output').getByText('暂无产出').waitFor();
    await m2.keyboard.press('Escape');

    const polish=createInitialWorld(202608);
    polish.sky.debris.forEach((d,i)=>{d.x=[20.3,27.5,23.3][i%3];d.y=[24,27.9,28.25][i%3];d.vx=0;d.vy=0;});
    await loadM2(polish,'m2-polish-day');await toastGone();await shot('06-polish-day');
    const storm=createInitialWorld(202608);storm.timeOfDay=.82;stepWorld(storm,240);
    await loadM2(storm,'m2-polish-storm');await m2.locator('#weather-status').getByText(/^暴雪夜/).waitFor();
    await toastGone();await shot('07-polish-blizzard');
    const cold=createInitialWorld(202608);cold.timeOfDay=.82;cold.player.x=27.3;cold.player.y=27.05;
    stepWorld(cold,180);cold.player.warmth=14;
    await loadM2(cold,'m2-polish-cold');await m2.locator('#thermal-stats[data-cold=true]').waitFor();
    await toastGone();await shot('08-polish-frost-vignette');
    const showcased=supply();showcased.unlockedTech.push('tier2_automation','tier3_fortress');
    for (const [kind,gx,gy] of [
      ['buoyancy_core',23,26], ['workbench',22,22], ['furnace',24,22], ['greenhouse',25,21],
      ['stove',23,25], ['catch_net',21,26], ['sorter_arm',22,26], ['heat_relay',26,26],
      ['warm_wall',23,27], ['iron_deck',25,27],
    ] as const) assert.ok(build(showcased,kind,gx,gy),'showcase build failed: '+kind);
    await loadM2(showcased,'m2-all-buildings');await toastGone();await shot('10-all-buildings');
    console.log('[e2e-visual:M2] OK: build grid, buoyancy, tech, 4s undo, sequential Escape, tooltip, Web Audio mute, relay heat, net→sorter and timed furnace');
  } finally { await m2.close(); }



  // M3 plays from the board through the published launcher; fixture placement just
  // shortens the walk to the helm/ramp and positions the player at a real resource cell.
  const m3=await browser.newPage({viewport:{width:1280,height:720}});
  try {
    m3.on('pageerror',e=>errors.push('M3 pageerror: '+e.message));
    m3.on('console',msg=>{if(msg.type()==='error')errors.push('M3 console.error: '+msg.text());});
    await m3.goto(baseUrl,{waitUntil:'networkidle'});
    await assertArtHud(m3);
    const context=m3.locator('#expedition-context');
    const chart=m3.locator('#sky-map');
    const shipStatus=m3.locator('#sky-nav-status');
    const frame=(name:string)=>m3.screenshot({path:resolve(outDir,'M3-'+name+'.png')});
    const toastClear=()=>m3.locator('#action').waitFor({state:'hidden',timeout:5500});
    const fixture=async(w:ReturnType<typeof createInitialWorld>,name:string)=>{
      if(!await m3.locator('#inventory').isVisible())await m3.keyboard.press('i');
      await m3.locator('#save-file').setInputFiles({name:name+'.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
      await m3.getByText('已载入 JSON 存档。',{exact:true}).waitFor();
      await m3.keyboard.press('Escape');
      await m3.locator('#inventory').waitFor({state:'hidden'});
    };
    async function exportM3() {
      await m3.keyboard.press('i');
      const download=m3.waitForEvent('download');
      await m3.getByRole('button',{name:'导出 JSON'}).click();
      const raw=readFileSync((await (await download).path())!,'utf8');
      assert.ok(!JSON.parse(raw).activeIsland?.tiles,'JSON contains an island reference, not 4096 terrain cells');
      const result=deserializeWorld(raw);
      await m3.keyboard.press('Escape');
      await m3.locator('#inventory').waitFor({state:'hidden'});
      return result;
    }
    const trip=createInitialWorld(202608);
    const helm=helmPoint(trip);
    trip.player.x=helm.x;trip.player.y=helm.y;
    assert.ok(inventoryChange(trip,[],[{itemId:'frost_iron_scrap',count:4}]));
    await fixture(trip,'m3-before-departure');
    await m3.keyboard.press('n');
    await chart.waitFor();
    await shipStatus.and(m3.locator('[data-nav-state=stopped]')).waitFor();
    const first=trip.sky.islands.filter(it=>it.tier===1).sort((a,b)=>Math.hypot(a.skyX,a.skyY)-Math.hypot(b.skyX,b.skyY))[0];
    assert.ok(first,'starting chart exposes a nearby Tier 1 island');
    assert.ok(trip.sky.islands.some(it=>it.tier===2),'chart has both M3 biomes');
    await chart.locator('[data-island-id="'+first.id+'"]').click();
    await chart.locator('#sky-set-course').click();
    await chart.getByText('已设为目的地',{exact:true}).waitFor();
    await frame('01-sky-route');
    await m3.keyboard.press('Escape');await chart.waitFor({state:'hidden'});
    await m3.keyboard.press('e');await m3.keyboard.press('n');
    await shipStatus.and(m3.locator('[data-nav-state=cruising]')).waitFor({timeout:4500});
    await shipStatus.and(m3.locator('[data-nav-state=docked]')).waitFor({timeout:22000});
    await m3.keyboard.press('Escape');
    const docked=await exportM3();
    assert.equal(docked.ark.anchoredIslandId,first.id,'real browser cruise arrives at the selected node');
    const bridge=gangwayGeometry(docked);
    assert.ok(bridge&&!bridge.deployed,'ramp only exists once the player deploys it');
    docked.player.x=bridge.x-.5;docked.player.y=bridge.y+.5;
    await fixture(docked,'m3-dock-side');
    await m3.keyboard.press('e');
    await context.and(m3.locator('[data-action=stow],[data-action=board]')).waitFor();
    await toastClear();
    await frame('02-dock-gangway');
    await m3.keyboard.down('d');
    try { await m3.locator('#expedition-context[data-area=island]').waitFor({state:'attached',timeout:9000}); }
    finally { await m3.keyboard.up('d'); }

    const landed=await exportM3();
    assert.equal(areaAt(landed,landed.player.x,landed.player.y),'island');
    assert.equal(dockedIsland(landed)?.size,64);
    assert.ok(dockedIsland(landed)?.tiles.length===4096);
    const mine=islandNodes(landed).find(n=>n.kind==='ore'&&islandNodeRemaining(landed,n)>0);
    assert.ok(mine,'seeded land has a mineable ore deposit');
    const nearMine=[[0,.8],[.8,0],[-.8,0],[0,-.8],[0,0]].map(([x,y])=>[mine.x+x,mine.y+y]).find(([x,y])=>
      areaAt(landed,x,y)==='island'&&nearestIslandNode({...landed,player:{...landed.player,x,y}})?.id===mine.id);
    assert.ok(nearMine,'mine has a reachable interaction cell');
    landed.player.x=nearMine[0];landed.player.y=nearMine[1];
    await fixture(landed,'m3-at-ore');
    await m3.keyboard.press('i');
    await m3.locator('[data-tool-action=craft][data-tool-kind=mining_pick]').click();
    await m3.keyboard.press('Escape');
    const meter=m3.locator('#pickaxe-durability');
    await meter.waitFor();
    const remaining=await meter.evaluate(el=>(el as HTMLMeterElement).value);
    assert.ok(remaining>0,'a crafted pick has real durability');
    const beforeMining=await exportM3();
    await m3.keyboard.press('e');
    await m3.waitForFunction(n=>document.querySelector<HTMLMeterElement>('#pickaxe-durability')!.value===n-1,remaining);
    await frame('03-island-mining');
    const after=await exportM3();
    assert.equal(countItem(after,mine.itemId),countItem(beforeMining,mine.itemId)+mine.count,'E mines the deposit into inventory');
    assert.ok(Object.keys(after.sky.islands.find(n=>n.id===first.id)?.deltas??{}).length>0,'only a resource change is stored for a visited island');
    // Save an actual mined depletion after walking back over the same bridge.
    after.player.x=bridge.x+bridge.width+.64;after.player.y=bridge.y+.5;
    await fixture(after,'m3-after-mining');
    await m3.keyboard.down('a');
    try { await m3.locator('#expedition-context[data-area=ark]').waitFor({state:'attached',timeout:9000}); }
    finally { await m3.keyboard.up('a'); }
    const returned=await exportM3();
    assert.equal(returned.activeIsland,null);
    assert.equal(returned.sky.islands.find(n=>n.id===first.id)?.deltas[mine.key],mine.count);

    // Set up the longer second cruise at the same real sim entry, then board via browser.
    const northern=createInitialWorld(202608);
    const wheel=helmPoint(northern);northern.player.x=wheel.x;northern.player.y=wheel.y;
    const t2=northern.sky.islands.find(i=>i.tier===2);
    assert.ok(t2);
    assert.equal(setDestination(northern,t2.id),null);
    assert.equal(toggleCruise(northern),null);
    stepWorld(northern,800);
    assert.equal(northern.ark.anchoredIslandId,t2.id);
    const northBridge=gangwayGeometry(northern);
    assert.ok(northBridge);
    northern.player.x=northBridge.x-.5;northern.player.y=northBridge.y+.5;
    await fixture(northern,'m3-tier2-shore');
    await m3.keyboard.press('e');
    await context.and(m3.locator('[data-action=stow]')).waitFor();
    await m3.keyboard.down('d');
    try {
      await m3.locator('#expedition-context[data-area=island]').waitFor({state:'attached',timeout:9000});
      await m3.waitForTimeout(750);
    } finally { await m3.keyboard.up('d'); }
    await toastClear();await frame('04-tier2-frostpine');
    console.log('[e2e-visual:M3] OK: chart, actual helm cruise, docking, E gangway, WASD crossing, 64×64 terrain, pick durability, mining and sparse save');
  } finally { await m3.close(); }


  await runGrappleRange(browser,baseUrl,outDir,errors);
  await runM4(browser,baseUrl,outDir,errors);

  await runM5(browser,baseUrl,outDir,errors);

  await runM6(browser,baseUrl,outDir,errors);

  await runFootprints(browser,baseUrl,outDir,errors);
  await runDeckMovement(browser,baseUrl,outDir,errors);
  await runP2Rescue(browser,baseUrl,outDir,errors);
  await runP2Food(browser,baseUrl,outDir,errors);
  await runP2Hook(browser,baseUrl,outDir,errors);
  await runP2Hull(browser,baseUrl,outDir,errors);
  await runP2Hearth(browser,baseUrl,outDir,errors);
  await runP2Gear(browser,baseUrl,outDir,errors);
  await runP2Weapons(browser,baseUrl,outDir,errors);
  await runP2Roll(browser,baseUrl,outDir,errors);
  await runP2Juice(browser,baseUrl,outDir,errors);
  await runP2Elements(browser,baseUrl,outDir,errors);
  await runP2Hotbar(browser,baseUrl,outDir,errors);
  await runP2Room(browser,baseUrl,outDir,errors);
  await runP2Logistics(browser,baseUrl,outDir,errors);
  await runP2Rig(browser,baseUrl,outDir,errors);
  await runP2Utilities(browser,baseUrl,outDir,errors);
  await runP2Home(browser,baseUrl,outDir,errors);
  await runP2Dock(browser,baseUrl,outDir,errors);
  await runP2Coasts(browser,baseUrl,outDir,errors);
  await runP2Landmarks(browser,baseUrl,outDir,errors);
  await runP2Forage(browser,baseUrl,outDir,errors);
  await runP2Caves(browser,baseUrl,outDir,errors);
  await runP2SkyEvents(browser,baseUrl,outDir,errors);
  await runP2Survey(browser,baseUrl,outDir,errors);
  await runP2Traits(browser,baseUrl,outDir,errors);
  await runP2Skills(browser,baseUrl,outDir,errors);
  await runP2Breeding(browser,baseUrl,outDir,errors);
  await runP2Alpha(browser,baseUrl,outDir,errors);
  await runP2Bond(browser,baseUrl,outDir,errors);
  await runP2Latte(browser,baseUrl,outDir,errors);
  await runP2Defense(browser,baseUrl,outDir,errors);
  await runP2Raiders(browser,baseUrl,outDir,errors);

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
  console.log(`[e2e-visual] OK -> ${shotPath}`);
} finally {
  await browser.close();
  server.close();
}
