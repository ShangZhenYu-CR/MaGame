export const SAVE_VERSION = 12;
export const TICK_RATE = 30;
export const ARK_SIZE = 48;
export const ISLAND_SIZE = 64;
export const TILE_PX = 32;

export type GearSlot='outer'|'guard'|'charm';
export type WeatherKind = 'clear' | 'snow' | 'whiteout';
export type BeastRole = 'companion' | 'work' | 'rest';
export type PortraitMood = 0 | 1 | 2 | 3; // head-0..head-3

export interface ItemStack {
  itemId: string;
  count: number;
  durability?: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: Vec2;
  hp: number;
  maxHp: number;
  warmth: number;
  maxWarmth: number;
  hunger: number;
  maxHunger: number;
  portraitMood: PortraitMood;
  selectedSlot: number;
  gear: Record<GearSlot,string|null>;
  weapon: string | null;
  weaponReadyTick: number;
  roll: {stamina:number;startedAt:number|null;dx:number;dy:number;restUntil:number};
  rescue: { startedAt: number | null; shieldUntil: number };
  diet: { warmUntil: number; last: import('./food').MealId | null; quick: import('./food').MealId | null };
  inventory: (ItemStack | null)[];
  grapple: {
    active: boolean;
    charging: boolean;
    charge: number;
    targetX: number;
    targetY: number;
    caughtDebrisId: string | null;
  };
}

export interface LatteState {
  x: number;
  y: number;
  mood: 'cozy' | 'alert' | 'hungry_hearth';
  autoLootUnlocked: boolean;
}

export interface BuildingInstance {
  id: string;
  defId: string;
  gx: number;
  gy: number;
  hp: number;
  maxHp: number;
  fuel: number;
  level: number;
  frozen: boolean;
  door?: {open:boolean;nearbyUntil:number};
}

export interface ArkState {
  size: number;
  decks: number[];          // 0 = empty sky, 1 = wood deck, 2 = iron deck (length = size * size)
  heatGrid: number[];       // °C per tile (length = size * size)
  buildings: BuildingInstance[];
  buoyancyUsed: number;
  buoyancyMax: number;
  anchoredIslandId: string | null;
}

export interface CloudDebris {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  heavy?: boolean;
  loot: ItemStack[];
}

export interface IslandNode {
  id: string;
  name: string;
  biomeId: string;
  tier: number;
  seed: number;
  skyX: number;
  skyY: number;
  discovered: boolean;
  bossDefeated: boolean;
  deltas: Record<string, number>;
}

export interface SkyMapState {
  x: number;
  y: number;
  headingX: number;
  headingY: number;
  cruising: boolean;
  windX: number;
  windY: number;
  islands: IslandNode[];
  debris: CloudDebris[];
}

export interface IslandState {
  nodeId: string;
  biomeId: string;
  size: number;
  tiles: number[];
  offsetX: number;
  offsetY: number;
}

export interface BeastEntity {
  id: string;
  defId: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  warmth: number;
  hunger: number;
  role: BeastRole;
  denBuildingId: string | null;
  workCooldown: number;
}

export interface WildEntity {
  id: string;
  kind: 'beast' | 'raider' | 'boss';
  defId: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  stunnedTicks: number;
  tameProgress: number;
  hostile: boolean;
  homeIslandId?: string; // fauna origin; raiders and global threats may omit it
}

export interface WorldState {
  saveVersion: number;
  seed: number;
  rngState: number;
  tick: number;
  day: number;
  timeOfDay: number;        // 0..1
  weather: WeatherKind;
  ambientTemp: number;
  player: PlayerState;
  latte: LatteState;
  ark: ArkState;
  sky: SkyMapState;
  activeIsland: IslandState | null;
  beasts: BeastEntity[];
  wildEntities: WildEntity[];
  unlockedTech: string[];
  skyheartCores: number;
  bossDefeated: boolean;
}
