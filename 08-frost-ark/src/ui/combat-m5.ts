import { guardianTell } from '../sim/guardians-p2';
import { attackM5, m5Status, m5Telegraph } from '../sim/m5';
import { areaAt } from '../sim/island';
import { TICK_RATE, type WorldState } from '../sim/types';
import specs from '../data/combat_m5.json';

const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
const text=(el:HTMLElement,s:string)=>{if(el.textContent!==s)el.textContent=s;};
interface Hooks{state:()=>WorldState;msg:(issue:string|null,success:string,event?:'hit')=>void}
const valid=(w:WorldState)=>{
 const onIsland=!!w.activeIsland, onDeck=areaAt(w,w.player.x,w.player.y)==='ark';
 return w.wildEntities.filter(e=>e.hp>0&&Object.hasOwn(specs.hostiles,e.defId)&&
   (onIsland?e.kind==='boss':e.kind==='raider'&&onDeck));
};
const nearest=(w:WorldState)=>valid(w).filter(e=>Math.hypot(w.player.x-e.x,w.player.y-e.y)<=2.05)
  .sort((a,b)=>Math.hypot(w.player.x-a.x,w.player.y-a.y)-Math.hypot(w.player.x-b.x,w.player.y-b.y))[0];
const names=new Map(Object.entries(specs.hostiles).map(([id,d])=>[id,d.name]));

export function combatM5Ui(h:Hooks){
 const raid=el('raid-alert'),boss=el('island-guardian'),strip=el('m5-attack-prompt');
 const bossHp=el<HTMLMeterElement>('guardian-health'),seeds=el('m5-seed-count'),attackBtn=el('m5-attack');
 let stamp=0;
 function strike():boolean{
  const w=h.state(),enemy=nearest(w);
  if(!enemy)return false;
  const issue=attackM5(w),defeated=!issue&&enemy.hp<=0;
  const name=names.get(enemy.defId)??'敌人';
  h.msg(issue,defeated?`击退${name}！`:`击中了${name}。`,'hit');
  return true;
 }
 attackBtn.onclick=strike;
 return {
  strike,
  update(now:number,overlay=false){
   if(now-stamp<60)return;stamp=now;
   const w=h.state(),s=m5Status(w),target=nearest(w);
   seeds.dataset.seeds=String(s.seeds);text(seeds,`天穹火种 ${s.seeds} / 4`);
   raid.dataset.phase=s.active?'active':s.warning?'warning':'clear';raid.dataset.wave=String(s.wave);
   raid.dataset.raiders=String(s.raidsRemaining);raid.hidden=overlay||(!s.active&&!s.warning);
   const turretCount=w.ark.buildings.filter(b=>b.defId==='frost_turret'||b.defId==='fire_oil_turret'||b.defId==='oil_mortar').length;
   text(el('raid-title'),s.active?'大寒潮 · 方舟防线':'大寒潮预警');
   text(el('raid-detail'),s.active?
    `第 ${s.wave}/${specs.waves.length} 波 · 敌袭 ${s.raidsRemaining} · 防御塔 ${turretCount}`:
    `距降温约 ${Math.ceil(s.untilTicks/TICK_RATE)} 秒 · 添柴、布置防霜箭塔或火油炮台`);
   const preview=el('raid-preview');
   preview.hidden=!s.warning;
   text(preview,s.warning?s.plan.map((batch,i)=>
    '第 '+(i+1)+' 波：'+[...new Set(batch)].join(' · ')).join('\n'):'');
   const guardian=s.bosses.find(b=>b.hp>0);
   boss.hidden=overlay||!guardian;
   boss.dataset.guardian=guardian?.defId??'';
   if(guardian){
    const windup=m5Telegraph(w,guardian.id);boss.dataset.telegraph=String(windup);
    text(el('guardian-name'),names.get(guardian.defId)??'浮岛守卫');
    const stage=guardianTell(w);
    boss.dataset.guardianMove=stage?.warn?.skill??(stage?.exposed?'overheat':'');
    text(el('guardian-phase'),stage?.warn?`${stage.warn.label} · ${stage.warn.skill==='shell'?'现在硬壳，等过热破绽':'离开预警范围'}`:stage?.exposed?'过热破绽 · 趁现在攻击':windup?'正在蓄力 · 拉开距离':'靠近按 F 反击，注意蓄力前兆');
    bossHp.max=guardian.maxHp;bossHp.value=Math.max(0,guardian.hp);
    text(el('guardian-hp-value'),`${Math.ceil(guardian.hp)}/${guardian.maxHp}`);
   }
   strip.hidden=overlay||!target;strip.dataset.target=target?.defId??'';
   if(target)text(el('m5-target-name'),names.get(target.defId)??'敌人');
  },
 };
}
