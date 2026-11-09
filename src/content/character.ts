/**
 * The 3D model of the portfolio owner, shown in the homepage composition.
 *
 * STATUS: TEMPORARY PORTRAIT. `model` is null, so the composition uses the
 * real photograph as a layered, depth-displaced portrait
 * (`components/spatial/hero-portrait.tsx`). That is a photo with soft relief,
 * not a 3D reconstruction. (The approved mockup's figure was AI-generated and
 * is used only as a target for pose, framing and prominence.)
 *
 * PRODUCTION: provide a high-quality GLB (Y-up, metres, facing +Z, seat on
 * y = 0), drop it in /public/models and set `model` below. It replaces the
 * portrait in the same slot; the loader normalises its height and grounds it.
 */
export const character = {
  model: null as string | null,
  /** Target height in metres for a loaded model (seated figure ≈ 1.62). */
  height: 1.62,
  status: "temporary-portrait" as "temporary-portrait" | "production",
};
