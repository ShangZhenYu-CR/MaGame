import type { Vec2, WorldState } from '../sim/types';
import { PALETTE as P } from './palette';

export type TilePaint=(x:number,y:number,w:number,h:number,color:string)=>void;
export function artHash(x:number,y:number,k=0):number {
  let n=Math.imul(x+1879,0x1f123bb5)^Math.imul(y+701,0x5f356495)^Math.imul(k+53,0x6c8e9cf5);
  n=Math.imul(n^(n>>>15),0x2c1b3c6d);return ((n^(n>>>13))>>>0)/4294967296;
}
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const smooth=(x:number)=>x*x*(3-2*x);
const clamp=(x:number)=>Math.max(0,Math.min(1,x));

function cloudNoise(x:number,y:number,k:number,period:number):number {
  const xi=Math.floor(x),yi=Math.floor(y),u=smooth(x-xi),v=smooth(y-yi);
  const h=(a:number,b:number)=>artHash((a%period+period)%period,b,k);
  return lerp(lerp(h(xi,yi),h(xi+1,yi),u),lerp(h(xi,yi+1),h(xi+1,yi+1),u),v);
}

export function makeCloudShelf(): HTMLCanvasElement[] {
  const colors=[
    [[26,42,59],[50,77,97],[73,106,125],[98,133,151]],
    [[31,52,70],[58,85,106],[81,114,136],[116,151,171]],
    [[35,55,74],[62,91,112],[91,124,145],[140,170,184]],
  ];
  return colors.map((cs,k)=>{
    const cv=document.createElement('canvas');cv.width=384;cv.height=216;
    const g=cv.getContext('2d')!, px=g.createImageData(cv.width,cv.height);
    const f=(x:number,y:number)=>cloudNoise(x/48,y/23,k*3,8)*.59+cloudNoise(x/16,y/9,k*3+1,24)*.30+
      cloudNoise(x/6,y/4,k*3+2,64)*.11;
    for(let y=0;y<cv.height;y++)for(let x=0;x<cv.width;x++){
      const yn=y/cv.height;
      const shelf=k===0?.16:k===1?.67:.96;
      const banks=Math.max(0,1-Math.abs(yn-shelf)/(k===2?.29:.49));
      const density=f(x,y)+banks*.23-(k===2?.61:.57);
      if(density<0)continue;
      const grad=(f(x,y+1)-f(x+2,y-2))*2.8;
      const c=cs[Math.min(3,Math.max(0,Math.floor(1.4+density*5+grad)))];
      const off=(y*cv.width+x)*4;
      px.data.set([...c,Math.round(clamp(density*5.9)*(k===2?196:172))],off);
    }
    g.putImageData(px,0,0);return cv;
  });
}

export function paintClouds(c:CanvasRenderingContext2D,shelves:HTMLCanvasElement[],world:WorldState):void {
  const {width:w,height:h}=c.canvas, night=world.weather!=='clear';
  c.fillStyle=night?'#14283a':'#23394b';c.fillRect(0,0,w,h);
  const layers=night?[.6,.81,.92]:[.78,.88,1];
  for(let j=0;j<shelves.length;j++){
    const cv=shelves[j], x=Math.floor((world.tick*(.10+j*.16))%w);
    c.globalAlpha=layers[j];c.imageSmoothingEnabled=false;
    c.drawImage(cv,x,0,w,h);c.drawImage(cv,x-w,0,w,h);
  }
  c.globalAlpha=1;
}

export function paintRock(t:TilePaint,x:number,y:number,left:boolean,right:boolean):void {
  t(x-.12,y+.85,1.24,.55,'#182737');
  const colors=['#294052','#334b5d','#425b6a','#536d79','#647f89'];
  for(let row=0;row<10;row++){
    const depth=row*.09, contraction=Math.min(.33,depth*.33);
    const l=x+(left?contraction:contraction*.46)-.09+(artHash(x,y,row)*.16);
    const r=x+1-(right?contraction:contraction*.46)+.13-artHash(x,y,row+10)*.16;
    if(r<=l)continue;
    t(l,y+.77+depth,r-l,.10,colors[row<3?1:row<6?0:1]);
    for(let f=0;f<5;f++){
      const w=.11+artHash(x+f,y,row+33)*.23;
      const at=l+(r-l)*artHash(x,y+f,row+15);
      t(at,y+.77+depth,Math.min(w,r-at),.09,colors[Math.floor(artHash(x+f,y,row+56)*colors.length)]);
    }
  }
  t(x+.12,y+1.05,.45,.037,'#6c8791');
  t(x+.19,y+1.20,.19,.044,'#587580');
  t(x+.55,y+1.35,.28,.039,'#516873');
}

const plankColors=['#694f3f','#755744','#81624b','#86664d','#735947','#604939','#8d6a52'];
export function paintPlanks(t:TilePaint,x:number,y:number,edge:boolean,upper:boolean):void {
  t(x,y,1,1,'#302d2d');
  for(let row=0;row<5;row++){
    const y0=y+.015+row*.2;
    const base=Math.floor(artHash(Math.floor((x+row%3)/2),y,row)*plankColors.length);
    const shift=(artHash(x,y,row+12)>.72?.03:0);
    t(x,y0+shift,1,.174-shift,plankColors[base]);
    t(x+.015,y0+shift,.97,.023,row%2?'#9c7756':'#aa845f');
    t(x,y0+.175,.98,.025,'#3b332f');
    const join= x+.2+artHash(x,y,row+72)*.61;
    if(artHash(x,y,row+13)>.68){t(join,y0+.02,.023,.156,'#40362e');t(join+.03,y0+.028,.022,.12,'#a27b58');}
    for(let j=0;j<7;j++){
      const run=.12+artHash(x+j,y,row+23)*.39;
      const u=artHash(x,y+j,row+31)*.83;
      t(x+u,y0+.032+artHash(x+j,y,row+20)*.13,Math.min(run,.99-u),.018,j%4===0?'#9b795d':'#634b3d');
    }
    if(artHash(x,y,row+85)>.79){t(x+.17,y0+.095,.065,.045,'#513c33');t(x+.18,y0+.084,.039,.017,'#a88a6c');}
  }
  if((x+y)%3===0){t(x+.12,y+.13,.055,.053,'#35414a');t(x+.123,y+.127,.029,.019,'#9aabac');}
  if(edge){
    t(x,y+.88,1,.117,'#435561');t(x,y+.887,1,.029,'#8f9d9b');
    t(x+.13,y+.928,.063,.052,'#a5aa9d');t(x+.78,y+.928,.063,.052,'#a5aa9d');
  }
  if(upper){t(x,y+.008,1,.025,'#719097');t(x+.11,y+.023,.29,.021,'#b0beba');}
}

export function paintHearth(t:TilePaint,x:number,y:number,fuel:number,level:number,tick:number):void {
  t(x-.09,y+.52,2.22,1.43,'#362c2b');t(x+.08,y+.39,1.86,1.41,'#3a454a');
  t(x+.16,y+.29,1.68,1.35,'#54626a');t(x+.31,y+.34,1.43,1.21,'#34444e');
  for(let j=0;j<4;j++){
    for(let k=0;k<6;k++){
      const bx=x+.18+k*.278+(j%2)*.065,by=y+.39+j*.365;
      if(bx>x+1.7)continue;
      const val=artHash(k,j,5);
      t(bx,by,.23,.166,val>.62?'#859190':val>.28?'#6d7b80':'#515e64');
      t(bx,by+.135,.23,.032,'#3c474b');
    }
  }
  t(x+.27,y+.39,1.46,1.05,'#252d32');
  t(x+.42,y+.47,1.16,.76,'#502f28');t(x+.44,y+.64,1.1,.48,fuel>0?'#933f26':'#292b2e');
  for(let i=0;i<7;i++){
    const q=artHash(i,level,12), xb=x+.46+i*.155;
    t(xb,y+1.05,.12,.082,fuel>0?(q>.45?'#d67036':'#8b3e27'):'#403634');
    if(fuel>0){
      const flick=1+Math.sin(tick*.27+i*2.6)*.23, height=(.16+q*.36)*flick;
      t(xb+.025,y+1.055-height,.115,height,'#ca5d2f');
      t(xb+.045,y+1.047-height*.8,.076,height*.8,'#ffc37b');
      if(q>.53)t(xb+.061,y+1.02-height*.5,.047,height*.5,'#fff0b2');
    }
  }
  t(x+.24,y+1.21,1.52,.12,'#938f83');t(x+.21,y+1.33,1.56,.20,'#465058');
  for(let n=0;n<7;n++)t(x+.39+n*.175,y+1.35,.08,.12,'#262f36');
  t(x+.13,y+1.57,1.73,.10,'#687174');t(x+.18,y+1.70,1.62,.1,'#343b3f');
  // Reinforced chimney and twin service bolts.
  t(x+1.41,y+.10,.37,.52,'#323d45');t(x+1.39,y+.085,.42,.12,'#7c8686');t(x+1.45,y+.105,.29,.041,'#28333b');
  for(const a of [.16,1.68]){t(x+a,y+.54,.12,.64,'#5b625e');t(x+a,y+.65,.105,.042,'#bfb69b');}
  if(level>1){t(x+.11,y+1.63,1.77,.05,'#c58953');t(x+.18,y+.22,1.57,.06,'#a8784e');}
}

export function paintDebris(t:TilePaint,x:number,y:number,id:string):void {
  if(id==='driftwood'){
    t(x-.42,y-.24,.84,.55,'#3d322b');t(x-.37,y-.30,.74,.4,'#8a6248');
    for(let j=0;j<4;j++){t(x-.28,y-.25+j*.092,.56,.048,j%2?'#a47e55':'#73563f');}
    for(const z of [-.32,.26]){t(x+z,y-.27,.067,.56,'#445563');t(x+z,y-.28,.064,.072,'#a1a69a');}
    t(x-.1,y+.05,.18,.105,'#c5a276');t(x-.07,y+.07,.10,.037,'#5d4c3e');
  }else if(id==='rope'){
    for(let j=0;j<4;j++){
      const a=.25-j*.043;
      t(x-a,y-.22+j*.099,a*2,.17,j%2?'#a27b50':'#846040');
      t(x-a+.04,y-.23+j*.1,a*2-.08,.033,'#d9b589');
    }
    t(x-.08,y-.11,.21,.19,'#544433');t(x+.16,y+.12,.19,.07,'#b7895d');
  }else{
    t(x-.34,y-.17,.67,.39,'#405869');t(x-.41,y-.08,.21,.21,'#576e7d');
    t(x-.17,y-.28,.38,.18,'#7892a0');t(x-.02,y-.33,.19,.11,'#a4b8bf');
    t(x+.1,y-.12,.26,.1,'#adc5cc');t(x-.23,y+.12,.49,.072,'#293e50');
    t(x+.02,y-.18,.054,.36,'#ca9b6f');
  }
}

export function paintLatte(t:TilePaint,x:number,y:number,tick:number,mood:WorldState['latte']['mood']):void {
  const breathe=Math.floor(tick/8)%2*.023;
  t(x-.32,y+.22,.64,.14,'#423738');
  if(mood==='cozy'){
    t(x-.29,y-.12+breathe,.42,.34,'#77574c');t(x+.04,y-.18,.27,.25,'#b48a65');
    t(x+.072,y-.26,.075,.115,'#9b644f');t(x+.23,y-.25,.074,.115,'#9b644f');
    t(x+.075,y-.02,.258,.085,'#d5b496');t(x+.125,y-.074,.09,.03,'#51474a');
    t(x-.4,y+.03,.22,.11,'#605055');t(x-.29,y+.12,.47,.095,'#a57b67');
    if(tick%95<54){t(x+.24,y-.35-breathe,.11,.022,'#d6bda7');t(x+.325,y-.40-breathe,.058,.023,'#d6bda7');}
  }else{
    t(x-.18,y-.21,.38,.43,'#906b58');t(x+.08,y-.32,.31,.27,'#c19b79');
    t(x+.115,y-.43,.065,.16,'#ac8065');t(x+.315,y-.45,.057,.17,'#ac8065');
    t(x+.18,y-.24,.045,.033,'#46363a');t(x+.30,y-.24,.045,.033,'#46363a');
    t(x+.10,y+.15,.105,.09,'#dbc0a2');t(x-.09,y+.15,.093,.09,'#dbc0a2');
    if(mood==='alert'){t(x-.3,y-.41,.12,.49,'#896359');t(x-.37,y-.5,.14,.31,'#b18a73');}
    else {t(x-.36,y+.11,.23,.073,'#a57b67');if(tick%50<25)t(x+.26,y-.144,.07,.056,'#493942');}
  }
}

export function screenWeather(c:CanvasRenderingContext2D,world:WorldState,fire:Vec2|null):void{
  const {width:w,height:h}=c.canvas, night=world.weather!=='clear';
  const count=world.weather==='whiteout'?180:night?149:52;
  for(let i=0;i<count;i++){
    const speed=night?1.4+(i%7)*.29:.21+(i%5)*.13;
    const x=(artHash(i,4,19)*w+world.tick*speed)%w, y=(artHash(i,8,21)*h+world.tick*speed*.47)%h;
    const size=1+(i%4===0?1:0);
    c.globalAlpha=(night?.28:.1)+(i%8)*.038;c.fillStyle=P.snowHighlight;
    c.fillRect(Math.floor(x),Math.floor(y),size,size);
    if(night&&i%3===0){c.fillRect(Math.floor(x)-3,Math.floor(y)-1,3,1);if(i%2)c.fillRect(Math.floor(x)-5,Math.floor(y)-2,2,1);}
  }
  if(fire)for(let i=0;i<20;i++){
    const q=(world.tick*.017+i*.113)%1;
    const x=fire.x+artHash(i,8,31)*34-17+q*(17+i%4*4),y=fire.y-q*(45+i%5*7);
    c.globalAlpha=(1-q)*.77;c.fillStyle=i%3===0?P.hearthCore:P.hearthGlow;
    c.fillRect(Math.round(x),Math.round(y),i%5===0?3:2,2);
  }
  c.globalAlpha=1;
}
