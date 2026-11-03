// ===== 关卡 =====
const HT=23,CW=48;
let LV=null;
function genLevel(floor){
 const th=THEME[floor],nCh=floor===4?2:4,arenaW=30,startW=26,w=startW+nCh*CW+arenaW;
 const T=new Uint8Array(w*HT);const set=(x,y,v)=>{if(x>=0&&x<w&&y>=0&&y<HT)T[y*w+x]=v};
 const spawns=[],decor=[],pks=[],signs=[];
 // 天花板
 for(let x=0;x<w;x++){set(x,0,1);set(x,1,1)}
 // 起点
 let g=19;for(let x=0;x<startW;x++)for(let y=g;y<HT;y++)set(x,y,1);
 for(let y=0;y<HT;y++){set(0,y,1);set(1,y,1)}
 signs.push({x:8*TS,y:(g-6)*TS,text:th.name});decor.push({k:'elevator',x:3*TS,y:g*TS-64,gy:g*TS,s:0});
 
 // 普通地图块
 let x=startW,secretDone=false,room=null;
 // 评审会：第 4 块里的封闭挑战房，进去后两侧封门，打完两轮才开
 const wantRoom=Math.random()<(floor===1?.5:.75);
 for(let c=0;c<nCh;c++){const x0=x;let segs=[];let cx=x0;
  while(cx<x0+CW){if(c===3&&wantRoom&&!room&&cx>=x0+12&&x0+CW-cx>=22){const len=18;g=clamp(g,13,18);room={tx:cx,len,g};segs.push({x:cx,len,g,room:true});for(let i=0;i<len;i++)for(let y=g;y<HT;y++)set(cx+i,y,1);cx+=len;continue}
   const len=Math.min(irnd(6,12),x0+CW-cx);let dg=0;if(cx>x0+2){const r=Math.random();dg=r<.35?0:r<.6?-irnd(1,3):r<.85?irnd(1,3):-irnd(4,5)}
   g=clamp(g+dg,12,19);segs.push({x:cx,len,g});for(let i=0;i<len;i++)for(let y=g;y<HT;y++)set(cx+i,y,1);cx+=len}
  // 平台
  for(const s of segs){if(!s.room&&s.len>=6&&Math.random()<.75){const pw=irnd(4,Math.min(7,s.len-1)),px0=s.x+irnd(0,s.len-pw),py=s.g-irnd(4,5);if(py>3){for(let i=0;i<pw;i++)set(px0+i,py,2);
    if(Math.random()<.45&&py-4>3){const p2=irnd(3,5),px2=px0+irnd(-2,pw-2);for(let i=0;i<p2;i++)if(T[(py-4)*w+px2+i]===0)set(px2+i,py-4,2);if(Math.random()<.5)pks.push({k:'cell',x:(px2+1)*TS,y:(py-5)*TS})}
    if(Math.random()<.25)pks.push({k:Math.random()<.4?'food':'cell',x:(px0+pw/2)*TS,y:(py-1)*TS})}}}
  // 高台阶补平台：前后落差>=4时放一块过渡平台
  for(let i=1;i<segs.length;i++){const a=segs[i-1],b=segs[i];if(a.g-b.g>=4){for(let k=-3;k<0;k++)set(b.x+k,b.g+2,2)}}
  // 敌人
  const n=irnd(3,4)+(floor>1?1:0)+(G.lvl>=4?1:0);
  const nsegs=segs.filter(s=>!s.room);for(let k=0;k<n;k++){const s=nsegs[irnd(c===0&&nsegs.length>1?1:0,nsegs.length-1)];const type=pick_(th.enemies,k);const ex=(s.x+irnd(1,Math.max(1,s.len-2)))*TS;
   const fly=type==='sticky'||type==='popup';spawns.push({type,x:ex,y:fly?(s.g-irnd(5,8))*TS:s.g*TS})}
  // 图钉陷阱（地面上方一格，宽 2-3 格，避开地图块开头）
  const spikeP=[.3,.5,.65,.45][floor-1];
  for(const s of segs){if(s.room||s.x<x0+3||s.len<5||Math.random()>spikeP)continue;const sw=irnd(2,3),sx=s.x+irnd(1,s.len-sw-1);let ok=true;for(let i=0;i<sw;i++)if(T[(s.g-1)*w+sx+i]!==0||T[(s.g-4)*w+sx+i]===2||T[(s.g-5)*w+sx+i]===2)ok=false;if(ok)for(let i=0;i<sw;i++)set(sx+i,s.g-1,3)}
  // 纸箱
  for(let k=0;k<irnd(1,2);k++){const s=nsegs[irnd(0,nsegs.length-1)];const cx=s.x+irnd(0,s.len-1);if(T[(s.g-1)*w+cx]===0)pks.push({k:'crate',x:cx*TS+8,y:s.g*TS,hp:14})}
  // 补模型：线框台阶通往高处宝箱（第 3、4 块里找一处）
  if((c===2||c===3)&&!secretDone){const cand=segs.filter(s=>!s.room&&s.len>=6&&s.g>=13).sort((a,b)=>b.len-a.len);
   for(const best of cand){const bx=best.x,g0=best.g;let ok=true;for(let y=g0-11;y<g0;y++)for(let x=bx;x<bx+6;x++)if(T[y*w+x]===1)ok=false;
    if(ok){for(let y=g0-11;y<g0;y++)for(let x=bx-1;x<bx+7;x++)if(T[y*w+x]===2||T[y*w+x]===3)set(x,y,0);for(let i=pks.length-1;i>=0;i--){const k=pks[i];if(k.x>=(bx-1)*TS&&k.x<=(bx+7)*TS&&k.y<g0*TS-2)pks.splice(i,1)}for(let i=0;i<3;i++)set(bx+i,g0-4,5);for(let i=0;i<3;i++)set(bx+3+i,g0-7,5);for(let i=0;i<3;i++)set(bx+i,g0-10,5);pks.push({k:'wireterm',x:(bx+4)*TS+8,y:g0*TS});pks.push({k:'chest',x:(bx+1)*TS+8,y:(g0-10)*TS,bonus:true,secret:true});secretDone=true;break}}}
  // 加班合同（诅咒宝箱）：第 3 块，一半概率
  if(c===2&&Math.random()<.5){const ss=segs.filter(s=>s.len>=4);if(ss.length){const s=pick(ss),cx=s.x+Math.floor(s.len/2);if(T[(s.g-1)*w+cx]===0)pks.push({k:'cchest',x:cx*TS+8,y:s.g*TS})}}
  // 实习生小卖部：第 3 块，60% 概率。一个实习生 + 三件商品，用灵感买
  if(c===2&&Math.random()<.6||floor===4&&c===0){const ss=segs.filter(s=>!s.room&&s.len>=9&&s.x>x0+2);if(ss.length){const s=pick(ss);let ok=true;for(let i=1;i<9;i++)for(let y=s.g-3;y<s.g;y++)if(T[y*w+s.x+i]!==0&&T[y*w+s.x+i]!==3)ok=false;
   if(ok){for(let i=0;i<10;i++)for(let y=s.g-3;y<s.g;y++)if(T[y*w+s.x+i]===3)set(s.x+i,y,0);pks.push({k:'intern',x:(s.x+1)*TS+8,y:s.g*TS});const ws=Object.keys(WARES).sort(()=>Math.random()-.5).slice(0,3);
    ws.forEach((it,i)=>pks.push({k:'ware',item:it,c:Math.round(WARES[it].c*(1+.2*(floor-1))/5)*5,x:(s.x+3.5+i*2.2)*TS,y:s.g*TS}))}}}
  // 加急任务：第 2 块
  if(c===1){const s=segs[irnd(0,segs.length-1)];pks.push({k:'rush',x:(s.x+Math.floor(s.len/2))*TS+8,y:s.g*TS})}
  // 卷轴：第 2、4 块各一个
  if(c===1||c===3){const s=nsegs[irnd(Math.min(1,nsegs.length-1),nsegs.length-1)];const cx=s.x+Math.floor(s.len/2);let gy=s.g;for(let y=s.g-1;y>2;y--)if(T[y*w+cx]===2){gy=y;break}pks.push({k:'scroll',x:cx*TS+8,y:gy*TS})}
  // 装饰
  for(let k=x0;k<x0+CW;k+=irnd(9,13))decor.push({k:'window',x:k*TS,y:Math.round(6.6*TS),s:irnd(0,99)});
  for(let k=x0+4;k<x0+CW;k+=irnd(10,14))decor.push({k:'lamp',x:k*TS,y:6*TS,s:0});
  for(const s of segs){if(!s.room&&Math.random()<.8){const kinds=floor===1?['easel','frame','plant','board','shelf','cooler']:floor===2?['monitor','server','board','poster','plant']:['trophy','plant','frame','poster','monitor'];
   const k=pick(kinds),dx=(s.x+irnd(0,Math.max(0,s.len-3)))*TS;const hgt={easel:30,frame:16,plant:26,board:28,shelf:19,cooler:30,monitor:20,server:46,poster:24,trophy:20}[k];
   decor.push({k,x:dx,y:(k==='frame'||k==='poster'||k==='board'?s.g*TS-hgt-30:s.g*TS-hgt),gy:s.g*TS,s:irnd(0,99)})}}
  x+=CW}
 if(room){const {tx,len,g:rg}=room;for(let i=0;i<len;i++)for(let y=2;y<rg;y++)set(tx+i,y,0);for(let i=0;i<4;i++){set(tx+3+i,rg-4,2);set(tx+len-7+i,rg-4,2)}for(let i=0;i<4;i++)set(tx+7+i,rg-8,2);}
 // 宝箱（精英掉落武器 + 一个宝箱）
 // 精英：楼层越高越多，加班等级 2 以上再多两只
 const cs=spawns.filter(s=>s.type!=='sticky'&&s.type!=='popup').sort(()=>Math.random()-.5);for(let i=0;i<Math.min(cs.length,floor+(G.lvl>=2?2:0));i++)cs[i].elite=true;
 {const cx=startW+CW+irnd(10,30);let gy=0;for(let y=2;y<HT;y++)if(T[y*w+cx]===1){gy=y;break}pks.push({k:'chest',x:cx*TS+8,y:gy*TS})}
 // 过渡到 Boss 房：平地
 const ax=x;g=19;for(let i=0;i<arenaW;i++)for(let y=2;y<HT;y++)set(ax+i,y,y>=g?1:0);
 for(let y=0;y<HT;y++){set(w-1,y,1);set(w-2,y,1)}
 for(let i=0;i<6;i++){set(ax+5+i,14,2);set(ax+arenaW-11+i,14,2)}for(let i=0;i<6;i++)set(ax+12+i,10,2);
 for(let k=ax+4;k<w-3;k+=8)decor.push({k:'window',x:k*TS,y:Math.round(6.6*TS),s:irnd(0,99)});decor.push({k:'lamp',x:(ax+8)*TS,y:6*TS,s:0});decor.push({k:'lamp',x:(ax+22)*TS,y:6*TS,s:0});
 {let gy=19;for(let y=2;y<HT;y++)if(T[y*w+ax-6]===1){gy=y;break}for(let i=-8;i<=-3;i++)if(T[(gy-1)*w+ax+i]===3)set(ax+i,gy-1,0);pks.push({k:'tdoor',x:(ax-6)*TS+8,y:gy*TS})}
 // 收尾清理：拾取物和互动物件脚下及两侧不留图钉；Boss 房入口附近不放普通怪（那段地面已被铺平）
 for(const k of pks){if(k.k==='cell'||k.k==='food')continue;const tx=Math.floor(k.x/TS);for(let y=2;y<HT;y++)for(let dx=-2;dx<=2;dx++)if(T[y*w+tx+dx]===3)set(tx+dx,y,0)}
 for(let i=spawns.length-1;i>=0;i--)if(spawns[i].x>=(ax-3)*TS)spawns.splice(i,1);
 const gate={x:ax+2,active:false};
 for(let i=pks.length-1;room&&i>=0;i--){const tx=pks[i].x/TS;if(tx>=room.tx-1&&tx<=room.tx+room.len+1)pks.splice(i,1)}
 // 天台：开头送一个高级宝箱
 if(floor===4){let gy=19;for(let y=2;y<HT;y++)if(T[y*w+(startW-8)]===1){gy=y;break}pks.push({k:'chest',x:(startW-8)*TS+8,y:gy*TS,bonus:true})}
 LV={floor,af:floor===4&&!(typeof sprReady==='function'&&(sprReady('bg_f4_mid')||sprReady('tiles_f4')))?3:floor,th,w,h:HT,T,spawns,decor,pick:pks,signs,boxes:[],room:room&&{x0:room.tx*TS,x1:(room.tx+room.len)*TS,tx:room.tx,len:room.len,g:room.g,state:0,cells:[]},arenaX:ax*TS,arenaW:arenaW*TS,gate,exitX:(w-6)*TS};
 return LV}
function pick_(a,i){return a[(i+Math.floor(Math.random()*a.length))%a.length]}
function tileAt(tx,ty){if(tx<0||tx>=LV.w)return 1;if(ty<0)return 1;if(ty>=LV.h)return 1;if(LV.gate.active&&tx===LV.gate.x)return 1;return LV.T[ty*LV.w+tx]}
const isSolid=(tx,ty)=>{const v=tileAt(tx,ty);return v===1||v===4};
// 物体移动：b={x,y(脚底中心),w,h,vx,vy,onGround,drop}
function moveBody(b,dt){b.onGround=false;
 // X
 b.x+=b.vx*dt;let l=Math.floor((b.x-b.w/2)/TS),r=Math.floor((b.x+b.w/2-.01)/TS),t=Math.floor((b.y-b.h)/TS),bt=Math.floor((b.y-.01)/TS);b.hitWall=0;
 for(let ty=t;ty<=bt;ty++){if(b.vx>0&&isSolid(r,ty)){b.x=r*TS-b.w/2;b.vx=0;b.hitWall=1;break}if(b.vx<0&&isSolid(l,ty)){b.x=(l+1)*TS+b.w/2;b.vx=0;b.hitWall=-1;break}}
 // Y
 const py=b.y;b.y+=b.vy*dt;l=Math.floor((b.x-b.w/2)/TS);r=Math.floor((b.x+b.w/2-.01)/TS);
 if(b.vy>=0){const ty=Math.floor((b.y-.01)/TS),pty=Math.floor((py-.01)/TS);
  for(let tx=l;tx<=r;tx++){const v=tileAt(tx,ty);if(v===1||v===4||(v===2&&!b.drop&&py<=ty*TS+.5&&pty<ty)){b.y=ty*TS;b.vy=0;b.onGround=true;break}}}
 else{const ty=Math.floor((b.y-b.h)/TS);for(let tx=l;tx<=r;tx++)if(isSolid(tx,ty)){b.y=(ty+1)*TS+b.h;b.vy=0;break}}
 // 站立检测（静止时）
 if(!b.onGround&&b.vy>=0){const ty=Math.floor((b.y+.5)/TS);for(let tx=l;tx<=r;tx++){const v=tileAt(tx,ty);if((v===1||v===4||(v===2&&!b.drop))&&Math.abs(b.y-ty*TS)<.6){b.onGround=true;break}}}}
function groundBelow(x,y){let ty=Math.floor(y/TS);for(;ty<LV.h;ty++){const v=tileAt(Math.floor(x/TS),ty);if(v===1||v===2||v===4)return ty*TS}return LV.h*TS}
// 瓦片素材 tiles_f{n}：8 列网格，编号见 art/batch6_scene_brief_v2.md
function tileIdx(v,tx,ty){const h=(tx*7+ty*13)%3;
 if(v===1){if(ty<=1)return isSolid(tx,ty+1)?16:17;const top=!isSolid(tx,ty-1),L=!isSolid(tx-1,ty),Rt=!isSolid(tx+1,ty);if(top)return L&&Rt?5:L?0:Rt?4:1+h;return L&&Rt?11:L?9:Rt?10:6+h}
 if(v===2){const L=tileAt(tx-1,ty)!==2,Rt=tileAt(tx+1,ty)!==2;return L&&Rt?15:L?12:Rt?14:13}
 return {3:18,4:21,5:19}[v]}
// 平台瓦片素材顶部有几像素透明，画的时候往上挪，让木板上沿和碰撞线对齐（不然人看起来悬空）
const PLAT_OFF={1:4.5,2:3,3:4.5};
// 某层的地面瓦片还没交付时（天台），先借顶层的瓦片
function drawTilesSpr(cx,cy){const tf=sprReady('tiles_f'+LV.af)?LV.af:3,n='tiles_f'+tf;if(!useSpr||!sprReady(n))return false;const im=SPR[n],s=SPRS[n]||1,ts=16*s,x0=Math.max(0,Math.floor(cx/TS)),x1=Math.min(LV.w-1,Math.floor((cx+VW)/TS)),y0=Math.max(0,Math.floor(cy/TS)),y1=Math.min(LV.h-1,Math.floor((cy+VH)/TS));
 for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){const v=LV.T[ty*LV.w+tx];if(!v)continue;const i=tileIdx(v,tx,ty);if(i===undefined)continue;if(v===5)ctx.globalAlpha=.55+.25*Math.sin(T*6+tx);ctx.drawImage(im,(i%8)*ts,Math.floor(i/8)*ts,ts,ts,tx*TS-cx,ty*TS-cy-(v===2?PLAT_OFF[tf]||0:0),TS,TS);ctx.globalAlpha=1}
 if(LV.gate.active){const sx=LV.gate.x*TS-cx;for(let ty=2;ty<LV.h;ty++)ctx.drawImage(im,(20%8)*ts,Math.floor(20/8)*ts,ts,ts,sx,ty*TS-cy,TS,TS)}
 return true}
function drawTiles(cx,cy){drawTilesSpr(cx,cy)}
// ===== 背景：窗外远景（far）→ 墙面（mid，窗户处透出远景）→ 装饰 → 灯光 =====
// 素材：bg_f{n}_far / bg_f{n}_mid / bg_f{n}_arena / bg_f{n}_near（素材还没加载完时先铺一层墙色）
function drawFar(cx,cy){const n='bg_f'+LV.af+'_far',ox=Math.floor(cx*.15),oy=R(-cy*.12)-12;
 if(sprReady(n)){const im=SPR[n],s=SPRS[n]||1,W=im.naturalWidth/s,H=im.naturalHeight/s;for(let x=-(ox%W);x<VW;x+=W)ctx.drawImage(im,x,oy,W,H)}}
function drawBackground(cx,cy,t){const th=LV.th,f=LV.af,mid='bg_f'+f+'_mid',arena='bg_f'+f+'_arena';
 if(sprReady(mid)){drawFar(cx,cy);const im=SPR[mid],s=SPRS[mid]||1,W=im.naturalWidth/s,H=im.naturalHeight/s,y0=R(2*TS-cy);
  const hasA=sprReady(arena),ax0=R(LV.arenaX-cx),ax1=ax0+LV.arenaW;
  // Boss 房那段不画普通墙面，让 Boss 房墙面的窗户透出窗外景色
  ctx.save();if(hasA&&ax0<VW){ctx.beginPath();ctx.rect(-10,-10,Math.max(0,ax0+10),VH+20);ctx.rect(ax1,-10,Math.max(0,VW-ax1+10),VH+20);ctx.clip()}
  for(let x=-(Math.floor(cx*.5)%W);x<VW;x+=W)ctx.drawImage(im,x,y0,W,H);
  // 墙面图底部有透明区（比如顶层墙面只画到 4/5 高）：把底边往上几行（边缘那一两行是半透明的）完全不透明的像素往下拉到屏幕底，免得露出窗外远景
  const gap=(ART_GAP[mid]||[0])[0];if(gap>0){const by=H-gap;for(let x=-(Math.floor(cx*.5)%W);x<VW;x+=W)ctx.drawImage(im,0,Math.floor(by*s)-4,im.naturalWidth,1,x,y0+by-2,W,Math.max(0,VH-(y0+by)+2))}
  ctx.restore();
  if(hasA){const a=SPR[arena],sa=SPRS[arena]||1;ctx.drawImage(a,ax0,y0,a.naturalWidth/sa,a.naturalHeight/sa)}
  for(const d of LV.decor)if(d.k==='lamp')drawDecor(d,cx,cy,th,t);return}
 ctx.fillStyle=th.wall;ctx.fillRect(0,0,VW,VH)}
// 灯光：只照背景和装饰（在地面、角色之前画），让前景更突出
function drawLights(cx,cy,t){const f=LV.af,th=LV.th;
 const scene=sprReady('bg_f'+f+'_mid');const amb=scene?{1:0,2:.06,3:.12,4:.1}[f]:{1:0,2:.16,3:.45,4:.3}[f];if(amb){ctx.fillStyle=f===2?`rgba(20,24,64,${amb})`:`rgba(8,6,26,${amb})`;ctx.fillRect(0,0,VW,VH)}
 ctx.save();ctx.globalCompositeOperation='lighter';
 for(const d of LV.decor){const x=R(d.x-cx),y=R(d.y-cy);if(x<-120||x>VW+120)continue;
  if(scene&&d.k==='window')continue;
  if(d.k==='window'&&f===1){ctx.fillStyle='rgba(255,226,160,.07)';ctx.beginPath();ctx.moveTo(x+2,y+2);ctx.lineTo(x+38,y+2);ctx.lineTo(x+110,y+190);ctx.lineTo(x+60,y+190);ctx.fill();ctx.fillStyle='rgba(255,226,160,.05)';ctx.fillRect(x+2,y+2,36,32)}
  if(d.k==='window'&&f===2){ctx.fillStyle='rgba(255,150,90,.06)';ctx.beginPath();ctx.moveTo(x+2,y+2);ctx.lineTo(x+38,y+2);ctx.lineTo(x+120,y+190);ctx.lineTo(x+40,y+190);ctx.fill()}
  if(d.k==='lamp'){const ly=y+(scene?20:12),g=ctx.createRadialGradient(x,ly,2,x,ly,f===3?130:80);g.addColorStop(0,th.light+(f===3?'.6)':scene?'.22)':'.14)'));g.addColorStop(1,th.light+'0)');ctx.fillStyle=g;ctx.fillRect(x-135,ly-132,270,270)}
  if(d.k==='monitor'||d.k==='server'){ctx.fillStyle='rgba(90,200,255,.06)';ctx.beginPath();ctx.arc(x+11,y+8,22,0,7);ctx.fill()}}
 ctx.restore()}
// 近景剪影层：试玩反馈说像奇怪的影子，默认关闭
const SHOW_NEAR=false;
function drawNear(cx,cy){if(!SHOW_NEAR)return;const n='bg_f'+LV.af+'_near';if(!sprReady(n))return;const im=SPR[n],s=SPRS[n]||1,W=im.naturalWidth/s,H=im.naturalHeight/s;for(let x=-(Math.floor(cx*1.3)%W);x<VW;x+=W)ctx.drawImage(im,x,VH-H,W,H)}
// ===== 新手教程关卡：一条走廊，从左到右依次练移动、跳、二段跳、下平台，再到训练场练战斗 =====
function genTutorial(){const w=100,T=new Uint8Array(w*HT);const set=(x,y,v)=>{if(x>=0&&x<w&&y>=0&&y<HT)T[y*w+x]=v};
 const ground=(x0,x1,g)=>{for(let x=x0;x<=x1;x++)for(let y=g;y<HT;y++)set(x,y,1)};
 for(let x=0;x<w;x++){set(x,0,1);set(x,1,1)}for(let y=0;y<HT;y++){set(0,y,1);set(1,y,1);set(w-1,y,1);set(w-2,y,1)}
 ground(2,13,17);ground(14,19,15);ground(20,31,12);ground(32,37,6);
 // 平台层：只能从平台跳下去才能继续往前
 ground(38,w-3,17);for(let x=38;x<=53;x++)set(x,6,2);for(let y=2;y<=13;y++){set(54,y,1);set(55,y,1)}
 // 训练场：沙袋上方一块平台，用来练下劈
 for(let x=63;x<=69;x++)set(x,13,2);for(let x=58;x<=61;x++)set(x,15,2);
 const decor=[{k:'elevator',x:3*TS,y:17*TS-64,gy:17*TS,s:0}];
 for(const x of[10,28,46,62,78,92])decor.push({k:'lamp',x:x*TS,y:6*TS,s:0});
 decor.push({k:'plant',x:8*TS,y:17*TS-26,gy:17*TS,s:1});decor.push({k:'easel',x:24*TS,y:12*TS-30,gy:12*TS,s:0});decor.push({k:'shelf',x:84*TS,y:17*TS-19,gy:17*TS,s:2});
 LV={floor:1,af:1,th:THEME[1],w,h:HT,T,spawns:[],decor,pick:[],signs:[],boxes:[],room:null,arenaX:w*TS+9999,arenaW:0,gate:{x:-9,active:false},exitX:95*TS,tlimit:1e9,tut:true};return LV}
