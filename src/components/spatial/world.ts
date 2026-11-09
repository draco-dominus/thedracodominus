import type { AreaId } from "@/content/areas";
import type { Route } from "@/lib/focus-store";

/**
 * The spatial layout, in metres. Pure math, no three.js, so the DOM layer can
 * import it without pulling WebGL code into the main bundle.
 *
 * OVERVIEW is the approved homepage composition: the portrait on the right,
 * four glass tiles floating around it at different depths, a ribbon passing
 * through. It is authored in fractions of a reference viewport (the mockup),
 * then converted to world space, so the 3D scene reproduces the design.
 *
 * FOCUS / INSPECT bring one area's exhibit forward onto a stage in front of
 * the portrait, which recedes behind it.
 */
export type Vec3 = [number, number, number];

export const FOV = 34;
/** Uniform scale of every exhibit group (objects are modelled at 1:1). */
export const DEST_SCALE = 0.8;
const TAN = Math.tan(((FOV / 2) * Math.PI) / 180);

/* ---------------------------- Hero composition ---------------------------- */

export type LayoutKind = "wide" | "narrow";

/** Reference viewports the composition was designed in (camera on +Z, level). */
const REFERENCE: Record<LayoutKind, { aspect: number; dist: number }> = {
  // The approved desktop mockup (1672 x 941).
  wide: { aspect: 1672 / 941, dist: 6 },
  // A typical phone (390 x 844): copy above, composition below.
  narrow: { aspect: 390 / 844, dist: 9.6 },
};

/** World position that appears at (fx, fy) of the reference viewport, at depth z. */
function onScreen(kind: LayoutKind, fx: number, fy: number, z: number): Vec3 {
  const f = REFERENCE[kind];
  const h = 2 * f.dist * TAN;
  const w = h * f.aspect;
  const k = (f.dist - z) / f.dist;
  return [(fx - 0.5) * w * k, (0.5 - fy) * h * k, z];
}

export interface RibbonShape {
  rx: number;
  rz: number;
  center: Vec3;
  tilt: Vec3;
  width: number;
}

export interface TileSpec {
  position: Vec3;
  rotation: Vec3;
}

export interface HeroLayout {
  /** Centre and height of the portrait plane. */
  portrait: { position: Vec3; height: number };
  tiles: Record<AreaId, TileSpec>;
  ribbon: RibbonShape;
  /** Region of the reference viewport the composition occupies (fractions, y down). */
  rect: { x0: number; x1: number; y0: number; y1: number };
}

/** Edge length of a navigation tile (world units). */
export const TILE_SIZE = 0.6;
export const PORTRAIT_HEIGHT = 3.45;

export const heroLayouts: Record<LayoutKind, HeroLayout> = {
  wide: {
    portrait: { position: onScreen("wide", 0.575, 0.525, 0), height: PORTRAIT_HEIGHT },
    tiles: {
      engineering: { position: onScreen("wide", 0.465, 0.372, -0.35), rotation: [0.05, 0.3, -0.05] },
      projects: { position: onScreen("wide", 0.363, 0.592, 0.35), rotation: [0.08, 0.34, 0.06] },
      design: { position: onScreen("wide", 0.81, 0.271, -0.1), rotation: [0.1, -0.3, -0.07] },
      about: { position: onScreen("wide", 0.85, 0.54, 0.15), rotation: [-0.04, -0.34, 0.04] },
    },
    ribbon: {
      rx: 2.05,
      rz: 1.1,
      center: onScreen("wide", 0.625, 0.43, 0),
      tilt: [0.45, 0.28, 0.33],
      width: 0.2,
    },
    rect: { x0: 0.31, x1: 0.93, y0: 0.04, y1: 0.96 },
  },
  narrow: {
    portrait: { position: onScreen("narrow", 0.56, 0.72, 0), height: 2.9 },
    tiles: {
      engineering: { position: onScreen("narrow", 0.15, 0.5, -0.3), rotation: [0.05, 0.3, -0.05] },
      projects: { position: onScreen("narrow", 0.15, 0.79, 0.35), rotation: [0.08, 0.34, 0.06] },
      design: { position: onScreen("narrow", 0.87, 0.47, -0.1), rotation: [0.1, -0.3, -0.07] },
      about: { position: onScreen("narrow", 0.87, 0.74, 0.15), rotation: [-0.04, -0.34, 0.04] },
    },
    ribbon: {
      rx: 1.3,
      rz: 0.75,
      center: onScreen("narrow", 0.56, 0.67, 0),
      tilt: [0.45, 0.28, 0.33],
      width: 0.14,
    },
    rect: { x0: 0.02, x1: 0.98, y0: 0.43, y1: 1.0 },
  },
};

/* ------------------------------ Exhibits ---------------------------------- */

export interface ItemPlacement {
  /** Local position inside the exhibit group (+Z faces the viewer). */
  position: Vec3;
  /** Radius to frame when inspecting. */
  extent: number;
  /** Camera direction offsets relative to the exhibit's facing. */
  view: { az: number; pol: number };
  /** Where its label sits relative to `position`. */
  labelOffset: Vec3;
}

export interface DestinationPlacement {
  extent: number;
  /** Viewing direction in focus; the exhibit turns to face it. */
  view: { az: number; pol: number };
  /** Local y of the soft shadow beneath the exhibit. */
  floor: number;
  items: Record<string, ItemPlacement>;
}

/**
 * Where a focused exhibit comes to rest: in front of the portrait (which
 * recedes behind it), between the composition and the viewer.
 */
export const STAGE: Vec3 = [0.55, 0.1, 1.5];

export const destinations: Record<AreaId, DestinationPlacement> = {
  projects: {
    extent: 1.25,
    view: { az: 0.18, pol: 1.47 },
    floor: -0.5,
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
  design: {
    extent: 0.95,
    view: { az: -0.3, pol: 1.47 },
    floor: -0.66,
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
  engineering: {
    extent: 0.95,
    view: { az: 0.34, pol: 1.25 },
    floor: -0.56,
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
  about: {
    extent: 0.95,
    view: { az: -0.26, pol: 1.42 },
    floor: -0.56,
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

/** Rotate a local vector about Y. */
function rotY(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
}

/** Every exhibit comes forward to the same stage; only one is present at a time. */
export function destinationCenter(id: AreaId): Vec3 {
  void id;
  return STAGE;
}

/** Each exhibit turns to face its own focus viewpoint. */
export function destinationYaw(id: AreaId) {
  return destinations[id].view.az;
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

export function itemLabelPosition(area: AreaId, item: string): Vec3 | null {
  const p = destinations[area].items[item];
  if (!p) return null;
  const o = p.labelOffset;
  return localToWorld(area, [p.position[0] + o[0], p.position[1] + o[1], p.position[2] + o[2]]);
}

/* ------------------------------ Camera poses ------------------------------ */

export const ORBIT = {
  /** Overview: drag shifts perspective within these bounds, then settles back. */
  heroAz: 0.32,
  heroPol: 0.14,
  /** Pointer parallax amplitude (radians) in the overview. */
  parallaxAz: 0.05,
  parallaxPol: 0.025,
  /** Look-around allowance once arrived at an exhibit / object. */
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
  /** User offsets from the designed viewpoint (drag / arrow keys). */
  dAz: number;
  dPol: number;
}

export interface Viewport {
  aspect: number;
  wide: boolean;
  /** Narrow layout: bottom of the intro copy, as a fraction of viewport height. */
  introBottom: number;
}

/** Distance at which a sphere of radius `r` fills the given fraction of the view. */
function fitDistance(r: number, aspect: number, fill: number) {
  const t = Math.min(TAN, TAN * aspect);
  return r / (t * fill);
}

/**
 * The overview camera reproduces the reference composition: the region the
 * composition occupies in the mockup is fitted into the matching region of
 * the actual viewport (narrowing it where the copy needs room).
 */
function overviewPose(orbit: OrbitInput, vp: Viewport): CameraPose {
  const kind: LayoutKind = vp.wide ? "wide" : "narrow";
  const ref = REFERENCE[kind];
  const r = heroLayouts[kind].rect;
  const H = 2 * ref.dist * TAN;
  const W = H * ref.aspect;
  const bw = (r.x1 - r.x0) * W;
  const bh = (r.y1 - r.y0) * H;
  const bx = ((r.x0 + r.x1) / 2 - 0.5) * W;
  const by = (0.5 - (r.y0 + r.y1) / 2) * H;

  const t = { ...r };
  // Narrower desktop windows: keep the composition clear of the headline.
  if (vp.wide && vp.aspect < 1.6) t.x0 = Math.min(0.43, r.x0 + (1.6 - vp.aspect) * 0.42);
  // Phones: the composition starts below the intro copy.
  if (!vp.wide && vp.introBottom > 0) t.y0 = Math.min(0.6, Math.max(0.3, vp.introBottom + 0.015));
  const tw = t.x1 - t.x0;
  const th = t.y1 - t.y0;
  const dist = Math.max(bh / (2 * TAN * th), bw / (2 * TAN * vp.aspect * tw));

  return {
    target: [bx, by, 0],
    az: orbit.dAz,
    pol: Math.PI / 2 - 0.015 + orbit.dPol,
    dist,
    shiftX: (t.x0 + t.x1) / 2 - 0.5,
    shiftY: 0.5 - (t.y0 + t.y1) / 2,
  };
}

export function poseFor(route: Route, orbit: OrbitInput, vp: Viewport): CameraPose {
  const { aspect, wide } = vp;
  if (!route.area) return overviewPose(orbit, vp);
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
    az: d.view.az + orbit.dAz,
    pol: d.view.pol + orbit.dPol,
    // Desktop: the exhibit owns the right two thirds; wayfinding sits left.
    dist: fitDistance(d.extent * DEST_SCALE, wide ? aspect * 0.66 : aspect, wide ? 0.86 : 0.9),
    shiftX: wide ? 0.15 : 0,
    shiftY: wide ? -0.02 : -0.06,
  };
}
