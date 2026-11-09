"""
Prepare the portrait layers used by the homepage.

Input : assets/portrait/source.png  (the real photograph, circular avatar crop)
Output: public/portrait/cutout.webp (subject with soft alpha matte)
        public/portrait/depth.png   (smooth pseudo-depth used for subtle relief)
        src/content/portrait-meta.json (aspect ratio + focal points)

This is a deliberately simple luminance/saturation matte: the source has a flat,
light studio backdrop and a dark-clothed subject, so a colour-key works well.
Replace this step with a proper segmentation or a real 3D capture later.

Usage: python3 scripts/prepare_portrait.py
Requires: pillow, numpy, scipy
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/portrait/source.png"
OUT = ROOT / "public/portrait"
META = ROOT / "src/content/portrait-meta.json"

# Geometry of the circular crop in the source image (pixels).
CX, CY, R = 205.5, 210.5, 166
UPSCALE = 3
PAD = 6

im = Image.open(SRC).convert("RGB")
a = np.asarray(im).astype(np.float32)
H, W = a.shape[:2]
yy, xx = np.mgrid[0:H, 0:W]
dist = np.sqrt((xx - CX) ** 2 + (yy - CY) ** 2)
inside = dist < R

# 1. Colour-key the light, low-saturation backdrop.
lum = a.mean(-1)
sat = a.max(-1) - a.min(-1)
backdrop = (lum > 175) & (sat < 28) & inside
fg = ndi.binary_opening(inside & ~backdrop, iterations=1)

# 2. Keep the largest connected region (the person), fill holes.
lab, n = ndi.label(fg)
sizes = ndi.sum(fg, lab, range(1, n + 1))
mask = lab == (np.argmax(sizes) + 1)
mask = ndi.binary_fill_holes(mask)
mask = ndi.binary_closing(mask, iterations=2)
mask = ndi.binary_fill_holes(mask)

# 3. Soft alpha: slight feather, then fade where the circular crop clips the
#    body (lower half only), so no hard arc is visible.
alpha = ndi.gaussian_filter(mask.astype(np.float32), 0.7)
edge = np.clip((R - 4 - dist) / 34.0, 0, 1)
edge = edge * edge * (3 - 2 * edge)  # smoothstep
lower = np.clip((yy - (CY + 30)) / 40.0, 0, 1)
alpha *= 1 - lower * (1 - edge)

# 4. Crop to the subject.
ys, xs = np.where(alpha > 0.02)
x0, x1 = int(max(xs.min() - PAD, 0)), int(min(xs.max() + PAD + 1, W))
y0, y1 = int(max(ys.min() - PAD, 0)), int(min(ys.max() + PAD + 1, H))
rgb = Image.fromarray(a[y0:y1, x0:x1].astype(np.uint8))
al = Image.fromarray((alpha[y0:y1, x0:x1] * 255).astype(np.uint8))
size = ((x1 - x0) * UPSCALE, (y1 - y0) * UPSCALE)
rgb = rgb.resize(size, Image.LANCZOS).filter(
    ImageFilter.UnsharpMask(radius=1.6, percent=60, threshold=2)
)
al = al.resize(size, Image.LANCZOS)
out = rgb.copy()
out.putalpha(al)
OUT.mkdir(parents=True, exist_ok=True)
out.save(OUT / "cutout.webp", "WEBP", quality=90, method=6)


# 5. Pseudo-depth: distance from the silhouette edge, heavily smoothed.
#    This is NOT a reconstruction, only a gentle relief for parallax.
d = ndi.distance_transform_edt(mask)[y0:y1, x0:x1]
d = ndi.gaussian_filter(d, 6)
d = np.sqrt(d / max(d.max(), 1e-6))
Image.fromarray((d * 255).astype(np.uint8)).resize(
    (size[0] // 2, size[1] // 2), Image.LANCZOS
).save(OUT / "depth.png", optimize=True)

# Focal points (normalised 0..1, origin top-left) for layout.
def norm(x, y):
    return [round((x - x0) / (x1 - x0), 4), round((y - y0) / (y1 - y0), 4)]

meta = {
    "width": size[0],
    "height": size[1],
    "aspect": round(size[0] / size[1], 4),
    "head": norm(205, 92),
    "hands": norm(170, 320),
    "source": "assets/portrait/source.png",
}
META.parent.mkdir(parents=True, exist_ok=True)
META.write_text(json.dumps(meta, indent=2) + "\n")
print(json.dumps(meta))
