import { attackWhale,finaleStatus,forgeSolarArk,repairSeaHearth,volleyWhale } from '../src/sim/finale';
import { startRoll } from '../src/sim/roll';
import assert from 'node:assert/strict';
import { build,countItem } from '../src/sim/ark';
import { fire,startCharge,aim } from '../src/sim/cloud';
import { eatMeal,quickMeal } from '../src/sim/food';
import { craftGear,equipGear } from '../src/sim/equipment';
import { addFuel,hearthNear,primaryHearth,upgradeHearth } from '../src/sim/heatField';
import { areaAt,gangwayGeometry,islandNodes,islandNodeRemaining,toggleGangway } from '../src/sim/island';
import { collectIndustry,industryPanel,startIndustry,unlockTech } from '../src/sim/industry';
import { deserializeWorld,serializeWorld } from '../src/sim/save';
import { helmPoint,setDestination,toggleCruise } from '../src/sim/sky-map';
import { craftTool,harvestIslandResource,repairTool,toolStatus } from '../src/sim/tools';
import { attackM5,m5Status } from '../src/sim/m5';
import { vec } from './p2-walk-helper';
import { createInitialWorld,stepWorld } from '../src/sim/world';
import type { Vec2 } from '../src/sim/types';

export function playEconomy(seed=202608,campaign=false){
 let w=createInitialWorld(seed), refuels=0, meals=0, catches=0, falls=0, previousHP=w.player.hp;
 const days:object[]=[];
 const count=(id:string)=>countItem(w,id);
 const fuelItems=()=>count('driftwood')+count('coal_chunk')+count('sulfur_ore');
 function support(){
  const p=w.player, meal=quickMeal(w);
  if(meal&&p.hp>0&&(p.hunger<60||w.activeIsland&&p.warmth<52||campaign&&p.hp<56)&&!eatMeal(w,meal))meals++;
  if(w.weather==='whiteout'&&w.wildEntities.some(e=>e.kind==='raider'&&Math.hypot(e.x-p.x,e.y-p.y)<=2.05))attackM5(w);
  if(primaryHearth(w)!.fuel<38&&hearthNear(w)&&fuelItems()>0&&!addFuel(w))refuels++;
 }
 function step(ticks:number,d:Vec2={x:0,y:0}){
  while(ticks>0){
   const chunk=Math.min(ticks,20),day=w.day;
   support();stepWorld(w,chunk,d);ticks-=chunk;
   if(w.player.hp<=0&&previousHP>0){falls++;console.error('Economy down',w.tick,w.day,w.weather,w.player.hunger,w.player.warmth,primaryHearth(w)!.fuel,w.player.x,w.player.y);}
   previousHP=w.player.hp;
   if(day!==w.day){
    const summary={day:w.day,tick:w.tick,hp:+w.player.hp.toFixed(1),hunger:+w.player.hunger.toFixed(1),
      fuel:+primaryHearth(w)!.fuel.toFixed(1),level:primaryHearth(w)!.level,catches,meals,refuels,falls};
    days.push(summary);
    assert.equal(deserializeWorld(serializeWorld(w)).day,w.day);
   }
  }
 }
 const warm=()=>go(24.5,25.4);
 function go(x:number,y:number){
  for(let n=0;n<26;n++){
   const dir=vec(w,{x,y});
   if(!dir)return;
   step(dir.ticks,dir.move);
  }
  throw Error(`Economy path from ${w.player.x},${w.player.y} to ${x},${y}`);
 }
 function catchOne(item:string,goal:number){
  if(count(item)>=goal)return;
  warm();
  for(let n=0;n<420&&count(item)<goal;n++){
   const p=w.player;
   const candidates=w.sky.debris.filter(d=>!d.heavy&&!d.id.startsWith('deckdrop_')&&d.loot.some(q=>q.itemId===item)&&
      Math.hypot(d.x-p.x,d.y-p.y)<8.58&&Math.hypot(d.x-p.x,d.y-p.y)>1.1&&areaAt(w,d.x,d.y)==='void')
      .sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));
   const d=candidates[0];
   if(d&&startCharge(w,d)){
    const before=count(item);
    step(25);aim(w,{x:d.x+d.vx*.45,y:d.y+d.vy*.45});fire(w);step(75);
    if(count(item)>before)catches++;
   }else step(22);
  }
  assert.ok(count(item)>=goal,`Day ${w.day}: insufficient natural ${item} ${count(item)}/${goal}`);
 }
 const place=(id:Parameters<typeof build>[1],x:number,y:number)=>{
  assert.ok(build(w,id,x,y),`place ${id}`);
  return w.ark.buildings.find(b=>b.defId===id&&b.gx===x&&b.gy===y)!.id;
 };
 function job(id:string,recipe:string,near:Vec2){
  go(near.x,near.y);
  assert.equal(startIndustry(w,id,recipe),null,`queue ${recipe}`);
  for(let i=0;i<22&&!industryPanel(w,id)?.output.length;i++)step(25);
  assert.equal(collectIndustry(w,id),null,`collect ${recipe}`);
  warm();
 }

 assert.ok(craftTool(w,'wood_axe').ok);
 const work=place('workbench',22,24);
 go(22.63,23.94);
 assert.equal(unlockTech(w,'tier2_automation'),null,work);
 catchOne('driftwood',12);catchOne('frost_iron_scrap',22);catchOne('coal_chunk',11);
 const stove=place('stove',22,26),furnace=place('furnace',25,24);
 assert.ok(craftTool(w,'mining_pick').ok);
 warm();assert.equal(upgradeHearth(w),null);
 catchOne('raw_root',8);job(stove,'cook_baked_root',{x:22.60,y:25.72});
 assert.equal(count('baked_root'),2);
 catchOne('warm_fur',3);catchOne('rope',2);
 assert.equal(craftGear(w,'warm_wind_coat'),null);
 assert.equal(equipGear(w,'warm_wind_coat'),null);
 assert.ok(w.day<=3,'stove, tools, hot food and the first warm coat must be attainable within the first three days');
 for(let i=0;i<6;i++)job(furnace,'smelt_frost_iron',{x:25.60,y:24.12});

 // Sail naturally to the first guaranteed geothermal vein. No coordinates,
 // time, inventory, discovery or boss counters are written by the harness.
 const helm=helmPoint(w);go(helm.x,helm.y);
 assert.equal(setDestination(w,'sulfur_furnace'),null);
 assert.equal(toggleCruise(w),null);
 for(let n=0;n<110&&w.ark.anchoredIslandId!=='sulfur_furnace';n++)step(22);
 assert.equal(w.ark.anchoredIslandId,'sulfur_furnace');
 const bridge=gangwayGeometry(w)!;
 go(bridge.x-.54,bridge.y+.5);assert.equal(toggleGangway(w),null);
 go(bridge.x+bridge.width+1.55,bridge.y+.5);
 const vein=islandNodes(w).filter(n=>n.itemId==='sulfur_ore'&&islandNodeRemaining(w,n)>0)
  .sort((a,b)=>Math.hypot(a.x-w.player.x,a.y-w.player.y)-Math.hypot(b.x-w.player.x,b.y-w.player.y))[0];
 assert.ok(vein);
 go(vein.x-.58,vein.y);
 assert.ok(harvestIslandResource(w,vein).ok,'legit geothermal mining');
 assert.ok((toolStatus(w,'mining_pick')?.durability??8)<8);
 go(bridge.x-.54,bridge.y+.5);
 assert.equal(toggleGangway(w),null);
 warm();assert.equal(upgradeHearth(w),null,'pressure furnace obtained with natural materials');
 assert.equal(primaryHearth(w)!.level,3);
 assert.ok(repairTool(w,'mining_pick').ok,'early pick upkeep is reachable');
 catchOne('ice_shard',2);catchOne('driftwood',4);
 go(22.63,23.94);assert.equal(unlockTech(w,'tier3_fortress'),null);
 place('frost_turret',25,23);
 assert.ok(w.day<5,'natural inland mining and smelting fund defenses before the first raid');

 let safety=0;
 while(w.day<=10&&safety++<900){
  warm();
  if(fuelItems()<6)catchOne('coal_chunk',10);
  if(count('baked_root')<2){
   catchOne('raw_root',4);job(stove,'cook_baked_root',{x:22.6,y:25.72});
  }
  step(210);
 }
 assert.equal(w.day,11,'complete Day 1 through Day 10');
 assert.ok(catches>3&&meals>=5&&refuels>=10,'sustained natural food and fuel loops');
 assert.ok(!falls,'living economy plan does not require dying to supply food or fuel');
 if(campaign){
  const fullStart=w.tick;
  function topUp(){
   warm();
   catchOne('raw_root',9);catchOne('coal_chunk',9);catchOne('driftwood',9);
   while(count('baked_root')<10){
    if(count('raw_root')<2)catchOne('raw_root',7);
    job(stove,'cook_baked_root',{x:22.6,y:25.72});
   }
   while(primaryHearth(w)!.fuel<200&&fuelItems()>0&&!addFuel(w))refuels++;
  }
  function dock(id:string){
   const h=helmPoint(w);go(h.x,h.y);
   assert.equal(setDestination(w,id),null,id);
   assert.equal(toggleCruise(w),null,id);
   for(let n=0;n<220&&w.ark.anchoredIslandId!==id;n++)step(22);
   assert.equal(w.ark.anchoredIslandId,id);
   const b=gangwayGeometry(w)!;
   go(b.x-.54,b.y+.5);assert.equal(toggleGangway(w),null);
   go(b.x+b.width+1.55,b.y+.5);return b;
  }
  for(const node of ['frostpine_gate','sulfur_reach','sulfur_furnace','permafrost_ruins']){
   const prev=w.skyheartCores;
   topUp();
   const b=dock(node);
   console.log('[campaign] landed '+node+' day '+w.day+' tick '+w.tick);
   if(node==='frostpine_gate'||node==='sulfur_reach'){
    const land=w.activeIsland!;
    go(land.offsetX+24.35,land.offsetY+32.5);
    const guard=()=>m5Status(w).bosses.find(e=>e.id==='boss_'+node);
    for(let n=0;n<100&&w.skyheartCores===prev;n++){
     const g=guard();
     if(g&&Math.hypot(g.x-w.player.x,g.y-w.player.y)>1.85)go(g.x-.65,g.y);
     if(g&&Math.hypot(g.x-w.player.x,g.y-w.player.y)<.2)startRoll(w,{x:0,y:1});
     attackM5(w);step(17);
    }
   }else{
    const cache=islandNodes(w).find(n=>n.key==='chest_2068')!;
    assert.ok(cache&&islandNodeRemaining(w,cache)>0,node);
    go(cache.x-.65,cache.y);
    assert.ok(harvestIslandResource(w,cache).ok,node+' chest');
   }
   assert.equal(w.skyheartCores,prev+1,'actual fire seed: '+node);
   console.log('[campaign] acquired '+w.skyheartCores+'/4 seeds, player '+w.player.hp.toFixed(1)+' hp');
   go(b.x-.54,b.y+.5);assert.equal(toggleGangway(w),null);
   warm();
   w=deserializeWorld(serializeWorld(w));
  }
  topUp();assert.equal(forgeSolarArk(w),null);
  assert.equal(primaryHearth(w)!.level,4);
  catchOne('frost_iron_scrap',39);catchOne('driftwood',12);
  const wheel=helmPoint(w);go(wheel.x,wheel.y);
  assert.equal(setDestination(w,'aurora_vault'),null);assert.equal(toggleCruise(w),null);
  for(let i=0;i<190&&!finaleStatus(w).sea&&!w.bossDefeated;i++)step(18);
  assert.ok(finaleStatus(w).sea,'natural access to the aurora sea arena');
  warm();
  let phase=0;
  for(let n=0;n<420&&!w.bossDefeated;n++){
   let f=finaleStatus(w);
   if(f.whale&&f.whale.phase!==phase){phase=f.whale.phase;console.log('[campaign] frost-whale phase '+(phase+1));w=deserializeWorld(serializeWorld(w));f=finaleStatus(w);}
   if(f.whale?.warning&&f.whale.warning.until-w.tick<10)startRoll(w,{x:1,y:0});
   if(f.whale?.open){volleyWhale(w);attackWhale(w);}
   if(primaryHearth(w)!.hp<primaryHearth(w)!.maxHp-53)repairSeaHearth(w);
   if(hearthNear(w,2.8)&&primaryHearth(w)!.fuel<95)addFuel(w);
   step(13);
   if(n%12===11&&Math.hypot(w.player.x-24.5,w.player.y-25.4)>1)warm();
  }
  assert.ok(w.bossDefeated,'natural fuel, actual paid cannon and recovery finish all phases');
  assert.equal(w.skyheartCores,4);
  assert.equal(falls,0);
  return {seed,campaign:true,fullStart,finish:w.tick,day:w.day,seeds:w.skyheartCores,whale:w.bossDefeated,catches,meals,refuels,falls};
 }
 return {seed,catches,meals,refuels,falls,days,final:{day:w.day,tick:w.tick,hunger:w.player.hunger,hp:w.player.hp,level:primaryHearth(w)!.level}};
}
console.log('[p2-economy] '+JSON.stringify(playEconomy(Number(process.argv[2])||202608,process.argv.includes('--campaign'))));
