import {
  ARK_SIZE,
  SAVE_VERSION,
  TICK_RATE,
  type WorldState,
} from './types';
import { nextRng } from './rng';

const DAY_TICKS = TICK_RATE * 60 * 8; // 8 minutes per in-game day

export function createInitialWorld(seed = 202608): WorldState {
  const decks = new Array<number>(ARK_SIZE * ARK_SIZE).fill(0);
  const heatGrid = new Array<number>(ARK_SIZE * ARK_SIZE).fill(-4);

  const center = Math.floor(ARK_SIZE / 2);
  // Initial 7x7 floating wooden deck centered on ArkGrid
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const gx = center + dx;
      const gy = center + dy;
      decks[gy * ARK_SIZE + gx] = 1;
      heatGrid[gy * ARK_SIZE + gx] = 22;
    }
  }

  const rng1 = nextRng(seed);

  return {
    saveVersion: SAVE_VERSION,
    seed,
    rngState: rng1.state,
    tick: 0,
    day: 1,
    timeOfDay: 0.15,
    weather: 'snow',
    ambientTemp: -4,
    player: {
      x: center + 0.5,
      y: center + 2.2,
      vx: 0,
      vy: 0,
      facing: { x: 0, y: 1 },
      hp: 100,
      maxHp: 100,
      warmth: 100,
      maxWarmth: 100,
      hunger: 100,
      maxHunger: 100,
      portraitMood: 0,
      selectedSlot: 0,
      inventory: [
        { itemId: 'grapple_hook', count: 1 },
        { itemId: 'driftwood', count: 8 },
        { itemId: 'rope', count: 4 },
        null, null, null, null, null, null,
        null, null, null, null, null, null, null, null, null,
      ],
      grapple: {
        active: false,
        charging: false,
        charge: 0,
        targetX: center,
        targetY: center,
        caughtDebrisId: null,
      },
    },
    latte: {
      x: center + 1.4,
      y: center + 1.4,
      mood: 'cozy',
      autoLootUnlocked: false,
    },
    ark: {
      size: ARK_SIZE,
      decks,
      heatGrid,
      buildings: [
        {
          id: 'hearth_main',
          defId: 'hearth_core',
          gx: center - 1,
          gy: center - 1,
          hp: 400,
          maxHp: 400,
          fuel: 120,
          level: 1,
          frozen: false,
        },
      ],
      buoyancyUsed: 49,
      buoyancyMax: 64,
      anchoredIslandId: null,
    },
    sky: {
      x: 0,
      y: 0,
      headingX: 1,
      headingY: 0,
      cruising: false,
      windX: 0.8,
      windY: 0.25,
      islands: [],
      debris: [],
    },
    activeIsland: null,
    beasts: [],
    wildEntities: [],
    unlockedTech: ['tier1_basics'],
    skyheartCores: 0,
    bossDefeated: false,
  };
}

export function stepWorld(world: WorldState, ticks = 1): void {
  for (let i = 0; i < ticks; i++) {
    world.tick += 1;
    world.timeOfDay = (world.timeOfDay + 1 / DAY_TICKS) % 1;
    if (world.tick % DAY_TICKS === 0) {
      world.day += 1;
    }

    const hearth = world.ark.buildings.find((b) => b.defId === 'hearth_core');
    if (hearth && hearth.fuel > 0) {
      hearth.fuel = Math.max(0, hearth.fuel - 0.015);
    }

    // Ambient temperature baseline curve (expanded in M1 heatField.ts)
    const isNight = world.timeOfDay >= 0.68;
    const isWhiteout = world.day % 5 === 0 && isNight;
    world.weather = isWhiteout ? 'whiteout' : isNight ? 'snow' : 'clear';
    world.ambientTemp = isWhiteout ? -55 : isNight ? -22 : -4;
  }
}
