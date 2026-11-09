"use client";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SpatialBus } from "./bus";

const v = new THREE.Vector3();
const EDGE = 12;

interface Placed {
  el: HTMLElement;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Pins the accessible HTML labels (real buttons) to their 3D anchors each
 * frame. Labels stay crisp DOM text; position and depth order come from the
 * scene.
 *
 * Tracked anchors (the glass tiles) follow a moving object and receive its
 * on-screen size as `--size`, so the button covers the tile exactly. Other
 * labels are clamped to the viewport and nudged apart so they never overlap.
 */
export function LabelProjector({ bus }: { bus: SpatialBus }) {
  useFrame((state) => {
    const cam = state.camera as THREE.PerspectiveCamera;
    const { width, height } = state.size;
    const tan = Math.tan(((cam.fov / 2) * Math.PI) / 180);
    const items: Placed[] = [];

    for (const anchor of bus.anchors.values()) {
      const el = anchor.el;
      if (!el.hasAttribute("data-shown")) continue;
      const tracked = anchor.track ? bus.tracked.get(anchor.track) : undefined;
      v.set(...(tracked ? tracked.position : anchor.position));
      const dist = v.distanceTo(cam.position);
      v.project(cam);
      let x = (v.x * 0.5 + 0.5) * width;
      let y = (-v.y * 0.5 + 0.5) * height;
      el.style.zIndex = String(Math.round(1000 - dist * 20));

      if (tracked) {
        const px = (tracked.size * height) / (2 * dist * tan);
        el.style.setProperty("--size", `${px.toFixed(1)}px`);
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
        continue;
      }

      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (v.z > 1) {
        // Behind the camera: mirror to the nearest edge.
        x = width - x;
        y = height - y;
      }
      const cx = Math.min(width - EDGE - w / 2, Math.max(EDGE + w / 2, x));
      const cy = Math.min(height - EDGE - h / 2, Math.max(76 + h / 2, y));
      el.dataset.edge = cx !== x || cy !== y || v.z > 1 ? "true" : "false";
      items.push({ el, x: cx, y: cy, w, h });
    }

    // Resolve overlaps: push later labels down below earlier ones.
    items.sort((a, b) => a.y - b.y);
    for (let i = 0; i < items.length; i++) {
      for (let j = 0; j < i; j++) {
        const a = items[j];
        const b = items[i];
        const ox = (a.w + b.w) / 2 + 6 - Math.abs(a.x - b.x);
        const oy = (a.h + b.h) / 2 + 4 - Math.abs(a.y - b.y);
        if (ox > 0 && oy > 0) b.y = a.y + (a.h + b.h) / 2 + 4;
      }
    }
    for (const p of items) {
      p.el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) translate(-50%, -50%)`;
    }
  });
  return null;
}
