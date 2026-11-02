// ===== 游戏流程 =====
// ===== 存档（局外进度）=====
const SAVE=(()=>{let d={maxLvl:0,bp:[],clears:0};try{const s=JSON.parse(localStorage.getItem('magame06')||'{}');if(s&&typeof s==='object')d=Object.assign(d,s)}catch(e){}if(!Array.isArray(d.bp))d.bp=[];return d})();
function saveGame(){try{localStorage.setItem('magame06',JSON.stringify(SAVE))}catch(e){}}
// 需要图纸解锁的武器和升级
const BP_ALL=['knife','boxcol','turret','render','keyframe','upg:jump','upg:crit','upg:cd'];
const BP_NAME={render:'渲染大剑',keyframe:'关键帧',knife:'切线刀',boxcol:'碰撞体方块',turret:'预制体炮台','upg:jump':'人体工学椅','upg:crit':'甲方满意','upg:cd':'快捷键大师'};
const unlocked=id=>!BP_ALL.includes(id)||SAVE.bp.includes(id);
// 加班等级：通关一次解锁下一级
const LVLS=['正常上班','敌人更硬更痛，Boss 更快，准时门更紧','+ 精英更多','+ 便当只带 1 个','+ 怪物更多，同时出招的怪 +1','+ 换楼层只回一半血'];
function commitBP(){const b=P.bps||[];P.bps=[];const nw=b.filter(x=>!SAVE.bp.includes(x));if(!nw.length)return'';SAVE.bp.push(...nw);saveGame();return'图纸入库：'+nw.map(x=>BP_NAME[x]).join('、')+'（以后的局里会出现）'}
const G={state:'title',lvl:0,floor:1,time:0,kills:0,deaths:0,bossDone:false,snap:null,hard:false,floorT:0,prev:null};
let hitstop=0,shake=0,slowmo=1,slowT=0,flashRed=0,T=0;const cam={x:0,y:0};
const UPG=[{id:'dmg',n:'灵感爆发',d:'所有伤害 +20%',ic:'💡'},{id:'hp',n:'加班体质',d:'最大生命 +30',ic:'💪'},{id:'roll',n:'摸鱼大师',d:'翻滚冷却 -35%，无敌更久',ic:'🐟'},{id:'spd',n:'速写手',d:'攻击速度 +18%',ic:'✍️'},
 {id:'flask',n:'多带个便当',d:'便当上限 +1',ic:'🍱'},{id:'steal',n:'落笔有神',d:'击败敌人回复 4 生命',ic:'🖌️'},{id:'jump',n:'人体工学椅',d:'空中跳跃 +1',ic:'🪑'},{id:'crit',n:'甲方满意',d:'暴击伤害 +60%',ic:'⭐'},{id:'cd',n:'快捷键大师',d:'副武器冷却 -30%',ic:'⌨️'},
 {id:'backup',t:1,n:'自动保存',d:'每层第一次受到致命伤害时保留 1 点生命，短暂无敌',ic:'💾'},{id:'chain',t:1,n:'连锁报错',d:'带灼烧的敌人死亡时爆炸，炸伤周围敌人并传染灼烧',ic:'💥'},
 {id:'hotkey',t:1,n:'热切换',d:'切换武器后副武器冷却立刻转好，换手斩伤害 +50%',ic:'🔁'},{id:'deadline',t:1,n:'截稿冲刺',d:'生命低于 35% 时伤害 +45%',ic:'⏰'},
 {id:'ghost',t:1,n:'甩锅',d:'完美闪避时原地爆炸，伤害并晕住周围敌人',ic:'🫥'},{id:'critheal',t:1,n:'甲方好评',d:'每次暴击回复 2 生命',ic:'👍'},
 {id:'overtime',t:1,n:'加班费',d:'每击败 10 个敌人，最大生命 +5',ic:'💰'},{id:'thorns',t:1,n:'反向需求',d:'受伤时震开并伤害身边的敌人',ic:'🌵'}];
function applyUpg(id){P.upg.push(id);if(id==='dmg')P.dmgMul*=1.2;if(id==='hp'){P.maxHp+=30}if(id==='roll')P.rollMul*=.65;if(id==='spd')P.spdMul*=1.18;if(id==='flask')P.maxFlasks++;if(id==='steal')P.steal+=4;if(id==='jump')P.airJumps++;if(id==='crit')P.critMul+=.6;if(id==='cd')P.cdMul*=.7}
// ===== HUD =====
function slotIcon(cv,w){const c=cv.getContext('2d');c.imageSmoothingEnabled=false;ctx.clearRect(0,0,24,24);ctx.fillStyle='rgba(0,0,0,0)';drawIcon(w,12,12);c.clearRect(0,0,cv.width,cv.height);c.drawImage(buf,0,0,24*RES,24*RES,0,0,cv.width,cv.height)}
function hud(){$('hpfill').style.width=(P.hp/P.maxHp*100)+'%';$('hprally').style.width=((P.hp+P.rally)/P.maxHp*100)+'%';$('hptxt').textContent=Math.ceil(P.hp)+' / '+P.maxHp;$('flasks').textContent='🍱'.repeat(P.flasks)+'▫'.repeat(Math.max(0,P.maxFlasks-P.flasks));
 $('stats').innerHTML=`<span class=s1>建模 ${P.stat.line}</span><span class=s2>地编 ${P.stat.color}</span><span class=s3>体力 ${P.stat.body}</span>`;
 const k1=P.prim+P.primLv+P.primAff.join()+P.primIdx+(P.primBag||[]).length,k2=P.sec+P.secLv+P.secAff.join()+P.secIdx+(P.secBag||[]).length;if(hud.p!==k1){hud.p=k1;slotIcon($('ic1'),P.prim);$('n1').textContent=wname(P.prim,P.primLv);$('b1').textContent=P.primBag.length>1?(P.primIdx+1)+'/'+P.primBag.length:'';$('a1').textContent=P.primAff.map(a=>AFF[a].n).join(' · ')}if(hud.s!==k2){hud.s=k2;slotIcon($('ic2'),P.sec);$('n2').textContent=wname(P.sec,P.secLv);$('b2').textContent=P.secBag.length>1?(P.secIdx+1)+'/'+P.secBag.length:'';$('a2').textContent=P.secAff.map(a=>AFF[a].n).join(' · ')}hudCells()}
function hudCells(){$('cells').textContent=P.cells}
let toastT=0,bannerT=0;
function toast(s,ms=1800){const t=$('toast');t.textContent=s;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),ms)}
function banner(a,b,ms=2200){$('bn1').textContent=a;$('bn2').textContent=b||'';const e=$('banner');e.classList.add('show');clearTimeout(bannerT);bannerT=setTimeout(()=>e.classList.remove('show'),ms)}
function bossBanner(name,quote){banner(name,quote,2600);$('bossname').textContent=name;$('bossname').classList.remove('flame');$('bossbar').classList.add('show')}
function show(id,v){$(id).classList.toggle('show',v)}
// ===== 楼层 =====
function loadFloor(n,fromRetry){G.floor=n;G.rush=null;genLevel(n);LV.tlimit=[0,110,140,160,90][n]*(G.hard?.8:1);G.floorT=0;enemies.length=0;projs.length=0;pickups.length=0;parts.length=0;fxs.length=0;corpses.length=0;splats.length=0;nums.length=0;boss=null;G.bossDone=false;G.bossLock=false;
 const keepHp=P.hp;resetPlayer(true);P.hp=G.lvl>=5&&!fromRetry&&n>1?Math.min(P.maxHp,keepHp+P.maxHp*.5):P.maxHp;P.flasks=P.maxFlasks;
 for(const s of LV.spawns)spawnEnemy(s);for(const k of LV.pick)pickups.push(Object.assign({vy:0},k));
 G.snap=JSON.stringify({prim:P.prim,sec:P.sec,primLv:P.primLv,primAff:P.primAff,secLv:P.secLv,secAff:P.secAff,stat:P.stat,cells:P.cells,dmgMul:P.dmgMul,spdMul:P.spdMul,rollMul:P.rollMul,cdMul:P.cdMul,airJumps:P.airJumps,steal:P.steal,critMul:P.critMul,maxHp:P.maxHp,maxFlasks:P.maxFlasks,upg:P.upg,bps:P.bps||[],curse:P.curse||0,primBag:P.primBag,secBag:P.secBag,primIdx:P.primIdx,secIdx:P.secIdx});
 cam.x=0;cam.y=8;G.state='play';Snd.play(LV.th.song);$('floor').textContent=LV.th.name;banner(LV.th.name,['','赶在下班前，穿过美术部','Bug 满地爬的研发部','最后一关：老板办公室','隐藏关卡：有人还在举铁'][n],2400);hud()}
function exitFloor(){if(G.state!=='play')return;SFX.door();if(G.floor<3){G.state='rest';openRest()}else{G.state='end';openEnd()}}
function playerDie(){G.deaths++;G.state='dead';Snd.play('rest');$('dcause').textContent=P.lastHit?'击倒你的是：'+P.lastHit:'';setTimeout(()=>{show('dead',true)},900)}
function retry(){show('dead',false);const s=JSON.parse(G.snap);Object.assign(P,s);P.cells=Math.floor(s.cells*.5);loadFloor(G.floor,true)}
// 灵感卷轴
const STATS={line:{n:'建模',d:'建模工具（主武器）与下劈伤害 +15%，生命 +10',c:'#e8783a'},color:{n:'地编',d:'地编工具（副武器、炮台、灼烧）伤害 +15%，冷却 -5%，生命 +10',c:'#3a8ad8'},body:{n:'体力',d:'最大生命 +25（并回复）',c:'#5ab85a'}};
let scrollOpts=[];
function openScroll(){G.prev=G.state==='scroll'?G.prev:G.state;G.state='scroll';const ks=Object.keys(STATS).sort(()=>Math.random()-.5).slice(0,2);scrollOpts=ks;const box=$('scards');box.innerHTML='';
 ks.forEach((k,i)=>{const s=STATS[k],d=document.createElement('button');d.className='card';d.style.borderColor=s.c;d.innerHTML=`<div class="ci" style="color:${s.c}">✦</div><div class="cn">${s.n} +1</div><div class="cd">${s.d}</div><div class="ck">${i+1}</div>`;d.onclick=()=>chooseScroll(i);box.appendChild(d)});show('scroll',true)}
function chooseScroll(i){if(G.state!=='scroll')return;const k=scrollOpts[i];P.stat[k]++;const add=k==='body'?25:10;P.maxHp+=add;P.hp+=add;SFX.heal();show('scroll',false);G.state=G.prev||'play';hud.p=hud.s=null;hud();if(G.state==='rest')rollShop();toast(STATS[k].n+' +1');}
// 茶水间
let restOpts=[];
function openRest(){Snd.play('rest');P.hp=G.lvl>=5?Math.min(P.maxHp,P.hp+P.maxHp*.5):P.maxHp;$('resttxt').textContent=(G.floor===3?'货梯缓缓上升，天台上传来杠铃落地的声音……最后整备一下。':'')+(G.lvl>=5?'喝口水，回了一半血，便当补满了。':'喝口水，生命和便当都补满了。');$('restbp').textContent=commitBP();P.flasks=P.maxFlasks;P.rally=0;rollRest();rollShop();show('rest',true)}
const SHOP=[{id:'flask',n:'加大便当盒',d:'便当上限 +1',c:55},{id:'scroll',n:'灵感卷轴',d:'选一项属性 +1',c:45},{id:'sharpen',n:'武器打磨',d:'主武器等级 +1',c:40},{id:'reforge',n:'重铸词缀',d:'重新随机主武器词缀',c:30}];
function rollShop(){const box=$('shop');box.innerHTML='';SHOP.forEach((s,i)=>{const b=document.createElement('button');b.className='sitem';const bought=P.bought&&P.bought.includes(s.id)&&s.id!=='scroll';b.disabled=P.cells<s.c||bought||(s.id==='sharpen'&&P.primLv>=5);b.innerHTML=`<b>${s.n}</b><span>${s.d}</span><i>✦ ${s.c}</i>`;b.onclick=()=>buy(s);box.appendChild(b)});$('reroll').disabled=P.cells<25;$('reroll').textContent=`花 25 灵感换一批升级（现有 ${P.cells}）`}
function buy(s){if(P.cells<s.c||G.state!=='rest')return;P.cells-=s.c;P.bought=(P.bought||[]).concat(s.id);SFX.pick();
 if(s.id==='flask'){P.maxFlasks++;P.flasks++}else if(s.id==='sharpen')P.primLv++;else if(s.id==='reforge'){const n=Math.max(1,P.primAff.length);P.primAff=rollAff(1,n)}else if(s.id==='scroll'){hudCells();openScroll();return}
 hud.p=hud.s=null;hud();rollShop();toast('买到了：'+s.n)}
function rollRest(){const pool=UPG.filter(u=>!(u.id==='jump'&&P.airJumps>=3)&&!(u.t&&P.upg.includes(u.id))&&unlocked('upg:'+u.id)).sort(()=>Math.random()-.5);const tal=pool.find(u=>u.t);restOpts=tal?[tal,...pool.filter(u=>u!==tal).slice(0,2)].sort(()=>Math.random()-.5):pool.slice(0,3);const box=$('cards');box.innerHTML='';
 restOpts.forEach((u,i)=>{const d=document.createElement('button');d.className='card';d.innerHTML=`<div class="ci">${u.ic}</div><div class="cn">${u.n}${u.t?'<span class=tal>天赋</span>':''}</div><div class="cd">${u.d}</div><div class="ck">${i+1}</div>`;d.onclick=()=>chooseRest(i);box.appendChild(d)});
 }
function chooseRest(i){if(G.state!=='rest')return;applyUpg(restOpts[i].id);SFX.pick();show('rest',false);P.bought=[];loadFloor(G.floor+1)}
$('reroll').onclick=()=>{if(P.cells>=25){P.cells-=25;SFX.select();rollRest();rollShop();hudCells()}};
// 结局
function openEnd(){Snd.play('end');show('hud',false);const tru=G.floor===4;$('etitle').textContent=tru?'真 · 下班了。':'下班了。';$('esub').textContent=tru?'连隐藏大佬都认可了你。明早七点，健身房见。':'踏实做事，好好生活。';const t=G.time;const bpMsg=commitBP();SAVE.clears++;let lvMsg='';if(G.lvl>=SAVE.maxLvl&&G.lvl<5){SAVE.maxLvl=G.lvl+1;lvMsg='解锁了加班等级 '+SAVE.maxLvl}saveGame();
 $('estat').innerHTML=(G.lvl?'<b style="color:#ff7a6a">加班等级 '+G.lvl+' 通关</b><br>':'')+(lvMsg?'<b style="color:#ffd84a">'+lvMsg+'</b><br>':'')+(bpMsg?'<b style="color:#7fd8ff">'+bpMsg+'</b><br>':'')+(!tru&&!SAVE.ljy?'<span style="opacity:.7">天台的灯还亮着……（打败老板后，Boss 房里的货梯能上天台）</span><br>':'')+`用时 <b>${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}</b>　击败 <b>${G.kills}</b>　倒下 <b>${G.deaths}</b> 次<br>灵感 <b>${P.cells}</b>　升级 ${P.upg.map(id=>UPG.find(u=>u.id===id).ic).join(' ')||'无'}`;setTimeout(()=>show('end',true),1800);G.endT=0}
function startGame(lvl){G.extra=false;Snd.unlock();G.lvl=clamp(lvl|0,0,SAVE.maxLvl);G.hard=G.lvl>=1;show('title',false);show('hud',true);resetPlayer(false);if(G.lvl>=3)P.maxFlasks=P.flasks=1;P.bought=[];P.bps=[];P.curse=0;G.time=0;G.kills=0;G.deaths=0;$('mode').textContent=G.lvl?'加班等级 '+G.lvl:'';loadFloor(1)}
let selLvl=SAVE.maxLvl;
function setLvl(v){selLvl=clamp(v,0,SAVE.maxLvl);$('lvln').textContent=selLvl;$('lvld').textContent=LVLS.slice(1,selLvl+1).join(' ')||LVLS[0];$('lvlm').disabled=selLvl<=0;$('lvlp').disabled=selLvl>=SAVE.maxLvl;$('bstart').textContent=selLvl?'开始加班':'开始上班';
 $('meta').textContent=`图纸 ${SAVE.bp.length}/${BP_ALL.length} 已解锁 · 通关 ${SAVE.clears} 次`+(SAVE.ljy?` · ★ 击败刘敬阳 ${SAVE.ljy} 次`:'')+(SAVE.maxLvl<5?` · 通关加班等级 ${SAVE.maxLvl} 可解锁下一级`:'')}
$('lvlm').onclick=()=>{setLvl(selLvl-1);SFX.select()};$('lvlp').onclick=()=>{setLvl(selLvl+1);SFX.select()};setLvl(selLvl);
$('bstart').onclick=()=>startGame(selLvl);
// 服装：素材到了才显示切换按钮（标题画面按 C 也能换）
const SKINS=[['','冬季卫衣'],['summer','夏季背心']];SKIN=SAVE.skin||'';
function skinBtn(){const ok=sprReady('player_summer_idle'),b=$('bskin');b.style.display=ok?'':'none';if(!ok)return;b.textContent='服装：'+SKINS.find(k=>k[0]===SKIN)[1]+'（C 切换）'}
function nextSkin(){if(!sprReady('player_summer_idle'))return;const i=SKINS.findIndex(k=>k[0]===SKIN);SKIN=SKINS[(i+1)%SKINS.length][0];SAVE.skin=SKIN;saveGame();skinBtn();SFX.select()}
$('bskin').onclick=nextSkin;
// 版本号与更新内容
$('ver').textContent=VERSION;
$('chglist').innerHTML=CHANGELOG.map(c=>`<h3>${c.v}<small>${c.date}</small></h3><ul>${c.items.map(i=>'<li>'+i+'</li>').join('')}</ul>`).join('');
const seenVer=(()=>{try{return localStorage.getItem('magame06_ver')}catch(e){return null}})();
if(seenVer!==VERSION)$('bchg').classList.add('new');
function showChanges(v){show('chg',v);if(v){$('bchg').classList.remove('new');try{localStorage.setItem('magame06_ver',VERSION)}catch(e){}}}
$('bchg').onclick=()=>{SFX.select();showChanges(true)};$('bchgx').onclick=()=>showChanges(false);$('bretry').onclick=retry;$('bagain').onclick=()=>{show('end',false);setLvl(SAVE.maxLvl);startGame(G.lvl<SAVE.maxLvl?G.lvl+1:G.lvl)};$('bresume').onclick=()=>togglePause(false);$('bmute').onclick=()=>{$('bmute').textContent=Snd.toggle()?'🔇':'🔊'};
function togglePause(v){if(G.state!=='play'&&G.state!=='pause')return;if(v)$('pstat').innerHTML=pauseStats()+`<br><small style="opacity:.6">${VERSION}</small>`;G.state=v?'pause':'play';show('pause',v)}
function pauseStats(){const r=[];r.push(`主武器 <b>${wname(P.prim,P.primLv)}</b> ${P.primAff.map(a=>'<em>'+AFF[a].n+'</em>').join(' ')}`);r.push(`副武器 <b>${wname(P.sec,P.secLv)}</b> ${P.secAff.map(a=>'<em>'+AFF[a].n+'</em>').join(' ')}`);
 r.push(`属性　建模 ${P.stat.line} · 地编 ${P.stat.color} · 体力 ${P.stat.body}`);if(P.upg.length)r.push('升级　'+P.upg.map(id=>{const u=UPG.find(q=>q.id===id);return u.ic+u.n}).join('　'));return r.join('<br>')}
// ===== 渲染 =====
const VIG=(()=>{const c=document.createElement('canvas');c.width=VW;c.height=VH;const g=c.getContext('2d');const gr=g.createRadialGradient(VW/2,VH/2,VH*.35,VW/2,VH/2,VH*.95);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(10,6,20,.45)');g.fillStyle=gr;g.fillRect(0,0,VW,VH);return c})();
function poseOf(){const p={},a=P.anim,spd=Math.abs(P.vx)/RUN;p.blink=P.blinkT<0;
 if(P.mantle){const k=Math.min(1,P.mantle.t/.17);p.armF=lerp(3,1.2,k);p.elbF=lerp(.2,1.4,k);p.armB=lerp(2.8,.8,k);p.legA=lerp(.2,1.2,k);p.kneeA=1.6;p.legB=-.2;p.kneeB=.8;p.crouch=lerp(0,4,k);p.lean=2;return p}
 if(P.healT>0){p.armF=2.7;p.elbF=.8;p.armB=.3;p.bob=0;return p}
 if(P.hurtT>0){p.lean=-2;p.armF=2.2;p.armB=2.4;p.legA=.3;p.legB=-.3;p.hurt=1;return p}
 if(!P.onGround){if(P.vy<0){p.legA=.6;p.kneeA=1.2;p.legB=-.2;p.kneeB=.4;p.armF=-.6;p.armB=.8}else{p.legA=.3;p.kneeA=.4;p.legB=-.4;p.kneeB=.6;p.armF=.9;p.armB=-.7}}
 else if(spd>.1){const ph=a*13;p.legA=Math.sin(ph)*.85;p.legB=-Math.sin(ph)*.85;p.kneeA=Math.max(0,-Math.cos(ph))*1.1;p.kneeB=Math.max(0,Math.cos(ph))*1.1;p.armF=-Math.sin(ph)*.7;p.armB=Math.sin(ph)*.7;p.elbF=p.elbB=.6;p.bob=Math.abs(Math.sin(ph))>.7?-1:0;p.lean=1}
 else{p.bob=Math.sin(a*2.4)>.3?1:0;p.armF=.15;p.armB=-.1;p.elbF=.3;p.legA=.08;p.legB=-.08}
 if(P.landT>0){p.crouch=2}
 if(P.atk){const d=P.atk.def;let k=P.atk.phase==='su'?0:P.atk.phase==='ac'?Math.min(1,P.atk.t/d.ac):1;
  if(d.thrust){p.armF=lerp(1.0,1.6,k);p.elbF=lerp(-.6,0,k);p.lean=lerp(-1,2,k);p.armB=-.6}else{p.armF=lerp(d.arc[0],d.arc[1],k);p.elbF=.1;p.lean=k>0?2:-1;p.armB=-.5}p.legA=.5;p.legB=-.5;p.kneeB=.5}
 if(P.dive){p.armF=0;p.elbF=0;p.armB=-.3;p.legA=.9;p.kneeA=1.6;p.legB=.6;p.kneeB=1.6;p.crouch=3}
 if(P.sprayT>0){p.armF=1.55;p.elbF=0;p.lean=1}
 if(P.parryT>0){p.armF=2.2;p.elbF=-.4;p.lean=-1}
 return p}
function drawPlayer(cx,cy){
 for(let i=ghosts.length-1;i>=0;i--){const g=ghosts[i];ctx.globalAlpha=g.t*2;ctx.save();ctx.translate(R(g.x-cx),R(g.y-cy-8));ctx.rotate(g.roll*g.face*22);px(-6,-6,12,12,'#7fd8ff');ctx.restore();ctx.globalAlpha=1}
 const x=P.x-cx,y=P.y-cy,flash=P.inv>0&&P.hurtT<=0&&P.rollT<=0&&Math.floor(P.inv*16)%2===0;
 if(P.rollT>0&&!(useSpr&&sprReady('player_roll'))){ctx.save();ctx.translate(R(x),R(y-8));ctx.rotate(-(ROLLT-P.rollT)/ROLLT*Math.PI*2*P.face);drawMan(0,8,P.face,{crouch:6,legA:1.2,kneeA:2,legB:1,kneeB:2,armF:1.8,elbF:1.4,armB:1.4,lean:2,headY:3},false);ctx.restore();return}
 if(P.djT>0&&!P.atk&&P.hurtT<=0&&!(useSpr&&sprReady('player_roll'))){ctx.save();ctx.translate(R(x),R(y-12));ctx.rotate((1-P.djT/.3)*Math.PI*2*P.face);drawMan(0,12,P.face,{crouch:4,legA:1,kneeA:1.8,legB:.8,kneeB:1.8,armF:1.6,elbF:1.2,armB:1.2,lean:1,headY:2},false);ctx.restore();return}
 // 新美术：有素材就用序列帧（T 键切换新旧）
 if(useSpr&&sprReady('player_idle')&&drawPlayerSpr(x,y,flash))return
 const pose=poseOf();if(LV.floor!==1){ctx.globalAlpha=.32;for(const[ox,oy]of[[-1,0],[1,0],[0,-1],[0,1]])drawMan(x+ox,y+oy,P.face,pose,true);ctx.globalAlpha=1}
 if(flash){ctx.globalAlpha=.5}
 const h=drawMan(x,y,P.face,pose,false);ctx.globalAlpha=1;
 // 武器
 const W=WEAPONS[P.prim],kind=P.prim;
 if(P.dive){drawWeaponAt(kind,h.hx,h.hy,0,P.face);ctx.globalAlpha=.5;pline(x,y-30,x,y-48,2,W.col);ctx.globalAlpha=1}
 else if(P.atk){const d=P.atk.def;const ang=pose.armF+pose.elbF*.5;drawWeaponAt(kind,h.hx,h.hy,ang,P.face);
  if(P.atk.phase==='ac'){ctx.globalAlpha=.7;if(d.thrust){pline(x+P.face*6,y-18,x+P.face*d.rng,y-18,2,W.col);px(x+P.face*d.rng-1,y-19,3,3,'#fff')}else smear(x,y-20,8,d.rng-2,d.arc[0],lerp(d.arc[0],d.arc[1],Math.min(1,P.atk.t/d.ac)),P.face,W.col);ctx.globalAlpha=1}}
 else if(P.healT>0){px(h.hx-4,h.hy-4,8,5,'#c8553d');px(h.hx-4,h.hy-5,8,2,'#f4f1ea')}
 else if(P.sprayT>0){drawIcon('airbrush',h.hx+P.face*3,h.hy)}
 else if(P.parryT>0){px(h.hx-3,h.hy-8,7,12,'#f2a0b0');px(h.hx-3,h.hy-8,7,4,'#3a6ad8')}
 else drawWeaponAt(kind,h.hx,h.hy,.5,P.face)}
// 每帧前手位置来自 art/**/anchors.json（帧左上角为原点），换算成相对脚底中心
function handOf(n0,fi){const AA=typeof ART_ANCHOR!=='undefined'?ART_ANCHOR:{},n=skinOf(n0),a=AA[n]||AA[n0];if(!a||!sprReady(n))return null;const c=sprN(n),s=SPRS[n]||1,L=SPR[n].naturalHeight/s;fi=((fi%c)+c)%c;return a[fi]?[a[fi][0]/s-L/2,a[fi][1]/s-L]:null}
// 没有专属连击素材的武器借用雕刻笔：连击段 → 雕刻笔第几刀
const ATK_SEG={stylus:[0,1,2],marker:[2,1],ruler:[0,0,2],knife:[0,1,0,2],whip:[0,1,2],shears:[0,1],render:[2,1]};
function drawPlayerSpr(x,y,flash){let n='player_idle',fi=Math.floor(P.anim*5),hand=[5,-20],wang=.5,noW=false;const W=WEAPONS[P.prim];
 const has=k=>sprReady(k),prog=(t,d)=>Math.max(0,Math.min(.999,t/d));
 if(P.dead&&has('player_die')){n='player_die';const t=T-(P.deadAt||T);fi=Math.min(5,Math.floor(t/.14));if(fi>=3)fi=5;noW=true}
 else if(P.mantle&&has('player_mantle')){n='player_mantle';fi=Math.floor(prog(P.mantle.t,.17)*4);noW=true}
 else if(P.rollT>0&&has('player_roll')){n='player_roll';fi=Math.floor(prog(ROLLT-P.rollT,ROLLT)*6);noW=true}
 else if(P.djT>0&&!P.atk&&P.hurtT<=0&&has('player_djump')){n='player_djump';fi=Math.floor(prog(.3-P.djT,.3)*4);noW=true}
 else if(P.hurtT>0&&has('player_hurt')){n='player_hurt';fi=P.hurtT>.17?0:1}
 else if(P.healT>0&&has('player_heal')){n='player_heal';fi=Math.floor(prog(.45-P.healT,.45)*4);noW=true}
 else if(P.parryT>0&&has('player_parry')){n='player_parry';fi=P.parryT>.2?0:1;noW=true}
 else if(P.sprayT>0&&has('player_spray')){n='player_spray';fi=1;noW=true}
 else if(P.dive&&has('player_dive')){n='player_dive';fi=Math.min(2,Math.floor((P.anim-(P.diveAt||0))/.06));wang=0;hand=handOf(n,fi)}
 else if(P.diveLandT>0&&has('player_dive_land')){n='player_dive_land';fi=Math.floor(prog(.3-P.diveLandT,.3)*3);wang=0;hand=handOf(n,fi)}
 else if(P.chargeT>.08&&P.prim==='render'&&!P.atk&&has('player_charge')){n='player_charge';fi=Math.floor(P.anim*6)%3;wang=3.0;hand=handOf(n,fi)}
 else if(P.atk){const a=P.atk,d=a.def,k=a.phase==='su'?0:a.phase==='ac'?(a.t<d.ac/2?1:2):3;
  wang=d.thrust?1.57:a.phase==='su'?d.arc[0]:a.phase==='ac'?lerp(d.arc[0],d.arc[1],Math.min(1,a.t/d.ac)):d.arc[1];
  if(d.dash&&has('player_atk_dash')){n='player_atk_dash';fi=a.phase==='su'?0:a.phase==='ac'?(a.t<d.ac/2?1:2):(a.t<d.re/2?3:4)}
  else if(has('player_atk_'+P.prim)){n='player_atk_'+P.prim;fi=Math.min(a.idx,Math.floor(sprN(n)/4)-1)*4+k}
  else if(has('player_atk_stylus')){const segs=ATK_SEG[P.prim]||[0,1,2];n='player_atk_stylus';fi=segs[Math.min(a.idx,segs.length-1)]*4+k}
  hand=handOf(n,fi)||hand}
 else if(!P.onGround&&P.vy<0&&has('player_jump')){n='player_jump';fi=P.anim-(P.jumpAt||0)<.07?0:1}
 else if(!P.onGround&&has('player_fall')){n='player_fall';fi=groundBelow(P.x,P.y)-P.y<26?1:0;hand=[14,-28];wang=1.6}
 else if(P.landT>0&&has('player_land')){n='player_land';fi=P.landT>.06?0:1;hand=[8,-14]}
 else if(P.onGround&&Math.abs(P.vx)>20){n='player_run';P.runD=(P.runD||0)+Math.abs(P.vx)/60;fi=Math.floor(P.runD*.21);hand=[10,-24];wang=P.prim==='ruler'?1.45:2.3}
 // 跑步、待机、跳跃等动作也按每帧手的位置挂武器，武器跟着手动
 if(!noW&&!P.atk&&!P.dive&&!(P.diveLandT>0)){const ha=handOf(n,fi);if(ha)hand=ha}
 if(LV.floor!==1){ctx.globalAlpha=.3;for(const[ox,oy]of[[-1,0],[1,0],[0,-1],[0,1]])sprFrame(n,fi,x+ox,y+oy,P.face);ctx.globalAlpha=1}
 if(flash)ctx.globalAlpha=.5;
 sprFrame(n,fi,x,y,P.face);
 // 武器：雕刻笔用素材，其他武器暂用代码画；格挡、喷涂等道具已画在人物图里
 if(!noW&&hand){const hx=x+hand[0]*P.face,hy=y+hand[1];const wn='weapon_'+P.prim;if(has(wn)){const im=SPR[wn],s=SPRS[wn]||1,g=(ART_ANCHOR[wn]||{}).grip||[im.naturalWidth/2,im.naturalHeight/2],base=P.prim==='ruler'?1.57:2.36;ctx.save();ctx.translate(R(hx),R(hy));ctx.scale(P.face,1);ctx.rotate(-(wang-base));ctx.drawImage(im,-g[0]/s,-g[1]/s,im.naturalWidth/s,im.naturalHeight/s);ctx.restore()}else drawWeaponAt(P.prim,hx,hy,wang,P.face)}
 ctx.globalAlpha=1;
 if(P.atk&&P.atk.phase==='ac'){const d=P.atk.def;ctx.globalAlpha=.75;if(d.thrust){pline(x+P.face*6,y-26,x+P.face*(d.rng+4),y-26,2,W.col);px(x+P.face*(d.rng+4)-1,y-27,3,3,'#fff')}else smear(x,y-26,Math.max(10,d.rng-6),d.rng+6,d.arc[0],lerp(d.arc[0],d.arc[1],Math.min(1,P.atk.t/d.ac)),P.face,W.col);ctx.globalAlpha=1}
 if(P.dive){ctx.globalAlpha=.5;pline(x,y-40,x,y-58,2,W.col);ctx.globalAlpha=1}
 return true}
function drawRoom(cx,cy){const r=LV.room;if(!r)return;const mx=R((r.x0+r.x1)/2-cx),gy=R(r.g*TS-cy);if(mx<-200||mx>VW+200)return;
 const by=gy-7*TS-20;px(mx-30,by,60,16,'#2a2030');px(mx-29,by+1,58,14,r.state===2?'#3a6a3a':r.state===1?'#8a2a2a':'#3a3458');ctx.font='bold 9px sans-serif';ctx.textAlign='center';ctx.fillStyle='#14121a';ctx.fillText('评审会',mx+1,by+12);ctx.fillStyle='#fff6c0';ctx.fillText('评审会',mx,by+11);ctx.textAlign='left';
 if(r.state===1){ctx.globalAlpha=.35+.2*Math.sin(T*8);for(const c of[r.tx,r.tx+r.len-1])px(c*TS-cx,2*TS-cy,TS,(r.g-2)*TS,'#ff3a3a');ctx.globalAlpha=1}}
function render(){const th=LV.th,cx=R(cam.x+(Math.random()-.5)*shake*2),cy=R(cam.y+(Math.random()-.5)*shake*2);
 drawBackground(cx,cy,T);
 for(const d of LV.decor)if(d.k!=='window'&&d.k!=='lamp'&&d.k!=='sign')drawDecor(d,cx,cy,th,T);
 drawLights(cx,cy,T);
 for(const s of LV.signs){const x=R(s.x-cx),y=R(s.y-cy);if(x>-100&&x<VW+100){}}
 for(const s of splats){ctx.globalAlpha=Math.min(1,s.life);px(s.x-cx,s.y-cy-1,s.w,2,s.col);ctx.globalAlpha=1}
 const near=drawPickups(cx,cy,T);
 drawTiles(cx,cy);drawRoom(cx,cy);
 if(boss){drawLjyDragon(boss,cx,cy);drawLjyTornado(boss,cx,cy,false);ctx.globalAlpha=boss.alpha===undefined?1:clamp(boss.alpha,0,1);drawBoss(boss,cx,cy);ctx.globalAlpha=1;drawLjyTornado(boss,cx,cy,true);drawBossExtras(cx,cy)}
 for(const e of enemies)if(Math.abs(e.x-cx-VW/2)<VW)drawEnemy(e,cx,cy);
 ctx.font='bold 8px sans-serif';ctx.textAlign='center';for(const e of enemies)if(e.affix&&e.hp>0&&Math.abs(e.x-cx-VW/2)<VW/2+20){const a=EAFFIX[e.affix],x=R(e.x-cx),y=R(e.y-cy-e.h-10);ctx.fillStyle='#14121a';ctx.fillText(a.n,x+1,y+1);ctx.fillStyle=a.c;ctx.fillText(a.n,x,y)}ctx.textAlign='left';
 for(const e of enemies)if(e.hp<e.max&&e.hp>0){const x=R(e.x-cx-8),y=R(e.y-cy-e.h-6);px(x,y,16,2,'#2a2030');px(x,y,R(16*e.hp/e.max),2,e.elite?'#ffb84a':'#ff5a4a')}
 drawCorpses(cx,cy);drawProjs(cx,cy);
 if(P.kfMark){const mx=R(P.kfMark.x-cx),my=R(P.kfMark.y-cy);ctx.globalAlpha=.4+.25*Math.sin(T*8);ctx.save();ctx.translate(mx,my-18);ctx.rotate(Math.PI/4);px(-5,-5,10,10,'#c8a0ff');px(-2,-2,4,4,'#fff');ctx.restore();px(mx-6,my-1,12,1,'#c8a0ff');ctx.globalAlpha=1;pnum(String(Math.ceil(P.kfMark.t)),mx,my-34,'#c8a0ff',1)}
 if(G.state!=='dead'||Math.floor(T*8)%2||(useSpr&&sprReady('player_die')))drawPlayer(cx,cy);
 if(P.chargeT>.08&&P.prim==='render'){const k=Math.min(1,P.chargeT/.55),x=R(P.x-cx),y=R(P.y-cy);px(x-8,y-48,16,2,'#2a2030');px(x-8,y-48,R(16*k),2,k>=1?'#fff6c0':'#ffd84a')}
 drawFx(cx,cy);drawParts(cx,cy);drawNear(cx,cy);drawNums(cx,cy);if(boss)drawLjyCine(cx,cy);
 ctx.drawImage(VIG,0,0);
 if(flashRed>0){ctx.fillStyle=`rgba(216,40,40,${flashRed*.6})`;ctx.fillRect(0,0,VW,VH)}
 if(slowT>0){ctx.fillStyle='rgba(255,255,255,.06)';ctx.fillRect(0,0,VW,VH)}
 // 提示
 const pr=$('prompt');if(near&&!G.wheel){let s='';if(near.k==='weapon'){const W=WEAPONS[near.w],old=W.slot===1?P.prim:P.sec,af=(near.aff||[]).map(a=>`<em>${AFF[a].n}</em>${AFF[a].d}`).join('　');{const bag=W.slot===1?P.primBag:P.secBag,room=bag.length<BAG_MAX;s=`<b>E</b> 拾取 ${wname(near.w,near.lv)}<small>${W.desc}　（${room?'放进背包 '+(bag.length+1)+'/'+BAG_MAX:'替换当前的'+WEAPONS[old].name}）</small>${af?'<small class=af>'+af+'</small>':''}`}}else if(near.k==='gymlift'){s='<b>E</b> 坐货梯上天台<small>隐藏关卡：先在茶水间整备，再去天台挑战隐藏大佬。走右边的门就是正常下班</small>'}else if(near.k==='ware'){const W=WARES[near.item];s=`<b>E</b> 买下 ${W.n}　✦ ${near.c}<small>${W.d}${P.cells<near.c?'　（灵感不够，现有 '+P.cells+'）':''}</small>`}else if(near.k==='chest')s='<b>E</b> 打开宝箱';else if(near.k==='cchest')s=`<b>E</b> 签加班合同<small>奖励一把高级武器 + 卷轴 + 灵感；但击败 ${8+LV.floor*3} 个敌人之前，受到的伤害翻倍</small>`;else if(near.k==='tdoor')s='<b>E</b> 打开准时下班门';else if(near.k==='wireterm')s='<b>E</b> 补模型<small>这里有一段没做完的场景，地编的活儿</small>';else if(near.k==='rush')s=`<b>E</b> 接下加急任务<small>限时清掉刷出来的怪，奖励高级武器</small>`;else s=`<b>E</b> ${G.floor<3?'进入茶水间':'下班！'}`;if(pr.dataset.s!==s){pr.innerHTML=s;pr.dataset.s=s}pr.classList.add('show')}else pr.classList.remove('show')}
function updCamera(dt){let tx=P.x-VW/2+P.face*36,ty=P.y-175;
 if(boss||G.bossLock){tx=LV.arenaX}
 tx=clamp(tx,0,LV.w*TS-VW);ty=clamp(ty,0,LV.h*TS-VH);cam.x=lerp(cam.x,tx,1-Math.exp(-6*dt));cam.y=lerp(cam.y,ty,1-Math.exp(-6*dt))}
function step(dt){T+=dt;
 if(slowT>0){slowT-=dt/Math.max(slowmo,.01);if(slowT<=0)slowmo=1}
 shake=Math.max(0,shake-dt*20);flashRed=Math.max(0,flashRed-dt*2);
 for(let i=ghosts.length-1;i>=0;i--){ghosts[i].t-=dt;if(ghosts[i].t<=0)ghosts.splice(i,1)}
 if(G.state==='play'){G.time+=dt;G.floorT+=dt;
  if(!P.dead)playerUpdate(dt);updEnemies(dt);bossUpdate(dt);updProjs(dt);updPickups(dt);updBoxes(dt);updRush(dt);updRoom(dt);
  if(!boss&&!G.bossDone&&P.x>LV.arenaX+4*TS){LV.gate.active=true;G.bossLock=true;spawnBoss(LV.th.boss)}
  if(boss){const b=$('bossfill');b.style.width=Math.max(0,boss.hp/boss.max*100)+'%';const s=$('bossstag');s.style.width=(boss.state==='stagger'?Math.max(0,1-boss.t/2.3):Math.min(1,boss.stag/boss.stagMax))*100+'%';s.classList.toggle('on',boss.state==='stagger'||boss.stagPend)}
  for(const s of splats)s.life-=dt*.15}
 else if(G.state==='dead'){updProjs(dt);P.vy=Math.min(MAXF,P.vy+GRAV*dt);P.vx*=.9;moveBody(P,dt)}
 updParts(dt);updNums(dt);updFx(dt);updCorpses(dt);if(LV)updCamera(dt)}
// 标题画面
function renderTitle(){if(!LV)genLevel(1);const th=THEME[1],sx=(T*20)%(LV.arenaX-VW);
 // 前景大号马楠只跟随实心地面（不踩悬空平台），镜头随地面高度平滑升降
 let gyT=19*TS;for(let ty=3;ty<HT;ty++)if(tileAt(Math.floor((sx+360)/TS),ty)===1){gyT=ty*TS;break}renderTitle.gy=renderTitle.gy===undefined?gyT:lerp(renderTitle.gy,gyT,.06);
 const sy=R(clamp(renderTitle.gy-206,0,LV.h*TS-VH));drawBackground(sx,sy,T);for(const d of LV.decor)if(d.k!=='window'&&d.k!=='lamp'&&d.k!=='sign')drawDecor(d,sx,sy,th,T);drawTiles(sx,sy);
 ctx.save();ctx.translate(360,R(renderTitle.gy-sy));ctx.scale(3,3);const ph=T*10;if(useSpr&&sprReady('player_run')){sprFrame('player_run',Math.floor(T*12),0,0,-1);ctx.restore();ctx.drawImage(VIG,0,0);return}drawMan(0,0,-1,{legA:Math.sin(ph)*.8,legB:-Math.sin(ph)*.8,kneeA:Math.max(0,-Math.cos(ph)),kneeB:Math.max(0,Math.cos(ph)),armF:-Math.sin(ph)*.7,armB:Math.sin(ph)*.7,elbF:.6,elbB:.6,lean:1,bob:Math.abs(Math.sin(ph))>.7?-1:0,blink:(T%3)<.12},false);drawWeaponAt('stylus',-3,-12,.5,-1);ctx.restore();ctx.drawImage(VIG,0,0)}
function renderEnd(){G.endT=(G.endT||0)+1/60;const t=G.endT,gy=Math.round(VH*.83);const g=ctx.createLinearGradient(0,0,0,VH);g.addColorStop(0,'#3a3a7a');g.addColorStop(.55,'#f28a5a');g.addColorStop(1,'#ffd08a');ctx.fillStyle=g;ctx.fillRect(0,0,VW,VH);
 pcirc(Math.round(VW*.72),Math.round(VH*.58),30,'#ffe2a0');for(let i=0;i<14;i++){const bx=i*40-((t*10)%40),bh=40+((i*37)%60);px(bx,gy-bh,34,bh,'#3a2a4a');for(let k=0;k<6;k++)if((i+k)%3)px(bx+5+(k%2)*14,gy-bh+8+Math.floor(k/2)*14,5,7,'#ffd27a')}
 px(0,gy,VW,VH-gy,'#2a2030');for(let x=0;x<VW+40;x+=40)px(x-((t*30)%40),gy+20,20,3,'#5a4a5a');
 ctx.save();ctx.translate(Math.round(VW*.16+((t*14)%(VW*.1))),gy);ctx.scale(2,2);const ph=t*9;if(useSpr&&sprReady('player_run')){sprFrame('player_run',Math.floor(t*10),0,0,1);ctx.restore();return}drawMan(0,0,1,{legA:Math.sin(ph)*.6,legB:-Math.sin(ph)*.6,kneeA:Math.max(0,-Math.cos(ph))*.8,kneeB:Math.max(0,Math.cos(ph))*.8,armF:-Math.sin(ph)*.5,armB:Math.sin(ph)*.5,elbF:.4,elbB:.4,bob:Math.abs(Math.sin(ph))>.7?-1:0},false);ctx.restore()}
function uiTick(){if(G.state!=='play')return;const fl=P.flow||0,fe=$('flow');if(fl>=3){const tier=fl>=50?3:fl>=25?2:fl>=10?1:0;fe.innerHTML=`心流 ×${fl}${tier?` <i>+${tier*10}%</i>`:''}`;fe.className='t'+tier}else fe.innerHTML='';
 $('curse').textContent=P.curse>0?`加班合同：再击败 ${P.curse} 个，受到伤害 ×2`:'';
 const re=$('rush');if(LV.room&&LV.room.state===1){const r=LV.room;re.textContent=r.delay>0&&r.wave>0?'评审会 · 第二轮马上开始':`评审会 · 第 ${Math.max(1,r.wave)}/2 轮 · 剩 ${r.list?r.list.filter(e=>e.hp>0).length:0}`}else if(G.rush){const left=G.rush.list.filter(e=>e.hp>0).length;re.textContent=`加急任务 ${Math.ceil(G.rush.t)}s · 剩 ${left}/${G.rush.total}`}else re.textContent='';
 const cd=secCd();$('hprally').style.width=((P.hp+P.rally)/P.maxHp*100)+'%';
 const td=$('tdoor'),left=LV.tlimit-G.floorT,tdk=LV.pick&&pickups.find(k=>k.k==='tdoor');if(tdk&&!tdk.used&&left>0&&!boss&&!G.bossDone){td.textContent='准时下班门 '+Math.floor(left/60)+':'+String(Math.floor(left%60)).padStart(2,'0');td.className=left<20?'warn':''}else td.textContent='';$('cd2').style.height=(Math.max(0,P.skillCd)/cd*100)+'%';const t=G.time;$('timer').textContent=Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');
 if(Math.floor(T*10)!==uiTick.k){uiTick.k=Math.floor(T*10);$('hpfill').style.width=(P.hp/P.maxHp*100)+'%';$('hptxt').textContent=Math.ceil(P.hp)+' / '+P.maxHp}}
// ===== 武器轮盘：按住 R / F 打开，J/L 或 ←/→ 选择，松开切换；打开时背景模糊、慢动作 =====
function wheelOpen(slot){const bag=slot===1?P.primBag:P.secBag;G.wheel={slot,sel:slot===1?P.primIdx:P.secIdx};$('screen').classList.add('blur');wheelDraw();show('wheel',true);SFX.select()}
function wheelClose(apply){const w=G.wheel;if(!w)return;G.wheel=null;$('screen').classList.remove('blur');show('wheel',false);
 const cur=w.slot===1?P.primIdx:P.secIdx;if(apply&&w.sel!==cur){equipFromBag(w.slot,w.sel);hud();SFX.pick();if(P.swapCd<=0){P.swapCd=4;if(w.slot===1)P.swapBuff=3;if(hasU('hotkey')){P.skillCd=0;P.kfMark=null;if(w.slot===2)P.swapBuff=3}ringFx(P.x,P.y-18,'#7fd8ff')}toast('换上了 '+(w.slot===1?wname(P.prim,P.primLv):wname(P.sec,P.secLv)),1000)}}
function wheelDraw(){const w=G.wheel,bag=w.slot===1?P.primBag:P.secBag,cur=w.slot===1?P.primIdx:P.secIdx;
 // 先把当前装备同步回背包，显示的等级、词缀才是最新的
 if(w.slot===1)P.primBag[P.primIdx]={w:P.prim,lv:P.primLv,aff:P.primAff};else P.secBag[P.secIdx]={w:P.sec,lv:P.secLv,aff:P.secAff};
 $('wtitle').textContent=(w.slot===1?'建模工具（主武器）':'地编工具（副武器）')+'  '+bag.length+'/'+BAG_MAX;
 const box=$('wcards');box.innerHTML='';
 for(let i=0;i<BAG_MAX;i++){const it=bag[i],d=document.createElement('div');d.className='wcard'+(i===w.sel?' sel':'')+(it?'':' empty');
  if(it){const cv=document.createElement('canvas');cv.width=48;cv.height=48;d.appendChild(cv);slotIcon(cv,it.w);const n=document.createElement('div');n.className='wn';n.textContent=wname(it.w,it.lv);d.appendChild(n);if(i===cur){const c=document.createElement('div');c.className='wc';c.textContent='使用中';d.appendChild(c)}
   const ds=document.createElement('div');ds.className='wd';ds.textContent=WEAPONS[it.w].desc;d.appendChild(ds);if(it.aff&&it.aff.length){const af=document.createElement('div');af.className='wa';af.textContent=it.aff.map(a=>AFF[a].n).join(' · ');d.appendChild(af)}}
  else{const n=document.createElement('div');n.className='wn';n.textContent='空位';d.appendChild(n);const ds=document.createElement('div');ds.className='wd';ds.textContent='捡到新武器会放进这里';d.appendChild(ds)}
  box.appendChild(d)}
 $('whint').innerHTML='<b>J</b>/<b>L</b> 或 <b>←</b>/<b>→</b> 选择　松开 <b>'+(w.slot===1?'R':'F')+'</b> 换上'}
function wheelUpdate(){if(G.state!=='play'){if(G.wheel)wheelClose(false);return}
 if(!G.wheel){if(pressed('wheel1'))wheelOpen(1);else if(pressed('wheel2'))wheelOpen(2);return}
 const w=G.wheel,bag=w.slot===1?P.primBag:P.secBag,held=down(w.slot===1?'wheel1':'wheel2');
 if(!held){wheelClose(true);return}
 if(pressed('wl')){w.sel=(w.sel-1+bag.length)%bag.length;SFX.select();wheelDraw()}
 if(pressed('wr')){w.sel=(w.sel+1)%bag.length;SFX.select();wheelDraw()}
 for(const k in KP)if(/Key[JKL]|Space|Shift|Mouse/.test(k))delete KP[k]}
// ===== 主循环 =====
let last=0;
function frame(ts){requestAnimationFrame(frame);try{let dt=Math.min(.05,(ts-last)/1000||.016);last=ts;
 pollPad();if(pressed('pause')){if(G.wheel)wheelClose(false);togglePause(G.state==='play')}
 wheelUpdate();
 if(G.state==='scroll'){if(pressed('opt1'))chooseScroll(0);else if(pressed('opt2'))chooseScroll(1)}
 if(G.state==='rest'){if(pressed('opt1'))chooseRest(0);else if(pressed('opt2'))chooseRest(1);else if(pressed('opt3'))chooseRest(2)}
 if(G.state==='dead'&&(pressed('confirm')||KP['Space'])&&$('dead').classList.contains('show'))retry();
 if(G.state==='title'&&$('chg').classList.contains('show')){if(pressed('confirm')||pressed('pause'))showChanges(false)}
 else if(G.state==='title'){if(!skinBtn.ok&&sprReady('player_summer_idle')){skinBtn.ok=1;skinBtn()}if(pressed('skin'))nextSkin();if(pressed('confirm'))startGame(selLvl);if(pressed('left'))setLvl(selLvl-1);if(pressed('right'))setLvl(selLvl+1)}
 // 调试用：Shift+F8 切换新旧美术（以前是 T，太容易误按）
 if(KP['F8']&&(K['ShiftLeft']||K['ShiftRight'])&&G.state==='play'){useSpr=!useSpr;toast(useSpr?'新美术':'旧美术（代码像素），再按 Shift+F8 切回',1500)}
 if(KP['KeyM'])$('bmute').textContent=Snd.toggle()?'🔇':'🔊';
 if(G.state==='title'){T+=dt;renderTitle()}
 else if(G.state==='end'){T+=dt;renderEnd()}
 else if(G.state==='pause'||G.state==='rest'||G.state==='scroll'){render()}
 else{let d=dt*slowmo;if(G.wheel)d=dt*.12;if(hitstop>0){hitstop-=dt;d*=.04}step(d);render()}
 uiTick();present();clearPressed()}catch(e){__err(e)}}
requestAnimationFrame(frame);
