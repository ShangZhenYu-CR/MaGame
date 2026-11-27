/** Ground contact is not the opaque sprite silhouette or the construction reservation.
 * Bounds and anchor are in tiles from the building's upper-left placement cell.
 * Calibration follows the painted feet, plinth, or floor, not upper shelves, roofs,
 * lids, weapon heads, or flame. The ground bounds stay inside the reserved tiles. */
export const PLAYER_FOOT_RADIUS = .21;

export const GROUND_FOOTPRINTS: Readonly<Record<string, {
  anchorY: number;
  bounds: readonly [left: number, top: number, right: number, bottom: number];
} | undefined>> = {
  hearth_core:    { anchorY: 1.76, bounds: [0, .91, 2, 1.76] },
  storage_box:    { anchorY:  .8,  bounds: [0, .43, 1, .8] },
  wind_wall:      { anchorY:  .8,  bounds: [0, .51, 1, .8] },
  torch_post:     { anchorY:  .8,  bounds: [.385, .605, .615, .8] },
  workbench:      { anchorY:  .8,  bounds: [.035, .435, .965, .8] },
  furnace:        { anchorY:  .8,  bounds: [.09, .39, .91, .8] },
  stove:          { anchorY:  .8,  bounds: [.015, .41, .985, .8] },
  heat_relay:     { anchorY:  .8,  bounds: [.23, .48, .77, .8] },
  catch_net:      { anchorY:  .92, bounds: [0, .67, 1, .92] },
  sorter_arm:     { anchorY:  .8,  bounds: [.255, .54, .745, .8] },
  greenhouse:     { anchorY: 1.76, bounds: [.06, .72, 1.94, 1.76] },
  fuel_hopper:    { anchorY:.80, bounds:[.09,.46,.91,.80] },
  steam_chute:    { anchorY:.77, bounds:[.09,.55,.91,.77] },
  wind_door:      { anchorY:.81, bounds:[0,.49,1,.81] },
  frost_airlock:  { anchorY:.81, bounds:[0,.49,1,.81] },
  warm_wall:      { anchorY:  .8,  bounds: [0, .49, 1, .8] },
  frost_turret:   { anchorY:  .8,  bounds: [.23, .50, .77, .8] },
  fire_oil_turret:{ anchorY:  .8,  bounds: [.24, .48, .76, .8] },
  beast_den:      { anchorY: 1.72, bounds: [0, .80, 2, 1.72] },
  feed_trough:    { anchorY:  .8,  bounds: [.015, .38, .985, .8] },
  buoyancy_core:  { anchorY:  .8,  bounds: [.03, .48, .97, .8] },
};

/** All four corners must have walkable ground. The deck and bridge share this rule. */
export function feetSupported(x:number,y:number,support:(x:number,y:number)=>boolean):boolean {
  const r=PLAYER_FOOT_RADIUS;
  return support(x-r,y-r)&&support(x+r,y-r)&&support(x-r,y+r)&&support(x+r,y+r);
}
