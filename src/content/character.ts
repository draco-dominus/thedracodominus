/**
 * The 3D character representing the portfolio owner.
 *
 * STATUS: NO CHARACTER IN THE COMPOSITION. `model` is null and `placeholder`
 * is "none", so the centre of the stage stays empty (a quiet marked slot).
 * The procedural stand-in in `components/spatial/character/procedural-character.tsx`
 * is kept only for development (`placeholder: "procedural"`); it is not a
 * likeness and must not ship.
 *
 * PRODUCTION: commission or capture a proper stylised model, export as GLB
 * (Y-up, metres, facing +Z, feet/seat on y = 0), drop it in /public/models and
 * set `model` below. The loader normalises its height and grounds it.
 */
export const character = {
  model: null as string | null,
  /** What to show when no model is set. */
  placeholder: "none" as "none" | "procedural",
  /** Target height in metres for a loaded model (seated figure ≈ 1.62). */
  height: 1.62,
  status: "awaiting-model" as "awaiting-model" | "production",
};
