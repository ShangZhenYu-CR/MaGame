const {chromium}=require('playwright');const out=process.argv[3];require('fs').mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1600,height:900}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('file://'+process.argv[2]);await pg.waitForTimeout(2500);const ev=s=>pg.evaluate(x=>window.__dbg(x),s);
await ev("startGame(0)");await pg.waitForTimeout(500);await ev("G.floor=3;loadFloor(4);enemies.length=0;P.inv=999;P.x=LV.arenaX+3*TS;P.y=19*TS");await pg.waitForTimeout(3000);
await ev("window.requestAnimationFrame=()=>0;spawnBoss('ljy');boss.x=LV.arenaX+LV.arenaW/2;boss.face=1;cam.x=boss.x-VW/2;shake=0");
const crop=async f=>{const r=await ev("(()=>{const s=SCALE;return {x:Math.round(OX+(boss.x-cam.x-110)*s),y:Math.round(OY+(boss.y-cam.y-170)*s),width:Math.round(220*s),height:Math.round(190*s)}})()");await pg.screenshot({path:f,clip:r})};
const moves=JSON.parse(process.argv[4]);
for(const [st,armor,ts,extra] of moves){for(let i=0;i<ts.length;i++){await ev(`boss.state='${st}';boss.armor=${armor};boss.t=${ts[i]};boss.anim=${ts[i]};boss.landT=0;${extra||''};parts.length=0;fxs.length=0;shake=0;cam.x=boss.x-VW/2;render();present()`);await crop(`${out}/${st}${extra?'L':''}_${String(i).padStart(2,'0')}.png`)}}
console.log('errs',errs);await b.close()})();
