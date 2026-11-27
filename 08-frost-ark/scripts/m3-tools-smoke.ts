import assert from 'node:assert/strict';
import { countItem } from '../src/sim/ark';
import { craftTool, harvestIslandResource, harvestWithTool, repairTool, toolStatus, upgradeTool } from '../src/sim/tools';
import { createInitialWorld } from '../src/sim/world';
import { transferStorage } from '../src/sim/storage-box';
import { deserializeWorld, serializeWorld } from '../src/sim/save';
import { dockedIsland, islandNodes, islandNodeRemaining } from '../src/sim/island';
import { ensureNavigationState } from '../src/sim/m3-state';

const w = createInitialWorld();
assert.equal(harvestWithTool(w, 'wood_axe', [{itemId:'driftwood', count:2}]).ok, false);
assert.equal(craftTool(w, 'mining_pick').ok, false);
assert.equal(craftTool(w, 'wood_axe').ok, true);
assert.equal(countItem(w, 'driftwood'), 6);
assert.equal(countItem(w, 'rope'), 3);
assert.equal(craftTool(w, 'wood_axe').ok, false);
const axe = toolStatus(w, 'wood_axe')!;
assert.equal(axe.durability, 8);
assert.equal(repairTool(w, 'wood_axe').ok, false);
assert.equal(upgradeTool(w, 'wood_axe').ok, false);
for (let i = 0; i < 8; i++) {
  assert.equal(harvestWithTool(w, 'wood_axe', [{itemId:'driftwood',count:2}]).ok, true);
}
assert.equal(toolStatus(w, 'wood_axe')?.durability, 0);
assert.equal(harvestWithTool(w, 'wood_axe', [{itemId:'driftwood',count:2}]).ok, false);
assert.equal(countItem(w, 'driftwood'), 22);
assert.equal(repairTool(w, 'wood_axe').ok, true);
assert.equal(countItem(w, 'driftwood'), 21);
assert.equal(toolStatus(w, 'wood_axe')?.durability, 8);

w.player.inventory[5] = {itemId:'frost_iron_ingot', count:1};
assert.equal(upgradeTool(w, 'wood_axe').ok, true);
assert.equal(countItem(w, 'frost_iron_ingot'), 0);
assert.equal(countItem(w, 'rope'), 2);
assert.equal(toolStatus(w, 'wood_axe')?.slot, axe.slot);
assert.equal(toolStatus(w, 'wood_axe')?.durability, 20);
assert.equal(countItem(w, 'wood_axe'), 0);
w.player.inventory[5] = {itemId:'frost_iron_scrap', count:1};
assert.equal(craftTool(w, 'mining_pick').ok, true);
assert.equal(countItem(w, 'frost_iron_scrap'), 0);
const pick = toolStatus(w, 'mining_pick')!;
w.player.inventory = w.player.inventory.map(s => s ?? {itemId:'rope', count:99});
const before = JSON.stringify(w.player.inventory);
assert.equal(harvestWithTool(w, 'mining_pick', [{itemId:'frost_iron_scrap',count:2}]).ok, false);
assert.equal(JSON.stringify(w.player.inventory), before);
assert.equal(toolStatus(w, 'mining_pick')?.durability, pick.durability);
assert.equal(harvestWithTool(w, 'wood_axe', [{itemId:'driftwood',count:2}]).ok, true);
assert.equal(toolStatus(w, 'wood_axe')?.durability, 19);
console.log('[m3-tools] crafting, costs, wear, repair, upgrade, full bag atomicity OK');

const expedition = createInitialWorld();
const testIsland = {
  id: 'm3-tools-island',
  name: '测试岛',
  tier: 1,
  biomeId: 'cloud_shallows',
  seed: 419,
  skyX: 2,
  skyY: 0,
  discovered: true,
  bossDefeated: false,
  deltas: {} as Record<string, number>,
};
expedition.sky.islands.push(testIsland);
expedition.ark.anchoredIslandId = testIsland.id;
ensureNavigationState(expedition).dock = { nodeId: testIsland.id, gx: 27, gy: 25, deployed: true };
const woodland = islandNodes(expedition).find(node => node.kind === 'tree')!;
const vein = islandNodes(expedition).find(node => node.kind === 'ore')!;
const ruin = islandNodes(expedition).find(node => node.kind === 'chest')!;
assert.ok(woodland && vein && ruin);
assert.equal(harvestIslandResource(expedition, woodland).ok, false);
expedition.activeIsland = dockedIsland(expedition);
assert.equal(harvestIslandResource(expedition, woodland).ok, false);
const standAt = (node: {x:number, y:number}) => Object.assign(expedition.player, { x:node.x, y:node.y });
standAt(woodland);
assert.equal(harvestIslandResource(expedition, woodland).ok, false);
assert.equal(islandNodeRemaining(expedition, woodland), woodland.count);
assert.equal(craftTool(expedition, 'wood_axe').ok, true);
assert.equal(harvestIslandResource(expedition, { ...woodland, itemId: 'skyheart_core' }).ok, true);
assert.equal(islandNodeRemaining(expedition, woodland), 0);
assert.equal(testIsland.deltas[woodland.key], woodland.count);
assert.equal(countItem(expedition, 'skyheart_core'), 0);
assert.equal(countItem(expedition, 'driftwood'), 6 + woodland.count);
assert.equal(harvestIslandResource(expedition, woodland).ok, false);
assert.equal(toolStatus(expedition, 'wood_axe')?.durability, 7);
standAt(vein);
assert.equal(harvestIslandResource(expedition, vein).ok, false);
assert.equal(islandNodeRemaining(expedition, vein), vein.count);
expedition.player.inventory[7] = { itemId:'frost_iron_scrap', count:1 };
assert.equal(craftTool(expedition, 'mining_pick').ok, true);
const openSlots = expedition.player.inventory;
expedition.player.inventory = openSlots.map(slot => slot ?? { itemId:'rope', count:99 });
assert.equal(harvestIslandResource(expedition, vein).ok, false);
assert.equal(islandNodeRemaining(expedition, vein), vein.count);
assert.equal(toolStatus(expedition, 'mining_pick')?.durability, 8);
standAt(ruin);
const noSpace = JSON.stringify(expedition.player.inventory);
assert.equal(harvestIslandResource(expedition, ruin).ok, false);
assert.equal(islandNodeRemaining(expedition, ruin), 1);
assert.equal(JSON.stringify(expedition.player.inventory), noSpace);
expedition.player.inventory = openSlots;
assert.equal(harvestIslandResource(expedition, ruin).ok, true);
assert.equal(islandNodeRemaining(expedition, ruin), 0);
standAt(vein);
assert.equal(harvestIslandResource(expedition).ok, true);
assert.equal(countItem(expedition, vein.itemId), vein.count);
assert.equal(toolStatus(expedition, 'mining_pick')?.durability, 7);
console.log('[m3-tools] expedition ranges, node authority, exact depletion, chest/ore full-bag atomicity OK');

const storage=createInitialWorld();
storage.player.x=25.7;storage.player.y=25.5;
assert.ok(craftTool(storage,'wood_axe').ok);
assert.ok(harvestWithTool(storage,'wood_axe',[{itemId:'driftwood',count:1}]).ok);
assert.equal(toolStatus(storage,'wood_axe')?.durability,7);
assert.equal(transferStorage(storage,'wood_axe','deposit'),null);
const reopened=deserializeWorld(serializeWorld(storage));
assert.equal(transferStorage(reopened,'wood_axe','withdraw'),null);
assert.equal(toolStatus(reopened,'wood_axe')?.durability,7);
console.log('[m3-tools] storage and an imported save preserve actual tool wear');
