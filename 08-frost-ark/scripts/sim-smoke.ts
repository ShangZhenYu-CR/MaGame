import assert from 'node:assert/strict';
import { createInitialWorld, stepWorld } from '../src/sim/world';
import { deserializeWorld, serializeWorld } from '../src/sim/save';

// Deterministic headless smoke verification (Dot must APPEND assertions per milestone, never weaken/delete)
const w1 = createInitialWorld(202608);
const w2 = createInitialWorld(202608);

stepWorld(w1, 30 * 120); // Simulate 2 minutes
stepWorld(w2, 30 * 120);

assert.equal(serializeWorld(w1), serializeWorld(w2), 'Simulation must be deterministic for same seed');

const snapshot = serializeWorld(w1);
const restored = deserializeWorld(snapshot);
assert.deepEqual(restored, w1, 'Save/load round-trip must preserve WorldState identically');

assert.ok(w1.ark.buoyancyUsed <= w1.ark.buoyancyMax, 'Starter ark must fit inside buoyancy budget');
assert.ok(
  w1.ark.buildings.some((b) => b.defId === 'hearth_core'),
  'Starter ark must contain central hearth_core',
);

console.log(
  `[sim-smoke] OK (tick=${w1.tick}, day=${w1.day}, weather=${w1.weather}, ambientTemp=${w1.ambientTemp}°C)`,
);
