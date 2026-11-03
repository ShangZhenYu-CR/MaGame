// ===== 武器定义 =====
const WEAPONS={
 stylus:{name:'雕刻笔',slot:1,desc:'快速三连击，第三下暴击',col:'#ffb84a',ink:['#ffb84a','#e8783a','#fff0c8'],
  combo:[{dmg:9,su:.05,ac:.07,re:.13,rng:24,hh:20,arc:[2.3,.5],kb:70,lunge:50},{dmg:9,su:.04,ac:.07,re:.13,rng:24,hh:20,arc:[.4,2.5],kb:70,lunge:50},{dmg:17,su:.08,ac:.09,re:.24,rng:28,hh:24,arc:[2.9,.1],kb:180,lunge:90,crit:1}]},
 marker:{name:'布尔锤',slot:1,desc:'又慢又重，大范围横扫；打晕眩、减速、灼烧中的敌人必暴击',col:'#9fd8ff',ink:['#9fd8ff','#5a8ad8','#e8f4ff'],
  combo:[{dmg:26,su:.15,ac:.1,re:.24,rng:32,hh:30,arc:[3.0,.2],kb:230,lunge:30,heavy:1},{dmg:38,su:.2,ac:.12,re:.34,rng:36,hh:34,arc:[.1,3.1],kb:300,lunge:40,heavy:1,crit:1}]},
 ruler:{name:'挤出长枪',slot:1,desc:'长距离突刺，贯穿多个敌人；尖端命中必暴击',col:'#ff9a4a',ink:['#ff9a4a','#fff2c0','#3a8ad8'],
  combo:[{dmg:13,su:.08,ac:.08,re:.15,rng:46,hh:8,thrust:1,kb:110,lunge:70},{dmg:13,su:.07,ac:.08,re:.15,rng:46,hh:8,thrust:1,kb:110,lunge:70},{dmg:24,su:.12,ac:.1,re:.26,rng:54,hh:10,thrust:1,kb:200,lunge:120,crit:1}]},
 knife:{name:'切线刀',slot:1,desc:'极快四连击，攻击距离短；打灼烧中的敌人必暴击',col:'#7ff0e0',ink:['#7ff0e0','#2ab8a8','#e0fffa'],
  combo:[{dmg:6,su:.03,ac:.05,re:.08,rng:19,hh:18,arc:[2.0,.8],kb:40,lunge:40},{dmg:6,su:.03,ac:.05,re:.08,rng:19,hh:18,arc:[.8,2.2],kb:40,lunge:40},{dmg:7,su:.03,ac:.05,re:.09,rng:20,hh:18,arc:[2.4,.6],kb:50,lunge:50},{dmg:13,su:.05,ac:.06,re:.2,rng:22,hh:22,arc:[2.9,.2],kb:150,lunge:80,crit:1}]},
 palette:{name:'变换轴',slot:2,desc:'回旋镖，飞出去再飞回来',cd:1.1},
 airbrush:{name:'植被笔刷',slot:2,desc:'近距离刷出带刺植被，持续伤害并缠绕敌人',cd:2.6},
 eraser:{name:'Ctrl+Z',slot:2,desc:'撤销：格挡并弹回子弹；成功时找回刚损失的血',cd:1.6},
 inkbomb:{name:'熔岩材质球',slot:2,desc:'抛出后碎成一滩熔岩，持续灼烧',cd:3.2},
 boxcol:{name:'碰撞体方块',slot:2,desc:'在面前放一个碰撞体：挡子弹、挡怪，还能站上去',cd:6.5},
 turret:{name:'预制体炮台',slot:2,desc:'放下一个自动射击的炮台，持续 9 秒',cd:11},
 // ---- 新武器 ----
 whip:{name:'法线鞭',slot:1,desc:'中距离横扫，命中范围内所有敌人；第三下把敌人拽到身边并缠住',col:'#7fd8ff',ink:['#7fd8ff','#3a8ad8','#e8f8ff'],
  combo:[{dmg:10,su:.07,ac:.08,re:.16,rng:58,hh:26,arc:[2.6,.4],kb:40,lunge:15},{dmg:10,su:.07,ac:.08,re:.16,rng:58,hh:26,arc:[.4,2.6],kb:40,lunge:15},{dmg:15,su:.1,ac:.1,re:.28,rng:64,hh:30,arc:[2.9,.2],kb:-170,lunge:20,crit:1,pull:1}]},
 shears:{name:'剪切刀',slot:1,desc:'两下快剪；同一个敌人被剪中 3 次触发“剪切”爆发伤害',col:'#ff7ab0',ink:['#ff7ab0','#d83a7a','#ffe0ee'],
  combo:[{dmg:7,su:.03,ac:.05,re:.1,rng:22,hh:18,arc:[2.2,.6],kb:30,lunge:40,cut:1},{dmg:8,su:.03,ac:.05,re:.13,rng:24,hh:18,arc:[.6,2.4],kb:60,lunge:50,cut:1}]},
 render:{name:'渲染大剑',slot:1,desc:'又慢又重；按住攻击键蓄力，松开打出大范围重斩（必暴击、直接破防）',col:'#ffd84a',ink:['#ffd84a','#ff9a3a','#fff6c0'],
  combo:[{dmg:22,su:.16,ac:.1,re:.3,rng:40,hh:32,arc:[3.0,.1],kb:200,lunge:40,heavy:1},{dmg:28,su:.18,ac:.12,re:.36,rng:42,hh:34,arc:[.2,3.0],kb:240,lunge:40,heavy:1}],
  charged:{dmg:72,su:.04,ac:.14,re:.4,rng:58,hh:46,arc:[3.1,.1],kb:360,lunge:120,heavy:1,crit:1,charged:1}},
 eyedrop:{name:'吸管工具',slot:2,desc:'把面前最近的敌人吸到身边并晕住 1 秒（对 Boss 只造成伤害）',cd:4.5},
 keyframe:{name:'关键帧',slot:2,desc:'第一次按下记录位置，6 秒内再按瞬移回来，瞬移瞬间无敌',cd:7},
 array:{name:'阵列修改器',slot:2,desc:'一次射出 3 发扇形弹幕',cd:2.6}};
const PRIM=['stylus','marker','ruler','knife','whip','shears','render'],SECN=['palette','airbrush','eraser','inkbomb','boxcol','turret','eyedrop','keyframe','array'];
const BAG_MAX=3;
const AFF={bleed:{n:'灼烧',d:'击中附加灼烧（持续伤害）',s:[1,2]},slow:{n:'缠绕',d:'击中附加缠绕（减速）',s:[1,2]},critc:{n:'灵光',d:'暴击率 +15%',s:[1]},elite:{n:'甲方克星',d:'对精英和 Boss 伤害 +35%',s:[1,2]},speed:{n:'手速',d:'攻击速度 +15%',s:[1]},steal:{n:'回本',d:'击败敌人回复 3 生命',s:[1]},cd:{n:'快捷键',d:'冷却 -25%',s:[2]},double:{n:'加量',d:'多放一次 / 持续更久',s:[2]}};
const NAMES={crumple:'穿模怪',sticky:'便签',printer:'打印机',bug:'Bug',popup:'报错弹窗',kpi:'KPI 表',firewall:'防火墙',invite:'会议邀请',spray:'喷漆罐',merge:'合并冲突',pm:'项目经理'};
const KIND_NAME={drop:'从天而降的东西',ebomb:'甩过来的锅',paper:'打印机的废纸',x:'报错弹窗',wave:'冲击波',note:'主美的修改意见',doc:'制作人的需求文档',pie:'老板的饼',bigpie:'老板的大饼',kpi:'KPI 柱',laser:'上线前的新功能',zone:'需求变更'};
function wname(id,lv){return WEAPONS[id].name+(lv?' +'+lv:'')}
function rollAff(slot,n){const pool=Object.keys(AFF).filter(k=>AFF[k].s.includes(slot)),out=[];while(out.length<n&&pool.length)out.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);return out}
function hasAff(slot,k){return (slot===1?P.primAff:P.secAff||[]).includes(k)}
function secCd(){return WEAPONS[P.sec].cd*P.cdMul*Math.max(.6,1-.05*P.stat.color)*(hasAff(2,'cd')?.75:1)}
function hasU(id){return P.upg&&P.upg.includes(id)}
function flowMul(){const f=P.flow||0;return f>=50?1.3:f>=25?1.2:f>=10?1.1:1}
function applyStatus(e,k){if(e.hp<=0)return;if(k==='bleed'){e.bleedT=3;e.bleedDps=Math.min(18,(e.bleedDps||0)+6)}else if(k==='slow')e.slowT=2.5}
function tickStatus(e,dt){if(e.slowT>0)e.slowT-=dt;if(e.bleedT>0){e.bleedT-=dt;e.bleedAcc=(e.bleedAcc||0)+dt;if(e.bleedAcc>=.5){e.bleedAcc-=.5;damage(e,e.bleedDps*.5,0,0,false,true,'dot')}if(e.bleedT<=0)e.bleedDps=0}}
// ===== 玩家 =====
const P={};
function resetPlayer(keep){Object.assign(P,{x:6*TS,y:19*TS,w:10,h:34,vx:0,vy:0,face:1,onGround:true,drop:false,dropT:0,coyote:0,buffer:0,jumps:0,rollT:0,rollCd:0,inv:0,hurtT:0,cut:false,
 atk:null,combo:0,comboT:0,skillCd:0,parryT:0,sprayT:0,healT:0,anim:0,blinkT:2,stepT:0,dead:false,landT:0,rally:0,rallyT:0,rootT:0,dive:false,lastHit:'',rollBuf:0,rollEnd:-9,airStall:false,mantle:null,pdT:0,pdUsed:false,atkQueued:0,chargeT:0,kfMark:null,backupUsed:false,swapBuff:0,swapCd:0,healCd:0});
 if(!keep)Object.assign(P,{hp:100,maxHp:100,flasks:2,maxFlasks:2,prim:'stylus',sec:'palette',primLv:0,primAff:[],secLv:0,secAff:[],primBag:[{w:'stylus',lv:0,aff:[]}],secBag:[{w:'palette',lv:0,aff:[]}],primIdx:0,secIdx:0,stat:{line:0,color:0,body:0},cells:0,dmgMul:1,spdMul:1,rollMul:1,cdMul:1,airJumps:1,steal:0,critMul:1.5,upg:[]})}
const RUN=150,ACC=1800,AACC=1100,GRAV=1350,JV=420,DJV=410,MAXF=520,ROLLV=290,ROLLT=.3;
function playerUpdate(dt){
 P.anim+=dt;P.stickT-=dt;P.swapBuff-=dt;P.swapCd-=dt;P.healCd-=dt;P.djT=(P.djT||0)-dt;if(P.diveLandT>0)P.diveLandT-=dt;P.inv-=dt;P.hurtT-=dt;P.rollCd-=dt;P.skillCd-=dt;P.comboT-=dt;P.dropT-=dt;P.landT-=dt;if(P.dropT<=0)P.drop=false;P.parryT-=dt;
 P.blinkT-=dt;if(P.blinkT<-.12)P.blinkT=rnd(2,4);
 P.rootT-=dt;const rooted=P.rootT>0;if(P.flowT>0){P.flowT-=dt;if(P.flowT<=0)P.flow=0}if(rooted&&Math.random()<.3)part(P.x+rnd(-8,8),P.y-rnd(10,26),0,-20,'#3a6ad8',.4,2,-20);
 if(P.rally>0){P.rallyT-=dt;if(P.rallyT<=0)P.rally=Math.max(0,P.rally-24*dt);P.rally=Math.min(P.rally,P.maxHp-P.hp)}
 // 武器轮盘打开时：只保留重力，不响应操作
 if(G.wheel){P.vy=Math.min(MAXF,P.vy+GRAV*dt);P.vx*=.85;moveBody(P,dt);return}
 const ix=rooted?0:(down('right')?1:0)-(down('left')?1:0);
 if(P.kfMark){P.kfMark.t-=dt;if(P.kfMark.t<=0){P.kfMark=null;if(P.sec==='keyframe'){P.skillCd=Math.max(P.skillCd,1)}}}
 if(P.pdT>0){P.pdT-=dt;if(Math.random()<.5)part(P.x+rnd(-6,6),P.y-rnd(4,26),0,-30,pick(['#ffd84a','#fff']),.35,1,-20)}
 // 攀边
 if(P.mantle){const m=P.mantle;m.t+=dt;const k=Math.min(1,m.t/.17);P.y=lerp(m.y0,m.y1,Math.min(1,k*1.7));P.x=lerp(m.x0,m.x1,Math.max(0,(k-.35)/.65));P.vx=0;P.vy=0;if(k>=1){P.mantle=null;P.onGround=true;P.landT=.08;P.jumps=P.airJumps;P.airStall=false}return}
 // 回血
 if(P.healT>0){P.healT-=dt;P.hp=Math.min(P.maxHp,P.hp+P.maxHp*.5*dt/.45);P.vx*=.8;if(Math.random()<.5)part(P.x+rnd(-6,6),P.y-rnd(4,24),0,-40,'#7af07a',.5,2,-50);moveBody(P,dt);return}
 // 翻滚
 if(pressed('roll'))P.rollBuf=.15;else P.rollBuf-=dt;
 if(P.rollBuf>0&&P.rollCd<=0&&P.rollT<=0){if(P.atk&&P.atk.phase!=='re'&&P.atk.t<P.atk.def.su*.6){}else{P.rollBuf=0;P.pdUsed=P.inv>0;P.atk=null;P.rollT=ROLLT;P.inv=Math.max(P.inv,.26+(P.rollMul<1?.06:0));P.rollCd=.55*P.rollMul;if(ix)P.face=ix;SFX.roll();burst(P.x,P.y-2,6,'#cfc6b8',60,.3,2,100)}}
 if(P.rollT>0){P.rollT-=dt;if(P.rollT<=0)P.rollEnd=P.anim;P.vx=P.face*ROLLV;if(Math.random()<.6)ghosts.push({x:P.x,y:P.y,face:P.face,t:.18,roll:P.anim})}
 else{
  let mv=P.stickT>0?.5:1;if(P.atk){const d=P.atk.def;mv=P.atk.phase==='ac'?.15:d.heavy?.2:.45}if(P.sprayT>0)mv=.35;
  const tv=ix*RUN*mv,a=P.onGround?ACC:AACC;if(ix&&!P.atk&&P.sprayT<=0)P.face=ix;
  if(Math.abs(tv-P.vx)<a*dt)P.vx=tv;else P.vx+=sign(tv-P.vx)*a*dt}
 // 跳跃
 if(P.onGround){P.coyote=.1;P.jumps=P.airJumps}else P.coyote-=dt;
 if(pressed('jump'))P.buffer=.12;else P.buffer-=dt;
 if(P.buffer>0&&P.rollT<=0&&!rooted&&!P.dive){
  if(down('down')&&P.onGround&&tileAt(Math.floor(P.x/TS),Math.floor((P.y+1)/TS))===2){P.drop=true;P.dropT=.25;P.buffer=0}
  else if(P.coyote>0){P.vy=-JV;P.coyote=0;P.buffer=0;P.cut=false;P.jumpAt=P.anim;SFX.jump();burst(P.x,P.y,5,'#cfc6b8',50,.25,2,80);if(P.atk&&P.atk.phase==='re')P.atk=null}
  else if(P.jumps>0){P.jumps--;P.vy=-DJV;P.buffer=0;P.cut=true;P.djT=.3;SFX.djump();sfx('fx_djump',P.x,P.y-2,1,16);ringFx(P.x,P.y,'#7fd8ff');burst(P.x,P.y,10,['#7fd8ff','#c8f0ff','#3a8ad8'],100,.35,2,60)}}
 if(!down('jump')&&P.vy<0&&!P.cut&&P.anim-(P.jumpAt||0)>.12){P.vy*=.55;P.cut=true}
 const apex=!P.onGround&&Math.abs(P.vy)<55&&down('jump')?.55:1;
 P.vy=Math.min(MAXF,P.vy+GRAV*dt*(P.vy>0?1.15:1)*apex);
 // 攻击
 if(pressed('atk')&&!P.onGround&&down('down')&&!P.dive&&P.rollT<=0&&groundBelow(P.x,P.y)-P.y>28){P.dive=true;P.diveAt=P.anim;P.atk=null;P.atkQueued=0;P.vy=520;SFX.heavy();KP['KeyJ']=0;KP['Mouse0']=0;KP['Pad2']=0}
 if(P.dive){P.vx=0;P.vy=Math.max(P.vy,560);for(const e of targets()){if(Math.abs(e.x-P.x)<e.w/2+P.w/2&&P.y>e.y-e.h&&P.y-8<e.y){damage(e,18,P.face,0,false,false,'dive');e.state=e.isBoss?e.state:'stun';e.timer=.6;P.dive=false;P.vy=-330;P.jumps=P.airJumps;P.cut=true;hitstop=.07;shake=4;break}}}
 // 渲染大剑：按住攻击键蓄力，松开打出重斩
 if(P.prim==='render'){if(down('atk')&&!(P.atk&&P.atk.def===WEAPONS.render.charged)&&P.onGround&&P.rollT<=0&&!P.dive&&P.healT<=0){const was=P.chargeT;P.chargeT+=dt;P.vx*=.8;if(Math.random()<.4+P.chargeT)part(P.x+P.face*rnd(4,14),P.y-rnd(10,30),rnd(-20,20),-rnd(20,60),pick(['#ffd84a','#fff6c0']),.3,P.chargeT>=.55?2:1,-20);if(was<.55&&P.chargeT>=.55){SFX.select();ringFx(P.x,P.y-18,'#ffd84a')}if(Math.random()<dt*10)sfx('fx_spark',P.x+P.face*rnd(10,22),P.y-rnd(2,6),P.face,14);}
  else if(!down('atk')&&P.chargeT>0){if(P.chargeT>=.55&&!(P.atk&&P.atk.def===WEAPONS.render.charged)){const def=WEAPONS.render.charged;P.atk={def,t:0,phase:'su',hit:new Set(),idx:2};P.combo=0;P.comboT=0;P.atkQueued=0;SFX.heavy();shake=Math.max(shake,3)}P.chargeT=0}}
 if(pressed('atk')&&!P.dive)P.atkQueued=.18;else P.atkQueued=(P.atkQueued||0)-dt;
 if(P.atkQueued>0&&P.rollT<=0&&!P.dive){const can=!P.atk||(P.atk.phase==='re'&&P.atk.t>P.atk.def.re*.25);if(can){const W=WEAPONS[P.prim];if(P.comboT<=0)P.combo=0;if(ix)P.face=ix;
   let def=W.combo[P.combo%W.combo.length],idx=P.combo%W.combo.length;
   // 冲刺斩：翻滚结束 0.2 秒内出手，直接打出终结技并多冲一段
   if(P.onGround&&P.anim-P.rollEnd<.2){const fin=W.combo[W.combo.length-1];def=Object.assign({},fin,{lunge:fin.lunge*1.6+90,dash:1,su:fin.su*.6});idx=W.combo.length-1;P.combo=W.combo.length-1;P.rollEnd=-9;burst(P.x,P.y-2,8,W.ink,90,.3,2,100)}
   // 空中第一刀会短暂滞空，方便空中连段
   if(!P.onGround&&!P.airStall){P.airStall=true;P.vy=Math.min(P.vy,-60)}
   P.atk={def,t:0,phase:'su',hit:new Set(),idx};P.combo++;P.comboT=.5;P.atkQueued=0;(def.heavy||def.dash?SFX.heavy:SFX.swing)()}}
 if(P.atk){const a=P.atk,d=a.def,sp=P.spdMul*(hasAff(1,'speed')?1.15:1);a.t+=dt*sp;
  if(a.phase==='su'&&a.t>=d.su){a.phase='ac';a.t=0;P.vx+=P.face*d.lunge;atkFx(a)}
  else if(a.phase==='ac'){doHit(a);if(a.t>=d.ac){a.phase='re';a.t=0}}
  // 剪切刀每段剪两下：收招到第二次合拢那一帧再出一次剪口特效
  else if(a.phase==='re'&&P.prim==='shears'&&!a.snip2&&a.t>=d.re*.25&&!d.dash){a.snip2=1;sfx('fx_snip',P.x+P.face*(d.rng-4),P.y-20,P.face,20,{follow:1})}
  if(P.atk&&!P.onGround&&P.atk.phase!=='re'&&P.vy>40)P.vy=40;
  else if(a.phase==='re'&&a.t>=d.re){P.atk=null;if(P.combo>=WEAPONS[P.prim].combo.length)P.combo=0}}
 // 副武器
 if(pressed('skill')&&P.skillCd<=0&&P.rollT<=0)useSkill();
 if(P.sprayT>0){P.sprayT-=dt;P.sprayTick=(P.sprayTick||0)-dt;for(let i=0;i<3;i++)part(P.x+P.face*10,P.y-17,P.face*rnd(120,230),rnd(-60,40),pick(['#5ab85a','#3a8a3a','#9ad870','#2a6a2a']),.4,2,200);
  if(P.sprayTick<=0){P.sprayTick=.08;for(const e of targets())if(Math.abs(e.y-e.h/2-(P.y-15))<26&&(e.x-P.x)*P.face>0&&Math.abs(e.x-P.x)<74){damage(e,4,P.face,30,false,true,'sec');applyStatus(e,'slow')}}}
 // 回血
 if(pressed('heal')&&P.flasks>0&&P.hp<P.maxHp&&!P.atk&&P.rollT<=0){P.flasks--;P.healT=.45;SFX.heal();hud()}
 // 互动
 if(pressed('use'))interact();
 moveBody(P,dt);
 if(P.onGround&&P.dive){P.dive=false;P.landT=.22;P.diveLandT=.3;sfx('fx_dive',P.x,P.y-12,1,16);SFX.stamp();shake=Math.max(shake,5);hitstop=Math.max(hitstop,.05);for(let i=0;i<14;i++){const s=i<7?-1:1;part(P.x,P.y-2,s*rnd(60,180),-rnd(20,120),pick(WEAPONS[P.prim].ink),.4,2,300)}
  for(const e of targets())if(Math.abs(e.x-P.x)<42&&Math.abs(e.y-P.y)<30){damage(e,22,sign(e.x-P.x)||1,140,false,false,'dive');if(!e.isBoss){e.state='stun';e.timer=.7}}
  for(const k of pickups)if(k.k==='crate'&&Math.abs(k.x-P.x)<40&&Math.abs(k.y-P.y)<30)hitCrate(k,99)}
 else if(P.onGround&&P.lastAir>.25){SFX.land();sfx('fx_dust',P.x,P.y-4,P.face,16);burst(P.x,P.y,6,'#cfc6b8',70,.3,2,120);P.landT=.12}
 if(tileAt(Math.floor(P.x/TS),Math.floor((P.y-3)/TS))===3&&P.inv<=0){if(hurtPlayer(8,-P.face,null,'图钉'))P.vy=-300}
 P.lastAir=P.onGround?0:(P.lastAir||0)+dt;if(P.onGround)P.airStall=false;
 if(!P.onGround&&ix&&P.hitWall===ix)tryMantle(ix);
 if(P.onGround&&Math.abs(P.vx)>40){P.stepT-=dt;if(P.stepT<=0){P.stepT=.25;part(P.x-P.face*4,P.y-1,-P.face*20,-20,'#cfc6b8',.3,1,50)}}
 if(P.y>LV.h*TS+40){P.y=10*TS;P.x=Math.max(P.x-40,3*TS);hurtPlayer(10,0)}}
// 攀边：空中贴墙且墙顶在胸口以下，自动爬上去
function tryMantle(ix){if(P.vy<-260||P.atk||P.dive||P.rollT>0||P.healT>0||P.hurtT>0)return false;
 const fx=Math.floor((P.x+ix*(P.w/2+2))/TS),cx=Math.floor(P.x/TS);
 for(let ty=Math.floor((P.y-22)/TS);ty<=Math.floor((P.y-1)/TS);ty++){const ly=ty*TS,d=P.y-ly;if(d<1||d>22)continue;
  if(isSolid(fx,ty)&&!isSolid(fx,ty-1)&&!isSolid(fx,ty-2)&&!isSolid(fx,ty-3)&&!isSolid(cx,ty-1)&&!isSolid(cx,ty-2)&&!isSolid(cx,ty-3)){
   P.mantle={x0:P.x,y0:P.y,x1:ix>0?fx*TS+P.w/2+1:(fx+1)*TS-P.w/2-1,y1:ly,t:0};P.face=ix;P.vx=P.vy=0;P.atkQueued=0;SFX.land();burst(ix>0?fx*TS:(fx+1)*TS,ly,5,'#cfc6b8',50,.25,2,80);return true}}
 return false}
// 完美闪避：翻滚刚开始时躲过攻击，短暂子弹时间，下一刀必暴击
function perfectDodge(){sfx('fx_perfect_dodge',P.x,P.y-20,1,18);P.pdUsed=true;P.pdT=2;P.inv=Math.max(P.inv,.45);slowmo=.3;slowT=.35;SFX.parry();ringFx(P.x,P.y-14,'#ffd84a');burst(P.x,P.y-14,12,['#ffd84a','#fff'],140,.35,2,0);P.flow=(P.flow||0)+3;P.flowT=4;toast('完美闪避！下一击必暴击',1000);
 if(hasU('ghost')){burst(P.x,P.y-14,22,['#c87aff','#fff','#3a1a4a'],200,.45);shake=Math.max(shake,4);for(const e of targets())if(Math.hypot(e.x-P.x,(e.y-e.h/2)-(P.y-17))<62){damage(e,30,sign(e.x-P.x)||1,160,false,false,'sec');if(!e.isBoss&&e.hp>0){e.state='stun';e.timer=.8}}}}
const ghosts=[];
function ringFx(x,y,col){for(let i=0;i<10;i++){const a=i/10*Math.PI*2;part(x,y,Math.cos(a)*80,Math.sin(a)*30,col,.25,2,0)}}
function atkBox(a){const d=a.def,f=P.face;if(d.thrust)return{x0:P.x+(f>0?2:-d.rng),x1:P.x+(f>0?d.rng:-2),y0:P.y-18-d.hh/2,y1:P.y-18+d.hh/2};return{x0:P.x+(f>0?-4:-d.rng),x1:P.x+(f>0?d.rng:4),y0:P.y-16-d.hh/2-4,y1:P.y-16+d.hh/2+2}}
function overlapE(b,e){return b.x1>e.x-e.w/2&&b.x0<e.x+e.w/2&&b.y1>e.y-e.h&&b.y0<e.y}
function targets(){const t=enemies.filter(e=>e.hp>0);if(boss&&boss.hp>0&&boss.state!=='intro'&&boss.state!=='tele_out')t.push(boss);return t}
// 招式特效（第十批素材）：出招瞬间
// 招式特效（第十批素材）：出招瞬间放刀光，跟着马楠一起走。挥砍方向反过来的那一下上下翻转
function atkFx(a){const d=a.def,f=P.face,w=P.prim,i=a.idx||0,up=d.arc&&d.arc[1]>d.arc[0],F={follow:1};
 if(w==='whip')sfx('fx_whip_'+(Math.min(2,i)+1),P.x+f*58,P.y-30,f,22,F);// 鞭身特效左端中点是握柄，对准胸前的手
 else if(w==='ruler'){const sc=d.crit||d.dash?.75:.6;sfx('fx_extrude',P.x+f*(d.rng-14+32*sc),P.y-19,f,22,{sc,follow:1})}// 从枪尖往前挤出
 else if(w==='render'){if(d.charged)sfx('fx_render_slash',P.x+f*30,P.y-24,f,18,F);else sfx('fx_render_slash',P.x+f*22,P.y-22,f,20,{sc:.62,fy:up,follow:1})}
 else if(w==='marker'){if(d.crit){sfx('fx_marker_smash',P.x+f*30,P.y-30,f,20,F);const gy=groundBelow(P.x+f*32,P.y-8);sfx('fx_bool_crater',P.x+f*32,gy-12,f,14)}else sfx('fx_marker_sweep',P.x+f*24,P.y-22,f,20,F)}
 else if(w==='stylus'){if(!d.crit&&sprReady('fx_stylus_slash'))sfx('fx_stylus_slash',P.x+f*16,P.y-22,f,22,{fy:up,follow:1});else sfx('fx_sculpt',P.x+f*16,P.y-22,f,22,{sc:d.crit?.85:.6,fy:up,follow:1})}
 else if(w==='knife')sfx('fx_grid_slash',P.x+f*12,P.y-20,f,26,{sc:d.crit?1.15:.85,fy:i%2===1,follow:1});
 else if(w==='shears')sfx('fx_snip',P.x+f*(d.rng-4),P.y-20,f,20,F)}
// 命中特效：雕刻笔命中飞黏土（剪刀、切线刀的刀光在出招时已经放了）
function hitFx(e,w,d){const ex=e.x+rnd(-3,3),ey=e.y-e.h*.55;if(w==='stylus')sfx('fx_clay',ex,ey,P.face,20)}
function doHit(a){const b=atkBox(a),d=a.def;let any=false;
 for(const e of targets()){if(a.hit.has(e)||!overlapE(b,e))continue;a.hit.add(e);any=true;let crit=!!d.crit;
  if(!crit&&(P.pdT>0||d.dash))crit=true;
  const swap=P.swapBuff>0;if(swap)crit=true;
  if(!crit){if(P.prim==='marker'&&(e.state==='stun'||e.slowT>0||e.bleedT>0))crit=true;else if(P.prim==='knife'&&e.bleedT>0)crit=true;else if(P.prim==='ruler'&&Math.abs(e.x-P.x)>d.rng*.62)crit=true;else if(hasAff(1,'critc')&&Math.random()<.15)crit=true}
  damage(e,d.dmg*(swap&&hasU('hotkey')?1.5:1),P.face,d.kb*(swap?1.6:1),crit,false,'prim');hitFx(e,P.prim,d);if(swap){dmgNum(e.x,e.y-e.h-16,'换手斩','#7fd8ff',true);ringFx(e.x,e.y-e.h/2,'#7fd8ff')}if(hasAff(1,'bleed'))applyStatus(e,'bleed');if(hasAff(1,'slow'))applyStatus(e,'slow');
  if(d.pull&&e.hp>0){applyStatus(e,'slow');if(!e.isBoss)e.vy=Math.min(e.vy,-80)}
  if(d.cut&&e.hp>0){e.cutN=(e.cutN||0)+1;if(e.cutN>=3){e.cutN=0;SFX.crit();sfx('fx_snip_burst',e.x,e.y-e.h/2,P.face,16);burst(e.x,e.y-e.h/2,16,['#ff7ab0','#fff','#d83a7a'],200,.4);damage(e,18+6*P.primLv,P.face,80,true,false,'prim')}}
  if(d.charged&&e.hp>0){if(!e.isBoss){e.poise=0;e.state='stun';e.timer=1.1}else{e.stag=(e.stag||0)+e.stagMax*.15;if(e.stag>=e.stagMax)e.stagPend=true}}}
 for(const k of pickups)if(k.k==='crate'&&!a.hit.has(k)&&b.x1>k.x-8&&b.x0<k.x+8&&b.y1>k.y-14&&b.y0<k.y){a.hit.add(k);hitCrate(k,d.dmg)}
 for(const pr of projs)if(pr.from==='e'&&pr.breakable&&b.x1>pr.x-pr.r&&b.x0<pr.x+pr.r&&b.y1>pr.y-pr.r&&b.y0<pr.y+pr.r){pr.life=0;burst(pr.x,pr.y,6,'#fff',90,.25)}
 if(any){if(P.pdT>0)P.pdT=0;P.swapBuff=0;hitstop=Math.max(hitstop,d.crit?.09:d.heavy?.07:.045);shake=Math.max(shake,d.crit?4:d.heavy?3.5:2)}}
function damage(e,dmg,dir,kb,crit,quiet,src='prim'){if(e.hp<=0)return;if(e.dummy&&G.tut){if(src==='prim')G.tut.hits++;if(P.atk&&P.atk.def.dash)G.tut.dash=true}let mul=P.dmgMul;const big=e.elite||e.isBoss;
 if(src==='prim'||src==='dive')mul*=(1+.15*P.stat.line)*(1+.12*P.primLv)*(big&&hasAff(1,'elite')?1.35:1);else if(src==='sec')mul*=(1+.15*P.stat.color)*(1+.12*P.secLv)*(big&&hasAff(2,'elite')?1.35:1);else if(src==='dot')mul*=1+.15*P.stat.color;else if(src==='turret')mul=P.dmgMul;
 if(src!=='dot')mul*=flowMul();if(hasU('deadline')&&P.hp<P.maxHp*.35)mul*=1.45;if(e.isBoss&&e.state==='stagger')mul*=1.25;if(e.isBoss&&e.hitLog&&src!=='dot'){e.hitLog.push(T);if(e.hitLog.length>20)e.hitLog.shift()}let v=dmg*mul*(crit?P.critMul:1)*rnd(.92,1.08);
 if(e.isBoss&&src!=='dot'&&e.state!=='stagger'&&e.state!=='roar'&&e.state!=='dead'){e.stag+=v*(src==='dive'?1.6:1)*(crit?1.3:1);if(e.stag>=e.stagMax)e.stagPend=true}
 if(e.type==='firewall'&&e.state!=='tired'&&e.state!=='stun'&&src!=='dot'){const front=(src==='prim'||src==='dive')?sign(P.x-e.x)===e.face:dir===-e.face;if(front){v*=.15;SFX.select();burst(e.x+e.face*8,e.y-14,6,['#ffd84a','#fff'],120,.25);dmgNum(e.x,e.y-e.h-6,v,'#9aa0a8');e.hp-=v;e.flash=.04;if(e.hp<=0)enemyDie(e);return}}
 if(src!=='dot'&&P.rally>0){const r=Math.min(P.rally,1+v*.15);P.hp=Math.min(P.maxHp,P.hp+r);P.rally-=r}
 if(src==='sec'){if(hasAff(2,'bleed'))applyStatus(e,'bleed');if(hasAff(2,'slow'))applyStatus(e,'slow')}
 if(src!=='dot'&&src!=='turret'){P.flow=(P.flow||0)+1;P.flowT=4}
 if(src==='dot'){e.hp-=v;dmgNum(e.x+rnd(-4,4),e.y-e.h-4,v,'#ffa04a');if(e.hp<=0)e.isBoss?bossDie():enemyDie(e);return}
 if(e.affix==='armor')v*=.7;e.sinceHit=0;
 e.hp-=v;e.flash=.08;
 const W=WEAPONS[P.prim];if(!quiet){burst(e.x,e.y-e.h/2,crit?14:8,W.ink||['#fff'],crit?220:150,.4,2,350);splat(e.x,groundBelow(e.x,e.y-2),pick(W.ink||['#888']),crit?5:3);(crit?SFX.crit:SFX.hit)()}
 dmgNum(e.x+rnd(-4,4),e.y-e.h-6,v,crit?'#ffd84a':'#fff',crit);if(crit&&hasU('critheal')&&P.healCd<=0&&P.hp<P.maxHp){P.healCd=.25;P.hp=Math.min(P.maxHp,P.hp+2);hud()}sfx(crit?'fx_crit':'fx_hit',e.x-dir*e.w*.2+rnd(-3,3),e.y-e.h*.55+rnd(-4,4),dir||1,crit?22:26,{sc:crit?.85:.7});
 if(e.isBoss){e.vx+=dir*kb*.05}else{const res=e.elite?.4:1;e.vx=dir*kb*res;if(e.type!=='printer'&&e.type!=='popup'&&e.type!=='sticky')e.vy=Math.min(e.vy,-60*res);const pd=dmg*(crit?1.4:1)+kb*.04;e.poise-=pd;e.poiseT=1.4;
  if(e.poise<=0){e.poise=e.maxPoise;if(e.state!=='stun'){e.state='stun';e.timer=e.elite?.9:.5;e.windT=0;e.vx=dir*kb*res*1.2;burst(e.x,e.y-e.h,8,['#ffd84a','#fff'],120,.3,2,0);if(e.elite||e.maxPoise>=24)dmgNum(e.x,e.y-e.h-14,'!','#ffd84a',true);sfx('fx_poise_break',e.x,e.y-e.h*.6,1,18)}}
  else if(ATK_STATES.includes(e.state)){e.vx*=.25}
  else if(e.state==='idle'||e.state==='move'){e.state='stun';e.timer=e.elite?.08:.2}}
 if(e.hp<=0)e.isBoss?bossDie():enemyDie(e)}
function useSkill(){if(G.tut)G.tut.skill=true;const k=P.sec,dbl=hasAff(2,'double');P.skillCd=secCd();
 if(k==='palette'){projs.push({kind:'palette',from:'p',x:P.x+P.face*8,y:P.y-16,vx:P.face*330,vy:0,r:6,dmg:12,life:2,t:0,hit:new Map(),ret:false});if(dbl)projs.push({kind:'palette',from:'p',x:P.x+P.face*8,y:P.y-22,vx:P.face*300,vy:-70,r:6,dmg:12,life:2,t:0,hit:new Map(),ret:false});SFX.throw()}
 else if(k==='airbrush'){P.sprayT=dbl?1.1:.7;SFX.shoot()}
 else if(k==='eraser'){P.parryT=dbl?.45:.3;SFX.select();burst(P.x+P.face*10,P.y-16,6,'#f2a0b0',60,.2,2,0)}
 else if(k==='boxcol'){if(!placeBox(dbl)){P.skillCd=.2;toast('这里放不下',800)}}
 else if(k==='turret'){const gy=groundBelow(P.x+P.face*12,P.y-4);projs.push({kind:'turret',from:'p',x:P.x+P.face*12,y:gy,life:dbl?13:9,max:dbl?13:9,t:0,cd:.3,ang:P.face>0?0:Math.PI});SFX.door();burst(P.x+P.face*12,gy-6,10,['#9fd8ff','#fff'],80,.3)}
 else if(k==='eyedrop'){let best=null,bd=150;for(const e of targets()){const dx=e.x-P.x;if(dx*P.face<-10)continue;const d=Math.hypot(dx,(e.y-e.h/2)-(P.y-17));if(d<bd){bd=d;best=e}}
  if(!best){P.skillCd=.3;toast('前面没有可以吸的东西',700);return}SFX.throw();sfx('fx_eyedrop',P.x+P.face*34,P.y-17,P.face,16);const sx=best.x,sy=best.y-best.h/2;for(let i=0;i<8;i++){const t=i/8;part(lerp(P.x+P.face*8,sx,t),lerp(P.y-17,sy,t),0,0,'#7af0a0',.35,2,0)}
  if(best.isBoss){damage(best,14,P.face,0,false,false,'sec')}else{best.x=clamp(P.x+P.face*18,best.x-200,best.x+200);if(!best.fly)best.y=Math.min(best.y,groundBelow(best.x,P.y-30));best.vx=0;best.state='stun';best.timer=dbl?1.6:1;damage(best,8,P.face,0,false,false,'sec')}}
 else if(k==='keyframe'){if(!P.kfMark){P.kfMark={x:P.x,y:P.y,t:dbl?9:6};P.skillCd=.3;SFX.select();ringFx(P.x,P.y-18,'#c8a0ff');sfx('fx_keyframe',P.x,P.y-18,1,14);toast('关键帧已记录，6 秒内再按 K 回来',1000)}
  else{burst(P.x,P.y-17,14,['#c8a0ff','#fff'],140,.35);P.x=P.kfMark.x;P.y=P.kfMark.y;P.vx=P.vy=0;P.inv=Math.max(P.inv,.35);P.kfMark=null;SFX.djump();burst(P.x,P.y-17,18,['#c8a0ff','#fff'],160,.4);ringFx(P.x,P.y-18,'#c8a0ff');sfx('fx_keyframe',P.x,P.y-18,1,14)}}
 else if(k==='array'){for(let i=-1;i<=1;i++){const ang=(P.face>0?0:Math.PI)+i*.22;projs.push({kind:'bolt',from:'p',x:P.x+P.face*8,y:P.y-18,vx:Math.cos(ang)*360,vy:Math.sin(ang)*360,r:3,dmg:dbl?12:9,life:.7,t:0,isProj:true})}SFX.shoot()}
 else if(k==='inkbomb'){projs.push({kind:'ink',from:'p',x:P.x+P.face*6,y:P.y-20,vx:P.face*190+P.vx*.3,vy:-260,r:4,dmg:30,life:3,t:0,grav:700});if(dbl)projs.push({kind:'ink',from:'p',x:P.x+P.face*6,y:P.y-20,vx:P.face*120+P.vx*.3,vy:-320,r:4,dmg:30,life:3,t:0,grav:700});SFX.throw()}}
function hurtPlayer(dmg,dir,src,name){if(P.dead||G.state!=='play'||G.chk)return false;
 if(P.inv>0){if(P.rollT>ROLLT-.17&&!P.pdUsed&&src)perfectDodge();return false}
 if(P.mantle)P.mantle=null;if(G.hard)dmg=Math.round(dmg*1.3);if(P.curse>0)dmg*=2;
 if(P.parryT>0){SFX.parry();hitstop=.1;if(P.sec==='eraser'&&P.rally>0){P.hp=Math.min(P.maxHp,P.hp+P.rally);dmgNum(P.x,P.y-44,'+'+Math.round(P.rally),'#7af07a');P.rally=0;hud()}burst(P.x+P.face*10,P.y-16,16,['#fff','#f2a0b0'],200,.35);dmgNum(P.x,P.y-34,'0','#9fd3f0');if(src&&src.isProj&&src.vx!==undefined){src.from='p';src.vx=-(src.vx||P.face*100)*1.3;src.vy=-Math.abs(src.vy||0);src.dmg=(src.dmg||10)*2;src.owner=null}else if(src&&src.isBoss){damage(src,25,P.face,0,true,false,'sec')}else if(src&&EDEF[src.type]&&src.hp>0){src.state='stun';src.timer=1.5;damage(src,20,P.face,120,true,false,'sec')}P.inv=.3;return false}
 if((P.flow||0)>=10)toast('心流中断',900);P.flow=0;P.hp=Math.max(0,P.hp-dmg);P.rally=Math.min(P.maxHp-P.hp,P.rally+dmg*.25);P.rallyT=1.0;P.lastHit=name||(src&&src.isBoss?src.name:src&&src.type?NAMES[src.type]:src&&src.kind?KIND_NAME[src.kind]||'':'')||'意外';P.inv=.9;P.dive=false;P.hurtT=.35;P.vx=dir*160;P.vy=-180;P.atk=null;P.sprayT=0;P.healT=0;shake=Math.max(shake,5);hitstop=Math.max(hitstop,.08);flashRed=.25;SFX.hurt();burst(P.x,P.y-14,12,['#d8584a','#fff'],160,.4);dmgNum(P.x,P.y-36,dmg,'#ff5a4a');hud();
 if(hasU('thorns')&&P.hp>0){ringFx(P.x,P.y-17,'#ff7a6a');for(const e of targets())if(Math.hypot(e.x-P.x,(e.y-e.h/2)-(P.y-17))<64)damage(e,15,sign(e.x-P.x)||1,180,false,true,'sec')}
 if(G.tut&&P.hp<1){P.hp=1;hud()}
 if(P.hp<=0&&hasU('backup')&&!P.backupUsed){P.backupUsed=true;P.hp=1;P.inv=1.6;P.rally=0;slowmo=.3;slowT=.5;SFX.parry();ringFx(P.x,P.y-17,'#7af07a');burst(P.x,P.y-17,20,['#7af07a','#fff'],180,.5);toast('自动保存！这层不会再救你了',1800);hud();return true}
 if(P.hp<=0){P.hp=0;P.dead=true;P.deadAt=T;playerDie()}return true}
// 离得近的先捡；叠在一起时优先捡背包还放得下的武器
const WARES={heal:{n:'热咖啡',d:'回复 50% 生命',c:30},flask:{n:'备用便当盒',d:'便当上限 +1，并多一个便当',c:70},scroll:{n:'灵感卷轴',d:'选一项属性 +1',c:55},sharpen:{n:'武器打磨',d:'当前主武器等级 +1',c:50},weapon:{n:'神秘武器',d:'随机一把高级武器',c:65}};
function buyWare(pk){if(P.cells<pk.c){toast('灵感不够，还差 '+(pk.c-P.cells),1000);SFX.select();return}P.cells-=pk.c;pk.sold=true;SFX.pick();burst(pk.x,pk.y-14,12,['#ffd84a','#fff'],120,.4);hudCells();const it=pk.item;
 if(it==='heal'){P.hp=Math.min(P.maxHp,P.hp+P.maxHp*.5);SFX.heal()}else if(it==='flask'){P.maxFlasks++;P.flasks++}else if(it==='sharpen'){P.primLv=Math.min(5,P.primLv+1);hud.p=null}else if(it==='weapon')dropWeapon(pk.x,pk.y-20,true);
 hud();if(it==='scroll')openScroll();else toast('买到了：'+WARES[it].n,1200)}
function pkKey(k){return Math.abs(k.x-P.x)-(k.k==='weapon'&&(WEAPONS[k.w].slot===1?P.primBag:P.secBag).length<BAG_MAX?2:0)}
function interact(){
 for(const pk of [...pickups].sort((a,b)=>pkKey(a)-pkKey(b))){if(Math.abs(pk.x-P.x)>18||Math.abs(pk.y-P.y)>24)continue;
  if(pk.k==='wireterm'&&!pk.used){pk.used=true;buildWire();return}
  if(pk.k==='rush'&&!pk.used&&!boss){pk.used=true;startRush(pk);return}
  if(pk.k==='tdoor'&&pk.open&&!pk.used){pk.used=true;SFX.win();dropWeapon(pk.x+14,pk.y-10,true);for(let i=0;i<10;i++)pickups.push({k:'cell',x:pk.x,y:pk.y-20,vx:rnd(-120,120),vy:rnd(-260,-100)});toast('准时下班奖励！');return}
  if(pk.k==='cchest'&&!pk.open){pk.open=true;SFX.boss();const n=8+LV.floor*3;P.curse=(P.curse||0)+n;dropWeapon(pk.x,pk.y-8,true);pickups.push({k:'scroll',x:pk.x+14,y:pk.y-6,vy:-140});for(let i=0;i<20;i++)pickups.push({k:'cell',x:pk.x,y:pk.y-10,vx:rnd(-140,140),vy:rnd(-280,-100)});burst(pk.x,pk.y-8,24,['#c87aff','#3a1a4a','#fff'],180,.6);toast('签了加班合同！击败 '+n+' 个敌人前，受到的伤害翻倍',2600);return}
  if(pk.k==='chest'&&!pk.open){pk.open=true;SFX.door();const r=Math.random();if(pk.bonus){dropWeapon(pk.x,pk.y-8,true);pickups.push({k:'scroll',x:pk.x+14,y:pk.y-6,vy:-120});toast('隐藏宝箱！')}else if(r<.75)dropWeapon(pk.x,pk.y-8);else{pickups.push({k:'food',x:pk.x-8,y:pk.y-6,vy:-120});pickups.push({k:'food',x:pk.x+8,y:pk.y-6,vy:-120})}burst(pk.x,pk.y-8,16,['#f2c14e','#fff'],160,.5);return}
  if(pk.k==='ware'&&!pk.sold){buyWare(pk);return}
  if(pk.k==='gymlift'&&G.state==='play'){G.extra=true;SFX.door();G.state='rest';openRest();return}
  if(pk.k==='weapon'){const slot=WEAPONS[pk.w].slot,bag=slot===1?P.primBag:P.secBag;
   if(bag.length<BAG_MAX){bag.push({w:pk.w,lv:pk.lv||0,aff:pk.aff||[]});equipFromBag(slot,bag.length-1);pk.dead=true;pickups.splice(pickups.indexOf(pk),1);SFX.pick();hud.p=hud.s=null;hud();toast('放进背包：'+wname(pk.w,pk.lv)+'（按住 '+(slot===1?'R':'F')+' 切换）',1600);return}
   if(slot===1){const o=[P.prim,P.primLv,P.primAff];P.prim=pk.w;P.primLv=pk.lv||0;P.primAff=pk.aff||[];[pk.w,pk.lv,pk.aff]=o;P.combo=0;P.atk=null;P.primBag[P.primIdx]={w:P.prim,lv:P.primLv,aff:P.primAff}}else{const o=[P.sec,P.secLv,P.secAff];P.sec=pk.w;P.secLv=pk.lv||0;P.secAff=pk.aff||[];[pk.w,pk.lv,pk.aff]=o;P.secBag[P.secIdx]={w:P.sec,lv:P.secLv,aff:P.secAff}}SFX.pick();hud.p=hud.s=null;hud();toast('换上了 '+(slot===1?wname(P.prim,P.primLv):wname(P.sec,P.secLv)));return}
  if(pk.k==='door'&&pk.open){if(G.tut){finishTutorial();return}exitFloor();return}}}
// 图纸：局外解锁。拾到后要活着走到茶水间（或下班）才算入库
function dropBP(x,y){const have=P.bps||[],locked=BP_ALL.filter(b=>!SAVE.bp.includes(b)&&!have.includes(b)&&!pickups.some(k=>k.k==='bp'&&k.id===b));if(!locked.length)return;pickups.push({k:'bp',id:pick(locked),x,y,vy:-180})}
// 从背包装备第 i 把（slot 1 主武器 / 2 副武器）
function equipFromBag(slot,i){if(slot===1){P.primBag[P.primIdx]={w:P.prim,lv:P.primLv,aff:P.primAff};const it=P.primBag[i];P.primIdx=i;P.prim=it.w;P.primLv=it.lv;P.primAff=it.aff;P.combo=0;P.atk=null;P.chargeT=0}
 else{P.secBag[P.secIdx]={w:P.sec,lv:P.secLv,aff:P.secAff};const it=P.secBag[i];P.secIdx=i;P.sec=it.w;P.secLv=it.lv;P.secAff=it.aff;P.sprayT=0;P.parryT=0;P.kfMark=null}hud.p=hud.s=null}
function dropWeapon(x,y,bonus){const own=[...(P.primBag||[]).map(b=>b.w),...(P.secBag||[]).map(b=>b.w),P.prim,P.sec,...pickups.filter(k=>k.k==='weapon').map(k=>k.w)];let pool=[...PRIM,...SECN].filter(w=>!own.includes(w)&&unlocked(w));if(!pool.length)pool=[...PRIM,...SECN].filter(w=>w!==P.prim&&w!==P.sec&&unlocked(w));const w=pick(pool),slot=WEAPONS[w].slot;
 const lv=clamp(LV.floor-1+(Math.random()<.35?1:0)+(bonus?1:0),0,5),n=bonus?2:Math.min(2,irnd(0,LV.floor));pickups.push({k:'weapon',w,lv,aff:rollAff(slot,n),x,y,vy:-160})}
function placeBox(dbl){const tx0=Math.floor((P.x+P.face*22)/TS)+(P.face>0?0:-1),w=dbl?3:2;let gy=Math.floor(groundBelow((tx0+.5)*TS,P.y-8)/TS);const cells=[];
 for(let i=0;i<w;i++)for(let j=1;j<=2;j++){const tx=tx0+i*(P.face>0?1:-1),ty=gy-j;if(tileAt(tx,ty)!==0)return false;cells.push([tx,ty])}
 const box={x0:Math.min(...cells.map(c=>c[0]))*TS,x1:(Math.max(...cells.map(c=>c[0]))+1)*TS,y0:(gy-2)*TS,y1:gy*TS};
 for(const e of [...enemies,P])if(e.x+e.w/2>box.x0&&e.x-e.w/2<box.x1&&e.y>box.y0&&e.y-e.h<box.y1)return false;
 if(boss&&boss.x+boss.w/2>box.x0&&boss.x-boss.w/2<box.x1)return false;
 for(const [tx,ty] of cells)LV.T[ty*LV.w+tx]=4;LV.boxes.push({cells,t:dbl?10:7});SFX.door();burst((box.x0+box.x1)/2,box.y1-16,14,['#7af0a0','#fff'],100,.35);return true}
function updBoxes(dt){for(let i=LV.boxes.length-1;i>=0;i--){const b=LV.boxes[i];b.t-=dt;if(b.t<=0){for(const[tx,ty]of b.cells)if(LV.T[ty*LV.w+tx]===4)LV.T[ty*LV.w+tx]=0;burst(b.cells[0][0]*TS+16,b.cells[0][1]*TS,10,'#7af0a0',80,.3);LV.boxes.splice(i,1)}}}
function buildWire(){let n=0;for(let i=0;i<LV.T.length;i++)if(LV.T[i]===5){LV.T[i]=2;n++;const tx=i%LV.w,ty=Math.floor(i/LV.w);burst(tx*TS+8,ty*TS+2,4,['#7fd8ff','#fff'],80,.4,2,100)}SFX.win();shake=2;toast(n?'补好了模型，上面好像有东西':'没有要补的模型',1800)}
function startRush(pk){const th=LV.th,n=LV.floor+3;const list=[];for(let i=0;i<n;i++){const type=th.enemies[i%th.enemies.length],fly=EDEF[type].fly,side=i%2?1:-1;const x=clamp(P.x+side*rnd(70,150),3*TS,LV.arenaX-2*TS);
  const e=spawnEnemy({type,x,y:fly?P.y-rnd(50,80):groundBelow(x,P.y-60),elite:i===n-1&&LV.floor>1});e.aggro=true;e.rush=true;list.push(e);burst(e.x,e.y-e.h/2,12,['#ff5a4a','#fff'],120,.4)}
 G.rush={t:30+LV.floor*4,list,total:n};SFX.boss();toast('加急任务！'+G.rush.t+' 秒内清掉所有怪',2200)}
function updRush(dt){const r=G.rush;if(!r)return;r.t-=dt;const left=r.list.filter(e=>e.hp>0).length;
 if(left===0){G.rush=null;SFX.win();toast('加急任务完成！',2000);dropWeapon(P.x,P.y-20,true);for(let i=0;i<15;i++)pickups.push({k:'cell',x:P.x,y:P.y-30,vx:rnd(-160,160),vy:rnd(-300,-120)})}
 else if(r.t<=0){G.rush=null;toast('加急任务超时……',1800)}}
function hitCrate(k,dmg){k.hp-=dmg;k.shake=.15;SFX.hit();burst(k.x,k.y-8,6,['#c8955a','#a87648','#f0dca0'],100,.3);if(k.hp<=0){k.dead=true;SFX.die();burst(k.x,k.y-8,16,['#c8955a','#a87648','#f0dca0'],180,.5,3);
 const n=irnd(2,4);for(let i=0;i<n;i++)pickups.push({k:'cell',x:k.x,y:k.y-10,vx:rnd(-90,90),vy:rnd(-220,-90)});if(Math.random()<.22)pickups.push({k:'food',x:k.x,y:k.y-8,vy:-140});else if(Math.random()<.06)dropWeapon(k.x,k.y-8)}}
// ===== 投射物 =====
const projs=[];
function eproj(o){o.from='e';o.t=0;o.isProj=true;projs.push(o)}
function updProjs(dt){for(let i=projs.length-1;i>=0;i--){const p=projs[i];if(p.life<=0){projs.splice(i,1);continue}p.t+=dt;p.life-=dt;
 if(p.kind==='palette'){if(!p.ret&&p.t>.42)p.ret=true;if(p.ret){const dx=P.x-p.x,dy=P.y-16-p.y,d=Math.hypot(dx,dy)||1;p.vx=dx/d*380;p.vy=dy/d*380;if(d<12){p.life=0;continue}}
  for(const e of targets()){const n=p.hit.get(e)||0;if(n<(p.ret?2:1)&&Math.abs(e.x-p.x)<e.w/2+p.r&&p.y>e.y-e.h-p.r&&p.y<e.y+p.r){p.hit.set(e,n+1);damage(e,p.dmg,sign(p.vx)||P.face,90,false,false,'sec')}}
  for(const k of pickups)if(k.k==='crate'&&!p.hit.has(k)&&Math.abs(k.x-p.x)<10&&Math.abs(k.y-8-p.y)<12){p.hit.set(k,1);hitCrate(k,p.dmg)}
  if(Math.random()<.6)part(p.x,p.y,0,0,pick(['#e8483a','#5ab85a','#3a8ad8']),.25,2,0)}
 else if(p.kind==='ink'){p.vy+=p.grav*dt;let hitE=false;for(const e of targets())if(Math.abs(e.x-p.x)<e.w/2+4&&p.y>e.y-e.h&&p.y<e.y)hitE=true;
  if(hitE||isSolid(Math.floor(p.x/TS),Math.floor(p.y/TS))||tileAt(Math.floor(p.x/TS),Math.floor(p.y/TS))===2&&p.vy>0){p.life=0;SFX.boom();shake=Math.max(shake,4);burst(p.x,p.y,26,['#ff6a2a','#ffb84a','#c83a1a','#fff0a0'],240,.6,3,400);
   for(const e of targets())if(Math.hypot(e.x-p.x,e.y-e.h/2-p.y)<44){damage(e,p.dmg,sign(e.x-p.x)||1,160,false,false,'sec');applyStatus(e,'bleed')}for(const k of pickups)if(k.k==='crate'&&Math.hypot(k.x-p.x,k.y-8-p.y)<44)hitCrate(k,99);projs.push({kind:'pool',from:'p',x:p.x,y:groundBelow(p.x,p.y-8),life:3,t:0,r:28,tick:0});continue}}
 else if(p.kind==='pool'){p.tick-=dt;if(p.tick<=0){p.tick=.25;for(const e of targets())if(Math.abs(e.x-p.x)<p.r&&Math.abs(e.y-p.y)<14){damage(e,3,0,0,false,true,'dot');applyStatus(e,'bleed')}}if(Math.random()<.4)part(p.x+rnd(-p.r,p.r),p.y-1,0,-30,pick(['#ff6a2a','#ffb84a']),.4,2,-30);continue}
 else if(p.kind==='turret'){p.cd-=dt;let best=null,bd=170;for(const e of targets()){const d=Math.hypot(e.x-p.x,e.y-e.h/2-(p.y-10));if(d<bd){bd=d;best=e}}
  if(best){p.ang=Math.atan2(best.y-best.h/2-(p.y-10),best.x-p.x);if(p.cd<=0){p.cd=.42;SFX.shoot();projs.push({kind:'bolt',from:'p',x:p.x+Math.cos(p.ang)*8,y:p.y-10+Math.sin(p.ang)*8,vx:Math.cos(p.ang)*320,vy:Math.sin(p.ang)*320,r:3,dmg:6,life:1,t:0,isProj:true,src:'turret'})}}continue}
 else if(p.kind==='drop'){if(p.t>=p.warn){if(p.y<-900)p.y=cam.y-20;p.y+=720*dt;if(!p.hitDone&&Math.abs(P.x-p.x)<12&&p.y>P.y-P.h&&p.y<P.y+4){if(hurtPlayer(p.dmg,sign(P.x-p.x)||1,p))p.hitDone=true;p.life=0;burst(p.x,p.y,10,p.img==='pie'?['#e8b060','#fff2c0']:['#f4f1ea','#e8483a'],120,.3)}
   if(p.y>=p.gy){p.life=0;SFX.hit();burst(p.x,p.gy-2,12,p.img==='pie'?['#e8b060','#c88a3a','#fff2c0']:['#f4f1ea','#e8483a'],140,.35,2,200)}}continue}
 else if(p.kind==='ebomb'){if(p.t>p.warn&&!p.done){p.done=true;SFX.boom();shake=Math.max(shake,5);burst(p.x,p.y,30,['#ff7a4a','#ffd84a','#fff'],260,.5,3,200);if(Math.hypot(P.x-p.x,P.y-16-p.y)<p.r)hurtPlayer(p.dmg,sign(P.x-p.x)||1,p);for(const e of enemies)if(e.hp>0&&Math.hypot(e.x-p.x,e.y-e.h/2-p.y)<p.r)e.vx=sign(e.x-p.x)*200}if(p.t>p.warn+.25)p.life=0;continue}
 else if(p.kind==='kpi'){ // 柱子：预警->升起->落下
  if(p.follow&&!p.locked&&p.t>=0){p.locked=true;p.x=clamp(P.x,LV.arenaX+20,LV.arenaX+LV.arenaW-20)}
  if(p.t>p.warn&&!p.up){p.up=true;SFX.stamp();shake=Math.max(shake,3)}
  if(p.up&&!p.hitDone&&P.y>p.y-p.hgt&&Math.abs(P.x-p.x)<p.w/2+4){if(hurtPlayer(p.dmg,sign(P.x-p.x)||1,p))p.hitDone=true}continue}
 else if(p.kind==='laser'){if(p.t>p.warn&&!p.fired){p.fired=true;SFX.laser();shake=Math.max(shake,4)}if(p.fired&&p.t<p.warn+.45&&Math.abs(P.y-13-p.y)<10&&!p.hitDone){if(hurtPlayer(p.dmg,P.x<p.x?-1:1,p))p.hitDone=true}continue}
 else if(p.kind==='cube'){p.vy+=p.grav*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
  if(Math.abs(P.x-p.x)<P.w/2+p.r&&P.y-P.h<p.y+p.r&&P.y>p.y-p.r){if(hurtPlayer(p.dmg,sign(p.vx)||1,p))p.life=0}
  const gy=19*TS;if(p.life>0&&p.vy>0&&p.y+p.r>=gy){p.life=0;SFX.stamp();shake=Math.max(shake,2);burst(p.x,gy-4,10,['#c8ccd6','#8a8e98','#fff'],140,.35);for(const d of[-1,1])eproj({kind:'wave',x:p.x+d*6,y:gy,vx:d*150,vy:0,r:5,dmg:12,life:1.1,col:'#c8ccd6'})}continue}
 else if(p.kind==='fireg'){if(P.onGround&&Math.abs(P.x-p.x)<p.r+3&&Math.abs(P.y-p.y)<6)hurtPlayer(p.dmg,sign(P.x-p.x)||1,p);if(Math.random()<.25)part(p.x+rnd(-p.r,p.r),p.y-2,0,-rnd(30,70),pick(['#ff8a2a','#ffd84a','#c8281e']),.35,2,-40);continue}
 else if(p.kind==='pillar'){if(p.t>p.warn&&!p.on){p.on=true;SFX.boom();shake=Math.max(shake,3);burst(p.x,p.y-10,10,['#ff8a2a','#ffd84a'],160,.4)}if(p.on&&!p.hitDone&&p.t<p.warn+.4&&Math.abs(P.x-p.x)<p.w/2+4&&P.y>p.y-p.hgt){if(hurtPlayer(p.dmg,sign(P.x-p.x)||1,p))p.hitDone=true}if(p.t>p.warn+.55)p.life=0;continue}
 else if(p.kind==='paint'){if(P.onGround&&Math.abs(P.x-p.x)<p.r+3&&Math.abs(P.y-p.y)<6)P.stickT=.12;continue}
 else if(p.kind==='zone'){if(p.t>p.warn&&!p.on){p.on=true;SFX.warn()}if(p.on&&p.t<p.warn+p.dur&&P.onGround&&P.x>p.x0&&P.x<p.x1){hurtPlayer(p.dmg,0,p)}if(p.t>p.warn+p.dur)p.life=0;continue}
 else{if(p.grav)p.vy+=p.grav*dt;
  if(p.kind==='pie'||p.kind==='bigpie'){const gy=groundBelow(p.x,p.y-p.r);if(p.y+p.r>gy&&p.vy>0){p.y=gy-p.r;p.vy=p.kind==='bigpie'?0:-Math.abs(p.vy)*.55;if(Math.abs(p.vy)<60)p.vy=0}p.rot=(p.rot||0)+p.vx*dt*.1}
  if(p.kind==='doc'||p.kind==='bell'){if(p.t>.7&&p.owner){const dx=p.owner.x-p.x,dy=p.owner.y-24-p.y,d=Math.hypot(dx,dy)||1;p.vx+=dx/d*900*dt;p.vy+=dy/d*900*dt;if(d<14&&p.t>1)p.life=0}}
  if(p.kind==='note'||p.kind==='paper'){p.y+=Math.sin(p.t*10)*.4}}
 p.x+=(p.vx||0)*dt;p.y+=(p.vy||0)*dt;
 if(p.kind==='wave'){p.y=groundBelow(p.x,p.y-4);if(isSolid(Math.floor((p.x+sign(p.vx)*4)/TS),Math.floor((p.y-4)/TS)))p.life=0;if(Math.random()<.7)part(p.x,p.y-2,rnd(-20,20),-rnd(40,90),p.col||'#c8c0b0',.3,2,200)}
 if(p.from==='e'){if(Math.abs(P.x-p.x)<P.w/2+p.r&&P.y-P.h<p.y+p.r&&P.y>p.y-p.r-(p.kind==='wave'?10:0)){if(p.kind==='wave'&&!P.onGround&&P.y<p.y-6){}else if(hurtPlayer(p.dmg,sign(p.vx)||sign(P.x-p.x),p)||p.from!=='e'){if(p.from==='e'&&!p.pierce)p.life=0}}}
 else if(p.kind!=='palette'&&p.isProj){for(const e of targets())if(Math.abs(e.x-p.x)<e.w/2+p.r&&p.y>e.y-e.h&&p.y<e.y+p.r){if(p.src==='turret')damage(e,p.dmg*(1+.15*P.stat.color)*(1+.12*P.secLv),sign(p.vx),40,false,false,'turret');else damage(e,p.dmg,sign(p.vx),120,true,false,'sec');p.life=0;break}}
 if(p.kind!=='wave'&&p.kind!=='pie'&&p.kind!=='bigpie'&&p.kind!=='palette'&&p.kind!=='doc'&&p.kind!=='bell'&&isSolid(Math.floor(p.x/TS),Math.floor(p.y/TS))){p.life=0;burst(p.x,p.y,5,'#fff',80,.2)}
 if(p.life<=0||p.x<-50||p.x>LV.w*TS+50)projs.splice(i,1)}}
function drawProjs(cx,cy){for(const p of projs){const x=R(p.x-cx),y=R(p.y-cy);
 switch(p.kind){
 case 'palette':ctx.save();ctx.translate(x,y);ctx.rotate(p.t*18);pline(0,0,7,0,2,'#e8483a');pline(0,0,0,-7,2,'#5ab85a');pline(0,0,-5,4,2,'#3a8ad8');px(6,-1,2,3,'#e8483a');px(-1,-8,3,2,'#5ab85a');px(-1,-1,3,3,'#fff');ctx.restore();break;
 case 'drop':{const gy=R(p.gy-cy);if(p.t>=0&&p.y<-900||p.t<p.warn){const k=Math.max(0,Math.min(1,p.t/p.warn));ctx.globalAlpha=.25+.45*k;px(x-4-R(6*k),gy-2,8+R(12*k),2,'#ff3a3a');px(x-2-R(3*k),gy-3,4+R(6*k),1,'#ff7a6a');ctx.globalAlpha=1}
  else if(p.img==='fire'){const yy=R(p.y-cy);sprFrame('proj_fire',Math.floor(p.t*12),x,yy,1,false,'center');ctx.globalAlpha=.4;px(x-6,gy-2,12,2,'#ff3a3a');ctx.globalAlpha=1}
  else{const n=p.img==='pie'?'proj_pie':'proj_note';sprFrame(n,Math.floor(p.t*12),x,R(p.y-cy),1,false,'center');ctx.globalAlpha=.4;px(x-6,gy-2,12,2,'#ff3a3a');ctx.globalAlpha=1}break}
 case 'ebomb':if(!p.done){ctx.globalAlpha=.3+.3*Math.sin(p.t*30);pring(x,y,p.r,'#ff5a4a',1);pring(x,y,R(p.r*p.t/p.warn),'#ffd84a',1);ctx.globalAlpha=1;px(x-3,y-4,6,6,'#3a3a46');px(x-1,y-8,2,4,'#ff7a4a')}else{ctx.globalAlpha=Math.max(0,1-(p.t-p.warn)*4);pcirc(x,y,p.r,'#ffd08a');ctx.globalAlpha=1}break;
 case 'ink':pcirc(x,y,4,'#e8582a');px(x-2,y-3,2,2,'#ffd08a');px(x+1,y+1,2,1,'#a8301a');break;
 case 'bolt':px(x-2,y-1,4,2,'#9fd8ff');px(x-1,y-1,2,2,'#fff');break;
 case 'turret':{const k=p.life/p.max;pline(x-5,y,x,y-7,1,'#5a5e68');pline(x+5,y,x,y-7,1,'#5a5e68');px(x-4,y-14,8,7,'#d0d6e0');px(x-4,y-14,8,1,'#fff');pline(x,y-11,x+Math.cos(p.ang)*9,y-11+Math.sin(p.ang)*9,2,'#3a8ad8');px(x-1,y-12,2,2,p.cd>.3?'#ff9a4a':'#7af0a0');px(x-6,y+2,12,1,'#2a2030');px(x-6,y+2,Math.round(12*k),1,'#7af0a0');break}
 case 'pool':ctx.globalAlpha=Math.min(1,p.life);px(x-p.r,y-2,p.r*2,3,'#c8401a');px(x-p.r+4,y-3,p.r*2-8,1,'#ff9a3a');for(let i=0;i<3;i++)px(x-p.r+((i*17+Math.floor(p.t*20))%(p.r*2)),y-3,2,1,'#fff0a0');ctx.globalAlpha=1;break;
 case 'paper':sprFrame('proj_paper',Math.floor(p.t*8),x,y,sign(p.vx)||1,false,'center');break;
 case 'note':sprFrame('proj_note',Math.floor(p.t*12),x,y,1,false,'center');break;
 case 'x':sprFrame('proj_x',Math.floor(p.t*10),x,y,1,false,'center');break;
 case 'wave':sprFrame('proj_wave',Math.floor(p.t*10),x,y+2,sign(p.vx)||1);break;
 case 'doc':sprFrame('proj_doc',Math.floor(p.t*12),x,y,1,false,'center');break;
 case 'pie':case 'bigpie':sprFrame('proj_'+p.kind,Math.floor(Math.abs(p.rot||0)*1.3),x,y,sign(p.vx)||1,false,'center');break;
 case 'kpi':{const prog=p.up?Math.min(1,(p.t-p.warn)/.12)*(p.t>p.warn+1.1?Math.max(0,1-(p.t-p.warn-1.1)/.2):1):0;
  if(!p.up){ctx.globalAlpha=.4+.4*Math.sin(p.t*30);px(x-p.w/2,y-3,p.w,3,'#ff5a4a');ctx.globalAlpha=1}
  else if(sprReady('proj_kpi_bar')){const h=R(p.hgt*prog),im=SPR.proj_kpi_bar,s=SPRS.proj_kpi_bar||1,fw=24*s,ci={'#d8584a':0,'#f2c14e':1,'#5ab85a':2}[p.col]||0;ctx.save();ctx.beginPath();ctx.rect(x-16,y-h,32,h);ctx.clip();ctx.drawImage(im,ci*fw,0,fw,im.naturalHeight,x-12,y-h,24,p.hgt+4);ctx.restore()}
  if(p.t>p.warn+1.35)p.life=0;break}
 case 'laser':if(!p.fired){ctx.globalAlpha=.5+.5*Math.sin(p.t*40);px(0,y,VW,1,'#ff5a4a');ctx.globalAlpha=1}else if(p.t<p.warn+.45){for(let lx=0;lx<VW;lx+=32)sprFrame('proj_laser',Math.floor(p.t*20),lx+16,y,1,false,'center')}if(p.t>p.warn+.5)p.life=0;break;
 case 'cube':sprFrame('proj_cube',Math.floor(p.t*12),x,y,1,false,'center');break;
 case 'bell':sprFrame('proj_bell',Math.floor(p.t*16),x,y,1,false,'center');break;
 case 'fireg':{const a=Math.min(1,p.life/.6);ctx.globalAlpha=a;sprFrame('fx_fireg',Math.floor(p.t*10+p.x),x,y,1);ctx.globalAlpha=1;break}
 case 'fireball':sprFrame('proj_fireball',Math.floor(p.t*12),x,y,sign(p.vx)||1,false,'center');break;
 case 'pillar':{const gy=y;if(p.on){sprFrame('proj_pillar',Math.min(sprN('proj_pillar')-1,Math.floor((p.t-p.warn)/.55*sprN('proj_pillar'))),x,gy,1)}else if(p.t>0){ctx.globalAlpha=.3+.3*Math.sin(p.t*30);px(x-p.w/2,gy-3,p.w,3,'#ff5a2a');ctx.globalAlpha=1}break}
 case 'paint':{const a=Math.min(1,p.life/1.2);ctx.globalAlpha=.85*a;px(x-p.r,y-2,p.r*2,2,'#c8402a');px(x-p.r+3,y-3,p.r*2-6,1,'#e8503a');px(x-p.r+5,y-3,3,1,'#ff9a7a');ctx.globalAlpha=1;break}
 case 'zone':if(p.style==='clay'){if(!p.on){ctx.globalAlpha=.3+.3*Math.sin(p.t*24);px(p.x0-cx,y-3,p.x1-p.x0,3,'#e8783a');ctx.globalAlpha=1}else{const k=Math.min(1,(p.t-p.warn)/.08);for(let xx=p.x0;xx<p.x1;xx+=7){const h=R((8+((xx*13)%7))*k);px(xx-cx,y-h,6,h,'#c8955a');px(xx-cx+1,y-h,3,2,'#f0c890');px(xx-cx+2,y-h-2,2,2,'#e8783a')}}break}
 if(!p.on){ctx.globalAlpha=.25+.25*Math.sin(p.t*24);px(p.x0-cx,y-6,p.x1-p.x0,6,'#ff5a4a');ctx.globalAlpha=1}else{ctx.save();ctx.beginPath();ctx.rect(p.x0-cx,y-12,p.x1-p.x0,12);ctx.clip();for(let zx=p.x0;zx<p.x1;zx+=32)sprFrame('proj_zone',Math.floor(p.t*10),zx+16-cx,y,1);ctx.restore()}break;
 }}}
// ===== 敌人 =====
const enemies=[];// poise：韧性。出招（前摇/冲刺）时只有打空韧性才能打断；普通状态下挨打会小硬直
const EDEF={crumple:{hp:30,w:22,h:26,dmg:12,poise:16},sticky:{hp:18,w:18,h:18,dmg:10,fly:1,poise:10},printer:{hp:40,w:30,h:28,dmg:10,poise:24},bug:{hp:22,w:18,h:14,dmg:9,poise:8},popup:{hp:26,w:30,h:24,dmg:10,fly:1,poise:16},kpi:{hp:56,w:14,h:22,dmg:14,poise:40},firewall:{hp:64,w:20,h:34,dmg:14,poise:44},invite:{hp:14,w:16,h:14,dmg:4,fly:1,poise:4},spray:{hp:28,w:14,h:24,dmg:9,poise:12},merge:{hp:34,w:18,h:26,dmg:14,poise:14},pm:{hp:50,w:16,h:39,dmg:6,poise:22}};
const ATK_STATES=['wind','lunge','bash','swoop','slam','spray','blinkw','slashw','slash','rally'];
// 出招名额：同一时间最多几只怪在出招，避免围殴时无从闪避
function atkToken(e,ranged){let n=0;for(const o of enemies)if(o!==e&&o.hp>0&&!!o.ranged===ranged&&ATK_STATES.includes(o.state)&&Math.abs(o.x-P.x)<300)n++;const max=ranged?2:2+(G.hard?1:0)+(G.lvl>=4?1:0);if(n>=max){e.cd=rnd(.25,.6);return false}return true}
function spawnEnemy(s,minion){const d=EDEF[s.type],m=s.elite?2.6:1;const e={type:s.type,x:s.x,y:s.y,hx:s.x,hy:s.y,w:d.w,h:d.h,vx:0,vy:0,face:-1,hp:d.hp*m*(1+(LV.floor-1)*.35)*(G.hard?1.5:1),max:0,dmg:Math.round(d.dmg*(s.elite?1.3:1)*(1+(LV.floor-1)*.2)),fly:!!d.fly,ranged:['printer','popup','spray','pm'].includes(s.type),poise:d.poise*(s.elite?2.5:1),maxPoise:d.poise*(s.elite?2.5:1),poiseT:0,state:'idle',timer:rnd(0,1),anim:rnd(0,9),flash:0,elite:!!s.elite,cd:0,onGround:false,minion:!!minion,aggro:false};if(e.elite){e.affix=s.affix||pick(AFFIX_POOL[LV.floor]||Object.keys(EAFFIX));if(e.affix==='armor'){e.poise*=1.6;e.maxPoise*=1.6}}
 e.max=e.hp;enemies.push(e);return e}
// 精英词缀
const EAFFIX={fast:{n:'赶工',c:'#ffd84a'},armor:{n:'返工护甲',c:'#9fd8ff'},split:{n:'拆需求',c:'#7af07a'},regen:{n:'带薪摸鱼',c:'#f2a0b0'},bomb:{n:'甩锅',c:'#ff7a4a'}};
const AFFIX_POOL={1:['fast','armor','split'],2:['fast','armor','split','regen','bomb'],3:['fast','armor','split','regen','bomb']};
// 评审会：进去后两侧封门，撑过两轮才开门发奖励
function updRoom(dt){const r=LV.room;if(!r||r.state===2||P.dead)return;
 if(r.state===0){if(P.x>r.x0+3*TS&&P.x<r.x1-3*TS&&P.y<=r.g*TS+1&&P.onGround){r.state=1;r.wave=0;r.delay=.6;
   for(const c of[r.tx,r.tx+r.len-1])for(let y=2;y<r.g;y++){const i=y*LV.w+c;if(LV.T[i]!==1){r.cells.push([i,LV.T[i]]);LV.T[i]=1}}
   for(const e of enemies)if(e.hp>0&&e.x>r.x0-8&&e.x<r.x0+TS+8)e.x=r.x0+TS+12;for(const e of enemies)if(e.hp>0&&e.x>r.x1-TS-8&&e.x<r.x1+8)e.x=r.x1-TS-12;
   SFX.boss();shake=Math.max(shake,4);banner('评审会','撑过两轮评审才能离开',1800)}return}
 if(r.delay>0){r.delay-=dt;if(r.delay<=0)roomWave(r);return}
 if(r.list.every(e=>e.hp<=0)){if(r.wave<2){r.delay=1.4;toast('第二轮评审，领导也来了……',1400)}else roomDone(r)}}
function roomWave(r){r.wave++;const th=LV.th,n=(r.wave===1?2:1)+LV.floor+(G.lvl>=4?1:0);r.list=[];
 for(let i=0;i<n;i++){const type=th.enemies[(i+r.wave)%th.enemies.length],fly=EDEF[type].fly;let x=0;for(let k=0;k<8;k++){x=r.x0+TS*rnd(2.5,r.len-2.5);if(Math.abs(x-P.x)>56)break}
  const e=spawnEnemy({type,x,y:fly?r.g*TS-rnd(60,100):r.g*TS,elite:r.wave===2&&i===0});e.aggro=true;e.state='stun';e.timer=.5;r.list.push(e);burst(e.x,e.y-e.h/2,14,['#ff5a4a','#fff'],140,.4)}SFX.boss()}
function roomDone(r){r.state=2;for(const[i,v]of r.cells)LV.T[i]=v;r.cells=[];SFX.win();toast('评审通过！',2000);const cx=(r.x0+r.x1)/2,gy=r.g*TS;
 dropWeapon(cx,gy-20,true);pickups.push({k:'scroll',x:cx+20,y:gy-10,vy:-160});pickups.push({k:'food',x:cx-20,y:gy-10,vy:-140});for(let i=0;i<14;i++)pickups.push({k:'cell',x:cx,y:gy-30,vx:rnd(-160,160),vy:rnd(-300,-120)});if(Math.random()<.5)dropBP(cx,gy-30);
 for(const c of[r.x0+TS/2,r.x1-TS/2])burst(c,gy-40,20,['#7af07a','#fff'],160,.5)}
function enemyDie(e){e.hp=0;if(useSpr&&sprReady('enemy_'+e.type+'_die'))corpses.push({n:'enemy_'+e.type+'_die',x:e.x,y:e.fly?e.y-e.h/2:e.y,face:e.face,t:0,fly:e.fly});SFX.die();shake=Math.max(shake,2.5);burst(e.x,e.y-e.h/2,18,['#14121a','#3a3a46',e.elite?'#ff5a4a':'#9aa0a8'],180,.5,3,300);splat(e.x,groundBelow(e.x,e.y-2),'#3a3a46',5);G.kills++;
 const n=e.elite?8:irnd(1,3);for(let i=0;i<n;i++)pickups.push({k:'cell',x:e.x,y:e.y-e.h/2,vx:rnd(-80,80),vy:rnd(-200,-80)});if(e.elite)dropWeapon(e.x,e.y-10);if(Math.random()<.08)pickups.push({k:'food',x:e.x,y:e.y-6,vy:-120});
 if(e.affix==='split'){const t={1:'sticky',2:'bug',3:'invite'}[LV.floor]||'bug';for(const d of[-1,1]){const m=spawnEnemy({type:t,x:e.x+d*10,y:EDEF[t].fly?e.y-20:e.y},e.minion);m.aggro=true;m.vx=d*120}toast('需求被拆成了两个！',900)}
 if(e.affix==='bomb'){projs.push({kind:'ebomb',from:'x',x:e.x,y:e.y-e.h/2,t:0,warn:.9,r:46,dmg:e.dmg+4,life:2,isProj:true})}
 if(hasU('chain')&&e.bleedT>0){burst(e.x,e.y-e.h/2,18,['#ff9a3a','#ffd84a','#fff'],200,.4);shake=Math.max(shake,3);for(const o of targets())if(o!==e&&Math.hypot(o.x-e.x,(o.y-o.h/2)-(e.y-e.h/2))<58){damage(o,16,sign(o.x-e.x)||1,100,false,true,'sec');applyStatus(o,'bleed')}}
 if(hasU('overtime')){P.otK=(P.otK||0)+1;if(P.otK%10===0){P.maxHp+=5;P.hp+=5;dmgNum(P.x,P.y-44,'加班费 +5','#7af07a');hud()}}
 if(P.curse>0){P.curse--;if(P.curse===0){toast('加班合同到期，解脱了',1500);SFX.win()}}
 if(e.elite?Math.random()<.35:Math.random()<.015)dropBP(e.x,e.y-10);
 if(P.steal)P.hp=Math.min(P.maxHp,P.hp+P.steal);if(hasAff(1,'steal'))P.hp=Math.min(P.maxHp,P.hp+3);hud()}
// 教程沙袋：打不死、不还手，挨打会晃一下，然后慢慢回到原位
function dummyUpd(e,dt){e.hp=e.max;e.anim+=dt;e.flash-=dt;if(e.state==='stun'){e.timer-=dt;if(e.timer<=0)e.state='idle'}else e.state='idle';e.vy=Math.min(MAXF,e.vy+GRAV*dt);e.vx*=.85;moveBody(e,dt);if(e.state==='idle')e.x=lerp(e.x,e.hx,.08);e.face=sign(P.x-e.x)||-1}
function updEnemies(dtA){for(let i=enemies.length-1;i>=0;i--){const e=enemies[i];if(e.hp<=0){enemies.splice(i,1);continue}if(e.dummy){dummyUpd(e,dtA);continue}tickStatus(e,dtA);if(e.hp<=0)continue;if(e.hasteT>0)e.hasteT-=dtA;const dt=dtA*(e.slowT>0?.5:1)*(e.affix==='fast'?1.35:1)*(e.hasteT>0?1.3:1);
 if(e.affix==='regen'){e.sinceHit=(e.sinceHit||0)+dtA;if(e.sinceHit>2&&e.hp<e.max){e.hp=Math.min(e.max,e.hp+e.max*.04*dtA);if(Math.random()<.2)part(e.x+rnd(-6,6),e.y-rnd(0,e.h),0,-30,'#7af07a',.4,1,-20)}}
 e.anim+=dt;e.flash-=dt;e.timer-=dt;e.cd-=dt;if(e.atkT>0)e.atkT-=dt;if(e.poiseT>0)e.poiseT-=dt;else e.poise=Math.min(e.maxPoise,e.poise+e.maxPoise*.8*dt);separate(e,dt);const dx=P.x-e.x,dy=(P.y-13)-(e.y-e.h/2),dist=Math.hypot(dx,dy);
 if(!e.aggro&&dist<200&&Math.abs(dx)<220)e.aggro=true;if(!e.aggro){e.idleT=(e.idleT||0)+dt;}
 if(e.state==='stun'){if(e.fly){const nx=e.x+e.vx*dt;if(!isSolid(Math.floor(nx/TS),Math.floor((e.y-6)/TS)))e.x=nx;e.vx*=.88;e.vy*=.88}
  else{const sv=e.vx;e.vy=Math.min(MAXF,e.vy+GRAV*dt);moveBody(e,dt);e.vx*=.88;
   // 撞墙：被打飞撞到墙上额外受伤
   if(e.hitWall&&Math.abs(sv)>150&&!e.splatted){e.splatted=true;e.timer+=.35;shake=Math.max(shake,3);SFX.stamp();burst(e.x+e.hitWall*e.w/2,e.y-e.h/2,10,['#fff','#cfc6b8'],140,.3);damage(e,6+LV.floor*2,0,0,false,true,'dot')}}
  if(e.timer<=0){e.state='idle';e.splatted=false}}
 else switch(e.type){
 case 'crumple':case 'kpi':{const spd=e.type==='kpi'?48:72;
  if(e.state==='idle'||e.state==='move'){if(e.aggro){e.face=sign(dx)||e.face;e.state='move';e.vx=e.face*spd;if(Math.abs(dx)<(e.type==='kpi'?34:30)&&Math.abs(dy)<24&&e.cd<=0&&atkToken(e,false)){e.state='wind';e.timer=e.type==='kpi'?.6:.42;e.windT=e.timer;e.vx=0;SFX.warn()}}else{e.vx=Math.sin(e.anim*.7)*25;if(e.vx)e.face=sign(e.vx)}}
  else if(e.state==='wind'){e.vx=0;if(e.timer<=0){if(e.type==='crumple'){e.state='lunge';e.timer=.26;e.vx=e.face*230;e.vy=-120}else{e.state='slam';e.timer=.4;shake=Math.max(shake,3);SFX.stamp();for(const d of[-1,1])eproj({kind:'wave',x:e.x+d*8,y:e.y,vx:d*170,vy:0,r:5,dmg:e.dmg,life:1.2,col:'#f2c14e'})}}}
  else if(e.state==='lunge'){if(Math.abs(dx)<e.w/2+5&&Math.abs(dy)<18)hurtPlayer(e.dmg,e.face,e);if(e.timer<=0){e.state='idle';e.cd=1}}
  else if(e.state==='slam'){e.vx=0;if(e.timer<=0){e.state='idle';e.cd=1.4}}
  if(!e.fly){e.vy=Math.min(MAXF,e.vy+GRAV*dt);const ox=e.x;moveBody(e,dt);
   if(e.onGround&&e.state==='move'){const ahead=Math.floor((e.x+e.face*(e.w/2+2))/TS),below=Math.floor((e.y+2)/TS);if(!tileAt(ahead,below)||e.hitWall){if(e.hitWall&&e.aggro&&Math.random()<.5)e.vy=-300;else{e.vx=0;e.x=ox}}}}
  if(Math.abs(dx)<e.w/2+3&&Math.abs(dy)<16&&e.state!=='lunge'&&e.cd<=0&&e.type==='kpi'){if(hurtPlayer(Math.round(e.dmg*.6),sign(dx),e))e.cd=.8}break}
 case 'bug':{e.vy=Math.min(MAXF,e.vy+GRAV*dt);if(e.aggro){e.face=sign(dx)||e.face;e.vx=e.face*110;if(e.onGround&&Math.abs(dx)<70&&e.cd<=0){e.vy=-280;e.vx=e.face*170;e.cd=1.1}}else e.vx=Math.sin(e.anim)*30;
  moveBody(e,dt);if(e.hitWall&&e.onGround)e.vy=-260;e.cd2=(e.cd2||0)-dt;if(e.cd2<=0&&Math.abs(dx)<e.w/2+5&&Math.abs(dy)<14){if(hurtPlayer(e.dmg,e.face,e))e.cd2=.8}break}
 case 'sticky':{const hx=P.x-e.face*20,hy=P.y-60;
  if(e.state==='idle'){const tx=e.aggro?hx:e.hx+Math.sin(e.anim)*30,ty=e.aggro?hy:e.hy+Math.sin(e.anim*1.7)*10;e.vx+=(tx-e.x)*2*dt-e.vx*1.5*dt;e.vy+=(ty-e.y)*2*dt-e.vy*1.5*dt;e.face=sign(dx)||e.face;if(e.aggro&&e.cd<=0&&dist<120&&atkToken(e,false)){e.state='wind';e.timer=.5;e.windT=.5;e.vx*=.2;e.vy*=.2;SFX.warn()}}
  else if(e.state==='wind'){e.vx*=.9;e.vy*=.9;if(e.timer<=0){e.state='swoop';e.timer=.55;const d=Math.hypot(dx,dy)||1;e.vx=dx/d*270;e.vy=dy/d*270}}
  else if(e.state==='swoop'){if(Math.abs(dx)<e.w/2+5&&Math.abs(dy)<16)hurtPlayer(e.dmg,sign(e.vx),e);if(e.timer<=0){e.state='idle';e.cd=1.3}}
  e.x+=e.vx*dt;e.y+=e.vy*dt;if(isSolid(Math.floor(e.x/TS),Math.floor((e.y-6)/TS))){e.x-=e.vx*dt;e.y-=e.vy*dt;e.vx*=-.5;e.vy*=-.5}break}
 case 'printer':{e.vy=Math.min(MAXF,e.vy+GRAV*dt);e.vx*=.8;moveBody(e,dt);e.face=sign(dx)||e.face;
  if(e.state==='idle'&&e.aggro&&Math.abs(dy)<60&&Math.abs(dx)<260&&e.cd<=0&&atkToken(e,true)){e.state='wind';e.timer=.5;e.windT=.5}
  else if(e.state==='wind'&&e.timer<=0){e.state='idle';e.cd=1.8;e.atkT=.3;SFX.shoot();eproj({kind:'paper',x:e.x+e.face*10,y:e.y-9,vx:e.face*190,vy:0,r:5,dmg:e.dmg,life:3,breakable:true})}break}
 case 'popup':{const want=P.x-sign(dx)*120,tY=P.y-55;e.vx+=((e.aggro?want:e.hx)-e.x)*1.5*dt-e.vx*2*dt;e.vy+=((e.aggro?tY:e.hy)-e.y)*1.5*dt-e.vy*2*dt;e.x+=e.vx*dt;e.y+=e.vy*dt;e.face=sign(dx)||1;
  if(e.state==='idle'&&e.aggro&&e.cd<=0&&dist<240&&atkToken(e,true)){e.state='wind';e.timer=.45;e.windT=.45}
  else if(e.state==='wind'&&e.timer<=0){e.state='idle';e.cd=2.1;e.atkT=.3;const d=dist||1;SFX.shoot();eproj({kind:'x',x:e.x,y:e.y-8,vx:dx/d*160,vy:dy/d*160,r:4,dmg:e.dmg,life:3,breakable:true})}break}
 case 'firewall':{e.vy=Math.min(MAXF,e.vy+GRAV*dt);
  if(e.state==='idle'||e.state==='move'){if(e.aggro){e.face=sign(dx)||e.face;e.state='move';e.vx=e.face*36;if(Math.abs(dx)<46&&Math.abs(dy)<22&&e.cd<=0&&atkToken(e,false)){e.state='wind';e.timer=.6;e.windT=.6;e.vx=0;SFX.warn()}}else e.vx=0}
  else if(e.state==='wind'){e.vx=0;if(e.timer<=0){e.state='bash';e.timer=.26;e.vx=e.face*270}}
  else if(e.state==='bash'){if(Math.abs(dx)<e.w/2+7&&Math.abs(dy)<18)hurtPlayer(e.dmg,e.face,e);if(e.timer<=0||e.hitWall){e.state='tired';e.timer=1.0;e.vx=0}}
  else if(e.state==='tired'){e.vx*=.85;if(e.timer<=0){e.state='idle';e.cd=1.3}}
  const ox=e.x;moveBody(e,dt);if(e.onGround&&e.state==='move'){const ahead=Math.floor((e.x+e.face*(e.w/2+2))/TS),below=Math.floor((e.y+2)/TS);if(!tileAt(ahead,below)||e.hitWall){e.vx=0;e.x=ox}}break}
 case 'spray':case 'merge':case 'pm':newEnemyAI(e,dt,dx,dy,dist);break;
 case 'invite':{const d=dist||1,spd=e.aggro?72:0;e.vx+=(dx/d*spd-e.vx)*2*dt;e.vy+=(dy/d*spd-e.vy)*2*dt;e.x+=e.vx*dt;e.y+=e.vy*dt;e.face=sign(dx)||1;
  if(Math.abs(dx)<12&&Math.abs(dy)<16&&P.inv<=0&&P.rollT<=0){P.rootT=1.2;hurtPlayer(e.dmg,0,e);toast('被拉进了会议……',1200);e.hp=0;burst(e.x,e.y-6,12,['#f4f4f8','#3a6ad8'],120,.35)}break}}
 if(e.y>LV.h*TS+60)e.hp=0}}
// 新怪：喷漆罐（远处喷一片减速油漆）、合并冲突（瞬移到身后砍）、项目经理（给周围的怪加速，没人时拉人开会）
function groundWalk(e,dt,tv){e.vy=Math.min(MAXF,e.vy+GRAV*dt);e.vx=tv;const ox=e.x;moveBody(e,dt);if(e.onGround&&tv){const ahead=Math.floor((e.x+sign(tv)*(e.w/2+2))/TS),below=Math.floor((e.y+2)/TS);if(!tileAt(ahead,below)||e.hitWall){e.vx=0;e.x=ox}}}
function newEnemyAI(e,dt,dx,dy,dist){const adx=Math.abs(dx);
 if(e.type==='spray'){let tv=0;
  if(e.state==='idle'||e.state==='move'){if(e.aggro){e.face=sign(dx)||e.face;tv=adx>95?e.face*55:adx<55?-e.face*45:0;e.state='move';
    if(adx<92&&Math.abs(dy)<30&&e.cd<=0&&atkToken(e,true)){e.state='wind';e.timer=.55;e.windT=.55;SFX.warn()}}else tv=Math.sin(e.anim*.6)*18}
  else if(e.state==='wind'){if(e.timer<=0){e.state='spray';e.timer=.7;e.hitDone=false;SFX.shoot();
    for(let i=1;i<=3;i++){const px_=e.x+e.face*(14+i*20),gy=groundBelow(px_,e.y-20);if(Math.abs(gy-e.y)<40)projs.push({kind:'paint',from:'x',x:px_,y:gy,r:11,t:0,life:5+LV.floor})}}}
  else if(e.state==='spray'){const fx=dx*e.face;if(!e.hitDone&&fx>0&&fx<96&&Math.abs(dy)<26){if(hurtPlayer(e.dmg,e.face,e))e.hitDone=true}if(Math.random()<.8)part(e.x+e.face*rnd(8,70),e.y-rnd(14,26),e.face*rnd(20,60),rnd(0,40),pick(['#e8503a','#ff7a5a']),.3,2,200);if(e.timer<=0){e.state='idle';e.cd=2.2}}
  groundWalk(e,dt,tv);return}
 if(e.type==='merge'){let tv=0;
  if(e.state==='idle'||e.state==='move'){if(e.aggro){e.face=sign(dx)||e.face;e.state='move';tv=adx>16?e.face*40:0;
    if(dist<190&&e.cd<=0&&P.onGround&&atkToken(e,false)){const side=-(P.face||1),tx=P.x+side*26,gy=groundBelow(tx,P.y-30);
     if(!isSolid(Math.floor(tx/TS),Math.floor((gy-10)/TS))&&Math.abs(gy-P.y)<20){e.state='blinkw';e.timer=.5;e.windT=.5;e.tx=tx;e.ty=gy;SFX.warn()}else e.cd=.5}}else tv=Math.sin(e.anim*.5)*20}
  else if(e.state==='blinkw'){if(Math.random()<.5)part(e.tx+rnd(-8,8),e.ty-rnd(0,26),0,-20,pick(['#7af07a','#ff7a7a']),.3,2,0);
   if(e.timer<=0){burst(e.x,e.y-13,10,['#7af07a','#ff7a7a'],120,.3);e.x=e.tx;e.y=e.ty;e.vx=e.vy=0;e.face=sign(P.x-e.x)||1;burst(e.x,e.y-13,10,['#7af07a','#ff7a7a'],120,.3);SFX.djump();e.state='slashw';e.timer=.3;e.windT=.3}}
  else if(e.state==='slashw'){if(e.timer<=0){e.state='slash';e.timer=.16;e.hitDone=false;SFX.throw()}}
  else if(e.state==='slash'){const fx=(P.x-e.x)*e.face;if(!e.hitDone&&fx>-4&&fx<32&&Math.abs(dy)<22){if(hurtPlayer(e.dmg,e.face,e))e.hitDone=true}if(e.timer<=0){e.state='idle';e.cd=2.4}}
  groundWalk(e,dt,tv);return}
 if(e.type==='pm'){let tv=0;
  if(e.state==='idle'||e.state==='move'){if(e.aggro){e.face=sign(dx)||e.face;e.state='move';tv=adx<120?-e.face*50:adx>200?e.face*40:0;
    if(e.cd<=0&&dist<260){e.state='wind';e.timer=.8;e.windT=.8;SFX.warn()}}else tv=Math.sin(e.anim*.4)*15}
  else if(e.state==='wind'){if(e.timer<=0){e.state='rally';e.timer=.4;const near=enemies.filter(o=>o!==e&&o.hp>0&&Math.hypot(o.x-e.x,o.y-e.y)<170);
    if(near.length>=2){for(const o of near){o.hasteT=5;burst(o.x,o.y-o.h/2,6,['#ffd84a','#fff'],80,.3)}SFX.select();dmgNum(e.x,e.y-e.h-14,'加急！','#ffd84a',true)}
    else{for(const d of[-1,1]){const m=spawnEnemy({type:'invite',x:e.x+d*16,y:e.y-30},true);m.aggro=true;m.vy=-60}SFX.select();dmgNum(e.x,e.y-e.h-14,'开个会','#7fd8ff',true)}}}
  else if(e.state==='rally'){if(e.timer<=0){e.state='idle';e.cd=4.5}}
  groundWalk(e,dt,tv);return}}
// 怪物之间互相推开，不再叠成一坨
function separate(e,dt){if(ATK_STATES.includes(e.state))return;for(const o of enemies){if(o===e||o.hp<=0||o.fly!==e.fly)continue;const dx=e.x-o.x,dy=(e.y-e.h/2)-(o.y-o.h/2),minx=(e.w+o.w)*.45;
 if(Math.abs(dx)<minx&&Math.abs(dy)<(e.h+o.h)*.45){const push=(minx-Math.abs(dx))*(dx===0?(Math.random()<.5?-1:1):sign(dx))*6*dt;const nx=e.x+push;
  if(e.fly||(!isSolid(Math.floor((nx+sign(push)*e.w/2)/TS),Math.floor((e.y-2)/TS))&&tileAt(Math.floor(nx/TS),Math.floor((e.y+2)/TS))))e.x=nx;if(e.fly)e.y+=sign(dy||1)*(e.h*.45-Math.abs(dy))*3*dt}}}
// ===== 拾取物 =====
const pickups=[];
function updPickups(dt){for(let i=pickups.length-1;i>=0;i--){const k=pickups[i];
 if(k.k==='cell'){const dx=P.x-k.x,dy=P.y-14-k.y,d=Math.hypot(dx,dy);if(d<70||k.mag){k.mag=true;k.vx=dx/d*260;k.vy=dy/d*260}else{k.vy=(k.vy||0)+600*dt;k.vx=(k.vx||0)*.98}k.x+=k.vx*dt;k.y+=k.vy*dt;if(!k.mag){const gy=groundBelow(k.x,k.y-4);if(k.y>gy){k.y=gy;k.vy=0;k.vx=0}}if(d<10){P.cells++;SFX.cell();pickups.splice(i,1);hudCells();}continue}
 if(k.vy!==undefined&&k.vy!==0||k.k!=='door'&&k.k!=='chest'){k.vy=(k.vy||0)+600*dt;k.y+=k.vy*dt;const gy=groundBelow(k.x,k.y-6);if(k.y>gy){k.y=gy;k.vy=0}}
 if(k.dead){pickups.splice(i,1);continue}
 if(k.k==='bp'&&Math.abs(P.x-k.x)<14&&Math.abs(P.y-k.y)<24){pickups.splice(i,1);SFX.pick();(P.bps=P.bps||[]).push(k.id);toast('拾到图纸：'+BP_NAME[k.id]+'（活着到茶水间才能入库）',2200);continue}
 if(k.k==='scroll'&&Math.abs(P.x-k.x)<12&&Math.abs(P.y-k.y)<22){pickups.splice(i,1);SFX.pick();openScroll();continue}
 if(k.k==='tdoor')k.open=!k.used&&G.floorT<LV.tlimit;
 if(k.k==='food'&&Math.abs(P.x-k.x)<12&&Math.abs(P.y-k.y)<20){if(P.hp<P.maxHp){P.hp=Math.min(P.maxHp,P.hp+25);SFX.heal();burst(k.x,k.y-6,12,'#7af07a',100,.4);pickups.splice(i,1);hud();toast('便当！生命 +25')}}}}
function drawPickups(cx,cy,t){let near=null;for(const k of pickups){const x=R(k.x-cx),y=R(k.y-cy);if(x<-20||x>VW+20)continue;
 const pk=n=>useSpr&&sprReady('pk_'+n);
 if(k.k==='cell'&&pk('cell'))sprFrame('pk_cell',Math.floor(t*8+k.x),x,y-3,1,false,'center');
 else if(k.k==='food'&&pk('food'))sprFrame('pk_food',0,x,y,1);
 else if((k.k==='chest'||k.k==='cchest')&&pk(k.k)){sprFrame('pk_'+k.k,k.open?1:0,x,y,1);if(k.k==='cchest'&&!k.open){ctx.globalAlpha=.2+.12*Math.sin(t*4);pcirc(x,y-8,14,'#c87aff');ctx.globalAlpha=1}}
 else if(k.k==='crate'&&pk('crate')){const sx=(k.shake>0?(k.shake-=1/60,rnd(-1,1)):0);sprFrame('pk_crate',k.hp<8?1:0,x+sx,y,1)}
 else if(k.k==='scroll'&&pk('scroll'))sprFrame('pk_scroll',Math.floor(t*6),x,y-12+Math.sin(t*3)*2,1,false,'center');
 else if(k.k==='bp'&&pk('bp'))sprFrame('pk_bp',Math.floor(t*6),x,y-12+Math.sin(t*4)*2,1,false,'center');
 else if(k.k==='door'&&pk('door')){sprFrame('pk_door',k.open?1:0,x,y,1);if(k.open){ctx.globalAlpha=.2+.15*Math.sin(t*4);px(x-14,y-44,28,44,'#fff2a0');ctx.globalAlpha=1}}
 else if(k.k==='tdoor'&&pk('tdoor'))sprFrame('pk_tdoor',k.used?2:k.open?0:1,x,y,1);
 else if(k.k==='wireterm'&&pk('wireterm'))sprFrame('pk_wireterm',k.used?1:0,x,y,1);
 else if(k.k==='rush'&&pk('rush')){if(!k.used){sprFrame('pk_rush',Math.floor(t*4),x,y-12+Math.sin(t*4)*2,1,false,'center');pnum('!',x,y-30,'#ff5a4a',1)}}
 else if(k.k==='weapon'){const b=Math.sin(t*4)*2;ctx.globalAlpha=.35;pcirc(x,y-10+b,9,'#fff2a0');ctx.globalAlpha=1;drawIcon(k.w,x,y-10+b)}
 else if(k.k==='gymlift'){ctx.globalAlpha=.2+.15*Math.sin(t*3);px(x-18,y-66,36,66,'#c87aff');ctx.globalAlpha=1;ctx.font='bold 8px sans-serif';ctx.textAlign='center';const s='天台 · 健身房 ↑',tw=ctx.measureText(s).width+8;px(x-tw/2,y-78,tw,12,'#14121a');px(x-tw/2+1,y-77,tw-2,10,'#3a1a4a');ctx.fillStyle='#ffd84a';ctx.fillText(s,x,y-69);ctx.textAlign='left'}
 else if(k.k==='intern'){sprFrame('pk_intern',Math.floor(t*3)%Math.max(1,sprN('pk_intern')),x,y,1);if(Math.abs(P.x-k.x)<110&&Math.abs(P.y-k.y)<40){ctx.font='bold 8px sans-serif';ctx.textAlign='center';const s='实习生小卖部',tw=ctx.measureText(s).width+8;px(x-tw/2,y-48,tw,12,'#14121a');px(x-tw/2+1,y-47,tw-2,10,'#fff6c0');ctx.fillStyle='#14121a';ctx.fillText(s,x,y-39);ctx.textAlign='left'}}
 else if(k.k==='ware'){px(x-9,y-10,18,10,'#14121a');px(x-8,y-9,16,9,'#a87648');px(x-8,y-9,16,2,'#d8a878');const b=k.sold?0:Math.sin(t*4+k.x)*1.5,iy=y-20+b;
  if(!k.sold){ctx.globalAlpha=.3;pcirc(x,iy,8,'#fff2a0');ctx.globalAlpha=1;const it=k.item;
   sprFrame('pk_ware_'+it,0,x,iy,1,false,'center')}
  ctx.font='bold 7px sans-serif';ctx.textAlign='center';const s=k.sold?'已售':'✦'+k.c;ctx.fillStyle='#14121a';ctx.fillText(s,x+1,y+9);ctx.fillStyle=k.sold?'#9aa0a8':P.cells>=k.c?'#ffd84a':'#ff7a6a';ctx.fillText(s,x,y+8);ctx.textAlign='left'}
 if((k.k==='weapon'||k.k==='chest'&&!k.open||k.k==='cchest'&&!k.open||k.k==='door'&&k.open||k.k==='tdoor'&&k.open&&!k.used||(k.k==='wireterm'||k.k==='rush')&&!k.used||k.k==='ware'&&!k.sold||k.k==='gymlift')&&Math.abs(k.x-P.x)<18&&Math.abs(k.y-P.y)<24)near=k}
 return near}
function drawIcon(w,x,y){sprFrame('icon_'+w,0,x,y,1,false,'center')}
