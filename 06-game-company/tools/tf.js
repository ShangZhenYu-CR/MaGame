const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1600,height:900}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('file://'+process.argv[2]);await pg.waitForTimeout(2500);const ev=s=>pg.evaluate(x=>window.__dbg(x),s);
await ev("startGame(0)");await pg.waitForTimeout(500);await ev("G.floor=3;loadFloor(4);enemies.length=0;P.inv=999;P.x=LV.arenaX+6*TS;P.y=19*TS");await pg.waitForTimeout(3500);
await ev("P.x=boss.x-110;boss.hp=boss.max*.49;boss.state='idle';boss.t=0");
const t0=Date.now();let shots=0;for(let i=0;i<60;i++){await pg.waitForTimeout(80);const s=await ev("boss.state+' '+boss.t.toFixed(2)");if(s.startsWith('transform')){const t=+s.split(' ')[1];if((shots===0&&t>.45)||(shots===1&&t>1.05)||(shots===2&&t>1.4)){await pg.screenshot({path:'tf'+shots+'.png'});shots++}}if(s.startsWith('idle')&&shots)break}
console.log('real secs',((Date.now()-t0)/1000).toFixed(1),'name',await ev("$('bossname').textContent+'|'+$('bossname').className"));
await ev("boss.hp=boss.max*.24;boss.state='idle';boss.t=0");for(let i=0;i<20;i++){await pg.waitForTimeout(60);if(await ev("boss.state")==='roar'&&await ev("boss.t")>.3){await pg.screenshot({path:'tf_p3.png'});break}}
console.log('errs',errs);await b.close()})();
