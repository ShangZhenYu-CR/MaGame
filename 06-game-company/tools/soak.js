const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:960,height:540}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('file://'+process.argv[2]);await pg.waitForTimeout(1500);
const ev=s=>pg.evaluate(x=>window.__dbg(x),s);
await ev(`window.__bot={log:[],stuck:0,lastX:0,best:0,frames:0};startGame(${process.argv[3]||0})`);
const res=await ev(`(()=>{const B=window.__bot,log=B.log;const prims=['stylus','marker','ruler','knife'],secs=['palette','airbrush','eraser','inkbomb','boxcol','turret'];
 let floorStart=0,lastFloor=1,stuckT=0,lastX=P.x,maxObj={parts:0,projs:0,fxs:0,corpses:0,enemies:0,pickups:0,nums:0,splats:0};let swapT=0;
 for(let f=0;f<60*60*12;f++){B.frames=f;
  for(const k in K)K[k]=0;
  if(G.state==='rest'){chooseRest(0);continue}
  if(G.state==='scroll'){chooseScroll(0);continue}
  if(G.state==='end'){log.push('END at frame '+f+' time '+G.time.toFixed(1));break}
  if(G.state==='dead'){log.push('died?');retry();continue}
  if(G.state!=='play'){log.push('state '+G.state);break}
  // god mode
  P.hp=P.maxHp;
  // weapon rotation every 20s to exercise all
  if(f%1200===0){P.prim=prims[(f/1200)%4];P.sec=secs[(f/1200)%6];P.skillCd=0;hud.p=hud.s=null}
  const tgt=(boss&&boss.hp>0)?boss:null;let dir=1;if(tgt)dir=sign(tgt.x-P.x)||1;
  const near=enemies.some(e=>e.hp>0&&Math.abs(e.x-P.x)<60&&Math.abs(e.y-P.y)<50);
  K[dir>0?'KeyD':'KeyA']=1;
  if(f%7===0&&(near||tgt))KP['KeyJ']=1;
  if(f%90===0)KP['KeyK']=1;
  if(f%150===75)KP['ShiftLeft']=1;
  if(P.hitWall||stuckT>40){if(f%20===0)KP['Space']=1;K['Space']=1}
  if(f%400===200&&!tgt)KP['KeyE']=1;
  if(Math.abs(P.x-lastX)<.2&&!tgt)stuckT++;else stuckT=0;lastX=P.x;
  if(stuckT===600){log.push('STUCK f'+G.floor+' at tile '+Math.floor(P.x/TS)+','+Math.floor(P.y/TS)+' state boss='+(!!boss));P.x+=TS*3;P.y-=TS*4;stuckT=0}
  // door: when boss done walk to exit and interact
  if(G.bossDone){const d=pickups.find(k=>k.k==='door');if(d){K['KeyD']=P.x<d.x-6?1:0;K['KeyA']=P.x>d.x+6?1:0;if(Math.abs(P.x-d.x)<12)KP['KeyE']=1}}
  step(1/60);if(f%15===0)render();uiTick();clearPressed();
  // invariants
  if(!isFinite(P.x)||!isFinite(P.y)){log.push('NaN player f'+f);break}
  if(P.y>LV.h*TS+50)log.push('player below map f'+G.floor);
  if(isSolid(Math.floor(P.x/TS),Math.floor((P.y-P.h/2)/TS))&&!P.mantle){B.inwall=(B.inwall||0)+1;if(B.inwall%120===1)log.push('player inside wall f'+G.floor+' tile '+Math.floor(P.x/TS)+','+Math.floor((P.y-P.h/2)/TS))}
  for(const e of enemies)if(!isFinite(e.x)||!isFinite(e.y)||!isFinite(e.hp)){log.push('NaN enemy '+e.type);e.hp=0}
  if(boss&&(!isFinite(boss.x)||!isFinite(boss.hp)))log.push('NaN boss');
  for(const k in maxObj){const a={parts,projs,fxs,corpses,enemies,pickups,nums,splats}[k];maxObj[k]=Math.max(maxObj[k],a.length)}
  if(G.floor!==lastFloor){log.push('floor '+lastFloor+' cleared in '+((f-floorStart)/60).toFixed(0)+'s');lastFloor=G.floor;floorStart=f}
 }
 log.push('final state '+G.state+' floor '+G.floor+' kills '+G.kills+' frames '+B.frames);log.push('max '+JSON.stringify(maxObj));return log.join('\\n')})()`);
console.log(res);console.log('pageerrors',errs,'err box',await ev("$('err').textContent"));await pg.screenshot({path:'soak_end.png'});await b.close()})();
