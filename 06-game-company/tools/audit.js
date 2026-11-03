// 每把武器每一段攻击逐帧截图，拼成一张表：行=招式段，列=时间（每 1/30 秒）
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1890,height:900}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto(process.env.CHK_URL||'http://127.0.0.1:8767/test_chk.html');await pg.waitForTimeout(3500);const ev=s=>pg.evaluate(x=>window.__dbg(x),s);
await ev("window.__ts=performance.now();window.requestAnimationFrame=()=>0;CHK.speed=1;CHK.box=false;CHK.anchor=true;window.__adv=n=>{for(let i=0;i<n;i++){__ts+=1000/60;frame(__ts)}}");
const out=process.argv[2],only=process.argv[3];
const rect=await ev("(()=>{const dpr=1,s=SCALE;return {s,ox:OX,oy:OY,cy:cam.y}})()");
const crop=async(file)=>{const r=await ev("(()=>{const s=SCALE;return {x:Math.round(OX+(P.x-cam.x-46)*s),y:Math.round(OY+(Math.min(19*TS,P.y+30)-cam.y-84)*s),width:Math.round(150*s),height:Math.round(96*s)}})()");await pg.screenshot({path:file,clip:r})};
for(const w of (only?only.split(','):['stylus','marker','ruler','knife','whip','shears','render'])){
 await ev(`chkEquip('${w}')`);const n=await ev(`WEAPONS['${w}'].combo.length`);const segs=[...Array(n).keys()].map(i=>({k:'hit',i})).concat([{k:'dash'},{k:'dive'}]);if(w==='render')segs.push({k:'charged'});
 for(const sg of segs){await ev(`fxs.length=0;parts.length=0;chkPlay(${JSON.stringify(sg)});__adv(1)`);
  for(let f=0;f<20;f++){await crop(path.join(out,`${w}_${sg.k}${sg.i??''}_${String(f).padStart(2,'0')}.png`));await ev("__adv(2)");if(f>3&&await ev("!P.atk&&!P.dive&&!(P.diveLandT>0)&&fxs.length===0"))break}}}
console.log('errs',errs);await b.close()})();
