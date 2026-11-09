# Spatial Portfolio

Homepage prototype for a personal software / product engineering portfolio.

> "The future feels futuristic until it exists."

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npm run build && npm start
```

Useful URLs:

- `/#projects`, `/#engineering`, `/#design`, `/#about`: travel to a destination
- `/#projects/example-project`, `/#about/resume`, `/#about/contact`: inspect an object
- `/?static`: force the no-WebGL fallback

## How it works

The homepage follows the approved design: editorial copy on the left, the
portrait on the right, four floating glass tiles and an iridescent ribbon.
One route (mirrored in the URL hash) drives the camera, the 3D scene and the
HTML layers, so links, Back and Escape all work:

| State | Scene | HTML layer |
| --- | --- | --- |
| Overview | The designed composition. Pointer parallax; hovered tiles lift and lean; drag shifts perspective within bounds and settles back | Intro, tile buttons (pinned to the 3D tiles) |
| Area focus | The selected tile travels forward and the area's exhibit unfolds from it; the portrait and ribbon recede | Breadcrumb, area intro, object labels |
| Inspect | Moves close to one object, framed beside the content | Breadcrumb, inspect card (sheet on mobile) |

The overview is authored in fractions of the mockup's viewport
(`heroLayouts` in `world.ts`, with a separate phone layout) and the camera fits
that region to the actual viewport.

| Path | Role |
| --- | --- |
| `src/content/areas.ts` | Areas and their objects (text only; placeholders labelled) |
| `src/content/character.ts` | Figure slot: set `model` to a GLB to replace the temporary portrait |
| `src/lib/focus-store.ts` | Route state (`area` / `item`), hash sync, back navigation |
| `src/components/spatial/world.ts` | Composition layout + camera poses (pure math, no three.js) |
| `src/components/spatial/camera-director.tsx` | Spring camera, parallax, bounded drag |
| `src/components/spatial/hero-portrait.tsx` | Temporary depth-displaced photo portrait |
| `src/components/spatial/hero-tiles.tsx` | Glass navigation tiles |
| `src/components/spatial/destinations/*` | Exhibits: Projects gallery, Engineering system stack, Design compositions, About still life |
| `src/components/spatial/spatial-stage.tsx` | Input, accessible 3D-pinned buttons, lazy WebGL, CSS fallback composition |
| `src/components/overlays.tsx` | Intro, wayfinding, inspect card |

## Portrait assets

`scripts/prepare_portrait.py` builds `public/portrait/*` from the real photo in
`assets/portrait/source.png` (requires Python with pillow, numpy and scipy):

```bash
python3 scripts/prepare_portrait.py
```

## Portrait (temporary)

The portrait is the real photograph, cut out and shown on a subdivided plane
displaced by a soft pseudo-depth map (`public/portrait/depth.png`), so it gains
gentle relief under parallax and the ribbon can pass in front of and behind it.
It is a layered photo, **not** a 3D reconstruction. The figure in the approved
mockup is AI-generated and is used only as the target for pose, framing and
prominence. The source photo is low resolution (a small circular avatar), so
the portrait is soft at desktop size: a higher-resolution photo on a plain
backdrop, re-run through `scripts/prepare_portrait.py`, is the quickest win.

For a production 3D model, export a GLB (Y-up, metres, facing +Z), put it in
`public/models/`, and set `character.model` in `src/content/character.ts`. It
takes the portrait's place and size in the composition.

## Before deploying

Fill the `TODO`s in `src/content/site.ts` (name, monogram, contact, résumé)
and replace the placeholder entries in `src/content/projects.ts` and
`src/content/areas.ts`.
