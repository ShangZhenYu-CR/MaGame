import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium,type Browser } from 'playwright';
import { seaWhaleFixture } from './p2-sea-whale-fixture';
import { inventoryChange } from '../src/sim/ark';
import { serializeWorld } from '../src/sim/save';

export async function checkActiveOverlays(b:Browser,url:string,out:string,allErrors:string[]){
 mkdirSync(out,{recursive:true});
 const all=[];
 for(const [width,height] of [[1280,720],[1920,1080]]){
  const p=await b.newPage({viewport:{width,height}}),errors:string[]=[];
  p.on('pageerror',e=>errors.push(e.message));
  p.on('console',e=>{if(e.type()==='error')errors.push(e.text())});
  try{
   await p.goto(url,{waitUntil:'networkidle'});await p.locator('[data-art-ready=true]').waitFor();
   const w=seaWhaleFixture();
   w.day=5;w.timeOfDay=.78;w.weather='whiteout';w.ambientTemp=-55;
   w.player.hunger=75;w.player.diet.quick='warm_berry_soup';
   assert.ok(inventoryChange(w,[],[{itemId:'warm_berry_soup',count:3}]));
   await p.locator('#save-file').setInputFiles({name:'ui-combination-check.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(w))});
   await p.getByText('已载入 JSON 存档。',{exact:true}).waitFor();
   await p.locator('#raid-alert').waitFor();
   await p.keyboard.press('e');await p.locator('#whale-context[data-waters=sea]').waitFor({timeout:12000});
   await p.keyboard.press('l');await p.locator('#voyage-journal').waitFor();
   await p.keyboard.press('h');await p.locator('#meal-buff').waitFor();
   await p.locator('#action[data-shown=true]').waitFor();
   const report=await p.evaluate(()=>{
    const list=['.hud-card','.sector','#action','#raid-alert','#whale-context','#voyage-journal','.quickdock','.m2-tools'];
    const surfaces=list.map(sel=>{const el=document.querySelector<HTMLElement>(sel)!;const r=el.getBoundingClientRect(),c=getComputedStyle(el);return{sel,x:r.x,y:r.y,w:r.width,h:r.height,visible:!el.hidden&&c.visibility!=='hidden'};});
    const overlap=[];
    for(let i=0;i<surfaces.length;i++)for(let j=i+1;j<surfaces.length;j++){
     const a=surfaces[i],b=surfaces[j];if(!a.visible||!b.visible)continue;
     const x=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),y=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
     if(x>1&&y>1)overlap.push([a.sel,b.sel,Math.round(x*y)]);
    }
    return{surfaces,overlap,allVisible:surfaces.every(r=>r.visible),buff:!document.querySelector<HTMLElement>('#meal-buff')!.hidden};
   });
   await p.screenshot({path:resolve(out,'Final-UI-'+width+'x'+height+'.png')});
   all.push({width,height,report,errors});allErrors.push(...errors);
  }finally{await p.close();}
 }
 writeFileSync(resolve(out,'overlay-report.json'),JSON.stringify(all,null,2));
 assert.ok(all.every(x=>x.report.allVisible&&x.report.buff&&!x.report.overlap.length&&!x.errors.length),
  JSON.stringify(all.map(x=>({width:x.width,overlap:x.report.overlap,allVisible:x.report.allVisible,buff:x.report.buff,errors:x.errors}))));
 console.log('[final-QA:layout] full simultaneous alerts, meal, boss, journal and hotbar show with no overlaps at 1280x720 and 1920x1080');
}

if(process.argv[1]?.endsWith('p2-final-overlay-probe.ts')){
 const url=process.argv[2],out=resolve(process.argv[3]??'artifacts/final-ui');
 if(!url)throw Error('Missing game entry URL');
 const b=await chromium.launch(),errors:string[]=[];
 try{await checkActiveOverlays(b,url,out,errors);assert.deepEqual(errors,[]);}finally{await b.close();}
}
