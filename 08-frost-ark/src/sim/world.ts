import { stepCave } from './cave';
import { stepLandmarks } from './landmarks';
import { stepM5 } from './m5';
import {
  ARK_SIZE,
  SAVE_VERSION,
  type WorldState,
  type Vec2,
} from './types';
import { seedDrift, stepCloud } from './cloud';
import { makeBuilding, refreshBuoyancy } from './ark';
import { walkExpedition } from './island';
import { stepBeasts } from './beasts';
import { ensureNavigation, stepNavigation } from './sky-map';
import { advanceClimate, initializeHeat, stepHeat } from './heatField';
import { stepIndustry } from './industry';
import { updateLatte } from './latte';
import { nextRng } from './rng';
import { stepFinale } from './finale';
import { stepRescue } from './rescue';
import { stepHunger } from './food';
import { stepWeapons } from './weapons';
import { stepAirlocks } from './rooms';
import { cleanElements } from './elements';
import { rollMotion,stepRoll } from './roll';

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

  const world: WorldState = {
    saveVersion: SAVE_VERSION,
    seed,
    rngState: rng1.state,
    tick: 0,
    day: 1,
    timeOfDay: 0.15,
    weather: 'clear',
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
      gear: {outer:null,guard:null,charm:null},
      weapon:null,weaponReadyTick:0,
      roll:{stamina:100,startedAt:null,dx:0,dy:1,restUntil:0},
      rescue: {startedAt:null, shieldUntil:0},
      diet: {warmUntil:0,last:null,quick:null},
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
        makeBuilding('storage_box', center + 2, center + 1, 'storage_main'),
      ],
      buoyancyUsed: 0,
      buoyancyMax: 0,
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
  refreshBuoyancy(world);
  seedDrift(world);
  ensureNavigation(world);
  initializeHeat(world);
  return world;
}

export function stepWorld(world: WorldState, ticks = 1, direction: Vec2 = {x: 0, y: 0}): void {
  for (let i = 0; i < ticks; i++) {
    world.tick += 1;
    stepAirlocks(world);
    const motion=rollMotion(world,direction);
    walkExpedition(world,motion.direction,motion.scale);
    stepNavigation(world);
    stepCloud(world);
    advanceClimate(world);
    stepHeat(world);
    stepLandmarks(world);
    stepCave(world);
    stepHunger(world);
    stepBeasts(world);
    stepIndustry(world);
    updateLatte(world);
    stepFinale(world);
    stepWeapons(world);
    stepM5(world);
    stepRescue(world);
    stepRoll(world);
    cleanElements(world);
  }
}
