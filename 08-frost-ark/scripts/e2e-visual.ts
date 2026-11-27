import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { chromium, type Page } from 'playwright';
import { createInitialWorld, stepWorld } from '../src/sim/world';
import { countItem } from '../src/sim/ark';

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

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
  console.log(`[e2e-visual] OK -> ${shotPath}`);
} finally {
  await browser.close();
  server.close();
}
