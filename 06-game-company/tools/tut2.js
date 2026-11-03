const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1600,height:900}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('file://'+process.argv[2]);await pg.waitForTimeout(3000);const ev=s=>pg.evaluate(x=>window.__dbg(x),s);const L=(...a)=>console.log(...a);
const K=pg.keyboard,W=ms=>pg.waitForTimeout(ms);
const st=()=>ev("G.tut?G.tut.step:-9");
// 等到进入第 n 步（且上一步的提示已经刷新）
const reach=async(n,ms=3000)=>{for(let t=0;t<ms;t+=50){if(await st()>=n&&!(await ev("G.tut&&G.tut.wait")))return true;await W(50)}return false};
const tryStep=async(n,act,tries=6)=>{for(let i=0;i<tries;i++){await act(i);if(await reach(n+1,1800)){L('step',n,'ok after',i+1,'tries');return}}L('step',n,'FAILED')};
await pg.click('#btut');await reach(0);
await tryStep(0,async()=>{await K.down('KeyD');await W(900);await K.up('KeyD')});
await tryStep(1,async()=>{await K.down('KeyD');await W(150);await K.press('Space');await W(450);await K.up('KeyD')});
await tryStep(2,async()=>{await K.down('KeyD');await W(100);await K.down('Space');await W(380);await K.up('Space');await W(500);await K.up('KeyD')});
await tryStep(3,async()=>{await K.down('KeyD');await W(500);await K.down('Space');await W(250);await K.up('Space');await W(120);await K.down('Space');await W(300);await K.up('Space');await W(700);await K.up('KeyD')});
await tryStep(4,async()=>{await K.down('KeyD');await W(600);await K.up('KeyD');await K.down('KeyS');await W(100);await K.press('Space');await W(100);await K.up('KeyS')});
await tryStep(5,async()=>{await K.down('KeyD');await W(300);await K.up('KeyD');await K.press('ShiftLeft')});
const toDummy=async()=>{for(let i=0;i<60;i++){const d=await ev("Math.round(enemies.find(e=>e.dummy).x-P.x)");if(Math.abs(d)<22)break;const k=d>0?'KeyD':'KeyA';await K.down(k);await W(60);await K.up(k)}await ev("P.face=sign(enemies.find(e=>e.dummy).x-P.x)||1")};
await tryStep(6,async()=>{await toDummy();for(let i=0;i<4;i++){await K.press('KeyJ');await W(170)}});
await tryStep(7,async()=>{for(let i=0;i<20;i++){const d=await ev("Math.round(enemies.find(e=>e.dummy).x-P.x)");if(d>60&&d<90)break;await K.down(d<70?'KeyA':'KeyD');await W(80);await K.up(d<70?'KeyA':'KeyD')}await ev("P.face=1");await K.press('ShiftLeft');await W(120);await K.press('KeyJ')});
await tryStep(8,async()=>{await toDummy();await K.down('Space');await W(330);await K.up('Space');await W(80);await K.down('Space');await W(200);await K.up('Space');await W(150);await K.down('KeyS');await W(80);await K.press('KeyJ');await W(80);await K.up('KeyS')});
await tryStep(9,async()=>{await K.press('KeyK')});
await tryStep(10,async()=>{await K.press('KeyQ')});
await tryStep(11,async()=>{const dx=await ev("Math.round(pickups.find(k=>k.k==='weapon').x-P.x)");const k=dx>0?'KeyD':'KeyA';for(let i=0;i<40&&Math.abs(await ev("pickups.find(k=>k.k==='weapon').x-P.x"))>10;i++){await K.down(k);await W(50);await K.up(k)}
  if(Math.abs(await ev("pickups.find(k=>k.k==='weapon').y-P.y"))>20){await K.down('Space');await W(300);await K.up('Space');await W(500)}await K.press('KeyE')});
await tryStep(12,async()=>{await K.down('KeyR');await W(250);await K.press('KeyL');await W(150);await K.up('KeyR')});
await pg.screenshot({path:'tu_13.png'});
await ev("P.inv=999");await tryStep(13,async()=>{for(let i=0;i<15;i++){await ev("const f=G.tut.foe;if(f&&f.hp>0){P.face=sign(f.x-P.x)||1;if(Math.abs(f.x-P.x)>28)P.x=f.x-P.face*20}");await K.press('KeyJ');await W(170)}},8);
await pg.screenshot({path:'tu_14.png'});
await ev("const d=pickups.find(k=>k.k==='door');P.x=d.x;P.y=17*TS");await W(300);await K.press('KeyE');await W(800);L('end',await ev("G.state"),'saved',await ev("SAVE.tut"),'tut panel',await ev("$('tut').classList.contains('show')"));
L('errs',errs,await ev("$('err').textContent"));await b.close()})();
