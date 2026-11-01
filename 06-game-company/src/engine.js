'use strict';
// ===== 引擎 =====
const VW=480,VH=270,TS=16;
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,rnd=(a,b)=>a+Math.random()*(b-a),irnd=(a,b)=>Math.floor(rnd(a,b+1)),pick=a=>a[Math.floor(Math.random()*a.length)];
const sign=v=>v<0?-1:v>0?1:0;
const screen=$('screen'),sctx=screen.getContext('2d');
const buf=document.createElement('canvas');buf.width=VW;buf.height=VH;const ctx=buf.getContext('2d');ctx.imageSmoothingEnabled=false;
let SCALE=3,OX=0,OY=0;
function resize(){const dpr=Math.min(window.devicePixelRatio||1,2),w=innerWidth||1280,h=innerHeight>100?innerHeight:720;screen.width=Math.floor(w*dpr);screen.height=Math.floor(h*dpr);screen.style.width=w+'px';screen.style.height=h+'px';
 const s=Math.min(screen.width/VW,screen.height/VH);SCALE=s>=2?Math.floor(s):s;OX=Math.floor((screen.width-VW*SCALE)/2);OY=Math.floor((screen.height-VH*SCALE)/2);sctx.imageSmoothingEnabled=false;
 const ui=$('ui');if(ui){const cs=SCALE/dpr;ui.style.width=VW*cs+'px';ui.style.height=VH*cs+'px';ui.style.left=OX/dpr+'px';ui.style.top=OY/dpr+'px';ui.style.fontSize=(cs*4.5)+'px'}}
addEventListener('resize',resize);resize();setTimeout(resize,300);
function present(){sctx.fillStyle='#000';sctx.fillRect(0,0,screen.width,screen.height);sctx.imageSmoothingEnabled=false;sctx.drawImage(buf,0,0,VW,VH,OX,OY,VW*SCALE,VH*SCALE)}
// ===== 输入 =====
const K={},KP={};
const BIND={left:['KeyA','ArrowLeft','PadL'],right:['KeyD','ArrowRight','PadR'],up:['KeyW','ArrowUp','PadU'],down:['KeyS','ArrowDown','PadD'],jump:['Space','KeyW','ArrowUp','Pad0'],atk:['KeyJ','Mouse0','Pad2'],skill:['KeyK','Mouse2','Pad3'],roll:['KeyL','ShiftLeft','ShiftRight','Pad1','Pad7'],use:['KeyE','Pad4'],heal:['KeyQ','Pad5'],pause:['Escape','KeyP','Pad9'],opt1:['Digit1','Numpad1'],opt2:['Digit2','Numpad2'],opt3:['Digit3','Numpad3'],confirm:['Enter','Pad0']};
const down=a=>BIND[a].some(k=>K[k]),pressed=a=>BIND[a].some(k=>KP[k]);
addEventListener('keydown',e=>{if(!K[e.code])KP[e.code]=1;K[e.code]=1;if(/Space|Arrow/.test(e.code))e.preventDefault();Snd.unlock()});
addEventListener('keyup',e=>{K[e.code]=0});addEventListener('blur',()=>{for(const k in K)K[k]=0});
screen.addEventListener('mousedown',e=>{const c='Mouse'+e.button;if(!K[c])KP[c]=1;K[c]=1;Snd.unlock()});addEventListener('mouseup',e=>{K['Mouse'+e.button]=0});
screen.addEventListener('contextmenu',e=>e.preventDefault());
function clearPressed(){for(const k in KP)delete KP[k]}
// 手柄
let padOn=false;
function pollPad(){const pads=navigator.getGamepads?navigator.getGamepads():[];const gp=pads&&Array.from(pads).find(p=>p&&p.connected);if(!gp){if(padOn){for(const k in K)if(k.startsWith('Pad'))K[k]=0;padOn=false}return}padOn=true;
 const st={};gp.buttons.forEach((b,i)=>{st['Pad'+i]=b.pressed||b.value>.5});const ax=gp.axes[0]||0,ay=gp.axes[1]||0;
 st.PadL=ax<-.4||st.Pad14;st.PadR=ax>.4||st.Pad15;st.PadD=ay>.55||st.Pad13;st.PadU=ay<-.6||st.Pad12;
 for(const k in st){if(st[k]&&!K[k])KP[k]=1;K[k]=st[k]?1:0}}
// ===== 音频 =====
const Snd=(()=>{let AC=null,M,mus,nb,muted=false;
 function unlock(){try{if(!AC){AC=new(window.AudioContext||window.webkitAudioContext)();M=AC.createGain();M.gain.value=.5;M.connect(AC.destination);mus=AC.createGain();mus.gain.value=.22;mus.connect(M);nb=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);const d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}if(AC.state!=='running')AC.resume()}catch(e){}}
 document.addEventListener('visibilitychange',()=>{if(AC){document.hidden?AC.suspend():AC.resume()}});
 function tone(type,f0,f1,dur,vol,t0=0,bus){if(!AC||muted)return;const t=AC.currentTime+t0,o=AC.createOscillator(),g=AC.createGain();o.type=type;const r=rnd(.97,1.03);o.frequency.setValueAtTime(f0*r,t);if(f1!==f0)o.frequency.exponentialRampToValueAtTime(Math.max(20,f1*r),t+dur);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.005);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(bus||M);o.start(t);o.stop(t+dur+.02)}
 function noise(dur,f,vol,t0=0,type='lowpass',bus,f1){if(!AC||muted)return;const t=AC.currentTime+t0,s=AC.createBufferSource(),fl=AC.createBiquadFilter(),g=AC.createGain();s.buffer=nb;fl.type=type;fl.frequency.setValueAtTime(f,t);if(f1)fl.frequency.exponentialRampToValueAtTime(f1,t+dur);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(fl).connect(g).connect(bus||M);s.start(t);s.stop(t+dur+.02)}
 const S={swing:()=>noise(.09,1800,.18,0,'bandpass',0,4200),heavy:()=>{noise(.18,600,.25,0,'bandpass',0,2400);tone('sine',120,60,.15,.15)},hit:()=>{noise(.06,3000,.25);tone('square',220,90,.08,.12)},crit:()=>{noise(.1,4000,.3);tone('square',440,110,.12,.14)},
  jump:()=>tone('square',260,520,.1,.07),djump:()=>tone('square',380,760,.1,.07),land:()=>noise(.06,500,.15),roll:()=>noise(.18,900,.12,0,'lowpass',0,300),hurt:()=>{tone('sawtooth',320,80,.25,.18);noise(.15,1200,.15)},
  die:()=>{noise(.25,1500,.2,0,'lowpass',0,200);tone('square',300,60,.25,.1)},pick:()=>{tone('triangle',880,880,.06,.12);tone('triangle',1320,1320,.12,.12,.06)},cell:()=>tone('sine',1200+Math.random()*400,1800,.05,.04),
  shoot:()=>noise(.07,2500,.12,0,'highpass'),throw:()=>tone('triangle',500,300,.12,.1),boom:()=>{noise(.4,700,.35,0,'lowpass',0,100);tone('sine',90,35,.4,.3)},parry:()=>{tone('square',1200,1200,.05,.12);tone('triangle',1800,2400,.15,.1)},
  heal:()=>[523,659,784].forEach((f,i)=>tone('triangle',f,f,.15,.1,i*.06)),warn:()=>tone('square',700,700,.07,.07),door:()=>tone('triangle',200,400,.4,.12),
  boss:()=>{tone('sawtooth',90,60,.8,.2);noise(.6,400,.2)},win:()=>[523,659,784,1047,784,1047,1319].forEach((f,i)=>tone('triangle',f,f,.25,.12,i*.11)),
  select:()=>tone('square',660,990,.08,.08),stamp:()=>{noise(.2,300,.4);tone('sine',80,40,.3,.3)},laser:()=>{tone('sawtooth',200,1200,.5,.08);noise(.5,3000,.08,0,'highpass')}};
 // 音乐
 const mtof=m=>440*Math.pow(2,(m-69)/12);
 const SONGS={
  f1:{bpm:118,prog:[[45,57,60,64],[41,53,57,60],[48,55,60,64],[43,55,59,62]],lead:[0,2,3,2,0,-1,0,2]},
  f2:{bpm:128,prog:[[40,52,55,59],[43,55,59,62],[45,57,60,64],[47,54,59,62]],lead:[0,3,2,3,0,2,1,2]},
  f3:{bpm:122,prog:[[38,50,53,57],[46,53,58,62],[41,53,57,60],[45,52,57,61]],lead:[0,2,0,3,2,0,1,3]},
  boss:{bpm:150,prog:[[45,57,60,64],[44,56,59,64],[43,55,58,62],[42,54,57,62]],lead:[3,2,3,1,3,2,0,1]},
  rest:{bpm:84,prog:[[48,55,60,64],[45,52,57,60],[41,48,53,57],[43,50,55,59]],lead:[1,2,3,2,1,2,3,0]},
  end:{bpm:90,prog:[[48,55,60,64],[43,50,55,59],[45,52,57,60],[41,48,53,57]],lead:[3,2,1,2,3,2,1,0]}};
 let song=null,nextT=0,step=0,timer=null;
 function sched(){if(!AC||!song||muted)return;const sp=60/song.bpm/2;while(nextT<AC.currentTime+.12){const t0=nextT-AC.currentTime,bar=Math.floor(step/8)%4,s=step%8,ch=song.prog[bar],busy=song!==SONGS.rest&&song!==SONGS.end;
   if(s%2===0)tone('triangle',mtof(ch[0]-12),mtof(ch[0]-12),sp*1.8,.22,t0,mus);
   if(s===0)ch.slice(1).forEach(n=>tone('sine',mtof(n),mtof(n),sp*7.5,.035,t0,mus));
   const ln=ch[1+song.lead[s]%3]+12+(song.lead[s]>2?12:0);if(busy||s%2===0)tone('square',mtof(ln),mtof(ln),sp*.8,busy?.03:.025,t0,mus);
   if(busy){if(s%4===0)tone('sine',140,45,.14,.3,t0,mus);if(s%4===2)noise(.1,2500,.07,t0,'highpass',mus);noise(.025,8000,.025,t0,'highpass',mus)}
   nextT+=sp;step++}}
 function play(n){song=SONGS[n];if(AC&&!timer){nextT=AC.currentTime+.05;timer=setInterval(sched,25)}if(AC)nextT=Math.max(nextT,AC.currentTime+.02);step=0}
 return{unlock,S,play,toggle(){muted=!muted;if(M)M.gain.value=muted?0:.5;return muted}}})();
const SFX=Snd.S;
// ===== 粒子 =====
const parts=[];
function part(x,y,vx,vy,col,life,size=2,grav=400,drag=1){parts.push({x,y,vx,vy,col,life,max:life,size,grav,drag})}
function burst(x,y,n,col,spd,life,size=2,grav=300,up=0){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=spd*rnd(.3,1);part(x,y,Math.cos(a)*s,Math.sin(a)*s-up,Array.isArray(col)?pick(col):col,life*rnd(.6,1.2),size,grav)}}
function updParts(dt){for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.life-=dt;if(p.life<=0){parts.splice(i,1);continue}p.vy+=p.grav*dt;p.vx*=1-dt*2*p.drag;p.x+=p.vx*dt;p.y+=p.vy*dt}}
function drawParts(cx,cy){for(const p of parts){const s=Math.max(1,Math.round(p.size*Math.min(1,p.life/p.max*1.6)));ctx.fillStyle=p.col;ctx.fillRect(Math.round(p.x-cx-s/2),Math.round(p.y-cy-s/2),s,s)}}
// 墨迹（地面溅射，持续一会）
const splats=[];function splat(x,y,col,n=6){for(let i=0;i<n;i++)splats.push({x:x+rnd(-8,8),y,w:irnd(1,4),col,life:6});if(splats.length>200)splats.splice(0,splats.length-200)}
// ===== 像素数字 3x5 =====
const DIG={'-':'000000111000000','0':'111101101101111','1':'010110010010111','2':'111001111100111','3':'111001111001111','4':'101101111001001','5':'111100111001111','6':'111100111101111','7':'111001010010010','8':'111101111101111','9':'111101111001111','!':'010010010000010','+':'000010111010000'};
function pnum(str,x,y,col,s=1){str=String(str);let cx=x-Math.floor(str.length*4*s/2);for(const ch of str){const g=DIG[ch];if(g){ctx.fillStyle='#14121a';for(let i=0;i<15;i++)if(g[i]==='1')ctx.fillRect(cx+(i%3)*s+1,y+Math.floor(i/3)*s+1,s,s);ctx.fillStyle=col;for(let i=0;i<15;i++)if(g[i]==='1')ctx.fillRect(cx+(i%3)*s,y+Math.floor(i/3)*s,s,s)}cx+=4*s}}
const nums=[];function dmgNum(x,y,v,col='#fff',big=false){nums.push({x,y,v:Math.round(v),col,t:0,big})}
function updNums(dt){for(let i=nums.length-1;i>=0;i--){nums[i].t+=dt;nums[i].y-=dt*(30-nums[i].t*40);if(nums[i].t>.7)nums.splice(i,1)}}
function drawNums(cx,cy){for(const n of nums)pnum(n.v,Math.round(n.x-cx),Math.round(n.y-cy),n.col,n.big?2:1)}
