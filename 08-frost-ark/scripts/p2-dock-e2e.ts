import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium,type Browser,type Page } from 'playwright';
import { areaAt,gangwayGeometry } from '../src/sim/island';
import { serializeWorld } from '../src/sim/save';
import type { WorldState } from '../src/sim/types';
import { exportWorld } from './p2-hook-e2e';
import { largeRadarArk,sideTrial,westOnlyTravel } from './p2-dock-fixture';

async function load(p:Page,w:WorldState){
 await p.keyboard.press('i');
 await p.locator('#save-file').setInputFiles({name:'radar-dock.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
 await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor();
 await p.keyboard.press('Escape');
}
async function reached(p:Page,k:string,area:string){
 await p.keyboard.down(k);
 try{await p.locator('#expedition-context[data-area="'+area+'"]').waitFor({timeout:22000});}
 finally{await p.keyboard.up(k);}
}

export async function runP2Dock(browser:Browser,url:string,dir:string,errors:string[]){
 const p=await browser.newPage({viewport:{width:1280,height:720}});
 p.on('pageerror',e=>errors.push('p2 dock page: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push('p2 dock console: '+m.text());});
 try{
  await p.goto(url,{waitUntil:'networkidle'});
  const canvas=p.locator('#game-canvas[data-art-ready=true]');await canvas.waitFor();
  const label=(suffix:string)=>resolve(dir,'P2-17-'+suffix+'.png');
  await load(p,largeRadarArk());
  await p.keyboard.press('y');
  const radar=p.locator('#heat-radar-map[data-tiles="441"]');
  await radar.waitFor();
  await p.waitForFunction(()=>{
   const m=document.querySelector<HTMLCanvasElement>('#heat-radar-map')!;
   return Number(m.dataset.warm)>0&&Number(m.dataset.cold)>300&&Number(m.dataset.enemies)>0;
  });
  const heatMarks=await radar.evaluate((m:HTMLCanvasElement)=>{
   const c=m.getContext('2d')!,b=c.getImageData(0,0,m.width,m.height).data;
   const warm=[220,142,75],cold=[87,126,175],red=[251,117,105];
   return [warm,cold,red].map(rgb=>{
    let n=0;for(let i=0;i<b.length;i+=4)if(b[i]===rgb[0]&&b[i+1]===rgb[1]&&b[i+2]===rgb[2])n++;return n;
   });
  });
  assert.ok(heatMarks.every(v=>v>1),'the physical radar canvas painted warm, cold and red hostile marks');
  await p.screenshot({path:label('01-21x21-heat-radar-1280')});
  await p.setViewportSize({width:1920,height:1080});
  await p.screenshot({path:label('02-21x21-heat-radar-1080p')});
  const capture=()=>p.evaluate(()=>new Promise<number[]>(done=>{
    const sample:number[]=[];let prev:number|undefined;
    const loops=[(now:number)=>{if(prev!==undefined)sample.push(now-prev);prev=now;if(sample.length>=60)done(sample);else requestAnimationFrame(loops[0]);}];
    requestAnimationFrame(loops[0]);
  }));
  const timings=await capture();
  const small=largeRadarArk();
  for(let y=0;y<small.ark.size;y++)for(let x=0;x<small.ark.size;x++){
    if(Math.max(Math.abs(x-24),Math.abs(y-24))>3)small.ark.decks[y*small.ark.size+x]=0;
  }
  await load(p,small);
  const baselineTimings=await capture();
  writeFileSync(resolve(dir,'P2-17-frame-sample.json'),JSON.stringify({size:'21×21',baseline:'7×7',resolution:'1920×1080',heatMarks,timings,baselineTimings},null,2));
  await p.keyboard.press('y');
  await p.setViewportSize({width:1280,height:720});

  await load(p,westOnlyTravel());
  const map=p.locator('#sky-map');await p.keyboard.press('n');
  await map.locator('[data-island-id=shallows_lantern]').click();
  await map.locator('#sky-set-course').click();await map.locator('#sky-cruise').click();
  await map.locator('#sky-nav-status[data-nav-state=docked]').waitFor({timeout:55000});
  const auto=await exportWorld(p);assert.equal(gangwayGeometry(auto)?.side,'west');
  await p.screenshot({path:label('03-auto-alternate-berth')});
  await p.keyboard.press('Escape');
  for(const [side,go,back] of [['west','a','d'],['north','w','s'],['south','s','w'],['east','d','a']] as const){
   const prepared=side==='west'?auto:sideTrial(side),dock=gangwayGeometry(prepared)!;
   if(side==='west')Object.assign(prepared.player,dock.deck);
   await load(p,prepared);
   await p.keyboard.press('e');
   await p.getByText('跳板已搭好，沿跳板走上浮岛。',{exact:true}).waitFor();
   await reached(p,go,'island');
   const coast=await exportWorld(p);
   assert.equal(areaAt(coast,coast.player.x,coast.player.y),'island');
   assert.equal(gangwayGeometry(coast)?.side,side);
   await p.screenshot({path:label('04-boarding-'+side)});
   await reached(p,back,'ark');
   await p.keyboard.press('e');await p.getByText('跳板已收回。',{exact:true}).waitFor();
   const backOnDeck=await exportWorld(p);
   assert.equal(gangwayGeometry(backOnDeck)?.deployed,false);
   console.log('[e2e:P2-17] real board + return:',side);
  }
  console.log('[e2e:P2-17] OK: 21x21 rasterized heat and raid marks, auto fallback, four real keyboard boarding and safe stow');
 }finally{await p.close();}
}
if(process.argv[1]?.endsWith('/p2-dock-e2e.ts')||process.argv[1]==='scripts/p2-dock-e2e.ts'){
 const dir=resolve('artifacts/p2-s3');mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch(),errors:string[]=[];
 try{await runP2Dock(browser,pathToFileURL(resolve('index.html')).href,dir,errors);assert.deepEqual(errors,[]);}
 finally{await browser.close();}
}
