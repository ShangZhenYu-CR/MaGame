import assert from 'node:assert/strict';
import { buildingAt, makeBuilding } from '../src/sim/ark';
import { ensureNavigationState } from '../src/sim/m3-state';
import { walkExpedition } from '../src/sim/island';
import { createInitialWorld } from '../src/sim/world';

for (const docked of [false,true]) {
  const w=createInitialWorld();
  w.ark.buildings.push(makeBuilding('torch_post',23,26,'lamp'),makeBuilding('workbench',22,26,'bench'));
  if(docked){
    const id=w.sky.islands[0].id;
    w.ark.anchoredIslandId=id;
    ensureNavigationState(w).dock={nodeId:id,gx:27,gy:24,deployed:true};
  }
  const p=w.player;
  const move=(x:number,y:number,dx:number,dy:number,ticks:number)=>{
    p.x=x;p.y=y;
    for(let i=0;i<ticks;i++)walkExpedition(w,{x:dx,y:dy});
  };
  // These remain full squares for construction, dismantling and interaction.
  assert.equal(buildingAt(w,23,26)?.id,'lamp');
  assert.equal(buildingAt(w,22,26)?.id,'bench');
  move(24.5,26.2,-1,0,33);
  assert.ok(p.x<21.6,'pass behind both ground footprints within the placement row');
  move(21.5,27.12,1,0,32);
  assert.ok(p.x>24.4,'pass in front of both before the former full-tile margin');
  move(23.90,25.95,0,1,12);
  assert.ok(p.y>27,'pass through clear deck right of the lamp base');
  for(const [x,y,dx,dy,limit,axis,sign] of [
    [23.5,25.7,0,1,26.395,'y',1],[23.5,27.4,0,-1,27.01,'y',-1],
    [24.2,26.67,-1,0,23.825,'x',-1],
    [22.5,25.7,0,1,26.225,'y',1],[22.5,27.4,0,-1,27.01,'y',-1],
    [21.4,26.6,1,0,21.825,'x',1],
  ] as const){
    move(x,y,dx,dy,20);
    const gap=(limit-p[axis])*sign;
    assert.ok(gap>=-1e-8&&gap<.096,`stop at visible base (${x},${y}) vs ${p[axis]}, expected ${limit}`);
  }
  const bench=w.ark.buildings.pop()!;
  move(22.7,26.67,1,0,15);
  assert.ok(p.x<=23.175+1e-8&&p.x>23.079,'lamp stops a direct approach from the left');
  w.ark.buildings.pop();
  w.ark.buildings.push(bench);
  move(23.6,26.62,-1,0,15);
  assert.ok(p.x>=23.175-1e-8&&p.x<23.271,'bench stops a direct approach from the right');
}
console.log('[footprints] OK: lamp and bench solid at the base, clear lanes, tile-based placement, both movement paths');
