import { ORBIT, type OrbitInput, type Vec3 } from "./world";

/**
 * Mutable, render-free channel between the DOM layer (labels, pointer input)
 * and the WebGL frame loop. Writing here never triggers a React render.
 */
export interface Anchor {
  el: HTMLElement;
  position: Vec3;
  /** Outward normal of what it labels; used to dim labels seen from behind. */
  normal?: Vec3;
}

export interface SpatialBus {
  orbit: OrbitInput & {
    /** Angular velocity carried after a drag is released (momentum). */
    vAz: number;
    vPol: number;
  };
  dragging: boolean;
  /** Pixels moved during the current/last press: distinguishes drag from click. */
  dragDistance: number;
  /** Key of the object under the pointer ("projects" or "projects/item"). */
  hover: string | null;
  anchors: Map<string, Anchor>;
  invalidate: () => void;
}

export function createSpatialBus(): SpatialBus {
  return {
    orbit: {
      az: ORBIT.defaultAz,
      pol: ORBIT.defaultPol,
      dist: ORBIT.defaultDist,
      dAz: 0,
      dPol: 0,
      vAz: 0,
      vPol: 0,
    },
    dragging: false,
    dragDistance: 0,
    hover: null,
    anchors: new Map(),
    invalidate: () => {},
  };
}
