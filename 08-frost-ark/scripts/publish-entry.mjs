import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = process.cwd();
const dist = resolve(root, 'dist');
const builtHtml = resolve(dist, 'dev.html');
let html = readFileSync(builtHtml, 'utf8');

// Use bundled, classic JS rather than network-loaded modules so opening file://
// starts the same build as HTTP. Keep dist/assets/ as the usual build output.
let scriptCount = 0, styleCount = 0;
html = html.replace(/<script\b[^>]*\bsrc="\.\/(assets\/[^"]+\.js)"[^>]*><\/script>/g, (_tag, asset) => {
  scriptCount++;
  const js = readFileSync(resolve(dist, asset), 'utf8');
  return '<script>' + js.replace(/<\/script/gi, '<\\/script') + '</script>';
});
html = html.replace(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="\.\/(assets\/[^"]+\.css)"[^>]*>/g, (_tag, asset) => {
  styleCount++;
  const css = readFileSync(resolve(dist, asset), 'utf8');
  if (/<\/style/i.test(css)) throw new Error('Build CSS cannot be safely inlined');
  return '<style>' + css + '</style>';
});
if (scriptCount !== 1 || styleCount !== 1) throw new Error('Expected one bundled JS and one CSS entry');
const runtime = html.match(/<script>[\s\S]*?<\/script>/)?.[0];
if (!runtime) throw new Error('Bundled runtime missing');
html = html.replace(runtime, '').replace(/^ +$/gm,'').replace('</body>', () => runtime + '\n</body>');
const scenario=execFileSync(process.execPath,['--import','tsx','scripts/p2-bench-fixture-json.ts'],{encoding:'utf8'});
const scenarioNode='<script id="bench-world" type="application/json">'+scenario.replace(/</g,'\\u003c')+'</script>';
html=html.replace(runtime,()=>scenarioNode+'\n'+runtime);
writeFileSync(resolve(root, 'index.html'), html);

// A dist entry has the same page-relative portrait path as the project entry.
const nested = html.replace('<head>', '<head>\n  <base href="../">');
writeFileSync(resolve(dist, 'index.html'), nested);
writeFileSync(builtHtml, nested);
console.log('[publish-entry] Synced file:// and HTTP entries in root and dist');
