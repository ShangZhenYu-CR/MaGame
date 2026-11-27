import assert from 'node:assert/strict';
import { createInitialWorld } from '../src/sim/world';
import { areaAt, dockedIsland, gangwayGeometry, toggleGangway, walkExpedition } from '../src/sim/island';
import { helmPoint, ensureNavigation, setDestination, stepNavigation, toggleCruise } from '../src/sim/sky-map';
import { attackWhale, AURORA_ISLAND, continueEndless, finaleStatus, forgeSolarArk, startWhale, stepFinale, validFinale } from '../src/sim/finale';
import { primaryHearth } from '../src/sim/heatField';
import { deserializeWorld, serializeWorld } from '../src/sim/save';
import { claimSunSeed } from '../src/sim/m5';
import { expandM5Chart } from '../src/sim/m5-zones';

const w=createInitialWorld(202608);ensureNavigation(w);expandM5Chart(w);
Object.assign(w.player,helmPoint(w));
assert.match(setDestination(w,AURORA_ISLAND)??'',/太阳方舟/,'AURORA is locked on a normal hull');
Object.assign(w.player,{x:24.5,y:25.6});
assert.match(forgeSolarArk(w)??'',/Lv.2/);
primaryHearth(w)!.level=2;
assert.match(forgeSolarArk(w)??'',/4 枚/);
for(const key of ['frostpine_gate','sulfur_reach','sulfur_furnace','permafrost_ruins'] as const)
{
  const n=w.sky.islands.find(i=>i.id===key)!;
  if(key==='sulfur_furnace'||key==='permafrost_ruins')n.deltas.chest_2068=1;
  else n.bossDefeated=true;
  assert.ok(claimSunSeed(w,key));
}
assert.match(forgeSolarArk(w)??'',/Lv.3/,'four cores cannot skip the pressure hearth');
primaryHearth(w)!.level=3;
assert.equal(forgeSolarArk(w),null);
assert.equal(forgeSolarArk(w),'太阳方舟已经升起。');
assert.equal(primaryHearth(w)!.level,4);
assert.equal(primaryHearth(w)!.fuel,360);
assert.equal(w.skyheartCores,4);
assert.ok(validFinale(w));
Object.assign(w.player,helmPoint(w));
assert.equal(setDestination(w,AURORA_ISLAND),null);
assert.equal(toggleCruise(w),null);
for(let i=0;i<7500&&w.sky.cruising;i++)stepNavigation(w);
assert.equal(w.ark.anchoredIslandId,AURORA_ISLAND);
const bridge=gangwayGeometry(w)!;
Object.assign(w.player,{x:bridge.x-.5,y:bridge.y+.5});
assert.equal(toggleGangway(w),null);
const island=dockedIsland(w)!;
assert.equal(island.nodeId,AURORA_ISLAND);
const start=bridge.x+bridge.width;
for(let i=1;i<8;i++){
  if(areaAt(w,start+i+.5,bridge.y+.5)==='island'){
    Object.assign(w.player,{x:start+i+.5,y:bridge.y+.5});break;
  }
}
w.activeIsland=island;
assert.equal(startWhale(w),null);
assert.match(attackWhale(w)??'',/冰甲/);
assert.equal(continueEndless(w),'击败永冬霜鲸后开启。');
const moveTo=(x:number,y:number)=>Object.assign(w.player,{x,y});
const tick=(n:number)=>{for(let i=0;i<n;i++){w.tick++;stepFinale(w);}};
tick(70);
const first=finaleStatus(w).whale!;
assert.equal(first.phase,0);
assert.ok(first.warning);
const initialHp=w.player.hp;
tick(first.warning!.until-w.tick);
assert.equal(w.player.hp,initialHp-15,'ignoring the circle costs hp');
const seen=new Set<number>();let iceEcho=false, walkedFinalDodge=false, cycles=0;
while(finaleStatus(w).mode==='battle'&&cycles++<30){
  let b=finaleStatus(w).whale!;
  seen.add(b.phase);
  if(b.warning){
    iceEcho ||= !!b.warning.echo;
    const hp=w.player.hp;
    if(b.phase===2&&!walkedFinalDodge){
      const aim=b.warning;
      while(w.tick<aim.until){walkExpedition(w,{x:0,y:1});tick(1);}
      assert.ok(Math.hypot(w.player.x-aim.x,w.player.y-aim.y)>b.radius,
        'ordinary movement can escape phase 3 within its telegraph');
      walkedFinalDodge=true;
    }else{
      moveTo(b.warning.x-4.4,b.warning.y+.7);
      tick(b.warning.until-w.tick);
    }
    assert.equal(w.player.hp,hp,'step outside the circles to dodge');
    b=finaleStatus(w).whale!;
  }
  moveTo(b.x-1.3,b.y);
  if(b.open){
    while(finaleStatus(w).whale?.open){
      assert.equal(attackWhale(w),null);
      tick(18);
    }
  }else tick(Math.max(1,b.next-w.tick));
}
assert.deepEqual([...seen],[0,1,2]);
assert.ok(iceEcho&&walkedFinalDodge);
assert.equal(finaleStatus(w).mode,'cleared');
assert.ok(w.bossDefeated);
assert.ok(w.sky.islands.find(i=>i.id===AURORA_ISLAND)?.bossDefeated);
assert.equal(continueEndless(w),null);
assert.equal(finaleStatus(w).mode,'endless');
assert.equal(startWhale(w),'永冬霜鲸的战斗已经开启或结束。');
assert.ok(validFinale(w));
const restored=deserializeWorld(serializeWorld(w));
assert.equal(finaleStatus(restored).mode,'endless');
console.log('[m6-finale] chart lock, four seeds, solar forge, arrival, 3-phase dodge & strike, victory, endless and JSON reload OK');
