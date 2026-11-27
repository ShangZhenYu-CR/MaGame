import assert from 'node:assert/strict';
import { beastDefinitions } from '../src/sim/beasts';
import { ensureFauna } from '../src/sim/m4-state';
import { gainBeastXp } from '../src/sim/beast-growth';
import type { BeastEntity,WorldState } from '../src/sim/types';
import { eventFixture } from './p2-sky-event-fixture';
import { outsideCave } from './p2-cave-fixture';
import { stepWorld } from '../src/sim/world';

export function skillCompanion(w:WorldState,species:string,index=0){
 const d=beastDefinitions.get(species);assert.ok(d);
 const b:BeastEntity={id:'skill_'+species+'_'+index,defId:d.id,name:d.name,x:w.player.x+.22+index*.14,y:w.player.y+.13,
  hp:d.maxHp,maxHp:d.maxHp,warmth:90,hunger:100,role:'companion',denBuildingId:null,workCooldown:240};
 ensureFauna(w);w.beasts.push(b);return b;
}
export function liveSkillCombat(){
 const {w}=eventFixture('pirates');
 w.sky.cruising=false;const foe=w.wildEntities.find(e=>e.id.startsWith('skyraid_'))!;
 Object.assign(w.player,{x:foe.x-1.61,y:foe.y,warmth:34,hp:64});
 const leader=skillCompanion(w,'magmalisk'),healer=skillCompanion(w,'glacierstag',1);
 gainBeastXp(w,leader,10);
 return {w,leader,healer,foe};
}

export function stageSkillGuardian(){
 const {w}=outsideCave(2),island=w.activeIsland!;
 Object.assign(w.player,{x:island.offsetX+24.2,y:island.offsetY+32.5,warmth:37,hp:64});
 stepWorld(w,1);
 const foe=w.wildEntities.find(e=>e.kind==='boss')!;assert.ok(foe&&foe.hp>120);
 const leader=skillCompanion(w,'magmalisk'),healer=skillCompanion(w,'glacierstag',1);
 gainBeastXp(w,leader,10);
 return {w,leader,healer,foe};
}
