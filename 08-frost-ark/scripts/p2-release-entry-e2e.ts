import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const [file,staticEntry,preview,output]=process.argv.slice(2);
if(!file||!staticEntry||!preview||!output)throw Error('Need file path, project HTTP entry, built Vite preview and proof directory');
mkdirSync(output,{recursive:true});
const b=await chromium.launch();
try{
 const errors:string[]=[];
 const paths=[pathToFileURL(resolve(file)).href,staticEntry,preview];
 const features=[];
 for(const [i,href] of paths.entries()){
  const p=await b.newPage({viewport:{width:1920,height:1080}});
  p.on('pageerror',e=>errors.push(e.message));
  p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  p.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
  await p.goto(href,{waitUntil:'networkidle'});
  await p.locator('#game-canvas[data-art-ready=true]').waitFor();
  await p.locator('#manan-portrait').evaluate((img:HTMLImageElement)=>img.decode());
  assert.equal(await p.evaluate(async()=>{
   const all=await Promise.all([0,1,2,3].map(async n=>{
    const pic=new Image();pic.src='../assets/character/head-'+n+'.png';
    await pic.decode();return pic.naturalWidth>0;
   }));return all.length===4&&all.every(Boolean);
  }),true);
  await p.locator('#audio-mix-toggle').click();
  await p.locator('[data-audio-running=true]').waitFor();
  await p.keyboard.press('Escape');
  const state=await p.locator('#game-canvas').evaluate(el=>({hearth:el.dataset.hearthArt,tiles:el.dataset.tileScale,hull:el.dataset.hullCones}));
  features.push(state);
  await p.screenshot({path:resolve(output,'P2-42-0'+(i+1)+'-entry.png')});
  await p.close();
 }
 assert.deepEqual(features[0],features[1]);assert.deepEqual(features[1],features[2]);
 const bench=await b.newPage({viewport:{width:1920,height:1080}});
 bench.on('pageerror',e=>errors.push(e.message));
 await bench.goto(pathToFileURL(resolve(file,'../benchmark.html')).href,{waitUntil:'networkidle'});
 await bench.getByRole('button',{name:'开始压测',exact:true}).waitFor();
 await bench.close();
 const cover=await b.newPage({viewport:{width:1920,height:1080}});
 cover.on('pageerror',e=>errors.push(e.message));
 await cover.goto(new URL('cover/index.html',staticEntry).href,{waitUntil:'networkidle'});
 const image=await cover.locator('.cover img').evaluate(async(img:HTMLImageElement)=>{await img.decode();return [img.naturalWidth,img.naturalHeight];});
 assert.equal(image[0]/image[1],16/9);
 await cover.screenshot({path:resolve(output,'P2-42-04-cover-16x9.png')});
 await cover.getByRole('link',{name:'登上方舟'}).click();
 await cover.locator('#game-canvas[data-art-ready=true]').waitFor();
 assert.deepEqual(errors,[]);
 console.log('[e2e:P2-42] OK: HTTP subdirectory, fresh file://, Vite built preview, all four portraits, first-gesture audio, actual 16:9 cover');
}finally{await b.close();}
