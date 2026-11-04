// 无浏览器的素材契约检查；不替代 Playwright 回归和实机目视。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..'),art=path.join(root,'art');
const files=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.name==='_pending'?[]:e.isDirectory()?files(path.join(p,e.name)):[path.join(p,e.name)]);
const all=files(art),anchors=Object.assign({},...all.filter(p=>path.basename(p)==='anchors.json').sort().map(p=>JSON.parse(fs.readFileSync(p))));
const images={};for(const p of all.filter(p=>p.endsWith('.png'))){const b=fs.readFileSync(p),n=path.basename(p,'.png').replace('@2x','');images[n]={name:n,complete:true,naturalWidth:b.readUInt32BE(16),naturalHeight:b.readUInt32BE(20)}}
const calls=[],ctx=new Proxy({drawImage:(im,...args)=>calls.push([im.name,...args])},{get:(o,k)=>o[k]||(()=>{})});
const c=vm.createContext({ART_SRC:{},ART_ANCHOR:anchors,ART_FW:JSON.parse(fs.readFileSync(path.join(art,'frames.json'))),ART_GAP:JSON.parse(fs.readFileSync(path.join(art,'gaps.json'))),ctx,document:{getElementById:()=>null},Math,console,images});
const ev=s=>vm.runInContext(s,c);
ev(fs.readFileSync(path.join(root,'src/art.js'),'utf8'));
ev("Object.assign(SPR,images);for(const k in SPR)SPRS[k]=2");
const game=fs.readFileSync(path.join(root,'src/game.js'),'utf8');
ev(game.slice(game.indexOf('function handOf('),game.indexOf('function drawRoom(')));
ev("const P={face:1,prim:'knife',anim:0,onGround:true,vx:0},LV={floor:1};const WEAPONS={knife:{combo:[{},{},{},{}]}};let T=10;function lerp(a,b,t){return a+(b-a)*t}");
let frames=0;
for(const [n,im] of Object.entries(images).filter(([n])=>n.startsWith('player_summer_'))){
 assert.equal(im.naturalHeight,96,n);assert.equal(im.naturalWidth%96,0,n);
 const base=images[n.replace('summer_','')];assert.equal(im.naturalWidth,base.naturalWidth,n+' frame count');frames+=im.naturalWidth/96;
}
assert.equal(Object.keys(images).filter(n=>n.startsWith('player_summer_')).length,24);assert.equal(frames,146);
ev("SKIN='summer'");
for(const [n,a] of Object.entries(anchors).filter(([n,a])=>n.startsWith('player_summer_')&&Array.isArray(a))){
 for(let i=0;i<a.length;i++){
  const got=ev(`handOf('${n.replace('summer_','')}',${i})`),gp=(c.ART_GAP[n]||[])[i]||0;
  assert.equal(got[0],a[i][0]/2-24,n);assert.equal(got[1],a[i][1]/2-48+gp,n);
 }
}
for(let i=0;i<12;i++){
 const got=ev(`hands2('player_atk_shears',${i})`),n='player_summer_atk_shears',h=anchors[n+'_hands'];
 for(const [j,k] of ['front','back'].entries()){assert.equal(got[j][0],h[k][i][0]/2-24);assert.equal(got[j][1],h[k][i][1]/2-48+((c.ART_GAP[n]||[])[i]||0))}
}
for(const skin of ['','summer'])for(const face of [-1,1])for(let seg=0;seg<4;seg++){
 calls.length=0;ev(`SKIN='${skin}';P.face=${face};P.atk={idx:${seg},phase:'ac',t:0,def:{su:.1,ac:.1,re:.1,arc:[0,1]}};drawPlayerSpr(100,200,false)`);
 assert.equal(ev('CHK_LAST.p[1]'),seg*4+[3,2,3,3][seg]);assert(calls.some(a=>a[0]==='weapon_knife_reverse'));
}
for(const t of [0,.2,.4,.55,.65,.85,1.05,1.45])for(const face of [-1,1]){
 const got=ev(`ljyMouth({x:100,y:200,face:${face},t:${t}})`),i=ev(`ljyBreathFrame(${t})`),p=anchors.boss_ljy_p2_breath_mouth[i];
 assert.equal(got[0],100+face*(p[0]/2-64));assert.equal(got[1],200+p[1]/2-128+((c.ART_GAP.boss_ljy_p2_breath||[])[i]||0));
}
console.log('PASS: 24 summer actions / 146 frames; single and dual anchors; both-facing knife impact and weapon selection; breath mouth synchronization.');
