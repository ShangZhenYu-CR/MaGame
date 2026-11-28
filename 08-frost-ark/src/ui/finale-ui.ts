import { codexRows,tabs,type CodexTab } from '../sim/codex';
import { endlessView,reclaimBounty } from '../sim/endless';
import { itemNames } from '../sim/ark';
import { attackWhale, continueEndless, finaleStatus, forgeSolarArk, repairSeaHearth,startWhale,volleyWhale } from '../sim/finale';
import type { WorldState } from '../sim/types';

const artSources=import.meta.glob<string>('../assets/art/*.{png,webp}',{eager:true,query:'?inline',import:'default'});
const art=(id:string)=>artSources['../assets/art/'+id+'.png']??artSources['../assets/art/'+id+'.webp'];
const tabTitle={beasts:'云兽',buildings:'建筑',gear:'装备武器',supplies:'料理物资',enemies:'敌怪与 Boss'};
const bead=(n:number)=>String(n).padStart(2,'0');
type Sound='solar'|'whale'|'victory'|'hit';
type Cmd='deck'|'fuel'|'chart';
interface Wiring {
  state:()=>WorldState;
  say:(issue:string|null,success:string)=>void;
  prepare:()=>void;
  icon:(key:string)=>string|undefined;
  sound:(s:Sound)=>void;
}
export function finaleUi({state,say,prepare,sound,icon}:Wiring){
  const root=document.createElement('div');
  root.id='finale-interface';
  root.innerHTML=`
    <button id="codex-toggle" class="codex-toggle" type="button" aria-expanded="false" aria-controls="codex"><kbd>J</kbd> 图鉴</button>
    <aside id="codex" class="finale-card codex-card" hidden aria-labelledby="codex-title">
      <header><h2 id="codex-title">方舟图鉴</h2><button type="button" id="codex-close" aria-label="关闭图鉴">关闭</button></header>
      <nav aria-label="图鉴分类">${tabs.map(id=>`<button type="button" id="codex-${id}" data-codex-tab="${id}" aria-pressed="false">${tabTitle[id]}</button>`).join('')}</nav>
      <div class="codex-meter"><label for="codex-progress">收集进度</label><progress id="codex-progress" max="1" value="0"></progress>
      <output id="codex-count"></output></div>
      <ul id="codex-list" aria-live="off"></ul>
    </aside>
    <aside id="whale-context" class="finale-card whale-card" hidden>
      <strong id="whale-title">永冬霜鲸</strong><output id="whale-phase"></output>
      <meter id="whale-health" min="0" max="1" value="0" aria-label="永冬霜鲸生命"></meter>
      <p id="whale-guidance"></p>
      <button type="button" id="whale-start">挑战永冬霜鲸</button>
      <button type="button" id="whale-attack"><kbd>F</kbd> 反击霜鲸</button>
      <button type="button" id="whale-volley" hidden><kbd>C</kbd> 炮台齐射</button>
      <button type="button" id="whale-repair" hidden><kbd>P</kbd> 抢修主炉</button>
    </aside>
    <section id="victory-panel" class="finale-card victory-card" hidden aria-labelledby="victory-title">
      <small>极光天穹</small><h2 id="victory-title">永冬散去</h2>
      <p>你点燃了太阳方舟，击败了永冬霜鲸。云海从此不再只有寒夜。</p>
      <dl id="victory-totals"></dl>
      <button type="button" id="continue-endless">继续 · 无尽云海</button>
    </section>
    <aside id="deep-voyage" class="finale-card deep-voyage" hidden aria-label="无尽深空">
      <strong id="deep-heading">无尽深空</strong><span id="deep-grade"></span>
      <p id="deep-weather"></p>
      <div id="deep-job"><b id="deep-target"></b><p id="deep-reward"></p><button id="deep-action" type="button">接下悬赏</button></div>
    </aside>
    <aside id="frost-guide" class="frost-guide" hidden>
      <span id="frost-guide-copy"></span>
      <button id="frost-guide-close" type="button" aria-label="关闭新手提示">×</button>
    </aside>`;
  document.body.append(root);
  const node=<T extends HTMLElement=HTMLElement>(id:string)=>root.querySelector<T>('#'+id)!;
  const codex=node('codex'), button=node('codex-toggle'), list=node('codex-list');
  document.querySelector('.m2-tools')?.append(button);
  const whale=node('whale-context'), start=node<HTMLButtonElement>('whale-start');
  const strike=node<HTMLButtonElement>('whale-attack'), health=node<HTMLMeterElement>('whale-health');
  const victory=node('victory-panel'), guide=node('frost-guide');
  const deep=node('deep-voyage'),jobAction=node<HTMLButtonElement>('deep-action');
  const forge=document.createElement('button');
  forge.id='forge-solar';forge.type='button';forge.hidden=true;
  const label=document.createElement('span');label.textContent='铸成太阳方舟';
  const badge=icon('solar-ark');if(badge){const img=document.createElement('img');img.alt='';img.src=badge;forge.append(img);}
  forge.append(label);
  document.querySelector('.hearth-tools')?.append(forge);

  let codexTab:CodexTab='beasts';
  let prior='',priorMode='',warnAt=-1,last:WorldState|undefined;
  const hints=new Set<Cmd>();let liveHint:Cmd|null=null;
  const texts:Record<Cmd,string>={
    deck:'长按左键看射程，松开钩取云海木料。',
    fuel:'靠近主炉按 R 添柴，暖区能恢复体温。',
    chart:'走到北侧舵轮，按 N 打开航图。',
  };
  const text=(id:string,value:string)=>{const e=node(id);if(e.textContent!==value)e.textContent=value;};
  function command(fn:(w:WorldState)=>string|null,success:string,kind:Sound){
    const issue=fn(state());say(issue,success);if(!issue)sound(kind);
  }
  function paintCodex(){
    const rows=codexRows(state(),codexTab),seen=rows.filter(x=>x.seen).length;
    codex.dataset.tab=codexTab;
    for(const tab of tabs)node('codex-'+tab).setAttribute('aria-pressed',String(tab===codexTab));
    const progress=node<HTMLProgressElement>('codex-progress');progress.max=rows.length;progress.value=seen;
    text('codex-count',seen+' / '+rows.length);
    list.replaceChildren(...rows.map((v,index)=>{
      const li=document.createElement('li'),thumb=document.createElement('div'),image=document.createElement('img'),copy=document.createElement('div');
      const title=document.createElement('strong'),details=document.createElement('span'),note=document.createElement('small');
      li.dataset.entry=v.id;li.dataset.discovered=String(v.seen);
      thumb.className='codex-thumb';image.src=art(v.art);image.alt=v.seen?v.name:'待发现剪影';image.decoding='async';
      thumb.append(image);copy.className='codex-copy';
      title.textContent=v.seen?v.name:'待发现 · '+bead(index+1);
      details.textContent=v.seen?v.detail:'首次遇见、建造或取得后收录';
      if(v.seen){note.textContent='马楠记：'+v.note;}
      copy.append(title,details,...(v.seen?[note]:[]));li.append(thumb,copy);return li;
    }));
    list.scrollTop=0;
  }
  function showCodex(show:boolean){
    if(show){prepare();paintCodex();}
    codex.hidden=!show;button.setAttribute('aria-expanded',String(show));
  }
  function strikeWhale(){
    if(!finaleStatus(state()).whale||!finaleStatus(state()).atAurora)return false;
    command(attackWhale,'命中冰甲裂口。','hit');return true;
  }
  button.onclick=()=>showCodex(codex.hidden);
  node('codex-close').onclick=()=>showCodex(false);
  for(const tab of tabs)node('codex-'+tab).onclick=()=>{codexTab=tab;paintCodex();};
  forge.onclick=()=>command(forgeSolarArk,'太阳方舟点燃。极光天穹已开放。','solar');
  start.onclick=()=>command(startWhale,'霜鲸苏醒。先避开地上的冰圈。','whale');
  strike.onclick=()=>strikeWhale();
  function seaAction(action:'volley'|'repair'){
    if(!finaleStatus(state()).sea)return false;
    if(action==='volley')command(volleyWhale,'船载炮台齐射，击中冰甲裂口。','hit');
    else command(repairSeaHearth,'主炉已抢修。','solar');
    return true;
  }
  node('whale-volley').onclick=()=>seaAction('volley');
  node('whale-repair').onclick=()=>seaAction('repair');
  node('continue-endless').onclick=()=>command(continueEndless,'已进入无尽云海，可以继续远航和建造。','solar');
  jobAction.onclick=()=>{
    const job=reclaimBounty(state());
    say(job.issue,job.claimed?'悬赏奖励已入背包，巨舰评分提升。':'已接悬赏，到目标浮岛沿跳板寻找古兽。');
    if(!job.issue)sound(job.claimed?'victory':'solar');
  };
  node('frost-guide-close').onclick=()=>{if(liveHint)hints.add(liveHint);guide.hidden=true;};

  function update(covered:boolean,hideGuide=false){
    const w=state();
    if(w!==last){prior='';priorMode='';warnAt=-1;last=w;}
    const f=finaleStatus(w),b=f.whale;
    forge.hidden=f.solar||!f.nearHearth||f.seedCount===0;
    const forgeCopy=f.seedCount>=4?'铸成太阳方舟':`天穹火种 ${f.seedCount}/4`;
    if(label.textContent!==forgeCopy)label.textContent=forgeCopy;
    whale.hidden=covered||!f.atAurora||f.mode==='cleared'||f.mode==='endless';
    start.hidden=f.mode!=='ready';
    strike.hidden=!b;
    health.hidden=!b;
    node('whale-volley').hidden=!f.sea;
    node('whale-repair').hidden=!f.sea;
    whale.dataset.waters=f.sea?'sea':'coast';
    if(b&&!whale.hidden){
      health.max=b.maxHp;health.value=b.hp;
      whale.dataset.phase=String(b.phase+1);
      whale.dataset.vulnerable=String(b.open);
      text('whale-phase',`阶段 ${bead(b.phase+1)}/03 · ${b.attackName}`);
      whale.dataset.whaleStrike=b.warning?.style??'';
      text('whale-guidance',f.sea?
        b.warning?(b.warning.style==='ram'?'船舷受冲撞预警，离开标记。':b.warning.style==='breath'?'冰封吐息瞄准甲板，翻滚离开。':'陨冰将落下，跳出落点。'):
          b.open?'冰甲裂开！炮台齐射或靠近船舷反击。':'霜鲸正在云海游弋，准备躲开下一招。':
        b.warning?'冰面正在发亮，移出预警圈。':b.open?'冰甲裂开，现在按 F 反击。':'观察冰面，等霜鲸出招后反击。');
      if(b.warning&&b.warning.until!==warnAt){warnAt=b.warning.until;sound('whale');}
    }else if(!whale.hidden){
      text('whale-phase','极光冰岸');
      text('whale-guidance','准备好补给和随行云兽后再挑战。');
    }
    victory.hidden=f.mode!=='cleared';
    if(f.mode==='cleared'){
      if(priorMode==='battle'){sound('victory');prepare();}
      const sig=[f.days,f.beasts,f.decks].join('/');
      if(sig!==prior){
        prior=sig;
        const cells=[['幸存天数',f.days],['驯服云兽',f.beasts],['甲板格数',f.decks]];
        node('victory-totals').replaceChildren(...cells.flatMap(([k,v])=>{
          const dt=document.createElement('dt'),dd=document.createElement('dd');
          dt.textContent=String(k);dd.textContent=String(v);return [dt,dd];
        }));
      }
    }
    const deepState=f.mode==='endless'?endlessView(w):null;
    deep.hidden=covered||!deepState;
    if(deepState){
      const {job}=deepState;
      deep.dataset.depth=String(deepState.depth);deep.dataset.score=String(deepState.points);
      deep.dataset.bounty=job?.phase??'';
      text('deep-heading','无尽深空 · Depth '+deepState.depth);
      text('deep-grade',deepState.grade+' · '+deepState.points+' 分');
      text('deep-weather',deepState.ancient?'远古极寒潮进行中':`距下轮远古极寒潮 ${deepState.nextAncient} 天`);
      node('deep-job').hidden=!job;
      if(job){
        text('deep-target',job.name+' · '+job.zone);
        text('deep-reward',job.phase==='active'?'登岛后沿跳板向岛内寻找':job.reward.map(r=>(itemNames.get(r.itemId)??r.itemId)+' ×'+r.count).join(' · '));
        jobAction.hidden=job.phase==='active';text('deep-action',job.phase==='reward'?'领取悬赏':'接下悬赏');
      }
    }
    priorMode=f.mode;
    const next:Cmd|null=w.day!==1||w.activeIsland||w.player.grapple.active||w.player.grapple.charging?null:
      w.tick>=75&&w.tick<440?'deck':w.tick>=520&&w.tick<850&&f.nearHearth?'fuel':
      w.tick>=940&&w.tick<1290&&!w.sky.islands.some(x=>x.discovered&&x.id!=='shallows_lantern')?'chart':null;
    if(next!==liveHint){if(liveHint)hints.add(liveHint);liveHint=next;}
    guide.hidden=covered||hideGuide||!next||hints.has(next)||!victory.hidden;
    if(next&&!guide.hidden)text('frost-guide-copy',texts[next]);
  }
  return {update, open:()=>!codex.hidden, blocking:()=>!victory.hidden, showCodex,
    toggle:()=>showCodex(codex.hidden), strikeWhale,seaAction, arena:()=>{const f=finaleStatus(state());return f.atAurora&&(f.mode==='battle'||f.mode==='cleared');}, reset:()=>{showCodex(false);priorMode='';}};
}
