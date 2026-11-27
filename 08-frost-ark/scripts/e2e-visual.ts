import { createServer } from 'node:http';
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

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
  console.log(`[e2e-visual] OK -> ${shotPath}`);
} finally {
  await browser.close();
  server.close();
}
