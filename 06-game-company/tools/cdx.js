const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1600,height:900}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('file://'+process.argv[2]);await pg.waitForTimeout(3000);const ev=s=>pg.evaluate(x=>window.__dbg(x),s);const L=(...a)=>console.log(...a);
await pg.screenshot({path:'c_title.png'});
await pg.click('#bcdx');await pg.waitForTimeout(500);
for(let i=0;i<6;i++){L('tab',await ev("cdxTab"),'cards',await ev("$('cdxlist').children.length"),await ev("[...document.querySelectorAll('#cdxlist .cdx b')].map(b=>b.textContent).join('|').slice(0,160)"));await pg.screenshot({path:'c_tab'+i+'.png'});await pg.keyboard.press('ArrowRight');await pg.waitForTimeout(250)}
await pg.keyboard.press('Escape');await pg.waitForTimeout(300);L('codex closed',!(await ev("$('codex').classList.contains('show')")),'state',await ev("G.state"));
// end -> home
await ev("startGame(0)");await pg.waitForTimeout(800);await ev("G.floor=3;loadFloor(3);G.state='end';openEnd()");await pg.waitForTimeout(2200);await pg.screenshot({path:'c_end.png'});
await pg.click('#bhome');await pg.waitForTimeout(800);L('after home',await ev("G.state"),'title shown',await ev("$('title').classList.contains('show')"),'hud',await ev("$('hud').classList.contains('show')"),'LV floor',await ev("LV.floor"),'boss',await ev("!!boss"));await pg.screenshot({path:'c_home.png'});
// start again works
await pg.click('#bstart');await pg.waitForTimeout(1500);L('restart',await ev("G.state+' '+G.floor+' hp '+P.hp"));
// pause -> home
await pg.keyboard.press('Escape');await pg.waitForTimeout(300);await pg.screenshot({path:'c_pause.png'});await pg.click('#bhome2');await pg.waitForTimeout(600);L('pause home',await ev("G.state"));
// dead -> home
await ev("startGame(0)");await pg.waitForTimeout(800);await ev("P.inv=0;hurtPlayer(9999,1,null,'t')");await pg.waitForTimeout(1500);await pg.click('#bhome3');await pg.waitForTimeout(600);L('dead home',await ev("G.state"),await ev("$('dead').classList.contains('show')"));
// ljy hidden then revealed
await ev("SAVE.ljyMet=1");await pg.click('#bcdx');await pg.waitForTimeout(300);await ev("cdxTab='boss';cdxDraw()");await pg.waitForTimeout(200);await pg.screenshot({path:'c_boss_seen.png'});
L('errs',errs,await ev("$('err').textContent"));await b.close()})();
