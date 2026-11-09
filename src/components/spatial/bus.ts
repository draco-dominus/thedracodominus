import type { OrbitInput, Vec3 } from "./world";

/**
 * Mutable, render-free channel between the DOM layer (labels, pointer input)
 * and the WebGL frame loop. Writing here never triggers a React render.
 */
export interface Anchor {
  el: HTMLElement;
  position: Vec3;
  /**
   * Key of a moving object in `tracked`: the label follows it (position and
   * on-screen size) instead of the static `position`.
   */
  track?: string;
}

/** Live pose of a moving object, written by the scene every frame. */
export interface Tracked {
  position: Vec3;
  /** World-space edge length, used to size the label to the object. */
  size: number;
}

export interface SpatialBus {
  orbit: OrbitInput & {
    /** Angular velocity carried after a drag is released (momentum). */
    vAz: number;
    vPol: number;
  };
  /** Pointer position in normalised device coordinates (-1..1, y up). */
  pointer: { x: number; y: number };
  dragging: boolean;
  /** Pixels moved during the current/last press: distinguishes drag from click. */
  dragDistance: number;
  /** Key of the object under the pointer ("projects" or "projects/item"). */
  hover: string | null;
  /** Narrow layout: where the intro copy ends (fraction of viewport height). */
  introBottom: number;
  anchors: Map<string, Anchor>;
  tracked: Map<string, Tracked>;
  invalidate: () => void;
}

export function createSpatialBus(): SpatialBus {
  return {
    orbit: { dAz: 0, dPol: 0, vAz: 0, vPol: 0 },
    pointer: { x: 0, y: 0 },
    dragging: false,
    dragDistance: 0,
    hover: null,
    introBottom: 0,
    anchors: new Map(),
    tracked: new Map(),
    invalidate: () => {},
  };
}
