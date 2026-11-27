import { SAVE_VERSION, type WorldState } from './types';

export function serializeWorld(world: WorldState): string {
  return JSON.stringify(world);
}

export function deserializeWorld(raw: string): WorldState {
  const parsed = JSON.parse(raw) as WorldState;
  if (typeof parsed.saveVersion !== 'number' || parsed.saveVersion > SAVE_VERSION) {
    throw new Error(`Unsupported saveVersion: ${String(parsed.saveVersion)}`);
  }
  return parsed;
}
