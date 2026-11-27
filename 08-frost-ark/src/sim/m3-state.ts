import type { DockSide } from './dock-direction';
import type { WorldState } from './types';

export interface IslandDock {
  nodeId:string;
  /** Anchor tile (the last tile of the ark, not the first board of the gangway). */
  gx:number;
  gy:number;
  deployed:boolean;
  side?:DockSide;
}
export interface NavigationState {
  targetId:string|null;
  dock:IslandDock|null;
}
export type NavigationSave=WorldState&{navigationM3?:NavigationState};
export const getNavigation=(w:WorldState)=>(w as NavigationSave).navigationM3;
export function ensureNavigationState(w:WorldState):NavigationState{
  return (w as NavigationSave).navigationM3??={targetId:null,dock:null};
}
