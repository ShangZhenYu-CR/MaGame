import assert from 'node:assert/strict';
import { inventoryChange } from '../src/sim/ark';
import { careForLatte,latteProfile } from '../src/sim/latte-growth';
import { createInitialWorld,stepWorld } from '../src/sim/world';
export function latteFixture(){
 const w=createInitialWorld(202608);
 assert.ok(inventoryChange(w,[],[{itemId:'cloud_fish',count:12}]));
 // Earn through normal care, allowing each timer to elapse naturally
 // before the browser test exercises all three selectable costumes.
 for(let i=0;i<4;i++){
  assert.equal(careForLatte(w,'pet'),null);
  assert.equal(careForLatte(w,'feed'),null);
  stepWorld(w,245);
 }
 assert.equal(latteProfile(w).xp,48);
 const p=w.player;
 w.sky.debris.push({id:'latte_test_visible_crate',x:p.x+6,y:p.y+2,vx:-.001,vy:0,heavy:true,
   loot:[{itemId:'frost_iron_scrap',count:2}]});
 return w;
}
