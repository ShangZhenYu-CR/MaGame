import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface ItemDef {
  id: string;
  gatherable?: boolean;
}

interface RecipeDef {
  id: string;
  output: { itemId: string; count: number };
  inputs: { itemId: string; count: number }[];
}

interface BuildingDef {
  id: string;
  cost: { itemId: string; count: number }[];
}

interface BeastDef {
  id: string;
  preferredBait: string;
}

interface BiomeDef {
  id: string;
  resources: string[];
  wildBeasts: string[];
}

interface TechData {
  nodes: { id: string; unlocksBuildings: string[]; unlocksRecipes: string[] }[];
}

const dataDir = resolve(process.cwd(), 'src', 'data');
const readJson = <T>(name: string): T =>
  JSON.parse(readFileSync(resolve(dataDir, name), 'utf8')) as T;

const items = readJson<ItemDef[]>('items.json');
const recipes = readJson<RecipeDef[]>('recipes.json');
const buildings = readJson<BuildingDef[]>('buildings.json');
const beasts = readJson<BeastDef[]>('beasts.json');
const biomes = readJson<BiomeDef[]>('biomes.json');
const tech = readJson<TechData>('tech.json');

const errors: string[] = [];

const itemIds = new Set(items.map((i) => i.id));
const recipeIds = new Set(recipes.map((r) => r.id));
const buildingIds = new Set(buildings.map((b) => b.id));
const beastIds = new Set(beasts.map((b) => b.id));

if (itemIds.size !== items.length) errors.push('Duplicate item id in items.json');
if (recipeIds.size !== recipes.length) errors.push('Duplicate recipe id in recipes.json');
if (buildingIds.size !== buildings.length) errors.push('Duplicate building id in buildings.json');
if (beastIds.size !== beasts.length) errors.push('Duplicate beast id in beasts.json');

for (const r of recipes) {
  if (!itemIds.has(r.output.itemId)) {
    errors.push(`Recipe ${r.id} references unknown output item "${r.output.itemId}"`);
  }
  for (const inp of r.inputs) {
    if (!itemIds.has(inp.itemId)) {
      errors.push(`Recipe ${r.id} references unknown input item "${inp.itemId}"`);
    }
  }
}

for (const b of buildings) {
  for (const c of b.cost) {
    if (!itemIds.has(c.itemId)) {
      errors.push(`Building ${b.id} references unknown cost item "${c.itemId}"`);
    }
  }
}

for (const beast of beasts) {
  if (!itemIds.has(beast.preferredBait)) {
    errors.push(`Beast ${beast.id} references unknown bait "${beast.preferredBait}"`);
  }
}

for (const biome of biomes) {
  for (const res of biome.resources) {
    if (!itemIds.has(res)) {
      errors.push(`Biome ${biome.id} references unknown resource "${res}"`);
    }
  }
  for (const bid of biome.wildBeasts) {
    if (!beastIds.has(bid)) {
      errors.push(`Biome ${biome.id} references unknown beast "${bid}"`);
    }
  }
}

for (const node of tech.nodes) {
  for (const bid of node.unlocksBuildings) {
    if (!buildingIds.has(bid)) {
      errors.push(`Tech node ${node.id} references unknown building "${bid}"`);
    }
  }
  for (const rid of node.unlocksRecipes) {
    if (!recipeIds.has(rid)) {
      errors.push(`Tech node ${node.id} references unknown recipe "${rid}"`);
    }
  }
}

// Reachability check: every recipe output must be craftable starting from gatherable base items
const reachable = new Set(items.filter((i) => i.gatherable).map((i) => i.id));
let changed = true;
while (changed) {
  changed = false;
  for (const r of recipes) {
    if (reachable.has(r.output.itemId)) continue;
    if (r.inputs.every((inp) => reachable.has(inp.itemId))) {
      reachable.add(r.output.itemId);
      changed = true;
    }
  }
}
for (const r of recipes) {
  if (!reachable.has(r.output.itemId)) {
    errors.push(`Recipe ${r.id} output "${r.output.itemId}" is unreachable (deadlock)`);
  }
}

if (errors.length > 0) {
  console.error('[check-data] FAILED:\n' + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}

console.log(
  `[check-data] OK (${items.length} items, ${recipes.length} recipes, ${buildings.length} buildings, ${beasts.length} beasts, ${biomes.length} biomes)`,
);
