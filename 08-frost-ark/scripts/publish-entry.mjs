import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const builtDevHtml = resolve(root, 'dist', 'dev.html');
const distIndexHtml = resolve(root, 'dist', 'index.html');
const rootIndexHtml = resolve(root, 'index.html');

// 1. Provide dist/index.html for standalone zip previews
copyFileSync(builtDevHtml, distIndexHtml);

// 2. Sync root 08-frost-ark/index.html for MaGame & GitHub Pages entry
const html = readFileSync(builtDevHtml, 'utf8')
  .replaceAll('"./assets/', '"./dist/assets/')
  .replaceAll("'./assets/", "'./dist/assets/");

writeFileSync(rootIndexHtml, html, 'utf8');
console.log('[publish-entry] Synced index.html and dist/index.html');
