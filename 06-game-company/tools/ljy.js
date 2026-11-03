const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1600,height:900}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('file://'+process.argv[2]);await pg.waitForTimeout(2500);const ev=s=>pg.evaluate(x=>window.__dbg(x),s);const L=(...a)=>console.log(...a);
await ev("startGame(0)");await pg.waitForTimeout(800);await ev("loadFloor(3);P.inv=999;P.x=LV.arenaX+6*TS;P.y=19*TS");await pg.waitForTimeout(800);
L('boss',await ev("boss&&boss.kind"));await ev("boss.state='idle';damage(boss,99999,1,0,true,true,'sec')");await pg.waitForTimeout(2600);
L('lift',await ev("JSON.stringify(pickups.filter(k=>k.k==='gymlift').map(k=>[k.x,k.y]))"),'door',await ev("pickups.some(k=>k.k==='door')"));
await ev("const k=pickups.find(k=>k.k==='gymlift');P.x=k.x;P.y=k.y");await pg.waitForTimeout(400);L('prompt',await ev("$('prompt').textContent"));await pg.screenshot({path:'lift.png'});
await pg.keyboard.press('KeyE');await pg.waitForTimeout(500);L('state',await ev("G.state"),'resttxt',await ev("$('resttxt').textContent"));
await ev("chooseRest(0)");await pg.waitForTimeout(1500);L('floor',await ev("LV.floor"),'af',await ev("LV.af"),'name',await ev("LV.th.name"),'w',await ev("LV.w"),'pk',await ev("pickups.map(k=>k.k).filter(k=>k!=='cell').join()"),'enemies',await ev("enemies.map(e=>e.type).join()"));
await pg.screenshot({path:'f4.png'});
await ev("enemies.length=0;P.inv=999;P.x=LV.arenaX+6*TS;P.y=19*TS");await pg.waitForTimeout(3200);L('boss',await ev("boss&&boss.kind+' '+boss.hp+' '+boss.state"));
const seen=new Set();
for(const st of['cube','bell','brush_wind','curl_wind','slam']){await ev(`boss.state='${st}';boss.t=0`);for(let i=0;i<25;i++){await pg.waitForTimeout(60);seen.add(await ev("boss.state"))}if(st==='cube')await pg.screenshot({path:'ljy1.png'})}
await ev("P.inv=0;P.hp=999;P.maxHp=999");await ev("boss.state='brush_wind';boss.t=0;P.x=boss.x+boss.face*60");await pg.waitForTimeout(1300);L('p1 hp lost (brush)',await ev("999-Math.round(P.hp)"));
await ev("P.inv=999;boss.hp=boss.max*.49;boss.state='idle';boss.t=0");await pg.waitForTimeout(2500);L('phase',await ev("boss.phase"),'armor',await ev("boss.armor"),'state',await ev("boss.state"));
for(const st of['fdash_wind','breath','pillars','dive_up','upper_wind']){await ev(`boss.state='${st}';boss.t=0`);for(let i=0;i<28;i++){await pg.waitForTimeout(60);seen.add(await ev("boss.state"));if(st==='pillars'&&i===14)await pg.screenshot({path:'ljy2.png'});if(st==='breath'&&i===16)await pg.screenshot({path:'ljy3.png'})}}
await ev("boss.hp=boss.max*.24;boss.state='idle';boss.t=0");await pg.waitForTimeout(1600);L('phase',await ev("boss.phase"));await ev("boss.state='meteor';boss.t=0");await pg.waitForTimeout(1500);seen.add(await ev("boss.state"));
L('states seen',[...seen].join(','));
await ev("P.inv=0");await ev("P.hp=999;window.__h=P.hp;boss.state='pillars';boss.t=0;P.x=boss.x+boss.face*88;P.y=19*TS");await pg.waitForTimeout(1800);L('pillar hp lost',await ev("Math.round(__h-P.hp)"));
await ev("P.inv=999;boss.state='idle';damage(boss,99999,1,0,true,true,'sec')");await pg.waitForTimeout(4800);L('ljy save',await ev("SAVE.ljy"));
await ev("const d=pickups.find(k=>k.k==='door');P.x=d.x;P.y=d.y");await pg.waitForTimeout(300);await pg.keyboard.press('KeyE');await pg.waitForTimeout(2500);
L('end',await ev("G.state"),await ev("$('etitle').textContent+' | '+$('esub').textContent"));await pg.screenshot({path:'trueend.png'});
L('errs',errs,await ev("$('err').textContent"));await b.close()})();
