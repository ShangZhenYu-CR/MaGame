// ===== Boss =====
let boss=null;
const BOSSDEF={
 ad:{name:'主美 · 改稿大师',hp:950,w:22,h:60,quote:'“这版不行，再改一版。”',p2:'“这是终稿……的第二版！”',dead:'“……这版，过了。”',contact:16},
 pd:{name:'制作人 · 需求变更',hp:1250,w:22,h:52,quote:'“需求有一点点小调整……”',p2:'“上线前再加个功能！”',dead:'“需求……冻结。”',contact:16},
 ceo:{name:'老板 · 画大饼',hp:2200,w:34,h:64,quote:'“年轻人，项目做成了，大家都有饼吃！”',p2:'“这个饼，可大了！”',dead:'“好吧……今天准时下班。”',contact:20}};
function bsp(b){return(b.phase===3?1.5:b.phase===2?1.3:1)*(G.hard?1.15:1)}
function spawnBoss(kind){const d=BOSSDEF[kind],hp=Math.round(d.hp*(G.hard?1.4:1));boss={kind,isBoss:true,name:d.name,x:LV.arenaX+LV.arenaW-80,y:19*TS,w:d.w,h:d.h,vx:0,vy:0,face:-1,hp,max:hp,state:'intro',t:0,anim:0,flash:0,phase:1,onGround:true,drop:false,cd:0,idleT:1,contactCd:0,pen:-.4,alpha:1,minions:0,seq:0,stag:0,stagMax:Math.round(hp*.25),stagPend:false,phasePend:0,closeT:0,hitLog:[]};
 bossBanner(d.name,d.quote);Snd.play('boss');SFX.boss()}
// 近身反击：玩家贴身太久，或短时间连砍太多刀，Boss 用一招快速近身技把人打开
function bossCounterDue(b){const recent=b.hitLog.filter(t=>T-t<1.5).length;return b.closeT>(b.phase>=3?.5:.7)||recent>=5}
const COUNTER={ad:'sweep_wind',pd:'shove_wind',ceo:'belly_wind'};
function bossChoose(){const b=boss,dx=P.x-b.x,dist=Math.abs(dx),sp=bsp(b);b.t=0;b.seq++;const prev=b.last;
 if(bossCounterDue(b)){b.state=COUNTER[b.kind];b.closeT=0;b.hitLog.length=0;b.last=b.state;b.sp=sp;SFX.warn();return}
 // 玩家贴得近时优先用近身招（不对着空气扔东西）
 if(dist<70&&Math.random()<.65){const near={ad:['sweep_wind','stamp_up','sweep_wind','dash_wind'],pd:['shove_wind','tele','change'],ceo:['pound','belly_wind','pound']}[b.kind];b.state=pick(near);if(b.state===prev)b.state=pick(near);b.last=b.state;b.sp=sp;if(b.state.endsWith('_wind'))SFX.warn();return}
 for(let tries=0;tries<3;tries++){
 if(b.kind==='ad'){const r=Math.random();b.state=dist>140?(r<.55?'dash_wind':'notes'):(r<.4?'dash_wind':r<.7?'stamp_up':'notes');if(b.seq%4===0)b.state='stamp_up';if(b.phase>=2&&b.seq%5===2)b.state='rain'}
 else if(b.kind==='pd'){const opts=['tele','doc','change','doc'];if(b.phase>=2)opts.push('laser','laser');b.state=pick(opts);if(b.seq%3===0)b.state='tele';if(b.phase>=2&&b.seq%6===4&&enemies.filter(e=>e.minion&&e.hp>0).length<2)b.state='call'}
 else{const opts=['pie','pound','kpi'];if(b.phase>=2)opts.push('bigpie','pierain');b.state=pick(opts);if(b.phase>=2&&b.seq%4===0)b.state='bigpie'}
 if(b.state!==prev)break}b.last=b.state;b.sp=sp}
function bossUpdate(dtA){const b=boss;if(!b)return;if(b.state!=='dead'){tickStatus(b,dtA);if(!boss)return}const dt=dtA*(b.slowT>0?.75:1);b.anim+=dt;if(b.landT>0)b.landT-=dt;b.flash-=dt;b.t+=dt;b.contactCd-=dt;const dx=P.x-b.x,sp=bsp(b);
 if(b.state==='dead'){b.vx*=.9;if(Math.random()<.5){burst(b.x+rnd(-14,14),b.y-rnd(4,b.h),6,['#ffd84a','#fff','#d8584a'],200,.5,3,200)}if(b.t>1.6){bossGone()}return}
 // 贴身计时（翻滚中不算）
 if(!['intro','stagger','roar','tele','tele_in'].includes(b.state)&&Math.abs(dx)<44&&Math.abs((P.y-17)-(b.y-b.h/2))<b.h/2+20&&P.rollT<=0)b.closeT+=dt;else b.closeT=Math.max(0,b.closeT-dt*.6);
 if(b.state==='recover'&&b.t>.25&&bossCounterDue(b)){bossChoose()}
 // 放远程招的时候被贴脸狂砍：中断施法，直接近身反击
 if(['pie','kpi','bigpie','pierain','notes','rain','doc','change','laser','call'].includes(b.state)&&b.t>.35&&(b.hitLog.filter(t=>T-t<1.5).length>=8||b.closeT>1.2)){b.thrown=false;bossChoose()}
 // 破绽槽：持续输出会攒满，满了 Boss 原地失衡，受到伤害提高
 if(b.state!=='stagger')b.stag=Math.max(0,b.stag-b.stagMax*.05*dt);
 const grounded=['idle','recover','dash_wind','notes','doc','change','laser','pie','kpi','bigpie','rain','call','pierain'].includes(b.state)&&b.onGround!==false;
 if(b.stagPend&&grounded){b.stagPend=false;b.stag=0;b.state='stagger';b.t=0;b.vx=-b.face*120;b.thrown=false;b.jumped=false;SFX.parry();SFX.stamp();shake=6;hitstop=Math.max(hitstop,.12);toast('破绽！趁现在猛攻',1400);burst(b.x,b.y-b.h,24,['#ffd84a','#fff'],220,.5,3,0)}
 // 转阶段：等 Boss 落地空闲时才怒吼，把玩家震开
 if(!b.phasePend&&b.phase===1&&b.hp<b.max*.5)b.phasePend=2;
 if(!b.phasePend&&b.phase===2&&b.hp<b.max*.25)b.phasePend=3;
 if(b.phasePend&&(b.state==='idle'||b.state==='recover')){const np=b.phasePend;b.phasePend=0;b.phase=np;b.state='roar';b.t=0;b.vx=0;
  toast(np===2?BOSSDEF[b.kind].name.split(' · ')[0]+'：'+BOSSDEF[b.kind].p2:BOSSDEF[b.kind].name.split(' · ')[0]+' 狂暴了！',2400);shake=7;SFX.boss();burst(b.x,b.y-b.h/2,np===2?30:40,np===2?['#ff5a4a','#ffd84a']:['#ff3a3a','#fff'],280,.6,3,100);sfx('fx_roar',b.x,b.y-b.h/2,1,12);
  for(const p of projs)if(p.from==='e'&&p.isProj){p.life=0;burst(p.x,p.y,4,'#fff',60,.2)}
  if(Math.abs(P.x-b.x)<110&&!P.dead){P.vx=sign(P.x-b.x||1)*280;P.vy=-220;P.hurtT=.2;P.atk=null}
  if(np===2&&b.kind==='ceo'){for(const s of[-1,1])spawnEnemy({type:'kpi',x:clamp(b.x+s*120,LV.arenaX+60,LV.arenaX+LV.arenaW-60),y:19*TS},true)}}
 let grav=true;
 switch(b.state){
 case 'roar':b.vx=0;b.face=sign(dx)||b.face;if(Math.random()<.6)part(b.x+rnd(-20,20),b.y-b.h-rnd(0,10),rnd(-60,60),-rnd(40,100),'#ff5a4a',.4,2,0);if(b.t>1.0){b.state='idle';b.t=0;b.idleT=.3}break;
 case 'stagger':b.vx*=.88;if(Math.random()<.3)part(b.x+rnd(-8,8),b.y-b.h-6,rnd(-30,30),-30,'#ffd84a',.4,2,0);if(b.t>1.8){b.state='idle';b.t=0;b.idleT=.25}break;
 case 'intro':b.vx=0;b.face=sign(dx)||-1;if(b.t>2.2){b.state='idle';b.t=0;b.idleT=.6}break;
 case 'idle':{b.face=sign(dx)||b.face;const walk=b.kind==='pd'?0:b.kind==='ceo'?55:60;b.vx=Math.abs(dx)>70?b.face*walk:0;b.pen=lerp(b.pen,-.4,.1);if(b.t>b.idleT/sp)bossChoose();break}
 // ---- 近身反击 ----
 case 'sweep_wind':b.vx=0;b.face=sign(dx)||b.face;if(b.t>(b.phase>=3?.3:.38)){b.state='sweep';b.t=0;SFX.heavy();shake=Math.max(shake,3)}break;
 case 'sweep':{b.vx=0;const ax=P.x-b.x;if(!b.hitDone&&((ax*b.face>-18&&ax*b.face<48)&&Math.abs((P.y-17)-(b.y-30))<40)){if(hurtPlayer(26,sign(ax)||b.face,b)){P.vx=(sign(ax)||b.face)*300;P.vy=-240}b.hitDone=true}
  if(b.t<.2&&Math.random()<.9)part(b.x+b.face*rnd(10,56),b.y-rnd(8,50),b.face*rnd(60,140),rnd(-40,40),'#e8483a',.25,2,0);
  if(b.t>.3){b.hitDone=false;b.sweepN=(b.sweepN||0)+1;if(b.phase>=2&&b.sweepN<2){b.face=-b.face;if(Math.abs(P.x-b.x)<70)b.face=sign(P.x-b.x)||b.face;b.state='sweep_wind';b.t=.18}else{b.sweepN=0;b.state='recover';b.t=0;b.rec=.5}}break}
 case 'shove_wind':b.vx=0;b.face=sign(dx)||b.face;if(Math.random()<.5)part(b.x+rnd(-30,30),b.y-rnd(0,40),0,0,'#5ab0d8',.3,2,0);if(b.t>(b.phase>=3?.3:.36)){b.state='shove';b.t=0;SFX.boom();shake=Math.max(shake,5);ringFx(b.x,b.y-26,'#5ab0d8');
   if(Math.hypot(P.x-b.x,(P.y-17)-(b.y-26))<62&&hurtPlayer(22,sign(P.x-b.x)||1,b)){P.vx=(sign(P.x-b.x)||1)*320;P.vy=-220}}break;
 case 'shove':b.vx=0;if(b.t>.35){b.state='tele';b.t=0}break;
 case 'call':b.vx=0;if(b.t<.05){toast('拉人开会！',1200);SFX.warn();for(const s of[-1,1]){const t=s<0?'popup':'bug',x=clamp(P.x+s*rnd(90,140),LV.arenaX+40,LV.arenaX+LV.arenaW-40);const m=spawnEnemy({type:t,x,y:EDEF[t].fly?19*TS-60:19*TS},true);m.aggro=true;burst(x,(EDEF[t].fly?19*TS-60:19*TS)-10,14,['#5ab0d8','#fff'],140,.4)}}if(b.t>.9){b.state='idle';b.t=0;b.idleT=.5}break;
 case 'belly_wind':b.vx=0;b.face=sign(dx)||b.face;if(b.t>(b.phase>=3?.32:.4)){b.state='belly';b.t=0;b.vx=b.face*240;b.vy=-180;SFX.jump()}break;
 case 'belly':{b.vx=b.face*240;if(!b.hitDone&&Math.abs(dx)<b.w/2+16&&Math.abs((P.y-17)-(b.y-32))<44){if(hurtPlayer(32,b.face,b)){P.vx=b.face*340;P.vy=-260}b.hitDone=true}
  if(b.t>.2&&b.onGround){b.hitDone=false;b.vx=0;SFX.stamp();shake=Math.max(shake,4);b.landT=.36;b.bellyN=(b.bellyN||0)+1;if(b.phase>=2&&b.bellyN<2&&Math.abs(P.x-b.x)<46){b.state='belly_wind';b.t=.1;b.face=sign(P.x-b.x)||b.face}else{b.bellyN=0;b.state='recover';b.t=0;b.rec=.55}}break}
 // ---- 从天而降（二阶段起）----
 case 'rain':case 'pierain':b.vx=0;b.face=sign(dx)||b.face;if(b.t<.05){toast(b.kind==='ad'?'满屏批注！':'饼从天上掉下来了！',1200);SFX.warn();const n=b.phase>=3?9:7;const xs=[P.x];for(let i=1;i<n;i++)xs.push(LV.arenaX+30+Math.random()*(LV.arenaW-60));
   xs.forEach((x,i)=>projs.push({kind:'drop',from:'x',x,gy:19*TS,y:-999,t:-i*.12,warn:.75,dmg:b.kind==='ad'?14:16,img:b.kind==='ad'?'note':'pie',life:6,isProj:true}))}
  if(b.t>1.3){b.state='idle';b.t=0;b.idleT=.5}break;
 // ---- 主美 ----
 case 'dash_wind':b.vx=0;b.face=sign(dx)||b.face;b.pen=lerp(b.pen,-2.6,.2);if(b.t<.05)SFX.warn();if(b.t>.55/sp){b.state='dash';b.t=0;SFX.heavy()}break;
 case 'dash':b.vx=b.face*370*sp;b.pen=lerp(b.pen,1.2,.4);if(Math.random()<.8)part(b.x-b.face*6,b.y-20,-b.face*60,rnd(-20,20),'#e8483a',.3,2,0);
  if(Math.abs(dx)<26&&P.y>b.y-b.h&&P.y-P.h<b.y)hurtPlayer(20,b.face,b);if(b.t>.5||b.hitWall){if(b.hitWall){shake=4;SFX.stamp()}b.dashN=(b.dashN||0)+1;if(b.phase>=2&&b.dashN<(b.phase>=3?3:2)){b.state='dash_wind';b.t=.2;b.face=sign(dx)||-b.face}else{b.dashN=0;b.state='recover';b.t=0;b.rec=.65}}break;
 case 'notes':b.vx=0;b.face=sign(dx)||b.face;b.pen=lerp(b.pen,-1.8,.2);if(b.t>.35&&!b.thrown){b.thrown=true;SFX.throw();const n=b.phase>=2?5:3;for(let i=0;i<n;i++){const T=.75+i*.15,tx=P.x+(i-(n-1)/2)*34,vx=(tx-b.x)/T;eproj({kind:'note',x:b.x+b.face*8,y:b.y-30,vx,vy:-300,grav:600,r:5,dmg:12,life:3,breakable:true})}}
  if(b.t>.8){b.thrown=false;b.state='idle';b.t=0;b.idleT=.55}break;
 case 'stamp_up':b.vx=0;if(b.t<.25){b.pen=-2.8}else{b.vy=-820;grav=false;b.y+=b.vy*dt;if(b.y<-80){b.state='stamp_hover';b.t=0;b.y=-80}}break;
 case 'stamp_hover':grav=false;b.vy=0;b.x=lerp(b.x,clamp(P.x,LV.arenaX+40,LV.arenaX+LV.arenaW-40),.08);if(b.t>.95/sp){b.state='stamp_fall';b.t=0;b.vy=200}break;
 case 'stamp_fall':b.vy=1000;break;
 case 'recover':b.vx*=.85;b.pen=lerp(b.pen,0,.1);if(b.t>(b.rec||.7)/sp){b.state='idle';b.t=0;b.idleT=.5}break;
 // ---- 制作人 ----
 case 'tele':b.alpha=1-b.t/.3;if(b.t>.3){const spots=[[LV.arenaX+60,19*TS],[LV.arenaX+LV.arenaW-50,19*TS],[LV.arenaX+8*TS,14*TS],[LV.arenaX+LV.arenaW-8*TS,14*TS],[LV.arenaX+15*TS,10*TS]];let s=pick(spots);if(Math.abs(s[0]-P.x)<60)s=pick(spots);b.x=s[0];b.y=s[1];b.vy=0;b.state='tele_in';b.t=0;burst(b.x,b.y-20,14,['#5ab0d8','#fff'],140,.4)}grav=false;break;
 case 'tele_in':grav=false;b.alpha=b.t/.3;b.face=sign(dx)||1;if(b.t>.3){b.alpha=1;b.state='idle';b.t=0;b.idleT=.3}break;
 case 'doc':b.vx=0;b.face=sign(dx)||b.face;if(b.t>.4&&!b.thrown){b.thrown=true;SFX.throw();const n=b.phase>=2?2:1;for(let i=0;i<n;i++){const dy=(P.y-14)-(b.y-24),d=Math.hypot(dx,dy)||1;eproj({kind:'doc',x:b.x,y:b.y-24,vx:dx/d*320+(i?0:0),vy:dy/d*320-(i?120:0),r:7,dmg:12,life:3,owner:b,pierce:true})}}if(b.t>1.1){b.thrown=false;b.state='idle';b.t=0;b.idleT=.45}break;
 case 'change':b.vx=0;if(b.t<.05){toast('需求变更！',1200);SFX.warn();const n=b.phase>=2?2:1,secs=[0,1,2].sort(()=>Math.random()-.5);const W3=LV.arenaW/3;for(let i=0;i<n;i++){const s=secs[i];projs.push({kind:'zone',x0:LV.arenaX+s*W3+8,x1:LV.arenaX+(s+1)*W3-8,y:19*TS,t:0,warn:1.0,dur:2.0,dmg:12,life:9})}}if(b.t>1.2){b.state='idle';b.t=0;b.idleT=.8}break;
 case 'laser':b.vx=0;b.face=sign(dx)||b.face;if(b.t<.05){projs.push({kind:'laser',x:b.x,y:P.y-13,t:0,warn:.8,dmg:18,life:3});if(b.phase>=3)projs.push({kind:'laser',x:b.x,y:P.y-13-48,t:-.35,warn:.8,dmg:18,life:3})}if(b.t>1.4){b.state='idle';b.t=0;b.idleT=.5}break;
 // ---- 老板 ----
 case 'pie':b.vx=0;b.face=sign(dx)||b.face;if(b.t>.5&&!b.thrown){b.thrown=true;SFX.throw();const n=b.phase>=2?4:3;for(let i=0;i<n;i++)eproj({kind:'pie',x:b.x+b.face*16,y:b.y-34,vx:b.face*rnd(110,260),vy:-rnd(220,360),grav:700,r:6,dmg:12,life:4.5,pierce:true})}if(b.t>1){b.thrown=false;b.state='idle';b.t=0;b.idleT=.55}break;
 case 'pound':if(b.t<.3){b.vx=0}else if(!b.jumped){b.jumped=true;b.vy=-520;b.vx=clamp(dx/1.0,-260,260);SFX.jump()}else if(b.onGround&&b.t>.45){b.jumped=false;SFX.stamp();shake=7;for(const d of[-1,1])eproj({kind:'wave',x:b.x+d*14,y:b.y,vx:d*200*sp,vy:0,r:6,dmg:16,life:2,col:'#e8b060'});b.landT=.36;if(Math.abs(dx)<34)hurtPlayer(26,sign(dx)||1,b);b.poundN=(b.poundN||0)+1;if(b.phase>=3&&b.poundN<3){b.state='pound';b.t=.15}else{b.poundN=0;b.state='recover';b.t=0;b.rec=.9}}break;
 case 'kpi':b.vx=0;if(b.t<.05){toast('KPI 上涨！',1000);const n=b.phase>=2?6:5;for(let i=0;i<n;i++){const x=i===0?P.x:LV.arenaX+40+((i*137+Math.floor(Math.random()*90))%(LV.arenaW-80));projs.push({kind:'kpi',x,y:19*TS,t:-i*.22,warn:.6,w:22,hgt:70+i*6,dmg:16,col:pick(['#d8584a','#f2c14e','#5ab85a']),life:9,follow:b.phase>=3})}}if(b.t>1.8){b.state='idle';b.t=0;b.idleT=.6}break;
 case 'bigpie':b.vx=0;if(b.t<.05){toast('画大饼！',1200);SFX.boss()}if(b.t>.7&&!b.thrown){b.thrown=true;eproj({kind:'bigpie',x:b.x+b.face*20,y:19*TS-22,vx:b.face*230,vy:0,r:22,dmg:22,life:4,pierce:true})}if(b.t>1.8){b.thrown=false;b.state='idle';b.t=0;b.idleT=.8}break;
 }
 if(grav&&b.state!=='stamp_fall'){b.vy=Math.min(MAXF,b.vy+GRAV*dt)}
 if(b.state==='stamp_fall'){b.y+=b.vy*dt;const gy=19*TS;if(b.y>=gy){b.y=gy;b.vy=0;b.state='recover';b.t=0;b.rec=.85;b.landT=.36;SFX.stamp();shake=8;splats.push({x:b.x-12,y:gy,w:24,col:'#c8302a',life:5});
   for(const d of[-1,1])eproj({kind:'wave',x:b.x+d*10,y:gy,vx:d*210*sp,vy:0,r:6,dmg:15,life:2,col:'#e8483a'});if(Math.abs(dx)<24)hurtPlayer(22,sign(dx)||1,b);
   if(b.phase>=2&&b.minions<4&&enemies.filter(e=>e.minion).length<2){b.minions++;spawnEnemy({type:'crumple',x:clamp(b.x+pick([-80,80]),LV.arenaX+40,LV.arenaX+LV.arenaW-40),y:gy},true)}}}
 else if(!['stamp_up','stamp_hover','tele'].includes(b.state)){b.drop=b.kind!=='pd';moveBody(b,dt)}// 主美和老板穿过单向平台落回地面，免得卡在高台上
 b.x=clamp(b.x,LV.arenaX+3*TS,LV.arenaX+LV.arenaW-2*TS);
 // 接触伤害
 // 被动碰撞伤害只在冲撞类动作里生效；平时贴身不扣血，贴脸交给近身反击来惩罚
 if(['dash','belly'].includes(b.state)&&b.alpha>.5&&b.contactCd<=0&&Math.abs(dx)<b.w/2+P.w/2&&P.y>b.y-b.h&&P.y-P.h<b.y){if(hurtPlayer(BOSSDEF[b.kind].contact,sign(dx)||1,b))b.contactCd=.65}}
function bossDie(){const b=boss;if(b.state==='dead')return;b.hp=0;b.state='dead';b.t=0;slowmo=.25;slowT=.9;SFX.boom();shake=10;hitstop=.2;toast(b.name.split(' · ')[0]+'：'+BOSSDEF[b.kind].dead,3000);$('bossbar').classList.remove('show');for(const e of enemies)if(e.minion)e.hp=0}
function bossGone(){const b=boss;burst(b.x,b.y-b.h/2,60,['#ffd84a','#fff','#d8584a','#7fd8ff'],320,.8,3,200);for(let i=0;i<20;i++)pickups.push({k:'cell',x:b.x,y:b.y-20,vx:rnd(-160,160),vy:rnd(-300,-100)});
 pickups.push({k:'door',x:LV.exitX,y:19*TS,open:true});dropBP(b.x,b.y-20);boss=null;G.bossDone=true;Snd.play(LV.th.song);SFX.win();banner(LV.floor<3?'本层通关！去右边的门':'老板被说服了！去下班吧','',2600)}
function drawBossExtras(cx,cy){const b=boss;if(!b)return;
 if(b.state==='stagger'){const x=R(b.x-cx),y=R(b.y-cy-b.h-8);for(let i=0;i<3;i++){const a=b.anim*5+i*2.1;px(x+Math.cos(a)*10-1,y+Math.sin(a)*3-1,3,3,'#ffd84a');px(x+Math.cos(a)*10,y+Math.sin(a)*3,1,1,'#fff')}}
 if(b.state==='roar'){ctx.globalAlpha=Math.max(0,.5-b.t*.5);pring(R(b.x-cx),R(b.y-cy-b.h/2),R(20+b.t*120),'#ff5a4a',2);ctx.globalAlpha=1}
 if(b.state==='stamp_hover'||b.state==='stamp_fall'){const gy=19*TS-cy,x=R(b.x-cx);ctx.globalAlpha=.35+.25*Math.sin(b.anim*30);px(x-16,gy-3,32,3,'#ff3a3a');ctx.globalAlpha=1;pnum('!',x,gy-24,'#ff5a4a',2)}
 if(['dash_wind','sweep_wind','shove_wind','belly_wind'].includes(b.state)&&Math.floor(b.anim*14)%2===0)pnum('!',R(b.x-cx),R(b.y-cy-b.h-14),'#ff5a4a',2)}
