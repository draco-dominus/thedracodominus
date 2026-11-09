import type { AreaId } from "@/content/areas";
import type { Route } from "@/lib/focus-store";

/**
 * The spatial layout of the world, in metres. Pure math, no three.js, so the
 * DOM layer can import it without pulling WebGL code into the main bundle.
 *
 * The character sits at the origin facing +Z. Each destination stands on a
 * ring around them and faces outward, so arriving at a destination means the
 * camera has travelled around the character, who remains in the background.
 */
export type Vec3 = [number, number, number];

export const FOV = 34;
/** Uniform scale of every destination group (objects are modelled at 1:1). */
export const DEST_SCALE = 0.8;
const TAN = Math.tan(((FOV / 2) * Math.PI) / 180);

export interface ItemPlacement {
  /** Local position inside the destination group (+Z faces outward). */
  position: Vec3;
  /** Radius to frame when inspecting. */
  extent: number;
  /** Camera direction offsets relative to the destination's facing. */
  view: { az: number; pol: number };
  /** Where its label sits relative to `position`. */
  labelOffset: Vec3;
}

export interface DestinationPlacement {
  /** Angle around the character, radians from +Z toward +X. */
  angle: number;
  radius: number;
  height: number;
  extent: number;
  view: { az: number; pol: number };
  labelOffset: Vec3;
  items: Record<string, ItemPlacement>;
}

export const destinations: Record<AreaId, DestinationPlacement> = {
  // Front centre: the primary destination, nearest the overview camera.
  projects: {
    angle: 0.0,
    radius: 2.3,
    height: 0.95,
    extent: 1.25,
    view: { az: 0.22, pol: 1.45 },
    labelOffset: [0, 0.58, 0],
    items: {
      "example-project": {
        position: [0, 0.02, 0.12],
        extent: 0.46,
        view: { az: 0, pol: 1.5 },
        labelOffset: [0, -0.5, 0.2],
      },
      "project-two": {
        position: [-0.86, -0.02, -0.06],
        extent: 0.38,
        view: { az: 0.26, pol: 1.5 },
        labelOffset: [0, -0.48, 0.2],
      },
      "project-three": {
        position: [0.86, -0.02, -0.06],
        extent: 0.38,
        view: { az: -0.26, pol: 1.5 },
        labelOffset: [0, -0.48, 0.2],
      },
    },
  },
  // Front right: floating compositions (the one exhibit without a pedestal).
  design: {
    angle: 0.9,
    radius: 2.3,
    height: 1.0,
    extent: 0.95,
    view: { az: -0.35, pol: 1.45 },
    // Below the floating exhibit, so it never lands on the exhibit behind.
    labelOffset: [0.05, -0.68, 0.25],
    items: {
      "interface-studies": {
        position: [-0.36, 0.04, 0],
        extent: 0.72,
        view: { az: 0.32, pol: 1.5 },
        labelOffset: [0, -0.62, 0.2],
      },
      "product-thinking": {
        position: [0.52, -0.02, 0.1],
        extent: 0.42,
        view: { az: -0.18, pol: 1.45 },
        labelOffset: [0, -0.4, 0.1],
      },
    },
  },
  // Back left, facing inward: its focus camera looks outward across an empty room.
  engineering: {
    angle: -1.8,
    radius: 2.3,
    height: 0.95,
    extent: 0.95,
    view: { az: Math.PI + 0.38, pol: 1.2 },
    labelOffset: [0, 0.78, 0],
    items: {
      architecture: {
        position: [0.06, 0.44, 0.02],
        extent: 0.55,
        view: { az: 0.1, pol: 1.0 },
        labelOffset: [0.64, 0.02, 0],
      },
      decisions: {
        position: [-0.04, 0.14, 0.06],
        extent: 0.55,
        view: { az: 0.05, pol: 1.05 },
        labelOffset: [0.64, 0.02, 0],
      },
      stack: {
        position: [0.04, -0.16, -0.02],
        extent: 0.55,
        view: { az: 0, pol: 1.1 },
        labelOffset: [0.64, 0.02, 0],
      },
    },
  },
  // Back right, facing inward.
  about: {
    angle: 2.2,
    radius: 2.3,
    height: 0.95,
    extent: 0.95,
    view: { az: Math.PI - 0.3, pol: 1.42 },
    labelOffset: [0, 0.62, 0],
    items: {
      background: {
        position: [-0.44, 0.08, -0.04],
        extent: 0.46,
        view: { az: 0.12, pol: 1.5 },
        labelOffset: [0, 0.5, 0],
      },
      philosophy: {
        position: [0.4, -0.25, 0.14],
        extent: 0.32,
        view: { az: -0.1, pol: 1.25 },
        labelOffset: [0, -0.36, 0.34],
      },
      resume: {
        position: [0.08, -0.13, -0.12],
        extent: 0.26,
        view: { az: -0.1, pol: 1.4 },
        labelOffset: [0, 0.28, 0],
      },
      contact: {
        position: [0.7, -0.235, -0.02],
        extent: 0.2,
        view: { az: -0.28, pol: 1.45 },
        labelOffset: [0, 0.17, 0],
      },
    },
  },
};

/** Rotate a local vector into the destination's world frame (rotation about Y). */
function rotY(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
}

export function destinationCenter(id: AreaId): Vec3 {
  const d = destinations[id];
  return [Math.sin(d.angle) * d.radius, d.height, Math.cos(d.angle) * d.radius];
}

/**
 * Each destination is turned to face its own designed viewpoint, so its
 * objects spread across the frame instead of stacking in depth.
 */
export function destinationYaw(id: AreaId) {
  const d = destinations[id];
  return d.angle + d.view.az;
}

export function localToWorld(id: AreaId, local: Vec3): Vec3 {
  const c = destinationCenter(id);
  const scaled: Vec3 = [local[0] * DEST_SCALE, local[1] * DEST_SCALE, local[2] * DEST_SCALE];
  const r = rotY(scaled, destinationYaw(id));
  return [c[0] + r[0], c[1] + r[1], c[2] + r[2]];
}

export function itemCenter(area: AreaId, item: string): Vec3 | null {
  const p = destinations[area].items[item];
  return p ? localToWorld(area, p.position) : null;
}

export function destinationLabelPosition(id: AreaId): Vec3 {
  return localToWorld(id, destinations[id].labelOffset);
}

export function itemLabelPosition(area: AreaId, item: string): Vec3 | null {
  const p = destinations[area].items[item];
  if (!p) return null;
  const o = p.labelOffset;
  return localToWorld(area, [p.position[0] + o[0], p.position[1] + o[1], p.position[2] + o[2]]);
}

/* ------------------------------ Camera poses ------------------------------ */

/** Overview pivot: the centre of the stage (and of the future character slot). */
export const CHARACTER_TARGET: Vec3 = [0, 0.6, 0];

export const ORBIT = {
  defaultAz: 0.3,
  defaultPol: 1.15,
  defaultDist: 8.0,
  minPol: 0.95,
  maxPol: 1.45,
  minDist: 5,
  maxDist: 11,
  /** Look-around allowance once arrived at a destination / object. */
  focusAz: 0.5,
  focusPol: 0.16,
  inspectAz: 0.38,
  inspectPol: 0.12,
};

export interface CameraPose {
  target: Vec3;
  az: number;
  pol: number;
  dist: number;
  /** Screen-space shift of the framed subject, fraction of viewport (+x right, +y up). */
  shiftX: number;
  shiftY: number;
}

export interface OrbitInput {
  az: number;
  pol: number;
  dist: number;
  /** User offsets while at a destination / inspecting. */
  dAz: number;
  dPol: number;
}

/** Distance at which a sphere of radius `r` fills the given fraction of the view. */
function fitDistance(r: number, aspect: number, fill: number) {
  const t = Math.min(TAN, TAN * aspect);
  return r / (t * fill);
}

export function poseFor(route: Route, orbit: OrbitInput, aspect: number, wide: boolean): CameraPose {
  if (!route.area) {
    // Narrow screens need extra distance to keep the composition in frame.
    const narrow = aspect < 1 ? 1 + (1 - aspect) * 1.3 : 1;
    return {
      target: CHARACTER_TARGET,
      az: orbit.az,
      pol: orbit.pol,
      dist: orbit.dist * narrow,
      shiftX: wide ? 0.14 : 0,
      // Mobile: lift the scene above the intro card.
      shiftY: wide ? 0 : 0.14,
    };
  }
  const d = destinations[route.area];
  const p = route.item ? d.items[route.item] : undefined;
  if (p) {
    return {
      target: localToWorld(route.area, p.position),
      az: destinationYaw(route.area) + p.view.az + orbit.dAz,
      pol: p.view.pol + orbit.dPol,
      // Desktop: object owns the left ~55% while the card sits to the right.
      dist: fitDistance(p.extent * DEST_SCALE, wide ? aspect * 0.55 : aspect, wide ? 0.8 : 0.85),
      shiftX: wide ? -0.2 : 0,
      shiftY: wide ? 0 : 0.24,
    };
  }
  return {
    target: destinationCenter(route.area),
    az: d.angle + d.view.az + orbit.dAz,
    pol: d.view.pol + orbit.dPol,
    // Desktop: the destination owns the right two thirds; wayfinding sits left.
    dist: fitDistance(d.extent * DEST_SCALE, wide ? aspect * 0.66 : aspect, wide ? 0.86 : 0.9),
    shiftX: wide ? 0.15 : 0,
    shiftY: wide ? -0.02 : -0.06,
  };
}
