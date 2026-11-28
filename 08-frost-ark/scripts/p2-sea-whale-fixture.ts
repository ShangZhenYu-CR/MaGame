import assert from 'node:assert/strict';
import { build,inventoryChange } from '../src/sim/ark';
import { ensureNavigationState } from '../src/sim/m3-state';
import { helmPoint,setDestination } from '../src/sim/sky-map';
import { coastFixture } from './p2-coast-fixture';

export function seaWhaleFixture(){
 const w=coastFixture('aurora_vault',202608);
 w.activeIsland=null;w.ark.anchoredIslandId=null;
 const n=ensureNavigationState(w);n.dock=null;
 Object.assign(w.sky,{x:35.94,y:-1.1,cruising:false});
 Object.assign(w.player,helmPoint(w));
 w.unlockedTech.push('tier2_automation','tier3_fortress');
 assert.ok(inventoryChange(w,[],[{itemId:'frost_iron_scrap',count:28},{itemId:'sulfur_ore',count:5},{itemId:'rope',count:6},
   {itemId:'frost_iron_ingot',count:8}]));
 for(const [id,x,y] of [['frost_turret',22,23],['fire_oil_turret',26,26],['oil_mortar',23,27]] as const)assert.ok(build(w,id,x,y),id);
 assert.equal(setDestination(w,'aurora_vault'),null);
 return w;
}
