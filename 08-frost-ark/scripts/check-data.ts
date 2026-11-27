import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface ItemDef {
  id: string;
  gatherable?: boolean;
}

type Cost = { itemId: string; count: number };

interface RecipeDef {
  id: string;
  station: string;
  seconds?: number;
  output: Cost;
  inputs: Cost[];
}

interface BuildingDef {
  id: string;
  cost: Cost[];
  size: [number,number];
  buoyancyDelta: number;
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
  nodes: { id: string; unlocksBuildings: string[]; unlocksRecipes: string[]; prerequisite?: string; researchCost?: Cost[] }[];
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

// M2: station/timing, footprint/mass and research prerequisites.
const techIds = new Set(tech.nodes.map(n=>n.id));
if(techIds.size!==tech.nodes.length)errors.push('Duplicate technology id in tech.json');
const positiveWhole=(n:number)=>Number.isSafeInteger(n)&&n>0;
for(const r of recipes){
  if(r.station!=='hand'&&(!buildingIds.has(r.station)||!positiveWhole(r.seconds??0)))
    errors.push(`Recipe ${r.id} lacks a valid production station and duration`);
}
for(const b of buildings){
  if(b.size?.length!==2||!b.size.every(positiveWhole)||!Number.isSafeInteger(b.buoyancyDelta))
    errors.push(`Building ${b.id} lacks a valid footprint or buoyancy delta`);
  for(const cost of b.cost)if(!positiveWhole(cost.count))
    errors.push(`Building ${b.id} has an invalid material quantity`);
}
const reachableTech=new Set<string>();
while(reachableTech.size<tech.nodes.length){
  const previous=reachableTech.size;
  for(const n of tech.nodes)if(!n.prerequisite||reachableTech.has(n.prerequisite))reachableTech.add(n.id);
  if(previous===reachableTech.size)break;
}
for(const t of tech.nodes){
  if(!reachableTech.has(t.id))errors.push(`Tech node ${t.id} has a missing or circular prerequisite`);
  for(const cost of t.researchCost??[]){
    if(!reachable.has(cost.itemId)||!positiveWhole(cost.count))
      errors.push(`Tech node ${t.id} has invalid or unreachable cost ${cost.itemId}`);
  }
}

if (errors.length > 0) {
  console.error('[check-data] FAILED:\n' + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}

console.log(
  `[check-data] OK (${items.length} items, ${recipes.length} recipes, ${buildings.length} buildings, ${beasts.length} beasts, ${biomes.length} biomes)`,
);
