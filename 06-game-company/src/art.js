// ===== 美术 =====
const R=Math.round;
// ===== 外部美术素材（art/ 下的 png，由 build.py 内嵌）=====
// ART_SRC 的值是 dataURI，或 {src,s}：s=2 表示 @2x 素材（每帧像素是逻辑尺寸的 2 倍）
const SPR={},SPRS={};const useSpr=true;
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
function sprFW(n){const im=SPR[n],s=SPRS[n]||1;for(const k in FRAME_W)if(n.startsWith(k))return FRAME_W[k]*s;if(SINGLE_PREFIX.some(p=>n.startsWith(p)))return im.naturalWidth;return im.naturalHeight}
function sprN(n){const im=SPR[n];return im&&im.naturalWidth?Math.max(1,Math.round(im.naturalWidth/sprFW(n))):1}
// 被打闪白：缓存一张纯白剪影
const WHITE={};function whiteOf(n){if(WHITE[n])return WHITE[n];const im=SPR[n],c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const g=c.getContext('2d');g.drawImage(im,0,0);g.globalCompositeOperation='source-in';g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);return WHITE[n]=c}
// 画一帧：横向序列帧，脚底中心对齐 (x,y)，朝左时水平翻转；mode='center' 时 (x,y) 是帧中心
// 换装：选了夏季服装且有对应素材时，player_xxx 换成 player_summer_xxx（动作、帧数、挂点和原版一致）
let SKIN='';function skinOf(n){if(SKIN&&n.startsWith('player_')){const m='player_'+SKIN+'_'+n.slice(7);if(sprReady(m))return m}return n}
function sprFrame(n,i,x,y,face,white,mode){n=skinOf(n);if(!sprReady(n))return false;const im=SPR[n],s=SPRS[n]||1,fw=sprFW(n),fh=im.naturalHeight,W=fw/s,H=fh/s,c=sprN(n);i=((i%c)+c)%c;
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
// 项目经理素材里人物只有约 32 高，放大到和马楠差不多
const ENEMY_SPR_SCALE={pm:1.25};
function drawEnemySpr(e,cx,cy){const b='enemy_'+e.type;if(!useSpr||!sprReady(b+'_idle'))return false;let n=b+'_idle',fi=Math.floor(e.anim*6);
 const has=k=>sprReady(b+'_'+k);
 if(e.state==='stun'&&has('stun')){n=b+'_stun';fi=Math.floor(e.anim*5)}
 else if(e.state==='tired'&&has('tired')){n=b+'_tired';fi=Math.floor(e.anim*4)}
 else if(e.state==='blinkw'&&has('blink')){n=b+'_blink';fi=Math.min(3,Math.floor((1-Math.max(0,e.timer)/.5)*4))}
 else if((e.state==='wind'||e.state==='slashw')&&has('wind')){n=b+'_wind';fi=Math.floor((1-Math.max(0,e.timer)/(e.windT||.5))*3)}
 else if((['lunge','swoop','bash','slam','spray','slash','rally'].includes(e.state)||e.atkT>0||(e.type==='bug'&&!e.onGround&&e.cd>.6))&&has('attack')){n=b+'_attack';fi=e.atkT>0?Math.floor((1-e.atkT/.3)*3):Math.min(2,Math.floor(e.anim*10)%3)}
 const x=e.x-cx,y=e.y-cy;
 if(e.fly){sprFrame(n,fi,x,y-e.h/2,e.face,false,'center');if(e.flash>0)sprFrame(n,fi,x,y-e.h/2,e.face,true,'center')}
 else{const k=ENEMY_SPR_SCALE[e.type]||1;if(k!==1){ctx.save();ctx.translate(x,y);ctx.scale(k,k);ctx.translate(-x,-y)}sprFrame(n,fi,x,y,e.face);if(e.flash>0)sprFrame(n,fi,x,y,e.face,true);if(k!==1)ctx.restore()}
 if(e.bleedT>0&&Math.floor(e.anim*8)%2)px(x+rnd(-4,4),y-e.h*rnd(.3,1.1),1,2,pick(['#ff6a2a','#ffb84a']));
 if(e.slowT>0){for(let i=0;i<3;i++){const vx=x-e.w/2+((i*7+Math.floor(e.anim*3))%Math.max(1,e.w));pline(vx,y,vx+2,y-6,1,'#3a8a3a');px(vx+1,y-5,2,1,'#9ad870')}}
 if((e.state==='wind'||e.state==='slashw')&&e.windT>0&&Math.floor(e.anim*12)%2===0)pnum('!',R(x),R(y-e.h-12),'#ff5a4a',2);
 return true}
// Boss 素材
// 刘敬阳：一阶段 boss_ljy_xxx，二阶段（铠甲）boss_ljy_p2_xxx；缺的动作用 idle 顶上
const LJY_ANIM={intro:'intro',cube:'cube',bell:'throw',brush_wind:'brush_wind',brush:'brush',curl_wind:'curl_wind',curl:'curl',slam:'slam',stagger:'stagger',transform:'transform',roar:'roar',dead:'die',
 fdash_wind:'fdash_wind',fdash:'fdash',breath:'breath',pillars:'pillars',dive_up:'dive_up',dive_hover:'dive_up',dive_fall:'dive',upper_wind:'upper_wind',upper:'upper',meteor:'roar'};
// 还没交付的动作先借用最接近的已有姿势（停在最后一帧），保持整场画风一致
const LJY_FALLBACK={throw:'cube',brush_wind:'curl_wind',brush:'curl_wind',slam:'curl',intro:'idle',walk:'idle',transform:'idle',
 fdash:'fdash_wind',breath:'upper_wind',pillars:'upper_wind',dive_up:'upper_wind',dive:'fdash_wind',upper:'upper_wind',roar:'idle',die:'stagger'};
function drawLJYSpr(b,cx,cy){const pre=b.armor?'boss_ljy_p2_':'boss_ljy_';if(!useSpr||!sprReady(pre+'idle'))return false;
 let k=LJY_ANIM[b.state]||(Math.abs(b.vx)>10?'walk':'idle');let n=(k==='transform'?'boss_ljy_':pre)+k,held=false;
 if(!sprReady(n)){const fb=LJY_FALLBACK[k]||'idle';n=pre+fb;if(!sprReady(n))n=pre+'idle';held=!['idle','stagger'].includes(fb)}
 const c=sprN(n),base=n.slice(pre.length),loop=!held&&['idle','walk','stagger','dive_up','fdash','breath'].includes(base)&&n.indexOf('transform')<0;let fi=held?c-1:loop?Math.floor(b.anim*8):Math.min(c-1,Math.floor(b.t*10));
 sprFrame(n,fi,b.x-cx,b.y-cy,b.face);if(b.flash>0)sprFrame(n,fi,b.x-cx,b.y-cy,b.face,true);return true}
function drawBossSpr(b,cx,cy){if(b.kind==='ljy')return drawLJYSpr(b,cx,cy);const p='boss_'+b.kind;if(!useSpr||!sprReady(p+'_idle'))return false;let n=p+'_idle',fi=Math.floor(b.anim*5);const has=k=>sprReady(p+'_'+k),st=b.state,set=(k,f)=>{if(has(k)){n=p+'_'+k;fi=f}};
 if((st==='tele'||st==='tele_in')&&has('tele_out'))ctx.globalAlpha=1;
 // 制作人
 // 近身反击和新招（复用现有动作帧）
 if(st==='sweep_wind')set('dash_wind',Math.min(2,Math.floor(b.t*8)));
 else if(st==='sweep')set('dash',2);
 else if(st==='shove_wind'||st==='call')set('change',Math.min(3,Math.floor(b.t*8)));
 else if(st==='shove')set('change',3);
 else if(st==='belly_wind')set('pound',Math.min(2,Math.floor(b.t*7)));
 else if(st==='belly')set('pound',3);
 else if(st==='rain')set('notes',Math.min(3,Math.floor(b.t*5)));
 else if(st==='pierain')set('kpi',Math.floor(b.t*6)%4);
 else if(st==='tele')set('tele_out',Math.min(3,Math.floor(b.t/.3*4)));
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
// 刀光残影
function smear(x,y,r0,r1,a0,a1,face,col){ctx.fillStyle=col;const n=Math.ceil(Math.abs(a1-a0)*r1/1.5);for(let i=0;i<=n;i++){const t=a0+(a1-a0)*i/n,c=Math.cos(t),s=Math.sin(t);for(let r=r0;r<=r1;r+=1.5)ctx.fillRect(R(x+s*r*face),R(y+c*r),2,2)}}
// ===== 敌人 =====
function drawEnemy(e,cx,cy){if(e.dummy){ctx.font='bold 8px sans-serif';ctx.textAlign='center';const x=R(e.x-cx),y=R(e.y-cy-e.h-10);ctx.fillStyle='#14121a';ctx.fillText('沙袋',x+1,y+1);ctx.fillStyle='#ffd84a';ctx.fillText('沙袋',x,y);ctx.textAlign='left'}if(e.elite){ctx.globalAlpha=.35+.2*Math.sin(e.anim*8);pcirc(R(e.x-cx),R(e.y-cy-e.h/2),Math.max(e.w,e.h)*.75,'#ff5a4a');ctx.globalAlpha=1}drawEnemySpr(e,cx,cy)}
// ===== Boss =====
function drawBoss(b,cx,cy){drawBossSpr(b,cx,cy)}
// ===== 楼层主题 =====
const THEME={
 1:{name:'1F · 美术部',wall:'#eadfca',wall2:'#ddcfb4',trim:'#b89a74',floor:'#8a6248',floorT:'#a87a58',floorD:'#5e4030',plat:'#b98a5e',platT:'#d8a878',sky:['#9fd3f0','#d8ecf8'],light:'rgba(255,230,170,',enemies:['crumple','sticky','printer','spray'],boss:'ad',song:'f1'},
 2:{name:'2F · 研发部',wall:'#232a42',wall2:'#1c2236',trim:'#3a4a6a',floor:'#3a4258',floorT:'#56607a',floorD:'#242a3a',plat:'#4a5470',platT:'#6a7896',sky:['#0e1426','#1c2a4a'],light:'rgba(120,220,255,',enemies:['bug','popup','firewall','crumple','merge'],boss:'pd',song:'f2'},
 3:{name:'顶层 · 总裁办',wall:'#cfc6b4',wall2:'#beb4a0',trim:'#a8884a',floor:'#5a2a2a',floorT:'#7a3a36',floorD:'#3a1a1a',plat:'#6a5a4a',platT:'#a8884a',sky:['#1a1c3a','#3a3060'],light:'rgba(255,215,140,',enemies:['kpi','invite','firewall','popup','pm'],boss:'ceo',song:'f3'},
 4:{name:'天台 · 健身房',wall:'#3a3448',wall2:'#2e2a3c',trim:'#c8402a',floor:'#3a3a46',floorT:'#5a5a68',floorD:'#24242c',plat:'#5a5a68',platT:'#8a8e98',sky:['#0a0c1e','#2a1a3a'],light:'rgba(255,170,110,',enemies:['firewall','merge','pm','kpi','spray','crumple'],boss:'ljy',song:'f3'}};
// 背景装饰
// 装饰物素材：程序生成的装饰种类 → 各层的素材名（用 d.s 在几种之间轮换）；wall=挂在墙上
const DECOR_MAP={1:{easel:['easel'],frame:['artwall'],plant:['plant','sculpture'],board:['drawingdesk'],shelf:['bookshelf'],cooler:['watercooler','wastebasket']},
 2:{monitor:['workstation'],server:['server'],board:['board','whiteboard'],poster:['poster'],plant:['coffee','beanbag','cables']},
 3:{trophy:['trophycase'],plant:['moneytree','globe'],frame:['portrait'],poster:['statue','winecabinet'],monitor:['aquarium','sofa']},
 4:{trophy:['dumbbellrack','barbellrack'],plant:['plant','bench'],frame:['neon'],poster:['lockers','mirror'],monitor:['treadmill','bench']}};
const DECOR_WALL=['artwall','board','whiteboard','poster','portrait','neon'];
// 天台（第 4 层）：健身房陈设单独到位了就先用，墙面、地面还没到时继续用顶层的；没到位的陈设不画，免得冒出总裁办的东西
function decorFloor(){return LV.floor===4&&sprReady('decor_f4_dumbbellrack')?4:LV.af}
function drawDecorSpr(d,cx,cy){if(!useSpr||d.gy===undefined)return false;const F=d.k==='elevator'?LV.af:decorFloor();let name=d.k==='elevator'?'elevator':null;const m=DECOR_MAP[F]&&DECOR_MAP[F][d.k];if(m)name=m[d.s%m.length];if(!name)return false;const n='decor_f'+F+'_'+name;if(!sprReady(n))return F===4;
 // 第一次画的时候检查摆不摆得下：不能被地面挡住，落地的物件下面要全是地面；放不下就左右挪，挪不开就不放
 if(d.fit===undefined||d.fitN!==n)decorFit(d,n,name);if(d.fit===null)return true;
 const st=DECOR_STYLE[name]||{},b=decorBox(n,name),x=R(d.x+12+d.fit-cx),bot=R(d.gy-(DECOR_WALL.includes(name)?34:0)-cy);
 let top=bot;if(st.base){drawDecorBase(st.base,x,bot);top=bot-st.base.h}
 const im=SPR[n],s=SPRS[n]||1,k=st.scale||1,W=im.naturalWidth/s*k,sh=st.clip?st.clip*s:im.naturalHeight,H=sh/s*k;
 ctx.drawImage(im,0,0,im.naturalWidth,sh,R(x-W/2),R(top-H),W,H);return true}
// 装饰物比例：以马楠（42 像素≈175 厘米，1 像素≈4 厘米）为尺子。
// scale：缩放（只用 0.5 这类和 2 倍素材对齐的值，像素不糊）；base：垫在下面的家具（代码画）
const DECOR_STYLE={drawingdesk:{scale:.5,base:{k:'desk',w:34,h:17}},wastebasket:{scale:.5},aquarium:{base:{k:'cabinet',w:34,h:14}},
 bookshelf:{base:{k:'cabinet',w:32,h:12}},coffee:{scale:.5,base:{k:'desk',w:20,h:18}},
 winecabinet:{base:{k:'cabinet',w:24,h:18}},server:{base:{k:'plinth',w:20,h:10}},trophycase:{base:{k:'plinth',w:32,h:6}},
 // 带支架腿的看板 / 白板挂到墙上：只画上半部分（clip=保留的高度，逻辑像素）
 whiteboard:{clip:21},board:{clip:20}};
function decorBox(n,name){const im=SPR[n],s=SPRS[n]||1,st=DECOR_STYLE[name]||{},k=st.scale||1,W=im.naturalWidth/s*k,H=(st.clip||im.naturalHeight/s)*k;return{w:Math.max(W,st.base?st.base.w:0),h:H+(st.base?st.base.h:0)}}
function drawDecorBase(b,x,bot){const f=LV.af,L=R(x-b.w/2);
 if(b.k==='desk'){const top=f===1?'#a87a58':f===2?'#5a6070':'#6a3a2a',side=f===1?'#7a5238':f===2?'#3a3e4a':'#4a2418';
  px(L,bot-b.h,b.w,3,top);px(L,bot-b.h+3,b.w,1,side);px(L+2,bot-b.h+4,2,b.h-4,side);px(L+b.w-4,bot-b.h+4,2,b.h-4,side);px(L+b.w-14,bot-b.h+4,10,6,side);px(L+b.w-13,bot-b.h+6,8,1,top);px(L,bot-b.h,b.w,1,'rgba(255,255,255,.18)')}
 else if(b.k==='cabinet'){const c=f===1?['#6a4028','#8a5a38','#c8a070','#5a3420']:f===2?['#2e323e','#3a3e4a','#8a90a0','#262a34']:['#3a2018','#4a2820','#c8a050','#3a2018'];px(L,bot-b.h,b.w,b.h,c[0]);px(L,bot-b.h,b.w,2,c[2]);px(L+2,bot-b.h+4,b.w/2-3,b.h-6,c[1]);px(L+b.w/2+1,bot-b.h+4,b.w/2-3,b.h-6,c[1]);px(L+b.w/2-3,bot-b.h+Math.floor(b.h/2),2,2,c[2]);px(L+b.w/2+1,bot-b.h+Math.floor(b.h/2),2,2,c[2]);px(L,bot-1,b.w,1,'rgba(0,0,0,.35)')}
 else if(b.k==='plinth'){const c=f===2?['#1e222c','#4a5060']:['#2a1810','#b08a48'];px(L-1,bot-b.h,b.w+2,b.h,c[0]);px(L-1,bot-b.h,b.w+2,1,c[1]);px(L-1,bot-1,b.w+2,1,'rgba(0,0,0,.4)')}}
function decorFit(d,n,name){const bx=decorBox(n,name),W=bx.w,H=bx.h,wall=DECOR_WALL.includes(name),bot=d.gy-(wall?34:0);d.fitN=n;
 const ok=cx=>{for(let x=Math.floor((cx-W/2+1)/TS);x<=Math.floor((cx+W/2-1)/TS);x++){for(let y=Math.floor((bot-H+1)/TS);y<=Math.floor((bot-1)/TS);y++)if(isSolid(x,y)||tileAt(x,y)===3)return false;
   if(!wall&&!isSolid(x,Math.floor(bot/TS)))return false}return true};
 for(const o of[0,-8,8,-16,16,-24,24,-32,32,-48,48])if(ok(d.x+12+o)){d.fit=o;return}d.fit=null}
function drawDecor(d,cx,cy,th,t){const x=R(d.x-cx),y=R(d.y-cy);if(x<-120||x>VW+120)return;if(drawDecorSpr(d,cx,cy))return;
 if(d.k==='lamp'){const LF=decorFloor(),ln=sprReady('decor_f'+LF+'_chandelier')?'decor_f'+LF+'_chandelier':'decor_f'+LF+'_lamp';if(useSpr&&sprReady(ln)){const im=SPR[ln],k=ln.endsWith('chandelier')?1:.5,W=im.naturalWidth/(SPRS[ln]||1)*k,H=im.naturalHeight/(SPRS[ln]||1)*k,top=R(2*TS-cy);px(x,top,1,y+3-top,'#2a2a34');px(x-2,top,5,2,'#2a2a34');ctx.drawImage(im,R(x-W/2),R(y+2),W,H);ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.5+.08*Math.sin(t*3+d.x);pcirc(x,R(y+2+H),2,'#ffe6a0');ctx.restore();}}}
