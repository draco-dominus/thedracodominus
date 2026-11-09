"use client";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SpatialBus } from "./bus";

const v = new THREE.Vector3();
const toCam = new THREE.Vector3();
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
 * frame. Labels stay crisp DOM text at a fixed size; position, depth order and
 * a "seen from behind" dimming come from the scene. Labels whose anchor is off
 * screen are clamped to the edge (an indicator pointing the way), and object
 * labels are nudged apart so they never overlap on narrow screens.
 */
export function LabelProjector({ bus }: { bus: SpatialBus }) {
  useFrame((state) => {
    const cam = state.camera;
    const { width, height } = state.size;
    const items: Placed[] = [];

    for (const anchor of bus.anchors.values()) {
      const el = anchor.el;
      if (!el.hasAttribute("data-shown")) continue;
      v.set(...anchor.position);
      toCam.copy(cam.position).sub(v);
      const dist = toCam.length();
      v.project(cam);
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      let x = (v.x * 0.5 + 0.5) * width;
      let y = (-v.y * 0.5 + 0.5) * height;
      if (v.z > 1) {
        // Behind the camera: mirror to the nearest edge.
        x = width - x;
        y = height - y;
      }
      const cx = Math.min(width - EDGE - w / 2, Math.max(EDGE + w / 2, x));
      const cy = Math.min(height - EDGE - h / 2, Math.max(76 + h / 2, y));
      el.dataset.edge = cx !== x || cy !== y || v.z > 1 ? "true" : "false";
      x = cx;
      y = cy;

      let facing = 1;
      if (anchor.normal) {
        const n = anchor.normal;
        facing = (toCam.x * n[0] + toCam.y * n[1] + toCam.z * n[2]) / Math.max(dist, 1e-6);
      }
      el.dataset.far = facing < -0.2 ? "true" : "false";
      el.style.zIndex = String(Math.round(1000 - dist * 20));
      items.push({ el, x, y, w, h });
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
