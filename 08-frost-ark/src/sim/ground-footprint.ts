/** Ground contact is not the opaque sprite silhouette or the construction reservation.
 * Coordinates are in tiles relative to the building's upper-left placement cell. */
export const PLAYER_FOOT_RADIUS = .21;

export const GROUND_FOOTPRINTS: Readonly<Record<string, {
  anchorY: number;
  bounds: readonly [left: number, top: number, right: number, bottom: number];
} | undefined>> = {
  // Circular cast-iron base, not the post, lantern head, or its light.
  torch_post: { anchorY: .8, bounds: [.385, .605, .615, .8] },
  // Width of the legs, with space behind the worktop and past the front feet.
  workbench: { anchorY: .8, bounds: [.035, .435, .965, .8] },
};
