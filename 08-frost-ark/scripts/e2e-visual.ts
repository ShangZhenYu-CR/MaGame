import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';

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
const baseUrl = `http://127.0.0.1:${port}/08-frost-ark/index.html`;

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
  await page.mouse.move(459,458);
  await page.mouse.down();
  await page.locator('#action').getByText('抓钩蓄力 100%', {exact:true}).waitFor();
  await page.mouse.up();
  await page.locator('#action').getByText('正在拉回：浮木板', {exact:true}).waitFor({timeout:4000});
  const shotCatch = resolve(outDir,'02-grapple-retract.png');
  await page.screenshot({path:shotCatch});
  await page.locator('#action').getByText('已回收入包：浮木板 ×3', {exact:true}).waitFor({timeout:4000});

  await page.getByRole('button',{name:'甲板'}).click();
  await page.mouse.move(807,448);
  await page.getByText('吸附就绪 · 浮木板 ×2',{exact:true}).waitFor();
  await page.mouse.click(807,448);
  await page.getByText('甲板已拼接，可以走上去。',{exact:true}).waitFor();
  await page.getByRole('button',{name:'背包',exact:false}).first().click();
  await page.locator('#stacks').getByText('×9',{exact:true}).waitFor();
  await page.getByRole('button',{name:'制作 ×2'}).click();
  await page.locator('#stacks').getByText('防风火把',{exact:true}).waitFor();
  await page.getByRole('button',{name:'火把',exact:false}).first().click();
  await page.mouse.click(807,448);
  await page.getByText('防风火把已点亮。',{exact:true}).waitFor();
  await page.getByRole('button',{name:'甲板'}).click();
  await page.mouse.move(851,448);
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

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
  console.log(`[e2e-visual] OK -> ${shotPath}`);
} finally {
  await browser.close();
  server.close();
}
