import assert from 'node:assert/strict';
import { build,buildCosts,buildIssue,inventoryChange,isDeck,type BuildKind } from '../src/sim/ark';
import { initializeHeat,primaryHearth } from '../src/sim/heatField';
import { emitters } from '../src/sim/heatField';
import { equipGear } from '../src/sim/equipment';
import { createInitialWorld } from '../src/sim/world';
import { skillCompanion } from './p2-skills-fixture';

export function giantFixture(){
 const w=createInitialWorld(202608);
 w.unlockedTech.push('tier2_automation','tier3_fortress');
 const paid=(id:BuildKind,x:number,y:number)=>{
  assert.ok(inventoryChange(w,[],buildCosts[id]),id);
  assert.equal(buildIssue(w,id,x,y),null,id+' '+x+','+y);
  assert.ok(build(w,id,x,y),id);
 };
 const blocked=new Set<string>();const core=()=>{
  for(let y=12;y<=35;y++)for(let x=12;x<=35;x++)
   if(isDeck(w,x,y)&&!blocked.has(x+':'+y)&&!w.ark.buildings.some(b=>Math.abs(x-b.gx)<=1&&Math.abs(y-b.gy)<=1)&&
     Math.hypot(x+.5-w.player.x,y+.5-w.player.y)>1.2&&(x<22||x>=27||y<=21||y>=28)){
    paid('buoyancy_core',x,y);return;
   }
  throw Error('No safe new core cell.');
 };
 for(let pass=0;pass<25;pass++){
  let changed=0;
  for(let y=12;y<=35;y++)for(let x=12;x<=35;x++){
   if(isDeck(w,x,y)||![[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>isDeck(w,x+dx,y+dy)))continue;
   if(w.ark.buoyancyUsed>=w.ark.buoyancyMax)core();
   paid('wood_deck',x,y);changed++;
  }
  if(!changed)break;
 }
 assert.equal(w.ark.decks.filter(Boolean).length,576);
 Object.assign(primaryHearth(w)!,{level:3,fuel:260});
 let lights=0;
 for(let y=16;y<=33&&lights<31;y++)for(let x=16;x<=33&&lights<31;x++){
  if((x+y)%3!==0||Math.hypot(x+.5-w.player.x,y+.5-w.player.y)<1.1)continue;
  const bad=buildIssue(w,'torch_post',x,y);
  if(bad==='这里被占用')continue;
  if(w.ark.buoyancyUsed>=w.ark.buoyancyMax-3)core();
  paid(lights%5===0?'ward_searchlight':'torch_post',x,y);lights++;
 }
 assert.ok(lights>=25);
 const crew=['frostyak','glacierstag','galehawk','magmalisk','burrowback','tempest_wyvern','emberfox'];
 for(let i=0;i<12;i++){
  const b=skillCompanion(w,crew[i%crew.length],i);
  if(i>=3){b.role='rest';b.x=24.5+Math.cos(i*1.4)*(1.8+(i%3)*.6);b.y=25.4+Math.sin(i*1.4)*(1.8+(i%3)*.6);}
 }
 assert.ok(inventoryChange(w,[],[{itemId:'aurora_mithril_cloak',count:1},{itemId:'frost_scale_armor',count:1}]));
 for(const gear of ['aurora_mithril_cloak','frost_scale_armor'])assert.equal(equipGear(w,gear),null);
 w.day=5;w.timeOfDay=.741;w.weather='whiteout';w.ambientTemp=-55;
 initializeHeat(w);
 assert.ok(emitters(w).length>=25);
 return w;
}
