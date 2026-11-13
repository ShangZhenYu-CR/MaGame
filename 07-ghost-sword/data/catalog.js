export const VERSION='1.2';
export const slots=['武器','上衣','下装','头肩','腰带','鞋','项链','手镯','戒指','辅助装备','魔法石','耳环'];
export const materials={scale:'腐鳞碎片',iron:'灵柩残铁',wick:'船灯灯芯',feather:'鸦羽',shard:'雾核碎片',core:'完整雾核',rough:'粗制材料',potion:'制作恢复药',boundPotion:'绑定恢复药',cleanse:'净化药剂'};
export const items={};
for(let s=0;s<12;s++)items['training'+s]={name:s?'训练'+slots[s]:'训练大剑',slot:s,level:1,atk:s?0:25,mag:s?0:25,def:0,bound:true,cost:null};
items.sword={name:'腐鳞大剑',slot:0,level:1,atk:36,mag:30,cost:{scale:10,iron:4,gold:100}};
for(let s=1;s<=5;s++)items['armor'+s]={name:['','列车护衣','列车护裤','列车肩甲','列车腰带','列车短靴'][s],slot:s,level:1,def:2,cost:{rough:4,iron:2,gold:40}};
Object.assign(items,{
 necklace:{name:'灯芯挂坠',slot:6,mp:10,cost:{rough:4,wick:1,gold:40}},
 bracelet:{name:'护腕',slot:7,hp:20,cost:{rough:4,iron:2,gold:40}},
 ring:{name:'鸦羽指环',slot:8,crit:.02,cost:{rough:4,feather:2,gold:40}},
 auxiliary:{name:'破雾符',slot:9,brk:.04,cost:{rough:4,shard:1,gold:40}},
 stone:{name:'凝息石',slot:10,regen:.2,cost:{rough:4,wick:1,gold:40}},
 earring:{name:'鸦羽耳饰',slot:11,controlResist:.1,cost:{rough:4,feather:2,gold:40}},
 airSword:{name:'追影大剑',slot:0,level:2,atk:32,mag:28,cost:{scale:10,iron:4,feather:2,gold:120}},
 airBracelet:{name:'追影护腕',slot:7,level:2,cost:{rough:4,feather:2,gold:80}},
 airStone:{name:'追影石',slot:10,level:2,cost:{rough:4,wick:1,shard:1,gold:100}},
 breakSword:{name:'破阵大剑',slot:0,level:2,atk:40,mag:24,cost:{iron:8,shard:1,scale:4,gold:120}},
 breakBracelet:{name:'破阵护腕',slot:7,level:2,cost:{rough:4,iron:4,gold:80}},
 breakStone:{name:'破阵石',slot:10,level:2,cost:{rough:4,shard:1,wick:1,gold:100}},
 zoneSword:{name:'守灯大剑',slot:0,level:2,atk:26,mag:40,cost:{wick:1,feather:2,iron:4,gold:120}},
 zoneBracelet:{name:'守灯护腕',slot:7,level:2,cost:{rough:4,wick:1,gold:80}},
 zoneStone:{name:'守灯石',slot:10,level:2,cost:{rough:4,shard:1,wick:1,gold:100}},
 escapeStone:{name:'雾行石',slot:10,level:2,cost:{core:1,feather:2,rough:4,gold:150}}
});
export const recipes={...Object.fromEntries(Object.entries(items).filter(([,v])=>v.cost).map(([k,v])=>[k,{name:v.name,cost:v.cost,gear:k}])),potion:{name:'恢复药剂',cost:{rough:3,gold:10},material:'potion'},cleanse:{name:'净化药剂',cost:{rough:3,feather:1,gold:10},material:'cleanse'}};
export const enchants={break:{name:'破雾附魔',cost:{shard:3,feather:4,gold:150},slots:[0]},regen:{name:'灯芯附魔',cost:{wick:3,rough:10,gold:100},slots:[6,7,8]}};
const hit=(f,m,stun,launch,brk,extra={})=>({f,m,stun,launch,brk,...extra});
export const actions={
 attack1:{name:'普攻一',total:22,box:[-10,112,32,10,110],move:18,moveEnd:5,hits:[hit(5,1,22,0,4,{end:8,kb:36,air:120,vx:80})],cancel:8,miss:16,next:'attack2',skillCancel:true},
 attack2:{name:'普攻二',total:24,box:[-10,118,32,12,120],move:18,moveEnd:6,hits:[hit(6,1.1,24,0,4,{end:9,kb:42,air:120,vx:90})],cancel:9,miss:18,next:'attack3',skillCancel:true},
 attack3:{name:'普攻三',total:32,box:[-10,130,34,0,125],move:36,moveEnd:9,hits:[hit(9,1.7,0,270,9,{end:13,kb:90,vx:220,heavy:true,sweep:170})],cancel:13,defend:18,miss:26,skillCancel:true},
 dash:{name:'冲刺斩',total:30,box:[-10,120,32,0,110],move:90,moveEnd:12,hits:[hit(8,1.4,20,0,6,{end:12,kb:70,air:100,vx:140})],cancel:12,defend:20,miss:26,to:['up','tri']},
 air:{name:'空中斩',total:22,box:[-10,110,30,-70,70],relative:true,hits:[hit(5,1.2,18,0,4,{end:9,kb:30,air:120,vx:80})],cancel:14,miss:14,to:['air']},
 up:{name:'顶点挑斩',total:30,mp:6,cd:150,box:[-10,120,34,0,170],hits:[hit(6,2,0,640,15,{end:10,vx:40,heavy:true,sweep:384})],armor:[3,10],cancel:18,defend:22,miss:26,to:['tri','wave']},
 tri:{name:'三重影袭',total:44,mp:14,cd:360,box:[-30,125,32,8,120],moves:[[0,7,70],[12,19,70],[24,32,70]],hits:[hit(4,1.6,20,0,8,{end:7,kb:40,air:100,vx:120}),hit(16,1.6,20,0,8,{end:19,kb:40,air:100,vx:120}),hit(28,1.6,0,330,8,{end:32,vx:160,heavy:true})],cancel:32,defend:36,miss:40,to:['up','slam']},
 wave:{name:'幽魂剑气',total:30,mp:14,cd:300,cast:true,projectile:10,hits:[],cancel:20,miss:20,guard:true},
 slam:{name:'陨星坠',total:9999,mp:22,cd:540,jump:8,dive:20,landing:24,landCancel:16,armor:[8,9999],hits:[]},
 zone:{name:'冥火结界',total:34,mp:28,cd:960,cast:true,zone:12,life:360,tick:24,m:.6,slow:.3,hits:[],cancel:22,miss:22,guard:true},
 ult:{name:'万面修罗',total:132,mp:60,cd:2700,cast:true,box:[-520,520,180,0,500],inv:[0,112],hits:[...Array.from({length:8},(_,i)=>hit(30+i*8,1.5,32,0,9,{end:31+i*8,sweep:0,noBlock:true,noStop:true})),hit(96,6,0,620,25,{end:97,vx:160,sweep:620,noBlock:true,noStop:true})]},
 back:{name:'后跳',total:18,move:-92,moveEnd:12,hits:[]},
 escape:{name:'紧急脱身',total:24,cd:1200,move:100,moveEnd:12,inv:[0,18],hits:[]},
 grab:{name:'抓取',total:30,mp:8,cd:360,box:[0,70,24,0,100],hits:[],grab:5,cancel:24,miss:24},
 jump:{name:'起跳',total:4,jump:3,hits:[]},
 rise:{name:'起身',total:12,hits:[]},
 land:{name:'落地',total:4,hits:[]},
 drink:{name:'饮用',total:12,hits:[]}
};
export const branches={up:{name:'追空',level:2},tri:{name:'牵引',level:4},slam:{name:'震裂',level:2},ult:{name:'断甲',level:4},zone:{name:'长明',level:2},wave:{name:'引灯',level:4}};
Object.assign(branches.up,{text:'挑斩倍率1.6、破韧10，CD120F；高度扩至200，命中F14可接影袭或剑气。'});
Object.assign(branches.tri,{text:'三段各1.3倍、推进各50；前两段横向击退20，末段浮空380；MP16。'});
Object.assign(branches.slam,{text:'落地5.2倍、破韧45；MP28、CD600F，F12起跳，落地32F收招。'});
Object.assign(branches.ult,{text:'八次小斩各1.2倍，终结5倍、破韧40；MP66。'});
Object.assign(branches.zone,{text:'结界持续480F，每跳0.45倍，减速20%；MP32、CD900F。'});
Object.assign(branches.wave,{text:'剑气2.4倍、MP16，留下120F灯印；目标在本人结界中时，结界伤害+15%。'});
export function actionFor(id,character){
 const a=structuredClone(actions[id]),b=character.branches[id],g=character.gear;
 if(b){if(id==='up'){a.cd=120;a.box[4]=200;a.cancel=14;a.hits[0].m=1.6;a.hits[0].brk=10;}
 if(id==='tri'){a.mp=16;for(const m of a.moves)m[2]=50;for(const h of a.hits)h.m=1.3;a.hits[0].vx=a.hits[1].vx=20;a.hits[2].launch=380;}
 if(id==='slam'){a.mp=28;a.cd=600;a.jump=12;a.dive=24;a.landing=32;a.landCancel=24;a.armor=[12,9999];}
 if(id==='ult'){a.mp=66;for(const h of a.hits)h.m=1.2;a.hits[8].m=5;a.hits[8].brk=40;}
 if(id==='zone'){a.mp=32;a.cd=900;a.life=480;a.m=.45;a.slow=.2;}
 if(id==='wave')a.mp=16;}
 if(g.includes('airSword')){if(id==='air')a.box[1]+=20;}
 if(g.includes('airBracelet')&&id==='ult')a.mp+=6;
 if(g.includes('airStone')){if(id==='tri')a.cd-=60;if(id==='slam')a.cd+=60;}
 if(g.includes('breakBracelet')){if(id==='slam')a.mp-=4;if(id==='wave')a.mp+=4;}
 if(g.includes('breakStone')&&id==='ult')a.cd+=120;
 if(g.includes('zoneSword')&&id==='attack3')a.hits[0].m*=.9;
 if(g.includes('zoneBracelet')){if(id==='zone')a.mp-=4;if(id==='slam')a.mp+=4;}
 if(g.includes('zoneStone')&&id==='dash')a.hits[0].m*=.9;
 if(g.includes('escapeStone')){if(id==='escape')a.cd=900;if(id==='ult')a.mp+=10;}
 if(a.mp)a.mp=Math.ceil(a.mp*10)/10;if(a.cd)a.cd=Math.max(60,Math.ceil(a.cd));return a;
}
export const rooms=[{name:'尾厢 · 腐鳞人鱼',width:1300,waves:[{fish:3},{fish:4}]},{name:'灵柩车厢 · 四座石棺',width:1500,waves:[{imp:3}]},{name:'雾影车厢 · 幽灵船长',width:1600,waves:[{shade:4},{captain:1}]},{name:'守卫车厢 · 鸦语者',width:1500,waves:[{guard:3,imp:2},{crowm:1}]},{name:'车头 · 噬雾者',width:1400,waves:[{boss:1}]}];
const enemy=(name,hp,r,h,speed,w,resist=0,kind='normal')=>({name,hp,r,h,speed,w,resist,kind});
export const enemies={fish:enemy('腐鳞人鱼',130,20,82,150,1),imp:enemy('煤灰小鬼',80,20,40,100,1),hammer:enemy('棺中锤卫',520,30,100,64,1.7,.2,'elite'),monk:enemy('棺中气宗',380,22,88,110,1.1,.2,'elite'),reaper:enemy('棺中鬼骑',420,24,92,105,1.2,.2,'elite'),witch:enemy('棺中魔女',300,20,80,100,1,.2,'elite'),totem:enemy('回生战斧',150,22,70,0,1,0,'static'),shade:enemy('雾影',150,20,70,70,1),captain:enemy('幽灵船长',1500,30,104,58,2,.2,'elite'),blob:enemy('怨念团',150,26,44,80,1),bomber:enemy('爆裂怨念',36,16,30,150,.8),guard:enemy('铁甲乘警',260,26,96,72,1.5,.35),crowm:enemy('鸦语者',850,24,96,120,1.4,.2,'elite'),crow:enemy('乌鸦',34,14,30,200,.75),pillar:enemy('封印石柱',200,24,120,0,1,0,'static'),boss:enemy('噬雾者',5600,44,120,105,2.2,0,'boss')};
export const enemyMoves={
 reaperIce:{wind:54,active:1,recover:24,cd:[360,360],dmg:8,ellipse:[120,50],height:80,special:'ice'},
 fish:{wind:23,active:3,recover:30,cd:[84,144],dmg:11,box:[-10,92,26,0,64],move:26,launch:380,armor:11},
 imp:{wind:27,active:3,recover:30,cd:[84,144],dmg:7,box:[-10,80,26,0,64],move:20},
 blob:{wind:30,active:3,recover:30,cd:[96,156],dmg:8,box:[-10,80,26,0,64],move:20},
 crow:{wind:18,active:3,recover:30,cd:[72,120],dmg:6,box:[-10,72,26,0,110],move:30},
 hammer:{wind:48,active:4,recover:54,cd:[108,156],dmg:22,box:[-10,130,32,0,80],launch:380,armor:12},
 guard:{wind:33,active:3,recover:30,cd:[96,144],dmg:15,box:[-10,104,26,0,64],move:24,armor:21},
 reaper:{wind:30,active:3,recover:30,cd:[90,144],dmg:15,box:[-10,104,26,0,64],move:20},
 monk:{wind:33,active:1,recover:24,cd:[132,192],dmg:13,shoot:true},
 witch:{wind:108,active:1,recover:48,cd:[390,390],dmg:22,ellipse:[140,58],launch:380},
 shade:{wind:51,active:3,recover:102,cd:[120,204],dmg:12,ellipse:[52,24],height:60,bleed:true},
 captain:{wind:42,active:4,recover:54,cd:[96,144],dmg:18,box:[-10,134,34,0,80],launch:380,armor:24},
 bomber:{wind:48,active:1,recover:0,cd:[9999,9999],dmg:18,ellipse:[84,36],height:24,launch:380,armor:0,noBlock:true},
 crowm:{wind:42,active:36,recover:48,cd:[180,252],dmg:20,ellipse:[64,32],height:90,launch:380,dash:true,armor:30},
 bossDash:{wind:45,active:36,recover:48,cd:[78,78],dmg:26,ellipse:[64,32],height:90,launch:380,dash:true},
 bossFists:{wind:132,active:0,recover:42,cd:[78,78],dmg:12,special:'fists'},
 bossClone:{wind:90,active:0,recover:36,cd:[78,78],dmg:24,special:'clone'},
 bossBite:{wind:65,active:3,recover:60,cd:[78,78],dmg:20,box:[-10,110,30,0,70],special:'bite',bleed:true},
 bossRoar:{wind:60,active:1,recover:54,cd:[78,78],dmg:24,ellipse:[2000,180],height:24,launch:380,noBlock:true}
};
export function panel(account){const level=Math.min(10,1+Math.floor(account.xp/100));const s={level,maxhp:260+(level-1)*10,maxmp:100+(level-1)*5,atk:5,mag:5,def:0,crit:.2,regen:3,resist:0,controlResist:0,brk:0,gear:[],branches:account.branches};
 for(const id of account.equipped){if(!id)continue;const e=account.inventory.find(x=>x.id===id),d=items[e.type],u=1+.04*e.upgrade;s.gear.push(e.type);s.atk+=(d.atk||0)*u;s.mag+=(d.mag||0)*u;s.def+=(d.def||0)*u;s.maxhp+=d.hp||0;s.maxmp+=d.mp||0;s.crit+=d.crit||0;s.regen+=(d.regen||0)+(e.enchant==='regen'?.5:0);s.resist+=d.resist||0;s.controlResist+=d.controlResist||0;s.brk+=(d.brk||0)+(e.enchant==='break'?.1:0);}
 s.controlResist=Math.min(.5,s.controlResist);s.magDef=s.def;s.resist=Math.min(.5,s.resist);s.brk=Math.min(.5,s.brk);s.crit=Math.max(0,Math.min(1,s.crit));s.atk=Number(s.atk.toFixed(2));s.mag=Number(s.mag.toFixed(2));s.def=Number(s.def.toFixed(2));s.magDef=s.def;return s;}

Object.assign(items.airSword,{text:'空中斩X范围+20；剑气伤害−10%'});
Object.assign(items.airBracelet,{text:'空中斩有效伤害回MP2，每动作一次；觉醒MP+6'});
Object.assign(items.airStone,{text:'影袭CD−60F；陨星坠CD+60F'});
Object.assign(items.breakSword,{text:'挑斩、陨星坠破韧+10%；横向移速−5%'});
Object.assign(items.breakBracelet,{text:'陨星坠MP−4；剑气MP+4'});
Object.assign(items.breakStone,{text:'Boss破韧时普攻伤害+10%；觉醒CD+120F'});
Object.assign(items.zoneSword,{text:'结界X/Y半径+10%；普攻三伤害−10%'});
Object.assign(items.zoneBracelet,{text:'结界MP−4；陨星坠MP+4'});
Object.assign(items.zoneStone,{text:'本人结界内额外回MP1/秒；冲刺斩伤害−10%'});
Object.assign(items.escapeStone,{text:'脱身CD900F；觉醒MP+10'});
