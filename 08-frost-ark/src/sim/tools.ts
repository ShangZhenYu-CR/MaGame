import recipes from '../data/recipes.json';
import { countItem, inventoryChange, itemNames } from './ark';
import { consumeIslandNode, harvestIssue, islandNodes, islandNodeRemaining, nearestIslandNode, type IslandResource } from './island';
import type { ItemStack, WorldState } from './types';

export type ToolKind = 'wood_axe' | 'mining_pick';
type ToolId = ToolKind | 'frost_axe' | 'frost_pick';
export interface ToolDefinition {
  id: ToolId;
  name: string;
  kind: ToolKind;
  tier: 1 | 2;
  maxDurability: number;
}
export interface ToolStatus extends ToolDefinition {
  durability: number;
  slot: number;
}
export interface ToolResult {
  ok: boolean;
  message: string;
}

function definition(id: ToolId, kind: ToolKind, tier: 1 | 2, maxDurability: number): ToolDefinition {
  return { id, kind, tier, maxDurability, name: itemNames.get(id) ?? id };
}
const toolDefs = new Map<string, ToolDefinition>([
  ['wood_axe', definition('wood_axe', 'wood_axe', 1, 8)],
  ['mining_pick', definition('mining_pick', 'mining_pick', 1, 8)],
  ['frost_axe', definition('frost_axe', 'wood_axe', 2, 20)],
  ['frost_pick', definition('frost_pick', 'mining_pick', 2, 20)],
]);
const upgradedIds: Record<ToolKind, ToolId> = { wood_axe: 'frost_axe', mining_pick: 'frost_pick' };
const costOf = (id: string): readonly ItemStack[] => recipes.find(recipe => recipe.id === id)!.inputs;

export function toolDefinition(id: string): ToolDefinition | undefined {
  return toolDefs.get(id);
}

export function normalizeToolDurability(stack: ItemStack): number | undefined {
  const def = toolDefinition(stack.itemId);
  if (!def) return undefined;
  return Number.isSafeInteger(stack.durability) && stack.durability! >= 0 && stack.durability! <= def.maxDurability
    ? stack.durability
    : def.maxDurability;
}

export function toolStatus(w: WorldState, kind: ToolKind): ToolStatus | null {
  const available: ToolStatus[] = [];
  w.player.inventory.forEach((stack, slot) => {
    if (!stack) return;
    const def = toolDefinition(stack.itemId);
    if (def?.kind !== kind) return;
    available.push({ ...def, slot, durability: normalizeToolDurability(stack)! });
  });
  return available.sort((a, b) =>
    Number(b.durability > 0) - Number(a.durability > 0) || b.tier - a.tier || b.durability - a.durability
  )[0] ?? null;
}

export function toolCraftCost(kind: ToolKind): ItemStack[] {
  return costOf(`craft_${kind}`).map(stack => ({ ...stack }));
}

export function toolUpgradeCost(kind: ToolKind): ItemStack[] {
  // The base tool is already shown by the HUD's current-tool slot. Do not charge it as a material.
  return costOf(`upgrade_${upgradedIds[kind]}`).filter(stack => stack.itemId !== kind).map(stack => ({ ...stack }));
}

export function toolRepairCost(kind: ToolKind, tier: 1 | 2 = 1): ItemStack[] {
  return tier === 2 ? [{ itemId: 'frost_iron_scrap', count: 1 }]
    : [{ itemId: kind === 'wood_axe' ? 'driftwood' : 'frost_iron_scrap', count: 1 }];
}

const failed = (message: string): ToolResult => ({ ok: false, message });
const succeeded = (message: string): ToolResult => ({ ok: true, message });

export function materialSummary(items: readonly ItemStack[]): string {
  return items.map(({itemId, count}) => `${itemNames.get(itemId) ?? itemId} ×${count}`).join('、');
}

function missingCost(w: WorldState, cost: ItemStack[]): string | null {
  const missing = cost.map(({itemId, count}) => ({itemId, count: count - countItem(w, itemId)}))
    .filter(({count}) => count > 0);
  return missing.length ? `材料不足，还缺：${materialSummary(missing)}。` : null;
}

export function craftTool(w: WorldState, kind: ToolKind): ToolResult {
  const def = toolDefinition(kind)!;
  if (toolStatus(w, kind)) return failed(`背包已有${def.name}，损坏时可以修理。`);
  const cost = toolCraftCost(kind);
  const missing = missingCost(w, cost);
  if (missing) return failed(missing);
  const output = { itemId: kind, count: 1 };
  if (!inventoryChange(w, cost, [output])) return failed('背包已满，材料未消耗。');
  w.player.inventory.find(stack => stack?.itemId === kind)!.durability = def.maxDurability;
  return succeeded(`已制作${def.name}（${def.maxDurability}/${def.maxDurability}）。`);
}

export function upgradeTool(w: WorldState, kind: ToolKind): ToolResult {
  const current = toolStatus(w, kind);
  const def = toolDefinition(upgradedIds[kind])!;
  if (!current) return failed(`请先制作${toolDefinition(kind)!.name}。`);
  if (current.tier === 2 || countItem(w, def.id)) return failed(`背包已有${def.name}。`);
  const cost = toolUpgradeCost(kind);
  const missing = missingCost(w, cost);
  if (missing) return failed(missing);
  if (!inventoryChange(w, cost, [])) return failed('升级失败，材料未消耗。');
  w.player.inventory[current.slot] = { itemId: def.id, count: 1, durability: def.maxDurability };
  return succeeded(`已升级为${def.name}（${def.maxDurability}/${def.maxDurability}）。`);
}

export function repairTool(w: WorldState, kind: ToolKind): ToolResult {
  const current = toolStatus(w, kind);
  if (!current) return failed(`请先制作${toolDefinition(kind)!.name}。`);
  if (current.durability === current.maxDurability) return failed(`${current.name}耐久已满。`);
  const cost = toolRepairCost(kind, current.tier);
  const missing = missingCost(w, cost);
  if (missing) return failed(missing);
  if (!inventoryChange(w, cost, [])) return failed('修理失败，材料未消耗。');
  w.player.inventory[current.slot]!.durability = current.maxDurability;
  return succeeded(`已修好${current.name}（${current.maxDurability}/${current.maxDurability}）。`);
}

export function harvestWithTool(w: WorldState, kind: ToolKind, rewards: ItemStack[]): ToolResult {
  const current = toolStatus(w, kind);
  if (!current) return failed(`需要${toolDefinition(kind)!.name}，请先制作。`);
  if (!current.durability) return failed(`${current.name}已损坏，请先修理。`);
  if (!rewards.length || rewards.some(s => !Number.isSafeInteger(s.count) || s.count <= 0 || !itemNames.has(s.itemId))) {
    return failed('这里已经没有可以采集的资源。');
  }
  if (!inventoryChange(w, [], rewards)) return failed('背包已满，资源未采集，耐久未消耗。');
  const left = current.durability - 1;
  w.player.inventory[current.slot]!.durability = left;
  return succeeded(`获得${materialSummary(rewards)}。 ${current.name} ${left}/${current.maxDurability}${left ? '' : '，已损坏，请修理'}。`);
}

// One interaction takes the remaining yield from a node. Defer the sparse
// depletion write until all rewards fit; rollback the inventory if it fails.
export function harvestIslandResource(
  w: WorldState,
  node: IslandResource | undefined = nearestIslandNode(w, 1.8),
): ToolResult {
  if (!node) return failed('附近没有可以采集的资源。');
  const issue = harvestIssue(w, node);
  if (issue) return failed(issue);

  const actual = islandNodes(w).find(n => n.id === node.id && n.key === node.key);
  if (!actual) return failed('这里已经没有可以带走的东西。');
  const remaining = islandNodeRemaining(w, actual);
  const before = w.player.inventory;
  const rewards = actual.kind === 'chest' ? [...actual.loot] : [{ itemId: actual.itemId, count: remaining }];
  if (!rewards?.length) return failed('这里已经没有可以带走的东西。');

  let result: ToolResult;
  if (actual.kind === 'chest') {
    if (!inventoryChange(w, [], rewards)) return failed('背包已满，遗迹箱未开启。');
    result = succeeded(`打开遗迹箱，获得${materialSummary(rewards)}。`);
  } else {
    result = harvestWithTool(w, actual.kind === 'tree' ? 'wood_axe' : 'mining_pick', rewards);
  }

  if (!result.ok) return result;
  if (!consumeIslandNode(w, actual, remaining)) {
    w.player.inventory = before;
    return failed('这里已经没有可以采集的资源。');
  }
  return result;
}
