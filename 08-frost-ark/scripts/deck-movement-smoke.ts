import assert from 'node:assert/strict';
import { buildingAt, buildingDefs, fitsOnDeck, makeBuilding } from '../src/sim/ark';
import { GROUND_FOOTPRINTS, PLAYER_FOOT_RADIUS as r } from '../src/sim/ground-footprint';
import { areaAt, gangwayGeometry, toggleGangway, walkExpedition } from '../src/sim/island';
import { ensureNavigationState } from '../src/sim/m3-state';
import { deserializeWorld } from '../src/sim/save';
import type { WorldState } from '../src/sim/types';
import { createInitialWorld } from '../src/sim/world';
import { overlayKind } from '../src/sim/utilities';

const walk=(w:WorldState,x:number,y:number,ticks=28)=>{
  for(let i=0;i<ticks;i++)walkExpedition(w,{x,y});
};
const dock=(w:WorldState)=>{
  const nodeId=w.sky.islands[0].id;
  w.ark.anchoredIslandId=nodeId;
  return ensureNavigationState(w).dock={nodeId,gx:27,gy:24,deployed:true};
};
const solids=[...buildingDefs.values()].filter(d=>d.id!=='wood_deck'&&d.id!=='iron_deck'&&!overlayKind(d.id));
assert.equal(Object.keys(GROUND_FOOTPRINTS).length,solids.length,'every deck obstacle has a measured profile');

for(const moored of [false,true]){
  for(const def of solids){
    const profile=GROUND_FOOTPRINTS[def.id];
    assert.ok(profile,`no missing contact profile for ${def.name}`);
    const [l,t,rr,b]=profile.bounds, [sw,sh]=def.size;
    assert.ok(l>=0&&l<rr&&rr<=sw&&t>=0&&t<b&&b<=sh&&profile.anchorY===b,
      `${def.id} ground and sprite anchors must stay in the reserved tiles; legacy positions stay legal`);
    const w=createInitialWorld(),p=w.player,x=23,y=23;
    if(moored)dock(w);
    w.ark.buildings=[makeBuilding(def.id,x,y,'single')];
    for(let iy=0;iy<sh;iy++)for(let ix=0;ix<sw;ix++)assert.equal(buildingAt(w,x+ix,y+iy)?.id,'single');
    const cx=x+(l+rr)/2, cy=y+(t+b)/2;
    for(const [px,py,dx,dy,k,limit] of [
      [cx,y+t-r-.5,0,1,'y',y+t-r],
      [cx,y+b+r+.5,0,-1,'y',y+b+r],
      [x+l-r-.5,cy,1,0,'x',x+l-r],
      [x+rr+r+.5,cy,-1,0,'x',x+rr+r],
    ] as const){
      p.x=px;p.y=py;walk(w,dx,dy);
      assert.ok(Math.abs(p[k]-limit)<.002,`${def.id} ${moored?'dock':'deck'} ${dx},${dy} stops at its real base: ${p[k]}/${limit}`);
    }
    p.x=x-.7;p.y=y+t-r-.025;walk(w,1,0,42);
    assert.ok(p.x>x+sw+.5,`${def.id} allows the visible lane behind its base`);
    p.x=x+sw+.7;p.y=y+b+r+.025;walk(w,-1,0,42);
    assert.ok(p.x<x-.5,`${def.id} allows the visible lane in front of its base`);
  }
}

// Actual starting deck: screenshot approach from the north, turn right into
// the alley by the rail, pass the chest, and stop at the actual deck edge.
const w=createInitialWorld(),p=w.player;
const chest=w.ark.buildings.find(b=>b.id==='storage_main')!;
p.x=chest.gx+.5;p.y=chest.gy-.75;walk(w,0,1);
assert.ok(p.y>chest.gy+.21&&p.y<chest.gy+.222,'reach the chest base from its north, not an invisible tile edge');
walk(w,1,0);
assert.ok(p.x>27.78&&fitsOnDeck(w,p.x,p.y),'visible starboard lane, no walking into the sky');
walk(w,0,1,12);
assert.ok(p.y>26.3,'round the chest to the south without moving either fixture');
walk(w,-1,0,12);
assert.ok(p.x<26.7,'cross behind the chest after turning');
assert.equal(buildingAt(w,chest.gx,chest.gy)?.id,'storage_main');

// A sub-tile gap between two narrow plinths remains a real corridor.
const narrow=createInitialWorld();narrow.ark.buildings=[
  makeBuilding('sorter_arm',23,24,'left'),makeBuilding('heat_relay',24,24,'right'),
];
narrow.player.x=24;narrow.player.y=23.4;walk(narrow,0,1,25);
assert.ok(narrow.player.y>25.6,'walk through the half-tile gap between neighbouring plinths');
// No diagonal shortcut across two corners touching across the void.
const corner=createInitialWorld();corner.ark.buildings=[];corner.ark.decks.fill(0);
for(const [x,y] of [[24,24],[25,25]])corner.ark.decks[y*corner.ark.size+x]=1;
corner.player.x=24.5;corner.player.y=24.5;walk(corner,1,1);
assert.ok(corner.player.x<25&&corner.player.y<25&&fitsOnDeck(corner,corner.player.x,corner.player.y));

const bridge=createInitialWorld(),joint=dock(bridge),g=gangwayGeometry(bridge)!;
bridge.player.x=g.x-.04;bridge.player.y=g.y+.5;
assert.equal(toggleGangway(bridge),null);
assert.equal(joint.deployed,false);
assert.ok(fitsOnDeck(bridge,bridge.player.x,bridge.player.y),'stow at the ship seam leaves both feet aboard');
assert.equal(toggleGangway(bridge),null);
walk(bridge,1,0,65);
assert.equal(areaAt(bridge,bridge.player.x,bridge.player.y),'island','cross ship / bridge / island seams');
walk(bridge,-1,0,69);
assert.equal(areaAt(bridge,bridge.player.x,bridge.player.y),'ark');
assert.equal(toggleGangway(bridge),null);
assert.equal(joint.deployed,false);
bridge.player.x=g.x-.04;bridge.player.y=g.y+.5;
const legacy=deserializeWorld(JSON.stringify(bridge));
walk(legacy,-1,0,3);
assert.ok(legacy.player.x<g.x-r-.25,'old save stranded at a retracted seam can back up without restart');
console.log(`[deck movement] OK: ${solids.length} profiles and four approaches on each path, chest/rail, narrow gaps, corner, round-trip bridge and old save`);
