const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1600,height:900}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('file://'+process.argv[2]);await pg.waitForTimeout(2500);const ev=s=>pg.evaluate(x=>window.__dbg(x),s);await ev("startGame(0)");await pg.waitForTimeout(2500);
const L=(...a)=>console.log(...a);
// bag pickup
await ev("enemies.length=0;pickups.length=0;for(const w of ['whip','shears','render'])pickups.push({k:'weapon',w,lv:1,aff:[],x:P.x,y:P.y,vy:0});pickups.push({k:'weapon',w:'array',lv:0,aff:[],x:P.x,y:P.y,vy:0});pickups.push({k:'weapon',w:'keyframe',lv:0,aff:[],x:P.x,y:P.y,vy:0})");
for(let i=0;i<5;i++){await pg.keyboard.press('KeyE');await pg.waitForTimeout(150)}
L('after pickups: primBag',await ev("JSON.stringify(P.primBag.map(b=>b.w))"),'prim',await ev("P.prim"),'secBag',await ev("JSON.stringify(P.secBag.map(b=>b.w))"),'sec',await ev("P.sec"),'pickups left',await ev("pickups.map(k=>k.w).join(',')"));
// wheel: hold R, press J twice, check slowmo, release
await pg.keyboard.down('KeyR');await pg.waitForTimeout(200);L('wheel open',await ev("JSON.stringify(G.wheel)"),'blur',await ev("$('screen').classList.contains('blur')"));
const t0=await ev("G.time");await pg.waitForTimeout(1000);const t1=await ev("G.time");L('game time advanced in 1s real:',(t1-t0).toFixed(3));
await pg.keyboard.press('KeyJ');await pg.waitForTimeout(150);await pg.keyboard.press('KeyJ');await pg.waitForTimeout(150);L('sel',await ev("G.wheel.sel"));
await pg.screenshot({path:'wheel.png'});
await pg.keyboard.up('KeyR');await pg.waitForTimeout(250);L('after release prim',await ev("P.prim"),'idx',await ev("P.primIdx"),'wheel',await ev("G.wheel"));
// secondary wheel quick
await pg.keyboard.down('KeyF');await pg.waitForTimeout(150);await pg.keyboard.press('KeyL');await pg.waitForTimeout(150);await pg.keyboard.up('KeyF');await pg.waitForTimeout(200);L('sec now',await ev("P.sec"));
// whip pull
await ev("enemies.length=0;P.prim='whip';P.combo=0;P.atk=null;window.__e=spawnEnemy({type:'crumple',x:P.x+50,y:P.y});__e.hp=__e.max=999;__e.aggro=false");
for(let i=0;i<3;i++){await pg.keyboard.press('KeyJ');await pg.waitForTimeout(230)}await pg.waitForTimeout(300);L('whip: enemy dx after 3rd hit',await ev("Math.round(__e.x-P.x)"),'slowed',await ev("__e.slowT>0"));
// shears cut burst
await ev("enemies.length=0;P.prim='shears';P.combo=0;P.atk=null;window.__e=spawnEnemy({type:'kpi',x:P.x+16,y:P.y});__e.hp=__e.max=999;__e.aggro=false;window.__h0=__e.hp");
for(let i=0;i<3;i++){await pg.keyboard.press('KeyJ');await pg.waitForTimeout(170)}L('shears: dmg dealt',await ev("Math.round(__h0-__e.hp)"),'cutN',await ev("__e.cutN"));
// render charge
await ev("enemies.length=0;P.prim='render';P.combo=0;P.atk=null;P.chargeT=0;window.__e=spawnEnemy({type:'crumple',x:P.x+30,y:P.y});__e.hp=__e.max=999;__e.aggro=false;window.__h0=__e.hp;P.face=1");
await pg.keyboard.down('KeyJ');await pg.waitForTimeout(1300);L('charging',await ev("P.chargeT.toFixed(2)"));await pg.keyboard.up('KeyJ');await pg.waitForTimeout(400);L('render charged dmg',await ev("Math.round(__h0-__e.hp)"),'state',await ev("__e.state"));
// eyedrop
await ev("enemies.length=0;P.sec='eyedrop';P.skillCd=0;window.__e=spawnEnemy({type:'printer',x:P.x+120,y:P.y});__e.aggro=false;P.face=1");await pg.keyboard.press('KeyK');await pg.waitForTimeout(100);L('eyedrop: enemy dx',await ev("Math.round(__e.x-P.x)"),'state',await ev("__e.state"));
// keyframe
await ev("enemies.length=0;P.sec='keyframe';P.skillCd=0;P.kfMark=null;window.__x0=P.x");await pg.keyboard.press('KeyK');await pg.waitForTimeout(450);await pg.keyboard.down('KeyD');await pg.waitForTimeout(600);await pg.keyboard.up('KeyD');L('moved',await ev("Math.round(P.x-__x0)"));await pg.keyboard.press('KeyK');await pg.waitForTimeout(100);L('keyframe back: dx',await ev("Math.round(P.x-__x0)"),'cd',await ev("P.skillCd.toFixed(1)"));
// array
await ev("P.sec='array';P.skillCd=0;projs.length=0");await pg.keyboard.press('KeyK');await pg.waitForTimeout(50);L('array bolts',await ev("projs.filter(p=>p.kind==='bolt').length"));
L('errs',errs,await ev("$('err').textContent"));await b.close()})();
