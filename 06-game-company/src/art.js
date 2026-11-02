// ===== 美术 =====
const R=Math.round;
// ===== 外部美术素材（art/ 下的 png，由 build.py 内嵌）=====
// ART_SRC 的值是 dataURI，或 {src,s}：s=2 表示 @2x 素材（每帧像素是逻辑尺寸的 2 倍）
const SPR={},SPRS={};let useSpr=true;
// 素材加载失败（例如只拷了 index.html 没带 art 文件夹）时提示，而不是悄悄退回代码像素图
const ART_FAIL=[];function artFailNote(){const el=document.getElementById('artfail');if(!el)return;if(!ART_FAIL.length){el.textContent='';return}el.textContent=`有 ${ART_FAIL.length} 张美术素材没加载出来，游戏正在用代码画的旧像素图。请通过网页地址打开，或把 index.html 和 art 文件夹放在一起再打开。`}
for(const k in (typeof ART_SRC!=='undefined'?ART_SRC:{})){const v=ART_SRC[k],im=new Image(),src0=typeof v==='string'?v:v.src;let tries=0;
 // 网络偶尔抖一下就会有图没加载上：最多自动重试 4 次（间隔递增），都失败才提示
 im.onerror=()=>{if(src0.startsWith('data:')||tries>=4){if(!ART_FAIL.includes(k))ART_FAIL.push(k);artFailNote();return}tries++;setTimeout(()=>{im.src=src0+(src0.includes('?')?'&':'?')+'retry='+tries},400*tries*tries)};
 im.addEventListener('load',()=>{const i=ART_FAIL.indexOf(k);if(i>=0){ART_FAIL.splice(i,1);artFailNote()}});if(k.startsWith('icon_'))im.onload=()=>{if(typeof hud==='function'&&G.state!=='title'){hud.p=hud.s=null;hud()}};im.src=src0;SPR[k]=im;SPRS[k]=typeof v==='string'?1:(v.s||1)}
function sprReady(n){const im=SPR[n];return !!(im&&im.complete&&im.naturalWidth)}
// 帧默认是正方形（边长 = 图片高度）；不是正方形的在这里写逻辑帧宽（按名字前缀匹配）
// 非正方形帧的逻辑帧宽在 art/frames.json（build.py 内嵌为 ART_FW），按名字前缀匹配
const FRAME_W=(typeof ART_FW!=='undefined'?ART_FW:{});
// 单张图（装饰物、武器、图标）整张就是一帧，不能按“正方形帧”切，否则宽图会被裁掉一截
const SINGLE_PREFIX=['decor_','weapon_','icon_'];
function sprFW(n){const im=SPR[n],s=SPRS[n]||1;if(SINGLE_PREFIX.some(p=>n.startsWith(p)))return im.naturalWidth;for(const k in FRAME_W)if(n.startsWith(k))return FRAME_W[k]*s;return im.naturalHeight}
function sprN(n){const im=SPR[n];return im&&im.naturalWidth?Math.max(1,Math.round(im.naturalWidth/sprFW(n))):1}
// 被打闪白：缓存一张纯白剪影
const WHITE={};function whiteOf(n){if(WHITE[n])return WHITE[n];const im=SPR[n],c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const g=c.getContext('2d');g.drawImage(im,0,0);g.globalCompositeOperation='source-in';g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);return WHITE[n]=c}
// 画一帧：横向序列帧，脚底中心对齐 (x,y)，朝左时水平翻转；mode='center' 时 (x,y) 是帧中心
function sprFrame(n,i,x,y,face,white,mode){if(!sprReady(n))return false;const im=SPR[n],s=SPRS[n]||1,fw=sprFW(n),fh=im.naturalHeight,W=fw/s,H=fh/s,c=sprN(n);i=((i%c)+c)%c;
 const gp=mode==='center'?0:((typeof ART_GAP!=='undefined'&&ART_GAP[n])?ART_GAP[n][i]||0:0);
 ctx.save();ctx.translate(R(x),R(y+gp));ctx.scale(face,1);ctx.drawImage(white?whiteOf(n):im,i*fw,0,fw,fh,-W/2,mode==='center'?-H/2:-H,W,H);ctx.restore();return true}
// 序列帧特效（命中火花等）
const fxs=[];function sfx(n,x,y,face=1,fps=20){if(sprReady(n))fxs.push({n,x,y,face,t:0,fps})}
function updFx(dt){for(let i=fxs.length-1;i>=0;i--){fxs[i].t+=dt;if(fxs[i].t*fxs[i].fps>=sprN(fxs[i].n))fxs.splice(i,1)}}
function drawFx(cx,cy){for(const f of fxs)sprFrame(f.n,Math.floor(f.t*f.fps),f.x-cx,f.y-cy,f.face,false,'center')}
// 敌人尸体（播放死亡动画）
const corpses=[];
function updCorpses(dt){for(let i=corpses.length-1;i>=0;i--){corpses[i].t+=dt;if(corpses[i].t>sprN(corpses[i].n)*.08+.25)corpses.splice(i,1)}}
function drawCorpses(cx,cy){for(const c of corpses){const k=Math.min(sprN(c.n)-1,Math.floor(c.t/.08));ctx.globalAlpha=Math.min(1,(sprN(c.n)*.08+.25-c.t)*4);sprFrame(c.n,k,c.x-cx,c.y-cy,c.face,false,c.fly?'center':'');ctx.globalAlpha=1}}
// 敌人素材：按状态挑动画
function drawEnemySpr(e,cx,cy){const b='enemy_'+e.type;if(!useSpr||!sprReady(b+'_idle'))return false;let n=b+'_idle',fi=Math.floor(e.anim*6);
 const has=k=>sprReady(b+'_'+k);
 if(e.state==='stun'&&has('stun')){n=b+'_stun';fi=Math.floor(e.anim*5)}
 else if(e.state==='tired'&&has('tired')){n=b+'_tired';fi=Math.floor(e.anim*4)}
 else if(e.state==='wind'&&has('wind')){n=b+'_wind';fi=Math.floor((1-Math.max(0,e.timer)/(e.windT||.5))*3)}
 else if((['lunge','swoop','bash','slam'].includes(e.state)||e.atkT>0||(e.type==='bug'&&!e.onGround&&e.cd>.6))&&has('attack')){n=b+'_attack';fi=e.atkT>0?Math.floor((1-e.atkT/.3)*3):Math.min(2,Math.floor(e.anim*10)%3)}
 const x=e.x-cx,y=e.y-cy;
 if(e.fly){sprFrame(n,fi,x,y-e.h/2,e.face,false,'center');if(e.flash>0)sprFrame(n,fi,x,y-e.h/2,e.face,true,'center')}
 else{sprFrame(n,fi,x,y,e.face);if(e.flash>0)sprFrame(n,fi,x,y,e.face,true)}
 if(e.bleedT>0&&Math.floor(e.anim*8)%2)px(x+rnd(-4,4),y-e.h*rnd(.3,1.1),1,2,pick(['#ff6a2a','#ffb84a']));
 if(e.slowT>0){for(let i=0;i<3;i++){const vx=x-e.w/2+((i*7+Math.floor(e.anim*3))%Math.max(1,e.w));pline(vx,y,vx+2,y-6,1,'#3a8a3a');px(vx+1,y-5,2,1,'#9ad870')}}
 if(e.state==='wind'&&e.windT>0&&Math.floor(e.anim*12)%2===0)pnum('!',R(x),R(y-e.h-12),'#ff5a4a',2);
 return true}
// Boss 素材
function drawBossSpr(b,cx,cy){const p='boss_'+b.kind;if(!useSpr||!sprReady(p+'_idle'))return false;let n=p+'_idle',fi=Math.floor(b.anim*5);const has=k=>sprReady(p+'_'+k),st=b.state,set=(k,f)=>{if(has(k)){n=p+'_'+k;fi=f}};
 if((st==='tele'||st==='tele_in')&&has('tele_out'))ctx.globalAlpha=1;
 // 制作人
 if(st==='tele')set('tele_out',Math.min(3,Math.floor(b.t/.3*4)));
 else if(st==='tele_in')set('tele_in',Math.min(3,Math.floor(b.t/.3*4)));
 else if(st==='doc')set('doc',Math.min(3,Math.floor(b.t/.55*4)));
 else if(st==='change')set('change',Math.min(3,Math.floor(b.t/.8*4)));
 else if(st==='laser')set('laser',b.t<.8?Math.min(2,Math.floor(b.t/.8*3)):3+Math.floor((b.t-.8)*10)%3);
 // 老板
 else if(st==='pie')set('pie',Math.min(3,Math.floor(b.t/.7*4)));
 else if(st==='pound')set('pound',b.t<.3?Math.min(2,Math.floor(b.t*10)):b.vy<0?3:4);
 else if(st==='kpi')set('kpi',Math.floor(b.t*6)%4);
 else if(st==='bigpie')set('bigpie',Math.min(5,Math.floor(b.t/1.2*6)));
 if(st==='intro')set('intro',Math.min(5,Math.floor(b.t/2.2*6)));
 else if(st==='dead')set('die',Math.min(7,Math.floor(b.t/1.6*8)));
 else if(st==='stagger')set('stagger',Math.min(3,Math.floor(b.t*4)));
 else if(st==='roar')set('roar',Math.floor(b.t*6)%6);
 else if(st==='dash_wind')set('dash_wind',Math.min(2,Math.floor(b.t*6)));
 else if(st==='dash')set('dash',Math.floor(b.anim*12));
 else if(st==='notes')set('notes',Math.min(3,Math.floor(b.t/.8*4)));
 else if(st==='stamp_up')set('stamp',b.t<.25?Math.min(2,Math.floor(b.t*12)):2);
 else if(st==='stamp_hover'||st==='stamp_fall')set('stamp',3+(Math.floor(b.anim*6)%2));
 else if(st==='recover'){const lk=b.kind==='ceo'?'pound':'stamp';if(b.landT>0&&has(lk))set(lk,5+Math.min(2,Math.floor((.36-b.landT)/.12)));else set('recover',Math.floor(b.anim*3)%2)}
 else if(st==='idle'&&Math.abs(b.vx)>5)set('walk',Math.floor(b.anim*8));
 const x=b.x-cx,y=b.y-cy;sprFrame(n,fi,x,y,b.face);if(b.flash>0)sprFrame(n,fi,x,y,b.face,true);return true}
function px(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(R(x),R(y),w,h)}
function pline(x0,y0,x1,y1,w,c){ctx.fillStyle=c;const d=Math.max(Math.abs(x1-x0),Math.abs(y1-y0)),n=Math.max(1,Math.ceil(d));const o=Math.floor(w/2);for(let i=0;i<=n;i++){const t=i/n;ctx.fillRect(R(x0+(x1-x0)*t)-o,R(y0+(y1-y0)*t)-o,w,w)}}
function pcirc(cx,cy,r,c){ctx.fillStyle=c;for(let y=-r;y<=r;y++){const w=Math.round(Math.sqrt(r*r-y*y));ctx.fillRect(R(cx-w),R(cy+y),w*2+1,1)}}
function pring(cx,cy,r,c,th=1){ctx.fillStyle=c;for(let a=0;a<64;a++){const t=a/64*Math.PI*2;ctx.fillRect(R(cx+Math.cos(t)*r),R(cy+Math.sin(t)*r),th,th)}}
const PAL={SKIN:'#e3b48e',SKD:'#c4906b',HAIR:'#1c1a19',JK:'#262a33',JKL:'#363b46',JKD:'#17191f',PANT:'#2e2f28',PANL:'#3d3e34',PAND:'#22231d',SHOE:'#f4f2ec',SOLE:'#a8a69e',ZIP:'#9aa0a8',INK:'#14121a'};
// 马楠：脚底中心为原点，朝右
function drawMan(x,y,face,P,flash){
 ctx.save();ctx.translate(R(x),R(y));ctx.scale(face,1);
 const C=flash?{SKIN:'#fff',SKD:'#fff',HAIR:'#fff',JK:'#fff',JKL:'#fff',JKD:'#ddd',PANT:'#fff',PANL:'#fff',PAND:'#ddd',SHOE:'#fff',SOLE:'#ddd',ZIP:'#fff'}:PAL;
 const hipY=-12+(P.crouch||0)+(P.bob||0),shY=hipY-10,lean=P.lean||0;
 const leg=(a,k,col,dx)=>{const hx=dx,hy=hipY,kx=hx+Math.sin(a)*6,ky=hy+Math.cos(a)*6,b=a-k,fx=kx+Math.sin(b)*6,fy=ky+Math.cos(b)*6;
  pline(hx,hy,kx,ky,3,col);pline(kx,ky,fx,fy,3,col);px(fx-1,fy-1,3,1,PAL.JKD);px(fx-1,fy-3+1,5,2,C.SHOE);px(fx-1,fy,5,1,C.SOLE);return[fx,fy]};
 const arm=(a,e,col,dx)=>{const sx=lean+dx,sy=shY+2,ex=sx+Math.sin(a)*5,ey=sy+Math.cos(a)*5,b=a+e,hx=ex+Math.sin(b)*5,hy=ey+Math.cos(b)*5;pline(sx,sy,ex,ey,3,col);pline(ex,ey,hx,hy,2,col);px(hx-1,hy-1,2,2,C.SKIN);return[hx,hy,b]};
 // 后腿后臂
 leg(P.legB||0,P.kneeB||0,C.PAND,-1);const hb=arm(P.armB||0,P.elbB||0,C.JKD,-1);
 // 帽兜
 px(lean-6,shY-1,3,4,C.JKD);
 // 躯干
 for(let i=0;i<=10;i++){const o=R(lean*(1-i/10));px(o-4,shY+i,9,1,i===10?C.JKD:C.JK)}
 px(R(lean*.5)+1,shY+1,1,9,C.ZIP);px(lean+2,shY+3,1,1,'#e8e8e8');px(lean-3,shY+5,2,1,C.JKL);px(lean-4,shY,9,1,C.JKL);
 // 前腿
 const f=leg(P.legA||0,P.kneeA||0,C.PANT,1);px(Math.sin(P.legA||0)*3+2,hipY+3,1,2,C.PANL);
 // 头
 const hx=lean-4,hy=shY-9+(P.headY||0);px(lean-1,shY-1,3,2,C.SKIN);
 px(hx,hy,8,8,C.SKIN);px(hx,hy,8,2,C.HAIR);px(hx,hy+2,2,3,C.HAIR);px(hx+2,hy+2,1,1,C.HAIR);px(hx+8,hy+4,1,2,C.SKIN);
 px(hx+2,hy+4,1,2,C.SKD);
 if(!P.blink)px(hx+6,hy+4,1,1,PAL.INK);else px(hx+5,hy+4,2,1,C.SKD);px(hx+5,hy+3,2,1,C.HAIR);px(hx+5,hy+6,2,1,P.hurt?PAL.INK:C.SKD);
 if(P.hurt&&!flash){px(hx+1,hy+2,1,2,'#7fc8f0')}
 // 前臂
 const hf=arm(P.armF||0,P.elbF||0,C.JK,1);
 ctx.restore();
 return{hx:x+hf[0]*face,hy:y+hf[1],ang:hf[2],bx:x+hb[0]*face,by:y+hb[1]}}
// 武器绘制：手部位置、角度（相对朝右、0=向下，正=向前）
function drawWeaponAt(kind,hx,hy,ang,face){
 const dx=Math.sin(ang)*face,dy=Math.cos(ang);const seg=(l0,l1,w,c)=>pline(hx+dx*l0,hy+dy*l0,hx+dx*l1,hy+dy*l1,w,c);
 if(kind==='stylus'){seg(-3,-1,2,'#5a5e68');seg(-1,8,2,'#2a2d36');seg(3,5,2,'#ff9a4a');seg(8,11,1,'#d8dde6');px(hx+dx*12,hy+dy*12,1,1,'#ffb84a')}
 else if(kind==='marker'){seg(-3,9,2,'#6a5040');const cx=hx+dx*12,cy=hy+dy*12;ctx.save();ctx.translate(R(cx),R(cy));ctx.rotate(-ang*face);px(-5,-4,10,8,'#c8d0dc');px(-5,-4,10,1,'#fff');px(-5,3,10,1,'#7a8494');px(-5,-4,1,8,'#3a8ad8');px(4,-4,1,8,'#3a8ad8');px(-2,-1,4,2,'#9fd8ff');ctx.restore()}
 else if(kind==='ruler'){seg(-4,20,2,'#9aa0a8');seg(20,24,4,'#ff9a4a');seg(24,27,2,'#ff9a4a');seg(27,28,1,'#fff2c0');seg(6,7,3,'#3a8ad8')}
 else if(kind==='knife'){seg(-3,1,2,'#3a3d46');seg(1,12,1,'#bff8f0');seg(1,9,2,'#7ff0e0');px(hx+dx*12,hy+dy*12,1,1,'#fff')}
 else if(kind==='redpen'){seg(-6,0,5,'#c03028');seg(0,26,5,'#e8483a');seg(26,32,3,'#2a1a1a')}
}
// 刀光残影
function smear(x,y,r0,r1,a0,a1,face,col){ctx.fillStyle=col;const n=Math.ceil(Math.abs(a1-a0)*r1/1.5);for(let i=0;i<=n;i++){const t=a0+(a1-a0)*i/n,c=Math.cos(t),s=Math.sin(t);for(let r=r0;r<=r1;r+=1.5)ctx.fillRect(R(x+s*r*face),R(y+c*r),2,2)}}
// ===== 敌人 =====
function eyes(x,y,face,ang,col='#14121a'){px(x+(face>0?1:-3),y,2,2,'#fff');px(x+(face>0?4:-6),y,2,2,'#fff');px(x+(face>0?2:-2),y+(ang?1:0),1,1,col);px(x+(face>0?5:-5),y+(ang?1:0),1,1,col);if(ang){px(x+(face>0?1:-3),y-1,2,1,col);px(x+(face>0?4:-6),y-1,2,1,col)}}
function drawEnemy(e,cx,cy){if(e.elite){ctx.globalAlpha=.35+.2*Math.sin(e.anim*8);pcirc(R(e.x-cx),R(e.y-cy-e.h/2),Math.max(e.w,e.h)*.75,'#ff5a4a');ctx.globalAlpha=1}if(drawEnemySpr(e,cx,cy))return;const x=R(e.x-cx),y=R(e.y-cy),f=e.face,t=e.anim,fl=e.flash>0;const W=fl?'#fff':null;
 
 if(e.type==='crumple'){const sq=e.state==='wind'?2:0;px(x-6,y-12+sq,12,11-sq,W||'#f050c8');for(let i=0;i<3;i++)for(let j=0;j<3;j++)if((i+j)%2)px(x-6+i*4,y-12+sq+j*4,4,Math.min(4,11-sq-j*4),W||'#1a1420');
  pline(x+5,y-10+sq,x+9,y-14+sq,1,W||'#9fd8ff');pline(x-6,y-6+sq,x-10,y-9+sq,1,W||'#9fd8ff');pline(x-2,y-12+sq,x-3,y-16+sq,1,W||'#9fd8ff');
  const l=Math.sin(t*14)*2;px(x-3+l,y-1,2,1,'#3a3540');px(x+1-l,y-1,2,1,'#3a3540');eyes(x-2,y-9+sq,f,true,e.state==='wind'?'#d8584a':'#14121a')}
 else if(e.type==='sticky'){const w=Math.sin(t*30)>0;px(x-5,y-10,10,10,W||'#f6d65a');px(x+2,y-3,3,3,W||'#d8b440');px(x-5,y-10,10,1,W||'#e8c448');px(x-9,y-9+(w?-2:1),4,3,'#fff');px(x+5,y-9+(w?-2:1),4,3,'#fff');eyes(x-3,y-7,f,true);px(x-2,y-3,4,1,'#8a6a2a')}
 else if(e.type==='printer'){px(x-10,y-14,20,14,W||'#b8bcc6');px(x-10,y-14,20,2,W||'#d0d4dc');px(x-7,y-9,14,2,'#2a2d36');px(x+5,y-12,2,1,e.state==='wind'?'#ff4a4a':'#5af05a');px(x-8,y-1,16,1,'#6a6e78');px(x-6,y-16+(e.state==='wind'?-2:0),12,3,W||'#fff');eyes(x-3,y-6,f,true)}
 else if(e.type==='bug'){const l=Math.sin(t*20)*1.5;px(x-6,y-7,12,6,W||'#5ab85a');px(x-6,y-7,12,1,W||'#7ad87a');px(x-1,y-7,1,6,'#2a6a2a');for(const d of[-4,0,4])px(x+d+l,y-1,1,2,'#2a3a2a');px(x+f*6,y-9,1,3,'#2a3a2a');px(x+f*8,y-10,1,1,'#2a3a2a');eyes(x+f*3-1,y-6,f,true,'#d8584a')}
 else if(e.type==='popup'){px(x-11,y-16,22,16,W||'#f4f4f8');px(x-11,y-16,22,4,W||'#3a6ad8');px(x+6,y-15,3,2,'#ff5a4a');px(x-11,y-16,1,16,'#2a2d36');px(x+10,y-16,1,16,'#2a2d36');px(x-11,y-1,22,1,'#2a2d36');px(x-1,y-11,2,5,'#d8584a');px(x-1,y-5,2,1,'#d8584a');if(e.state==='wind'){px(x-11,y-16,22,1,'#ff4a4a')}}
 else if(e.type==='kpi'){const l=Math.sin(t*10)*2;px(x-3+l,y-3,2,3,'#2a2d36');px(x+1-l,y-3,2,3,'#2a2d36');px(x-7,y-21,14,18,W||'#f4f1ea');px(x-5,y-11,3,7,W||'#d8584a');px(x-1,y-15,3,11,W||'#f2c14e');px(x+3,y-19,3,15,W||'#5ab85a');px(x-7,y-4,14,1,'#2a2d36');eyes(x-3,y-19+(e.state==='wind'?1:0),f,true)}
 else if(e.type==='firewall'){const l=Math.sin(t*8)*1.5,tired=e.state==='tired';px(x-3+l,y-3,2,3,'#2a2d36');px(x+1-l,y-3,2,3,'#2a2d36');px(x-6,y-22,12,19,W||'#4a5470');eyes(x-3,y-19,f,true,tired?'#7fd8ff':'#14121a');
  const sx=x+f*(tired?2:7),sy=y-(tired?8:24);ctx.save();if(tired){ctx.translate(sx,sy);ctx.rotate(f*1.2);ctx.translate(-sx,-sy)}px(sx-3,sy,6,22,W||'#b8603a');for(let r=0;r<5;r++)px(sx-3+(r%2)*3,sy+2+r*4,3,1,'#7a3a20');px(sx-2,sy+8,4,5,'#ffb84a');px(sx-1,sy+6,2,2,'#ff6a3a');ctx.restore();if(tired&&Math.floor(t*6)%2)pnum('+',x,y-30,'#7fd8ff')}
 else if(e.type==='invite'){const b=Math.sin(t*5)*2;px(x-8,y-12+b,16,11,W||'#f4f4f8');pline(x-8,y-12+b,x,y-6+b,1,'#9aa0a8');pline(x+7,y-12+b,x,y-6+b,1,'#9aa0a8');px(x-3,y-5+b,6,3,'#d8584a');px(x+4,y-15+b,6,6,'#3a6ad8');px(x+5,y-13+b,4,1,'#fff');px(x+5,y-11+b,2,1,'#fff');eyes(x-4,y-10+b,f,false)}
 if(e.bleedT>0&&Math.floor(t*8)%2)px(x+rnd(-4,4),y-e.h*rnd(.3,1.1),1,2,pick(['#ff6a2a','#ffb84a']));
 if(e.slowT>0){for(let i=0;i<3;i++){const vx=x-e.w/2+((i*7+Math.floor(t*3))%Math.max(1,e.w));pline(vx,y,vx+2,y-6,1,'#3a8a3a');px(vx+1,y-5,2,1,'#9ad870')}}
 if(e.state==='stun'&&Math.floor(t*6)%2){px(x-4,y-e.h-6,2,2,'#ffd84a');px(x+3,y-e.h-8,2,2,'#ffd84a')}
 if(e.state==='wind'&&e.windT>0&&Math.floor(e.anim*12)%2===0){pnum('!',x,y-e.h-12,'#ff5a4a',2)}}
// ===== Boss =====
function drawBoss(b,cx,cy){if(drawBossSpr(b,cx,cy))return;const x=R(b.x-cx),y=R(b.y-cy),f=b.face,t=b.anim,fl=b.flash>0;const c=(v)=>fl?'#fff':v;
 ctx.save();ctx.translate(x,y);ctx.scale(f,1);
 if(b.kind==='ad'){ // 主美：贝雷帽、围巾、长风衣、大红笔
  const bob=Math.sin(t*4)*1;px(-6,-4,4,4,c('#2a2230'));px(2,-4,4,4,c('#2a2230'));px(-8,-26+bob,16,22,c('#5a3a6a'));px(-8,-26+bob,16,2,c('#6a4a7a'));px(-1,-25+bob,2,20,c('#4a2a5a'));
  px(-7,-29+bob,14,4,c('#e8b84a'));px(4,-27+bob,4,8,c('#e8b84a'));
  px(-6,-39+bob,12,11,c('#e8bf9a'));px(-7,-42+bob,14,4,c('#c8302a'));px(-3,-44+bob,6,2,c('#c8302a'));px(4,-43+bob,2,2,c('#c8302a'));
  px(-1,-36+bob,8,3,c('#14121a'));px(0,-35+bob,2,1,c('#7fd8ff'));px(4,-35+bob,2,1,c('#7fd8ff'));px(2,-31+bob,4,1,c('#a05040'));px(-6,-39+bob,2,8,c('#3a2a2a'));
  const pa=b.pen||0;drawPenArm(4,-22+bob,pa,c)}
 else if(b.kind==='pd'){ // 制作人：西装、耳麦、文件夹
  const bob=Math.sin(t*5)*1;px(-6,-4,5,4,c('#1a1a22'));px(1,-4,5,4,c('#1a1a22'));px(-7,-20+bob,14,16,c('#4a5a78'));px(-7,-20+bob,14,2,c('#5a6a88'));px(-1,-20+bob,2,8,c('#f4f4f8'));px(-1,-18+bob,2,7,c('#d8584a'));
  px(-9,-26+bob,18,7,c('#4a5a78'));px(-6,-36+bob,12,10,c('#e8bf9a'));px(-6,-38+bob,12,4,c('#2a2020'));px(-7,-35+bob,2,6,c('#2a2020'));px(1,-32+bob,2,1,c('#14121a'));px(4,-32+bob,2,1,c('#14121a'));px(1,-29+bob,5,1,c('#a05040'));
  px(-8,-34+bob,2,5,c('#3a3a46'));px(-6,-30+bob,1,1,c('#3a3a46'));pline(-6,-30+bob,2,-28+bob,1,c('#3a3a46'));
  px(7,-22+bob,8,10,c('#f4f4f8'));px(7,-22+bob,8,2,c('#5ab0d8'));px(9,-18+bob,4,1,c('#9aa0a8'));px(9,-16+bob,4,1,c('#9aa0a8'))}
 else if(b.kind==='ceo'){ // 老板：大肚子、金领带、端着饼
  const bob=Math.sin(t*3)*1;px(-9,-5,7,5,c('#141418'));px(2,-5,7,5,c('#141418'));pcirc(0,-20+bob,13,c('#24242c'));px(-13,-30+bob,26,8,c('#24242c'));
  px(-2,-31+bob,4,22,c('#f4f4f8'));px(-1,-30+bob,2,16,c('#e8b84a'));px(-2,-15+bob,4,3,c('#e8b84a'));
  px(-8,-46+bob,16,15,c('#e8bf9a'));px(-8,-46+bob,16,3,c('#7a6a60'));px(-9,-42+bob,2,6,c('#7a6a60'));px(1,-40+bob,3,2,c('#14121a'));px(5,-40+bob,3,2,c('#14121a'));px(1,-42+bob,3,1,c('#5a4a40'));px(5,-42+bob,3,1,c('#5a4a40'));
  px(2,-35+bob,6,1,c('#a05040'));px(3,-34+bob,4,1,c('#c06050'));
  px(10,-28+bob,6,8,c('#24242c'));pcirc(16,-30+bob,7,c('#e8b060'));px(10,-31+bob,13,2,c('#c88a3a'));px(13,-33+bob,2,1,c('#fff2c0'))}
 ctx.restore()}
function drawPenArm(x,y,a,c){pline(x,y,x+Math.sin(a)*6,y+Math.cos(a)*6,3,c('#5a3a6a'));const hx=x+Math.sin(a)*7,hy=y+Math.cos(a)*7;px(hx-1,hy-1,3,3,c('#e8bf9a'));
 const dx=Math.sin(a+.6),dy=Math.cos(a+.6);pline(hx-dx*6,hy-dy*6,hx+dx*26,hy+dy*26,4,c('#e8483a'));pline(hx+dx*26,hy+dy*26,hx+dx*31,hy+dy*31,2,c('#2a1a1a'))}
// ===== 楼层主题 =====
const THEME={
 1:{name:'1F · 美术部',wall:'#eadfca',wall2:'#ddcfb4',trim:'#b89a74',floor:'#8a6248',floorT:'#a87a58',floorD:'#5e4030',plat:'#b98a5e',platT:'#d8a878',sky:['#9fd3f0','#d8ecf8'],light:'rgba(255,230,170,',enemies:['crumple','sticky','printer'],boss:'ad',song:'f1'},
 2:{name:'2F · 研发部',wall:'#232a42',wall2:'#1c2236',trim:'#3a4a6a',floor:'#3a4258',floorT:'#56607a',floorD:'#242a3a',plat:'#4a5470',platT:'#6a7896',sky:['#0e1426','#1c2a4a'],light:'rgba(120,220,255,',enemies:['bug','popup','firewall','crumple'],boss:'pd',song:'f2'},
 3:{name:'顶层 · 总裁办',wall:'#cfc6b4',wall2:'#beb4a0',trim:'#a8884a',floor:'#5a2a2a',floorT:'#7a3a36',floorD:'#3a1a1a',plat:'#6a5a4a',platT:'#a8884a',sky:['#1a1c3a','#3a3060'],light:'rgba(255,215,140,',enemies:['kpi','invite','firewall','popup'],boss:'ceo',song:'f3'}};
// 背景装饰
// 装饰物素材：程序生成的装饰种类 → 各层的素材名（用 d.s 在几种之间轮换）；wall=挂在墙上
const DECOR_MAP={1:{easel:['easel'],frame:['artwall'],plant:['plant','sculpture'],board:['drawingdesk'],shelf:['bookshelf'],cooler:['watercooler','wastebasket']},
 2:{monitor:['workstation'],server:['server'],board:['board','whiteboard'],poster:['poster'],plant:['coffee','beanbag','cables']},
 3:{trophy:['trophycase'],plant:['moneytree','globe'],frame:['portrait'],poster:['statue','winecabinet'],monitor:['aquarium','sofa']}};
const DECOR_WALL=['artwall','board','whiteboard','poster','portrait'];
function drawDecorSpr(d,cx,cy){if(!useSpr||d.gy===undefined)return false;let name=d.k==='elevator'?'elevator':null;const m=DECOR_MAP[LV.floor]&&DECOR_MAP[LV.floor][d.k];if(m)name=m[d.s%m.length];if(!name)return false;const n='decor_f'+LV.floor+'_'+name;if(!sprReady(n))return false;
 // 第一次画的时候检查摆不摆得下：不能被地面挡住，落地的物件下面要全是地面；放不下就左右挪，挪不开就不放
 if(d.fit===undefined||d.fitN!==n)decorFit(d,n,name);if(d.fit===null)return true;
 sprFrame(n,0,R(d.x+12+d.fit-cx),R(d.gy-(DECOR_WALL.includes(name)?34:0)-cy),1);return true}
function decorFit(d,n,name){const im=SPR[n],s=SPRS[n]||1,W=im.naturalWidth/s,H=im.naturalHeight/s,wall=DECOR_WALL.includes(name),bot=d.gy-(wall?34:0);d.fitN=n;
 const ok=cx=>{for(let x=Math.floor((cx-W/2+1)/TS);x<=Math.floor((cx+W/2-1)/TS);x++){for(let y=Math.floor((bot-H+1)/TS);y<=Math.floor((bot-1)/TS);y++)if(isSolid(x,y)||tileAt(x,y)===3)return false;
   if(!wall&&!isSolid(x,Math.floor(bot/TS)))return false}return true};
 for(const o of[0,-8,8,-16,16,-24,24,-32,32,-48,48])if(ok(d.x+12+o)){d.fit=o;return}d.fit=null}
function drawDecor(d,cx,cy,th,t){const x=R(d.x-cx),y=R(d.y-cy);if(x<-120||x>VW+120)return;if(drawDecorSpr(d,cx,cy))return;
 switch(d.k){
 case 'window':{px(x-1,y-1,42,38,'rgba(0,0,0,.15)');px(x,y,40,36,th.trim);ctx.save();ctx.beginPath();ctx.rect(x+2,y+2,36,32);ctx.clip();drawFar(cx,cy);ctx.fillStyle='rgba(255,255,255,.08)';ctx.beginPath();ctx.moveTo(x+6,y+2);ctx.lineTo(x+16,y+2);ctx.lineTo(x+4,y+34);ctx.lineTo(x-6,y+34);ctx.fill();ctx.restore();px(x+19,y+2,2,32,th.trim);px(x+2,y+17,36,2,th.trim);px(x-3,y+36,46,3,th.trim);px(x-3,y+39,46,1,'rgba(0,0,0,.2)');break}
 case 'easel':pline(x+2,y+30,x+10,y,2,'#8a6248');pline(x+18,y+30,x+10,y,2,'#8a6248');px(x+1,y+4,18,16,'#f4f1ea');px(x+3,y+6,14,12,['#9fd3f0','#f2a0b0','#bde986'][d.s%3]);px(x+5,y+12,6,4,'#5a7a9a');px(x+1,y+20,18,2,'#8a6248');break;
 case 'frame':px(x,y,20,16,'#8a6248');px(x+2,y+2,16,12,'#f4f1ea');pline(x+4,y+11,x+9,y+5,1,'#3a3a46');pline(x+9,y+5,x+15,y+11,1,'#3a3a46');pcirc(x+14,y+5,1,'#d8584a');break;
 case 'plant':px(x+2,y+18,10,8,'#c86a4a');px(x+1,y+18,12,2,'#d87a5a');pcirc(x+7,y+12,6,'#4f8a3f');pcirc(x+4,y+8,4,'#5f9a4f');pcirc(x+10,y+9,4,'#6aaa5a');break;
 case 'monitor':px(x,y,22,15,'#1a1d26');const on=Math.sin(t*3+d.s)>-.8;px(x+2,y+2,18,11,on?(th===THEME[2]?'#1a3a5a':'#3a5a7a'):'#0a0c12');if(on){for(let i=0;i<4;i++)px(x+4,y+4+i*2,4+((i*5+d.s)%10),1,th===THEME[2]?'#5af0c8':'#9fd3f0')}px(x+9,y+15,4,3,'#2a2d36');px(x+5,y+18,12,2,'#2a2d36');break;
 case 'server':px(x,y,20,46,'#14161e');for(let i=0;i<6;i++){px(x+2,y+3+i*7,16,5,'#22262f');px(x+4,y+5+i*7,2,1,(Math.floor(t*4)+i+d.s)%3?'#5af05a':'#2a6a2a');px(x+8,y+5+i*7,2,1,(Math.floor(t*3)+i)%4?'#5ab0f0':'#1a3a5a')}break;
 case 'board':px(x,y,46,28,'#9aa0a8');px(x+2,y+2,42,24,'#f8f8fa');for(let i=0;i<4;i++)px(x+5,y+6+i*5,10+((i*11+d.s)%26),1,['#3a6ad8','#d8584a','#3a3a46'][i%3]);break;
 case 'poster':px(x,y,18,24,['#d8584a','#3a6ad8','#f2c14e'][d.s%3]);px(x+3,y+3,12,10,'#f4f1ea');px(x+3,y+16,12,2,'#fff');px(x+3,y+19,8,1,'#fff');break;
 case 'trophy':px(x+4,y+16,8,4,'#6a5a4a');px(x+6,y+12,4,4,'#e8b84a');px(x+2,y+2,12,10,'#e8b84a');px(x,y+3,2,5,'#e8b84a');px(x+14,y+3,2,5,'#e8b84a');px(x+4,y+4,2,4,'#fff2c0');break;
 case 'lamp':{const ln=sprReady('decor_f'+LV.floor+'_chandelier')?'decor_f'+LV.floor+'_chandelier':'decor_f'+LV.floor+'_lamp';if(useSpr&&sprReady(ln)){const H=SPR[ln].naturalHeight/(SPRS[ln]||1),top=R(2*TS-cy);px(x,top,1,y+3-top,'#2a2a34');px(x-2,top,5,2,'#2a2a34');sprFrame(ln,0,x,y+2+H,1);ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.5+.08*Math.sin(t*3+d.x);pcirc(x,R(y+2+H),2,'#ffe6a0');ctx.restore();break}}px(x,y-40,1,40,'#3a3a46');px(x-1,y,2,6,'#3a3a46');px(x-6,y+6,12,3,'#3a3a46');ctx.fillStyle=th.light+'0.07)';ctx.beginPath();ctx.moveTo(x-5,y+9);ctx.lineTo(x+5,y+9);ctx.lineTo(x+30,y+130);ctx.lineTo(x-30,y+130);ctx.fill();px(x-4,y+9,8,1,'#fff6d0');break;
 case 'sign':px(x,y,64,16,'#2a2d36');px(x+1,y+1,62,14,th.trim);break;
 case 'cooler':px(x,y,12,8,'#9fd3f0');px(x+1,y+8,10,22,'#e8e8ee');px(x+3,y+14,2,2,'#5ab0f0');px(x+7,y+14,2,2,'#d8584a');break;
 case 'shelf':px(x,y,30,3,'#8a6248');px(x,y+16,30,3,'#8a6248');for(let i=0;i<5;i++)px(x+2+i*5,y-9+((i*7+d.s)%4),4,9+((i*3)%3),['#d8584a','#3a6ad8','#f2c14e','#5ab85a','#9a6ad8'][(i+d.s)%5]);break;
 }}
