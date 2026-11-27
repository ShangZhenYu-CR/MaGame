import assert from 'node:assert/strict';
import { join } from 'node:path';
import type { Browser } from 'playwright';
import { createInitialWorld } from '../src/sim/world';

export async function runGrappleRange(browser:Browser,baseUrl:string,outDir:string,errors:string[]){
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  try{
    page.on('pageerror',e=>errors.push('Grapple range: '+e.message));
    page.on('console',e=>{if(e.type()==='error')errors.push('Grapple range: '+e.text());});
    await page.goto(baseUrl,{waitUntil:'networkidle'});
    await page.locator('#game-canvas[data-art-ready=true]').waitFor();
    const w=createInitialWorld(202608);
    w.day=5;w.timeOfDay=.845;w.weather='whiteout';w.ambientTemp=-55;w.player.warmth=8;
    await page.keyboard.press('i');
    await page.locator('#save-file').setInputFiles({name:'whiteout-range.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
    await page.getByText('已载入 JSON 存档。',{exact:true}).waitFor();
    await page.keyboard.press('Escape');
    const view=page.locator('#game-canvas');
    const coord=await view.evaluate((e,p)=>{
      const bounds=e.getBoundingClientRect(),s=Number(e.dataset.tileScale);
      return {x:bounds.left+Number(e.dataset.originX)+s*(p.x-9.5),y:bounds.top+Number(e.dataset.originY)+s*p.y};
    },{x:w.player.x,y:w.player.y});
    await page.mouse.move(coord.x,coord.y);
    await page.mouse.down();
    await page.getByText('抓钩蓄力 100%',{exact:true}).waitFor({timeout:4000});
    const colored=()=>view.evaluate((el,p)=>{
      const cv=el as HTMLCanvasElement;
      const s=Number(cv.dataset.tileScale),ox=Number(cv.dataset.originX),oy=Number(cv.dataset.originY);
      const a={x:ox+s*(p.x-.28),y:oy+s*(p.y-.40)}, b={x:ox+s*(p.x-9),y:oy+s*p.y};
      const c=cv.getContext('2d')!;let hits=0;
      for(let i=30;i<a.x-b.x-15;i++){
        const y=a.y+(b.y-a.y)*i/(a.x-b.x);
        for(let j=-1;j<=1;j++){
          const [r,g,b2]=c.getImageData(Math.round(a.x-i),Math.round(y+j),1,1).data;
          if(r>230&&g>195&&b2<220){hits++;break;}
        }
      }
      return hits;
    },{x:w.player.x,y:w.player.y});
    const before=await colored();
    assert.ok(before>150,`range line should be visible above whiteout, only ${before} bright pixels`);
    await page.screenshot({path:join(outDir,'grapple-range-whiteout.png')});
    await page.keyboard.press('Escape');
    await page.locator('#meter').waitFor({state:'hidden'});
    const after=await colored();
    assert.ok(after<before/5,'cancel removes painted charge range');
    await page.mouse.up();
    console.log('[e2e-visual:grapple-range] OK: whiteout visible trajectory and cancel');
  }finally{await page.close();}
}
