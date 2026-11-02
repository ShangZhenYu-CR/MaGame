// ===== 关卡 =====
const HT=23,CW=48;
let LV=null;
function genLevel(floor){
 const th=THEME[floor],nCh=4,arenaW=30,startW=26,w=startW+nCh*CW+arenaW;
 const T=new Uint8Array(w*HT);const set=(x,y,v)=>{if(x>=0&&x<w&&y>=0&&y<HT)T[y*w+x]=v};
 const spawns=[],decor=[],pks=[],signs=[];
 // 天花板
 for(let x=0;x<w;x++){set(x,0,1);set(x,1,1)}
 // 起点
 let g=19;for(let x=0;x<startW;x++)for(let y=g;y<HT;y++)set(x,y,1);
 for(let y=0;y<HT;y++){set(0,y,1);set(1,y,1)}
 signs.push({x:8*TS,y:(g-6)*TS,text:th.name});decor.push({k:'elevator',x:3*TS,y:g*TS-64,gy:g*TS,s:0});
 
 // 普通地图块
 let x=startW,secretDone=false;
 for(let c=0;c<nCh;c++){const x0=x;let segs=[];let cx=x0;
  while(cx<x0+CW){const len=Math.min(irnd(6,12),x0+CW-cx);let dg=0;if(cx>x0+2){const r=Math.random();dg=r<.35?0:r<.6?-irnd(1,3):r<.85?irnd(1,3):-irnd(4,5)}
   g=clamp(g+dg,12,19);segs.push({x:cx,len,g});for(let i=0;i<len;i++)for(let y=g;y<HT;y++)set(cx+i,y,1);cx+=len}
  // 平台
  for(const s of segs){if(s.len>=6&&Math.random()<.75){const pw=irnd(4,Math.min(7,s.len-1)),px0=s.x+irnd(0,s.len-pw),py=s.g-irnd(4,5);if(py>3){for(let i=0;i<pw;i++)set(px0+i,py,2);
    if(Math.random()<.45&&py-4>3){const p2=irnd(3,5),px2=px0+irnd(-2,pw-2);for(let i=0;i<p2;i++)if(T[(py-4)*w+px2+i]===0)set(px2+i,py-4,2);if(Math.random()<.5)pks.push({k:'cell',x:(px2+1)*TS,y:(py-5)*TS})}
    if(Math.random()<.25)pks.push({k:Math.random()<.4?'food':'cell',x:(px0+pw/2)*TS,y:(py-1)*TS})}}}
  // 高台阶补平台：前后落差>=4时放一块过渡平台
  for(let i=1;i<segs.length;i++){const a=segs[i-1],b=segs[i];if(a.g-b.g>=4){for(let k=-3;k<0;k++)set(b.x+k,b.g+2,2)}}
  // 敌人
  const n=irnd(3,4)+(floor>1?1:0)+(G.lvl>=4?1:0);
  for(let k=0;k<n;k++){const s=segs[irnd(c===0?1:0,segs.length-1)];const type=pick_(th.enemies,k);const ex=(s.x+irnd(1,Math.max(1,s.len-2)))*TS;
   const fly=type==='sticky'||type==='popup';spawns.push({type,x:ex,y:fly?(s.g-irnd(5,8))*TS:s.g*TS})}
  // 图钉陷阱（地面上方一格，宽 2-3 格，避开地图块开头）
  const spikeP=[.3,.5,.65][floor-1];
  for(const s of segs){if(s.x<x0+3||s.len<5||Math.random()>spikeP)continue;const sw=irnd(2,3),sx=s.x+irnd(1,s.len-sw-1);let ok=true;for(let i=0;i<sw;i++)if(T[(s.g-1)*w+sx+i]!==0||T[(s.g-4)*w+sx+i]===2||T[(s.g-5)*w+sx+i]===2)ok=false;if(ok)for(let i=0;i<sw;i++)set(sx+i,s.g-1,3)}
  // 纸箱
  for(let k=0;k<irnd(1,2);k++){const s=segs[irnd(0,segs.length-1)];const cx=s.x+irnd(0,s.len-1);if(T[(s.g-1)*w+cx]===0)pks.push({k:'crate',x:cx*TS+8,y:s.g*TS,hp:14})}
  // 补模型：线框台阶通往高处宝箱（第 3、4 块里找一处）
  if((c===2||c===3)&&!secretDone){const cand=segs.filter(s=>s.len>=6&&s.g>=13).sort((a,b)=>b.len-a.len);
   for(const best of cand){const bx=best.x,g0=best.g;let ok=true;for(let y=g0-11;y<g0;y++)for(let x=bx;x<bx+6;x++)if(T[y*w+x]===1)ok=false;
    if(ok){for(let y=g0-11;y<g0;y++)for(let x=bx-1;x<bx+7;x++)if(T[y*w+x]===2||T[y*w+x]===3)set(x,y,0);for(let i=pks.length-1;i>=0;i--){const k=pks[i];if(k.x>=(bx-1)*TS&&k.x<=(bx+7)*TS&&k.y<g0*TS-2)pks.splice(i,1)}for(let i=0;i<3;i++)set(bx+i,g0-4,5);for(let i=0;i<3;i++)set(bx+3+i,g0-7,5);for(let i=0;i<3;i++)set(bx+i,g0-10,5);pks.push({k:'wireterm',x:(bx+4)*TS+8,y:g0*TS});pks.push({k:'chest',x:(bx+1)*TS+8,y:(g0-10)*TS,bonus:true,secret:true});secretDone=true;break}}}
  // 加班合同（诅咒宝箱）：第 3 块，一半概率
  if(c===2&&Math.random()<.5){const ss=segs.filter(s=>s.len>=4);if(ss.length){const s=pick(ss),cx=s.x+Math.floor(s.len/2);if(T[(s.g-1)*w+cx]===0)pks.push({k:'cchest',x:cx*TS+8,y:s.g*TS})}}
  // 加急任务：第 2 块
  if(c===1){const s=segs[irnd(0,segs.length-1)];pks.push({k:'rush',x:(s.x+Math.floor(s.len/2))*TS+8,y:s.g*TS})}
  // 卷轴：第 2、4 块各一个
  if(c===1||c===3){const s=segs[irnd(1,segs.length-1)];const cx=s.x+Math.floor(s.len/2);let gy=s.g;for(let y=s.g-1;y>2;y--)if(T[y*w+cx]===2){gy=y;break}pks.push({k:'scroll',x:cx*TS+8,y:gy*TS})}
  // 装饰
  for(let k=x0;k<x0+CW;k+=irnd(9,13))decor.push({k:'window',x:k*TS,y:Math.round(6.6*TS),s:irnd(0,99)});
  for(let k=x0+4;k<x0+CW;k+=irnd(10,14))decor.push({k:'lamp',x:k*TS,y:6*TS,s:0});
  for(const s of segs){if(Math.random()<.8){const kinds=floor===1?['easel','frame','plant','board','shelf','cooler']:floor===2?['monitor','server','board','poster','plant']:['trophy','plant','frame','poster','monitor'];
   const k=pick(kinds),dx=(s.x+irnd(0,Math.max(0,s.len-3)))*TS;const hgt={easel:30,frame:16,plant:26,board:28,shelf:19,cooler:30,monitor:20,server:46,poster:24,trophy:20}[k];
   decor.push({k,x:dx,y:(k==='frame'||k==='poster'||k==='board'?s.g*TS-hgt-30:s.g*TS-hgt),gy:s.g*TS,s:irnd(0,99)})}}
  x+=CW}
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
 const gate={x:ax+2,active:false};
 LV={floor,th,w,h:HT,T,spawns,decor,pick:pks,signs,boxes:[],arenaX:ax*TS,arenaW:arenaW*TS,gate,exitX:(w-6)*TS};
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
function drawTilesSpr(cx,cy){const n='tiles_f'+LV.floor;if(!useSpr||!sprReady(n))return false;const im=SPR[n],s=SPRS[n]||1,ts=16*s,x0=Math.max(0,Math.floor(cx/TS)),x1=Math.min(LV.w-1,Math.floor((cx+VW)/TS)),y0=Math.max(0,Math.floor(cy/TS)),y1=Math.min(LV.h-1,Math.floor((cy+VH)/TS));
 for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){const v=LV.T[ty*LV.w+tx];if(!v)continue;const i=tileIdx(v,tx,ty);if(i===undefined)continue;if(v===5)ctx.globalAlpha=.55+.25*Math.sin(T*6+tx);ctx.drawImage(im,(i%8)*ts,Math.floor(i/8)*ts,ts,ts,tx*TS-cx,ty*TS-cy,TS,TS);ctx.globalAlpha=1}
 if(LV.gate.active){const sx=LV.gate.x*TS-cx;for(let ty=2;ty<LV.h;ty++)ctx.drawImage(im,(20%8)*ts,Math.floor(20/8)*ts,ts,ts,sx,ty*TS-cy,TS,TS)}
 return true}
function drawTiles(cx,cy){if(drawTilesSpr(cx,cy))return;const th=LV.th,x0=Math.max(0,Math.floor(cx/TS)),x1=Math.min(LV.w-1,Math.floor((cx+VW)/TS)),y0=Math.max(0,Math.floor(cy/TS)),y1=Math.min(LV.h-1,Math.floor((cy+VH)/TS));
 for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){const v=tileAt(tx,ty),sx=tx*TS-cx,sy=ty*TS-cy;
  if(v===1){const top=!isSolid(tx,ty-1),ceil=ty<=1;if(ceil){px(sx,sy,TS,TS,th.trim);if(ty===1)px(sx,sy+TS-3,TS,3,th.wall2);continue}
   px(sx,sy,TS,TS,top?th.floor:th.floorD);if(top){px(sx,sy,TS,3,th.floorT);px(sx,sy+3,TS,1,th.floorD);if((tx*7)%3===0)px(sx+5,sy+6,4,1,th.floorT)}else if((tx+ty)%3===0)px(sx+3,sy+5,6,1,th.floor)
   if(!isSolid(tx-1,ty))px(sx,sy,2,TS,th.floorD);if(!isSolid(tx+1,ty))px(sx+TS-2,sy,2,TS,th.floorD)}
  else if(v===4){px(sx,sy,TS,TS,'rgba(208,214,224,.92)');ctx.fillStyle='#3ad870';ctx.fillRect(sx,sy,TS,1);ctx.fillRect(sx,sy,1,TS);ctx.fillRect(sx+TS-1,sy,1,TS);ctx.fillRect(sx,sy+TS-1,TS,1);pline(sx+1,sy+1,sx+TS-2,sy+TS-2,1,'rgba(122,240,160,.6)')}
  else if(v===5){const a=.35+.25*Math.sin(T*6+tx);ctx.globalAlpha=a;ctx.fillStyle='#7fd8ff';for(let i=0;i<TS;i+=3){ctx.fillRect(sx+i,sy,2,1);ctx.fillRect(sx+i,sy+5,2,1)}ctx.fillRect(sx,sy,1,6);ctx.fillRect(sx+TS-1,sy,1,6);pline(sx,sy+5,sx+TS-1,sy,1,'#7fd8ff');ctx.globalAlpha=1}
  else if(v===3){for(let i=0;i<4;i++){const ox=2+i*4;px(sx+ox,sy+TS-7,1,6,'#c8ccd4');px(sx+ox-1,sy+TS-9,3,3,['#d8584a','#3a8ad8','#f2c14e','#5ab85a'][(tx+i)%4])}px(sx,sy+TS-1,TS,1,'rgba(0,0,0,.25)')}
  else if(v===2){px(sx,sy,TS,4,th.platT);px(sx,sy+4,TS,2,th.plat);if(tileAt(tx-1,ty)!==2)px(sx+1,sy+6,2,8,th.plat);if(tileAt(tx+1,ty)!==2)px(sx+TS-3,sy+6,2,8,th.plat)}}
 if(LV.gate.active){const sx=LV.gate.x*TS-cx;for(let ty=2;ty<LV.h;ty++){px(sx,ty*TS-cy,TS,TS,'#3a3a46');px(sx+2,ty*TS-cy+2,TS-4,TS-4,'#d8584a');px(sx+6,ty*TS-cy+4,4,8,'#fff')}}}
// ===== 背景：窗外远景（far）→ 墙面（mid，窗户处透出远景）→ 装饰 → 灯光 =====
// 有 bg_f{n}_far / bg_f{n}_mid / bg_f{n}_arena / bg_f{n}_near 素材时用素材，没有就用代码画
const FAR={};
function farCanvas(f){if(FAR[f])return FAR[f];const c=document.createElement('canvas');c.width=480*RES;c.height=300*RES;const g=c.getContext('2d');g.scale(RES,RES);
 let seed=f*977;const rr=()=>(seed=(seed*16807)%2147483647)/2147483647;const H=300,hz=210;
 const sky={1:[['#7fbde8',0],['#cfe8f6',.75],['#eef6fa',1]],2:[['#2a2858',0],['#7a4a78',.4],['#f0845a',.75],['#ffc27a',1]],3:[['#05081a',0],['#121638',.7],['#26244a',1]]}[f];
 const gr=g.createLinearGradient(0,0,0,hz);for(const[c,p]of sky)gr.addColorStop(p,c);g.fillStyle=gr;g.fillRect(0,0,480,H);
 if(f===1){g.fillStyle='rgba(255,255,255,.85)';for(let i=0;i<7;i++){const x=rr()*480,y=20+rr()*90,w=30+rr()*50;for(let k=0;k<5;k++){g.beginPath();g.ellipse(x+k*w/5,y+Math.sin(k*1.7)*3,w/4,7+rr()*4,0,0,7);g.fill();g.beginPath();g.ellipse(x+k*w/5-480,y+Math.sin(k*1.7)*3,w/4,7+rr()*4,0,0,7);g.fill()}}}
 if(f===2){g.fillStyle='#ffd08a';g.beginPath();g.arc(330,hz-18,22,0,7);g.fill();g.fillStyle='rgba(255,208,138,.25)';g.beginPath();g.arc(330,hz-18,40,0,7);g.fill()}
 if(f===3){for(let i=0;i<90;i++){g.fillStyle=rr()<.2?'#fff':'rgba(255,255,255,.55)';g.fillRect(Math.floor(rr()*480),Math.floor(rr()*170),1,1)}g.fillStyle='#f4ecd0';g.beginPath();g.arc(90,60,12,0,7);g.fill();g.fillStyle='#121638';g.beginPath();g.arc(95,56,11,0,7);g.fill()}
 // 两层城市剪影，水平方向首尾相接
 const layers={1:[['#b4cadc','#d6e4ee',.0],['#93adc4','#c6d8e6',.25]],2:[['#4a3060','#ffcf7a',.25],['#2a1e3c','#ffd27a',.35]],3:[['#161a34','#f2d27a',.4],['#0c0e22','#9fd8ff',.45]]}[f];
 layers.forEach(([col,win,lit],li)=>{let x=0;const base=hz+li*28;while(x<480){const w=18+Math.floor(rr()*34),h=30+Math.floor(rr()*(li?70:110));for(const ox of[0,-480,480]){g.fillStyle=col;g.fillRect(x+ox,base-h,w,H-base+h);
   if(rr()<.4){g.fillRect(x+ox+w/2-1,base-h-8,2,8)}
   for(let wy=base-h+5;wy<base-4;wy+=6)for(let wx=x+ox+3;wx<x+ox+w-3;wx+=5){const on=((wx*7+wy*13+f)%11)/11<lit;if(on||f===1){g.fillStyle=f===1?'rgba(255,255,255,.35)':win;g.fillRect(wx,wy,2,3)}}}
  x+=w+Math.floor(rr()*4)}});
 return FAR[f]=c}
function drawFar(cx,cy){const n='bg_f'+LV.floor+'_far',ox=Math.floor(cx*.15),oy=R(-cy*.12)-12;
 if(sprReady(n)){const im=SPR[n],s=SPRS[n]||1,W=im.naturalWidth/s,H=im.naturalHeight/s;for(let x=-(ox%W);x<VW;x+=W)ctx.drawImage(im,x,oy,W,H);return}
 const c=farCanvas(LV.floor);for(let x=-(ox%480);x<VW;x+=480)ctx.drawImage(c,x,oy,480,300)}
function drawBackground(cx,cy,t){const th=LV.th,f=LV.floor,mid='bg_f'+f+'_mid',arena='bg_f'+f+'_arena';
 if(sprReady(mid)){drawFar(cx,cy);const im=SPR[mid],s=SPRS[mid]||1,W=im.naturalWidth/s,H=im.naturalHeight/s,y0=R(2*TS-cy);
  const hasA=sprReady(arena),ax0=R(LV.arenaX-cx),ax1=ax0+LV.arenaW;
  // Boss 房那段不画普通墙面，让 Boss 房墙面的窗户透出窗外景色
  ctx.save();if(hasA&&ax0<VW){ctx.beginPath();ctx.rect(-10,-10,Math.max(0,ax0+10),VH+20);ctx.rect(ax1,-10,Math.max(0,VW-ax1+10),VH+20);ctx.clip()}
  for(let x=-(Math.floor(cx*.5)%W);x<VW;x+=W)ctx.drawImage(im,x,y0,W,H);ctx.restore();
  if(hasA){const a=SPR[arena],sa=SPRS[arena]||1;ctx.drawImage(a,ax0,y0,a.naturalWidth/sa,a.naturalHeight/sa)}
  for(const d of LV.decor)if(d.k==='lamp')drawDecor(d,cx,cy,th,t);return}
 ctx.fillStyle=th.wall;ctx.fillRect(0,0,VW,VH);
 // 墙面竖条纹（视差）+ 墙裙
 const o=Math.floor(cx*.5)%64;for(let x=-o;x<VW;x+=64){px(x,0,32,VH,th.wall2);px(x+31,0,1,VH,'rgba(0,0,0,.05)')}
 px(0,R(2*TS-cy),VW,4,th.trim);px(0,R(2*TS-cy)+4,VW,2,'rgba(0,0,0,.12)');
 px(0,R(15*TS-cy),VW,R(2*TS),'rgba(0,0,0,.06)');px(0,R(15*TS-cy),VW,1,th.trim);px(0,R(17*TS-cy),VW,2,th.trim);
 for(const d of LV.decor)if(d.k==='window'||d.k==='lamp'||d.k==='sign')drawDecor(d,cx,cy,th,t)}
// 灯光：只照背景和装饰（在地面、角色之前画），让前景更突出
function drawLights(cx,cy,t){const f=LV.floor,th=LV.th;
 const scene=sprReady('bg_f'+f+'_mid');const amb=scene?{1:0,2:.06,3:.12}[f]:{1:0,2:.16,3:.45}[f];if(amb){ctx.fillStyle=f===2?`rgba(20,24,64,${amb})`:`rgba(8,6,26,${amb})`;ctx.fillRect(0,0,VW,VH)}
 ctx.save();ctx.globalCompositeOperation='lighter';
 for(const d of LV.decor){const x=R(d.x-cx),y=R(d.y-cy);if(x<-120||x>VW+120)continue;
  if(scene&&d.k==='window')continue;
  if(d.k==='window'&&f===1){ctx.fillStyle='rgba(255,226,160,.07)';ctx.beginPath();ctx.moveTo(x+2,y+2);ctx.lineTo(x+38,y+2);ctx.lineTo(x+110,y+190);ctx.lineTo(x+60,y+190);ctx.fill();ctx.fillStyle='rgba(255,226,160,.05)';ctx.fillRect(x+2,y+2,36,32)}
  if(d.k==='window'&&f===2){ctx.fillStyle='rgba(255,150,90,.06)';ctx.beginPath();ctx.moveTo(x+2,y+2);ctx.lineTo(x+38,y+2);ctx.lineTo(x+120,y+190);ctx.lineTo(x+40,y+190);ctx.fill()}
  if(d.k==='lamp'){const ly=y+(scene?20:12),g=ctx.createRadialGradient(x,ly,2,x,ly,f===3?130:80);g.addColorStop(0,th.light+(f===3?'.6)':'.14)'));g.addColorStop(1,th.light+'0)');ctx.fillStyle=g;ctx.fillRect(x-135,ly-132,270,270)}
  if(d.k==='monitor'||d.k==='server'){ctx.fillStyle='rgba(90,200,255,.06)';ctx.beginPath();ctx.arc(x+11,y+8,22,0,7);ctx.fill()}}
 ctx.restore()}
function drawNear(cx,cy){const n='bg_f'+LV.floor+'_near';if(!sprReady(n))return;const im=SPR[n],s=SPRS[n]||1,W=im.naturalWidth/s,H=im.naturalHeight/s;for(let x=-(Math.floor(cx*1.3)%W);x<VW;x+=W)ctx.drawImage(im,x,VH-H,W,H)}
