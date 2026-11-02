// ===== Boss =====
let boss=null;
const BOSSDEF={
 ad:{name:'主美 · 改稿大师',hp:950,w:22,h:60,quote:'“这版不行，再改一版。”',p2:'“这是终稿……的第二版！”',dead:'“……这版，过了。”',contact:16},
 pd:{name:'制作人 · 需求变更',hp:1250,w:22,h:52,quote:'“需求有一点点小调整……”',p2:'“上线前再加个功能！”',dead:'“需求……冻结。”',contact:16},
 ceo:{name:'老板 · 画大饼',hp:2200,w:34,h:64,quote:'“年轻人，项目做成了，大家都有饼吃！”',p2:'“这个饼，可大了！”',dead:'“好吧……今天准时下班。”',contact:20},
 ljy:{name:'隐藏大佬 · 刘敬阳',hp:3400,w:22,h:72,quote:'“这么晚还在公司？来，陪我练两组。”',p2:'“炎龙铠甲——合体！”',p3:'“龙魂，燃烧吧！”',dead:'“……好小子。明早七点，健身房见。”',contact:22}};
function bsp(b){return(b.phase===3?1.5:b.phase===2?1.3:1)*(G.hard?1.15:1)}
function spawnBoss(kind){if(kind==='ljy'&&!SAVE.ljyMet){SAVE.ljyMet=1;saveGame()}const d=BOSSDEF[kind],hp=Math.round(d.hp*(G.hard?1.4:1));boss={kind,isBoss:true,name:d.name,x:LV.arenaX+LV.arenaW-80,y:19*TS,w:d.w,h:d.h,vx:0,vy:0,face:-1,hp,max:hp,state:'intro',t:0,anim:0,flash:0,phase:1,onGround:true,drop:false,cd:0,idleT:1,contactCd:0,pen:-.4,alpha:1,minions:0,seq:0,stag:0,stagMax:Math.round(hp*.25),stagPend:false,phasePend:0,closeT:0,hitLog:[]};
 bossBanner(d.name,d.quote);Snd.play('boss');SFX.boss()}
// 近身反击：玩家贴身太久，或短时间连砍太多刀，Boss 用一招快速近身技把人打开
function bossCounterDue(b){const recent=b.hitLog.filter(t=>T-t<1.5).length;return b.closeT>(b.phase>=3?.5:.7)||recent>=5}
const COUNTER={ad:'sweep_wind',pd:'shove_wind',ceo:'belly_wind',ljy:'curl_wind'};
function bossChoose(){const b=boss,dx=P.x-b.x,dist=Math.abs(dx),sp=bsp(b);b.t=0;b.seq++;const prev=b.last;
 if(bossCounterDue(b)){b.state=b.kind==='ljy'&&b.phase>=2?'upper_wind':COUNTER[b.kind];b.closeT=0;b.hitLog.length=0;b.last=b.state;b.sp=sp;SFX.warn();return}
 // 玩家贴得近时优先用近身招（不对着空气扔东西）
 if(b.kind==='ljy'){b.state=dist<70&&Math.random()<.6?pick(LJY_NEAR[b.phase>=2?2:1]):ljyChoose(b,dist,prev);b.last=b.state;b.sp=sp;if(b.state.endsWith('_wind'))SFX.warn();return}
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
 if(['pie','kpi','bigpie','pierain','notes','rain','doc','change','laser','call','cube','bell','breath','pillars','meteor'].includes(b.state)&&b.t>.35&&(b.hitLog.filter(t=>T-t<1.5).length>=8||b.closeT>1.2)){b.thrown=false;bossChoose()}
 // 破绽槽：持续输出会攒满，满了 Boss 原地失衡，受到伤害提高
 if(b.state!=='stagger')b.stag=Math.max(0,b.stag-b.stagMax*.05*dt);
 const grounded=['idle','recover','dash_wind','notes','doc','change','laser','pie','kpi','bigpie','rain','call','pierain','cube','bell','breath','pillars','meteor','brush_wind','fdash_wind'].includes(b.state)&&b.onGround!==false;
 if(b.stagPend&&grounded){b.stagPend=false;b.stag=0;b.state='stagger';b.t=0;b.vx=-b.face*120;b.thrown=false;b.jumped=false;SFX.parry();SFX.stamp();shake=6;hitstop=Math.max(hitstop,.12);toast('破绽！趁现在猛攻',1400);burst(b.x,b.y-b.h,24,['#ffd84a','#fff'],220,.5,3,0)}
 // 转阶段：等 Boss 落地空闲时才怒吼，把玩家震开
 if(!b.phasePend&&b.phase===1&&b.hp<b.max*.5)b.phasePend=2;
 if(!b.phasePend&&b.phase===2&&b.hp<b.max*.25)b.phasePend=3;
 if(b.phasePend&&(b.state==='idle'||b.state==='recover')){const np=b.phasePend;b.phasePend=0;b.phase=np;b.state='roar';b.t=0;b.vx=0;
  {const D=BOSSDEF[b.kind],nm=b.kind==='ljy'?'刘敬阳':D.name.split(' · ')[0];toast(np===2?nm+'：'+D.p2:D.p3?nm+'：'+D.p3:nm+' 狂暴了！',2400)}if(b.kind==='ljy'&&np===2){b.state='transform';b.t=0;slowmo=.45;slowT=.7}if(b.kind==='ljy'&&np===3){slowmo=.4;slowT=.5}shake=7;SFX.boss();burst(b.x,b.y-b.h/2,np===2?30:40,np===2?['#ff5a4a','#ffd84a']:['#ff3a3a','#fff'],280,.6,3,100);if(b.kind!=='ljy')sfx('fx_roar',b.x,b.y-b.h/2,1,12);
  for(const p of projs)if(p.from==='e'&&p.isProj){p.life=0;burst(p.x,p.y,4,'#fff',60,.2)}
  if(Math.abs(P.x-b.x)<110&&!P.dead){P.vx=sign(P.x-b.x||1)*280;P.vy=-220;P.hurtT=.2;P.atk=null}
  if(np===2&&b.kind==='ceo'){for(const s of[-1,1])spawnEnemy({type:'kpi',x:clamp(b.x+s*120,LV.arenaX+60,LV.arenaX+LV.arenaW-60),y:19*TS},true)}}
 let grav=true;
 switch(b.state){
 case 'roar':b.vx=0;b.face=sign(dx)||b.face;if(Math.random()<.6)part(b.x+rnd(-20,20),b.y-b.h-rnd(0,10),rnd(-60,60),-rnd(40,100),'#ff5a4a',.4,2,0);if(b.t>1.0){b.state='idle';b.t=0;b.idleT=.3}break;
 case 'stagger':b.vx*=.88;if(Math.random()<.3)part(b.x+rnd(-8,8),b.y-b.h-6,rnd(-30,30),-30,'#ffd84a',.4,2,0);if(b.t>1.8){b.state='idle';b.t=0;b.idleT=.25}break;
 case 'intro':b.vx=0;b.face=sign(dx)||-1;if(b.t>2.2){b.state='idle';b.t=0;b.idleT=.6}break;
 case 'idle':{b.face=sign(dx)||b.face;const walk=b.kind==='pd'?0:b.kind==='ceo'?55:b.kind==='ljy'?(b.armor?85:65):60;b.vx=Math.abs(dx)>70?b.face*walk:0;b.pen=lerp(b.pen,-.4,.1);if(b.t>b.idleT/sp)bossChoose();break}
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
 default:if(b.kind==='ljy')grav=ljyUpdate(b,dt,dx,sp);break;
 case 'bigpie':b.vx=0;if(b.t<.05){toast('画大饼！',1200);SFX.boss()}if(b.t>.7&&!b.thrown){b.thrown=true;eproj({kind:'bigpie',x:b.x+b.face*20,y:19*TS-22,vx:b.face*230,vy:0,r:22,dmg:22,life:4,pierce:true})}if(b.t>1.8){b.thrown=false;b.state='idle';b.t=0;b.idleT=.8}break;
 }
 if(grav&&b.state!=='stamp_fall'){b.vy=Math.min(MAXF,b.vy+GRAV*dt)}
 if(b.state==='stamp_fall'){b.y+=b.vy*dt;const gy=19*TS;if(b.y>=gy){b.y=gy;b.vy=0;b.state='recover';b.t=0;b.rec=.85;b.landT=.36;SFX.stamp();shake=8;splats.push({x:b.x-12,y:gy,w:24,col:'#c8302a',life:5});
   for(const d of[-1,1])eproj({kind:'wave',x:b.x+d*10,y:gy,vx:d*210*sp,vy:0,r:6,dmg:15,life:2,col:'#e8483a'});if(Math.abs(dx)<24)hurtPlayer(22,sign(dx)||1,b);
   if(b.phase>=2&&b.minions<4&&enemies.filter(e=>e.minion).length<2){b.minions++;spawnEnemy({type:'crumple',x:clamp(b.x+pick([-80,80]),LV.arenaX+40,LV.arenaX+LV.arenaW-40),y:gy},true)}}}
 else if(!['stamp_up','stamp_hover','tele','dive_up','dive_hover','dive_fall'].includes(b.state)){b.drop=b.kind!=='pd';moveBody(b,dt)}// 主美和老板穿过单向平台落回地面，免得卡在高台上
 b.x=clamp(b.x,LV.arenaX+3*TS,LV.arenaX+LV.arenaW-2*TS);
 // 接触伤害
 // 被动碰撞伤害只在冲撞类动作里生效；平时贴身不扣血，贴脸交给近身反击来惩罚
 if(['dash','belly','brush','fdash'].includes(b.state)&&b.alpha>.5&&b.contactCd<=0&&Math.abs(dx)<b.w/2+P.w/2&&P.y>b.y-b.h&&P.y-P.h<b.y){if(hurtPlayer(BOSSDEF[b.kind].contact,sign(dx)||1,b))b.contactCd=.65}}
function bossDie(){const b=boss;if(b.state==='dead')return;b.hp=0;b.state='dead';b.t=0;slowmo=.25;slowT=.9;SFX.boom();shake=10;hitstop=.2;toast(b.name.split(' · ')[0]+'：'+BOSSDEF[b.kind].dead,3000);$('bossbar').classList.remove('show');for(const e of enemies)if(e.minion)e.hp=0}
function bossGone(){const b=boss;burst(b.x,b.y-b.h/2,60,['#ffd84a','#fff','#d8584a','#7fd8ff'],320,.8,3,200);for(let i=0;i<20;i++)pickups.push({k:'cell',x:b.x,y:b.y-20,vx:rnd(-160,160),vy:rnd(-300,-100)});
 pickups.push({k:'door',x:LV.exitX,y:19*TS,open:true});dropBP(b.x,b.y-20);boss=null;G.bossDone=true;Snd.play(LV.th.song);SFX.win();banner(LV.floor<3?'本层通关！去右边的门':LV.floor===3?'老板被说服了！去下班吧':'刘敬阳认可了你！去下班吧',LV.floor===3?'……那部货梯，好像能上天台？':'',3200);
 if(LV.floor===3){const lx=LV.arenaX+14*TS;LV.decor.push({k:'elevator',x:lx-20,y:19*TS-64,gy:19*TS,s:0,lift:1});pickups.push({k:'gymlift',x:lx,y:19*TS})}
 if(LV.floor===4){SAVE.ljy=(SAVE.ljy||0)+1;saveGame()}}
function drawBossExtras(cx,cy){const b=boss;if(!b)return;
 if(b.state==='stagger'){const x=R(b.x-cx),y=R(b.y-cy-b.h-8);for(let i=0;i<3;i++){const a=b.anim*5+i*2.1;px(x+Math.cos(a)*10-1,y+Math.sin(a)*3-1,3,3,'#ffd84a');px(x+Math.cos(a)*10,y+Math.sin(a)*3,1,1,'#fff')}}
 if(b.state==='roar'){ctx.globalAlpha=Math.max(0,.5-b.t*.5);pring(R(b.x-cx),R(b.y-cy-b.h/2),R(20+b.t*120),'#ff5a4a',2);ctx.globalAlpha=1}
 if(b.state==='dive_hover'||b.state==='dive_fall'){const gy=19*TS-cy,x=R(b.x-cx);ctx.globalAlpha=.35+.25*Math.sin(b.anim*30);px(x-28,gy-3,56,3,'#ff8a2a');ctx.globalAlpha=1;pnum('!',x,gy-24,'#ff5a4a',2)}
 if(b.state==='stamp_hover'||b.state==='stamp_fall'){const gy=19*TS-cy,x=R(b.x-cx);ctx.globalAlpha=.35+.25*Math.sin(b.anim*30);px(x-16,gy-3,32,3,'#ff3a3a');ctx.globalAlpha=1;pnum('!',x,gy-24,'#ff5a4a',2)}
 if(['dash_wind','sweep_wind','shove_wind','belly_wind','brush_wind','curl_wind','fdash_wind','upper_wind'].includes(b.state)&&Math.floor(b.anim*14)%2===0)pnum('!',R(b.x-cx),R(b.y-cy-b.h-14),'#ff5a4a',2)}
// ===== 隐藏 Boss：刘敬阳（天台健身房）=====
// 一阶段中山装：扔方块、雕刻笔刷、哑铃；二阶段炎龙铠甲：烈焰冲刺、龙炎吐息、烈焰柱、炎龙天降、升龙拳；三阶段加天火
function ljyChoose(b,dist,prev){let s;
 if(b.phase===1){const o=dist>150?['cube','cube','bell','brush_wind']:['brush_wind','slam','cube','bell'];s=pick(o);if(b.seq%4===0)s='slam'}
 else{const o=dist>150?['fdash_wind','breath','pillars','dive_up','pillars']:['fdash_wind','breath','pillars','dive_up','upper_wind'];s=pick(o);if(b.phase>=3&&b.seq%3===0)s='meteor'}
 if(s===prev)s=b.phase===1?pick(['cube','brush_wind','bell']):pick(['fdash_wind','pillars','breath']);return s}
const LJY_NEAR={1:['curl_wind','slam','brush_wind'],2:['upper_wind','breath','fdash_wind']};
function ljyFireTrail(x){projs.push({kind:'fireg',from:'x',x,y:19*TS,r:9,t:0,life:2.4,dmg:9})}
function ljyUpdate(b,dt,dx,sp){const gy=19*TS,AX0=LV.arenaX+3*TS,AX1=LV.arenaX+LV.arenaW-2*TS;let grav=true;
 if(b.armor&&Math.random()<.4)part(b.x+rnd(-14,14),b.y-rnd(10,b.h),rnd(-20,20),-rnd(40,90),pick(['#ff8a2a','#ffd84a','#c8281e']),.4,2,-60);
 const done=(idle)=>{b.thrown=false;b.state='idle';b.t=0;b.idleT=idle};
 switch(b.state){
 // ---- 一阶段：中山装 ----
 case 'cube':b.vx=0;b.face=sign(dx)||b.face;if(b.t>.45&&!b.thrown){b.thrown=true;SFX.throw();for(let i=0;i<3;i++){const vy=-300-i*50,g=760,h=66-7,T=(-vy+Math.sqrt(vy*vy+2*g*h))/g,x0=b.x+b.face*12,tx=P.x+(i-1)*44+P.vx*.3;eproj({kind:'cube',x:x0,y:b.y-66,vx:(tx-x0)/T,vy,grav:g,r:7,dmg:16,life:4,breakable:true})}}if(b.t>1.15)done(.5);break;
 case 'bell':b.vx=0;b.face=sign(dx)||b.face;if(b.t>.4&&!b.thrown){b.thrown=true;SFX.throw();eproj({kind:'bell',x:b.x+b.face*20,y:b.y-40,vx:b.face*340,vy:0,r:9,dmg:18,life:3,owner:b,pierce:true})}if(b.t>1.3)done(.45);break;
 case 'brush_wind':b.vx=0;b.face=sign(dx)||b.face;if(b.t<.05)SFX.warn();if(b.t>.5/sp){b.state='brush';b.t=0;b.bx0=b.x;SFX.heavy()}break;
 case 'brush':b.vx=b.face*330*sp;if(Math.random()<.9)part(b.x-b.face*10,gy-2,-b.face*rnd(20,60),-rnd(10,50),pick(['#e8783a','#c8955a','#ffb84a']),.35,2,200);
  if(b.t>.42||b.hitWall){const x0=Math.min(b.bx0,b.x),x1=Math.max(b.bx0,b.x);projs.push({kind:'zone',style:'clay',x0:x0-6,x1:x1+6,y:gy,t:0,warn:.35,dur:.45,dmg:16,life:3});b.state='recover';b.t=0;b.rec=.6}break;
 case 'curl_wind':b.vx=0;b.face=sign(dx)||b.face;if(b.t>(b.phase>=3?.3:.38)){b.state='curl';b.t=0;SFX.heavy();shake=Math.max(shake,4)}break;
 case 'curl':{b.vx=0;const ax=(P.x-b.x)*b.face;if(!b.hitDone&&ax>-12&&ax<58&&Math.abs((P.y-17)-(b.y-40))<50){if(hurtPlayer(24,b.face,b)){P.vx=b.face*180;P.vy=-400}b.hitDone=true}if(b.t>.3){b.hitDone=false;b.state='recover';b.t=0;b.rec=.55}break}
 case 'slam':if(b.t<.32){b.vx=0}else if(!b.jumped){b.jumped=true;b.vy=-540;b.vx=clamp(dx/0.95,-280,280);SFX.jump()}else if(b.onGround&&b.t>.45){b.jumped=false;SFX.stamp();shake=7;b.landT=.36;for(const d of[-1,1])eproj({kind:'wave',x:b.x+d*16,y:b.y,vx:d*210*sp,vy:0,r:6,dmg:16,life:2,col:'#9aa0a8'});burst(b.x,b.y-4,16,['#9aa0a8','#fff'],180,.4);if(Math.abs(dx)<36)hurtPlayer(24,sign(dx)||1,b);b.state='recover';b.t=0;b.rec=.8}break;
 // ---- 变身 ----
 case 'transform':b.vx=0;b.face=sign(dx)||b.face;if(Math.random()<.9)part(b.x+rnd(-20,20),b.y-rnd(0,b.h),rnd(-40,40),-rnd(60,160),pick(['#ff8a2a','#ffd84a','#c8281e','#fff']),.5,3,-40);
  if(b.t>.9&&!b.armor){b.armor=true;b.h=72;b.w=28;b.flash=.3;SFX.boom();shake=9;hitstop=Math.max(hitstop,.12);slowmo=.3;slowT=.55;flashRed=.35;banner('炎龙铠甲','合 体 ！',1600);$('bossname').textContent='炎龙铠甲 · 刘敬阳';$('bossname').classList.add('flame');burst(b.x,b.y-34,50,['#ff8a2a','#ffd84a','#c8281e','#fff'],320,.7,3,0);ringFx(b.x,b.y-34,'#ff8a2a');if(Math.abs(P.x-b.x)<120&&!P.dead){P.vx=sign(P.x-b.x||1)*300;P.vy=-240}}
  if(b.t>1.8)done(.3);break;
 // ---- 二阶段：炎龙铠甲 ----
 case 'fdash_wind':b.vx=0;b.face=sign(dx)||b.face;if(b.t<.05)SFX.warn();if(Math.random()<.6)part(b.x-b.face*10,b.y-rnd(0,30),-b.face*60,-20,'#ff8a2a',.3,2,0);if(b.t>.48/sp){b.state='fdash';b.t=0;b.trailX=b.x;SFX.heavy()}break;
 case 'fdash':b.vx=b.face*430*sp;if(Math.abs(b.x-b.trailX)>16){b.trailX=b.x;ljyFireTrail(b.x)}if(Math.random()<.9)part(b.x-b.face*12,b.y-rnd(10,50),-b.face*rnd(60,140),rnd(-30,30),pick(['#ff8a2a','#ffd84a']),.3,2,0);
  if(b.t>.5||b.hitWall){if(b.hitWall){shake=5;SFX.stamp()}b.dashN=(b.dashN||0)+1;if(b.phase>=3&&b.dashN<2){b.state='fdash_wind';b.t=.22;b.face=sign(dx)||-b.face}else{b.dashN=0;b.state='recover';b.t=0;b.rec=.6}}break;
 case 'breath':{b.vx=0;if(b.t<.55){b.face=sign(dx)||b.face;if(b.t<.05){SFX.warn();toast('龙炎吐息！',900)}if(Math.random()<.6)part(b.x+b.face*20,b.y-64,b.face*20,-10,'#ffd84a',.25,2,0)}
  else if(b.t<1.5){b.breathT=(b.breathT||0)-dt;if(b.breathT<=0){b.breathT=.05;const k=(b.t-.55)/.95,ang=(b.phase>=3?-.35+k*.75:-.15+k*.45)+rnd(-.08,.08);SFX.shoot&&Math.random()<.2&&SFX.shoot();eproj({kind:'fireball',x:b.x+b.face*22,y:b.y-64,vx:b.face*Math.cos(ang)*280,vy:Math.sin(ang)*280+60,r:5,dmg:10,life:1})}}
  else done(.5);break}
 case 'pillars':b.vx=0;b.face=sign(dx)||b.face;if(b.t<.05){SFX.warn();toast('烈焰柱！',900);const n=b.phase>=3?7:5,dir=b.face;for(let i=0;i<n;i++){const x=b.x+dir*(46+i*42);if(x>AX0-20&&x<AX1+20)projs.push({kind:'pillar',from:'x',x,y:gy,t:-i*.16,warn:.5,w:22,hgt:96,dmg:18,life:4})}
   if(b.phase>=3)for(let i=0;i<3;i++)projs.push({kind:'pillar',from:'x',x:clamp(P.x+(i-1)*70,AX0,AX1),y:gy,t:-.6-i*.12,warn:.5,w:22,hgt:96,dmg:18,life:4})}
  if(b.t>1.6)done(.5);break;
 case 'dive_up':b.vx=0;grav=false;if(b.t<.28){if(Math.random()<.7)part(b.x+rnd(-10,10),b.y-2,rnd(-40,40),-rnd(20,60),'#ff8a2a',.3,2,0)}else{b.vy=-900;b.y+=b.vy*dt;if(b.y<-90){b.state='dive_hover';b.t=0;b.y=-90}}break;
 case 'dive_hover':grav=false;b.vy=0;b.x=lerp(b.x,clamp(P.x,AX0,AX1),.1);if(b.t>.85/sp){b.state='dive_fall';b.t=0;b.vy=300}break;
 case 'dive_fall':grav=false;b.vy=1100;b.y+=b.vy*dt;if(b.y>=gy){b.y=gy;b.vy=0;SFX.boom();shake=9;b.landT=.4;burst(b.x,gy-10,40,['#ff8a2a','#ffd84a','#c8281e','#fff'],300,.6,3,200);
   if(Math.abs(P.x-b.x)<62&&P.y>gy-60)hurtPlayer(28,sign(P.x-b.x)||1,b);for(let i=-3;i<=3;i++)if(i)ljyFireTrail(b.x+i*20);for(const d of[-1,1])eproj({kind:'wave',x:b.x+d*16,y:gy,vx:d*230*sp,vy:0,r:6,dmg:16,life:2,col:'#ff8a2a'});b.state='recover';b.t=0;b.rec=.85}break;
 case 'upper_wind':b.vx=0;b.face=sign(dx)||b.face;if(Math.random()<.7)part(b.x+b.face*10,b.y-20,0,-80,'#ff8a2a',.3,2,0);if(b.t>(b.phase>=3?.3:.36)){b.state='upper';b.t=0;b.vy=-560;b.vx=b.face*120;SFX.heavy();shake=Math.max(shake,4)}break;
 case 'upper':{if(Math.random()<.9)part(b.x+rnd(-8,8),b.y-rnd(0,40),rnd(-30,30),60,pick(['#ff8a2a','#ffd84a']),.3,2,0);const ax=(P.x-b.x)*b.face;if(!b.hitDone&&ax>-14&&ax<52&&P.y>b.y-b.h-30&&P.y-P.h<b.y+10){if(hurtPlayer(26,b.face,b)){P.vx=b.face*160;P.vy=-420}b.hitDone=true}
  if(b.t>.2&&b.onGround){b.hitDone=false;b.vx=0;SFX.stamp();shake=4;b.landT=.3;b.state='recover';b.t=0;b.rec=.55}break}
 case 'meteor':b.vx=0;b.face=sign(dx)||b.face;if(b.t<.05){toast('天火！',1000);SFX.boss();const n=10,xs=[P.x];for(let i=1;i<n;i++)xs.push(AX0+Math.random()*(AX1-AX0));xs.forEach((x,i)=>projs.push({kind:'drop',from:'x',x,gy,y:-999,t:-i*.11,warn:.7,dmg:16,img:'fire',life:6,isProj:true}))}
  if(b.t>1.5)done(.5);break;
 }
 return grav}
// ===== 刘敬阳变身演出 =====
// 火焰龙卷（分前后两层，包住 Boss）、龙影（变身合体那一下和三阶段龙魂爆发）、四周压暗 + 聚光
function ljyCineK(b){if(!b||b.kind!=='ljy')return 0;if(b.state==='transform')return Math.min(1,b.t/.35)*(b.t>1.5?Math.max(0,1-(b.t-1.5)/.3):1);if(b.state==='roar'&&b.phase>=3)return Math.min(1,b.t/.2)*Math.max(0,1-Math.max(0,b.t-.7)/.3);return 0}
function drawLjyTornado(b,cx,cy,front){if(!b||b.kind!=='ljy'||b.state!=='transform')return;const x=R(b.x-cx),gy=R(b.y-cy),t=b.t,k=Math.min(1,t/.3)*(t>1.45?Math.max(0,1-(t-1.45)/.35):1);if(k<=0)return;
 const sp=front?'fx_ljy_tornado_front':'fx_ljy_tornado_back';if(useSpr&&sprReady(sp)){ctx.globalAlpha=k;sprFrame(sp,Math.floor(t*12),x,gy,1);ctx.globalAlpha=1;return}
 const H=130*Math.min(1,t/.5),cols=['#ffd84a','#ff8a2a','#e8483a','#c8281e'];
 if(!front){ // 中心火柱的光
  for(let r=0;r<3;r++){ctx.globalAlpha=k*(.18+r*.08);const w=R(46-r*12);px(x-w/2,R(gy-H),w,R(H),r===2?'#fff2a0':r===1?'#ffb84a':'#ff5a2a')}
  ctx.globalAlpha=k*.6;px(x-44,gy-4,88,4,'#ff8a2a');px(x-30,gy-6,60,2,'#ffd84a')}
 // 4 股火焰螺旋缠绕上升，按前后分层
 for(let sI=0;sI<4;sI++)for(let i=0;i<34;i++){const h=i/33,a=t*9+sI*Math.PI/2+h*7,z=Math.cos(a);if((z>0)!==front)continue;const rad=14+h*26+3*Math.sin(t*14+i),xx=x+Math.sin(a)*rad,yy=gy-h*H,sz=R(2+(1-h)*4+(front?1:0));
  ctx.globalAlpha=k*(front?.85:.6)*(1-h*.4);px(R(xx-sz/2),R(yy-sz/2),sz,sz+1,cols[Math.min(3,Math.floor(h*3.2+(i%2)*.5))])}
 // 火星
 for(let i=0;i<10;i++){const a=t*6+i*2.4,h=((t*.9+i*.13)%1);if((Math.cos(a)>0)!==front)continue;ctx.globalAlpha=k*(1-h);px(R(x+Math.sin(a)*(20+h*40)),R(gy-h*H*1.2),2,2,'#fff2a0')}
 ctx.globalAlpha=1}
function drawLjyDragon(b,cx,cy){if(!b||b.kind!=='ljy')return;let t0;if(b.state==='transform'&&b.t>.85)t0=b.t-.85;else if(b.state==='roar'&&b.phase>=3)t0=b.t;else return;
 const k=Math.min(1,t0/.25)*Math.max(0,1-Math.max(0,t0-.65)/.35);if(k<=0)return;const x=R(b.x-cx),gy=R(b.y-cy),f=b.face||1,rise=Math.min(1,t0/.45);
 if(useSpr&&sprReady('fx_ljy_dragon')){ctx.globalAlpha=k;sprFrame('fx_ljy_dragon',Math.min(sprN('fx_ljy_dragon')-1,Math.floor(t0*10)),x,gy,f);ctx.globalAlpha=1;return}
 // 程序画：火龙从脚下盘旋而上，身体由尾到颈逐渐变粗，背上有金色背鳍，头在 Boss 头顶上方回望
 const N=40,pts=[];for(let i=0;i<N;i++){const h=i/(N-1),yy=gy-6-h*128*rise,xx=x+Math.sin(h*6.5-b.anim*3)*(40-h*22)*f;pts.push([xx,yy,h])}
 for(let i=0;i<N;i++){const [xx,yy,h]=pts[i],r=1.5+h*6;ctx.globalAlpha=k*.5;pcirc(R(xx),R(yy),R(r+2),'#7a1410');ctx.globalAlpha=k*.85;pcirc(R(xx),R(yy),R(r),h>.3&&i%4<2?'#ff8a2a':'#e8483a');ctx.globalAlpha=k;px(R(xx-r*.4),R(yy-r*.6),R(Math.max(1,r*.6)),1,'#ffd84a');
  if(i%4===0&&i>4){const [nx,ny]=pts[Math.min(N-1,i+1)],dx=nx-xx,dy=ny-yy,l=Math.hypot(dx,dy)||1,ox=-dy/l*f,oy=dx/l*f;pline(R(xx),R(yy),R(xx+ox*(r+5)),R(yy+oy*(r+5)-3),1,'#f2c14e')}}
 const [hx,hy]=pts[N-1];ctx.globalAlpha=k;
 // 鬃毛火焰
 for(let i=0;i<6;i++){const a=-1.2+i*.35+Math.sin(b.anim*12+i)*.15;pline(R(hx),R(hy),R(hx-f*Math.cos(a)*16),R(hy+Math.sin(a)*14-4),2,i%2?'#ffd84a':'#ff8a2a')}
 // 头：长吻、下颚、龙角、发光的眼
 pcirc(R(hx),R(hy),9,'#7a1410');pcirc(R(hx),R(hy),8,'#e8483a');px(R(hx),R(hy-4),f*14,6,'#e8483a');px(R(hx+f*2),R(hy-5),f*12,2,'#ff8a2a');px(R(hx+f*1),R(hy+3),f*12,3,'#c8281e');px(R(hx+f*13),R(hy-4),f*2,3,'#14121a');
 const open=Math.max(0,Math.sin(t0*9));px(R(hx+f*3),R(hy+2),f*10,R(1+open*3),'#ffd84a');
 px(R(hx+f*2),R(hy-7),3,3,'#fff2a0');px(R(hx+f*3),R(hy-6),1,1,'#ff3a1a');
 pline(R(hx-f*2),R(hy-7),R(hx-f*14),R(hy-20),2,'#f2c14e');pline(R(hx-f*1),R(hy-8),R(hx-f*8),R(hy-23),2,'#f2c14e');
 pline(R(hx+f*14),R(hy),R(hx+f*20),R(hy-4),1,'#ffd84a');pline(R(hx+f*14),R(hy+2),R(hx+f*21),R(hy+6),1,'#ffd84a');ctx.globalAlpha=1}
function drawLjyCine(cx,cy){const b=boss,k=ljyCineK(b);if(k<=0)return;const x=b.x-cx,y=b.y-cy-40;
 const g=ctx.createRadialGradient(x,y,40,x,y,170);g.addColorStop(0,'rgba(10,4,8,0)');g.addColorStop(.55,`rgba(10,4,8,${.45*k})`);g.addColorStop(1,`rgba(10,4,8,${.85*k})`);ctx.fillStyle=g;ctx.fillRect(0,0,VW,VH)}
