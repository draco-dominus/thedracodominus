# Spatial Portfolio (v1)

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

The homepage is one spatial interface with three camera states, driven by the
URL hash (so links, Back and Escape all retrace camera moves):

| State | Camera | HTML layer |
| --- | --- | --- |
| Overview | Free orbit around the character (drag + momentum, wheel zoom, arrow keys; bounded) | Intro, orbit hint, destination labels |
| Area focus | Travels to the destination's designed viewpoint; small look-around | Breadcrumb, destination intro, object labels |
| Inspect | Moves close to one object, framed beside the content | Breadcrumb, inspect card (sheet on mobile) |

| Path | Role |
| --- | --- |
| `src/content/areas.ts` | Destinations and their objects (text only; placeholders labelled) |
| `src/content/character.ts` | Character slot: set `model` to a GLB to replace the temporary figure |
| `src/lib/focus-store.ts` | Route state (`area` / `item`), hash sync, back navigation |
| `src/components/spatial/world.ts` | Spatial layout + camera poses (pure math, no three.js) |
| `src/components/spatial/camera-director.tsx` | Coordinated spring camera across the three states |
| `src/components/spatial/destinations/*` | Projects gallery, Engineering system stack, Design compositions, About still life |
| `src/components/spatial/character/*` | GLB loader + temporary procedural character |
| `src/components/spatial/spatial-stage.tsx` | Input, accessible 3D-anchored labels, lazy WebGL, fallback |
| `src/components/overlays.tsx` | Intro, wayfinding, inspect card |

## Portrait assets

`scripts/prepare_portrait.py` builds `public/portrait/*` from the real photo in
`assets/portrait/source.png` (requires Python with pillow, numpy and scipy):

```bash
python3 scripts/prepare_portrait.py
```

## Character asset

No character is shown at the moment: the centre of the stage is a marked,
empty slot. For production, provide a stylised GLB (Y-up, metres, facing +Z,
seated on y = 0), put it in `public/models/`, and set `character.model` in
`src/content/character.ts`. (A procedural stand-in exists for development
only: `placeholder: "procedural"`. It is not a likeness and must not ship.)
Note: the Engineering and About focus cameras look outward from near the
centre, so revisit those viewpoints once a character occupies it.

## Before deploying

Fill the `TODO`s in `src/content/site.ts` (name, monogram, contact, résumé)
and replace the placeholder entries in `src/content/projects.ts` and
`src/content/areas.ts`.
