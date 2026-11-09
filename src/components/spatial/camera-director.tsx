"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import type * as THREE from "three";
import { cameraStateOf, type Route } from "@/lib/focus-store";
import { Spring, type SpringConfig } from "@/lib/spring";
import type { SpatialBus } from "./bus";
import { ORBIT, poseFor } from "./world";

/**
 * Drives the camera through the three states:
 *
 *  OVERVIEW  holds the designed homepage composition. Pointer movement adds a
 *            gentle parallax; dragging shifts perspective within tight bounds
 *            and the view settles back to the composition on release.
 *  FOCUS     frames the exhibit brought forward for an area; small look-around
 *  INSPECT   moves close to one object, framed beside the content card
 *
 * Target, azimuth, polar angle, distance and screen framing are separate
 * springs sharing one tuning, so they move as one coordinated motion.
 */
const travel: SpringConfig = { stiffness: 26, damping: 10.4, mass: 1 };
const follow: SpringConfig = { stiffness: 140, damping: 24, mass: 1 };
const drift: SpringConfig = { stiffness: 14, damping: 7.5, mass: 1 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function CameraDirector({
  bus,
  route,
  wide,
  reduced,
}: {
  bus: SpatialBus;
  route: Route;
  wide: boolean;
  reduced: boolean;
}) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    bus.invalidate = invalidate;
    return () => {
      bus.invalidate = () => {};
    };
  }, [bus, invalidate]);

  const s = useMemo(
    () => ({
      tx: new Spring(0, travel),
      ty: new Spring(0, travel),
      tz: new Spring(0, travel),
      az: new Spring(0, travel),
      pol: new Spring(0, travel),
      dist: new Spring(0, travel),
      sx: new Spring(0, travel),
      sy: new Spring(0, travel),
      // Pointer parallax.
      px: new Spring(0, drift),
      py: new Spring(0, drift),
      first: true,
      key: "",
    }),
    [],
  );

  // Each arrival starts from the designed viewpoint.
  useEffect(() => {
    bus.orbit.dAz = 0;
    bus.orbit.dPol = 0;
    bus.orbit.vAz = 0;
    bus.orbit.vPol = 0;
    bus.invalidate();
  }, [bus, route.area, route.item]);

  useFrame((state, dt) => {
    const cam = state.camera as THREE.PerspectiveCamera;
    const { width, height } = state.size;
    const o = bus.orbit;
    const mode = cameraStateOf(route);
    const lim =
      mode === "overview"
        ? { az: ORBIT.heroAz, pol: ORBIT.heroPol }
        : mode === "focus"
          ? { az: ORBIT.focusAz, pol: ORBIT.focusPol }
          : { az: ORBIT.inspectAz, pol: ORBIT.inspectPol };

    // Momentum after a drag is released.
    if (!bus.dragging && !reduced && (Math.abs(o.vAz) > 1e-3 || Math.abs(o.vPol) > 1e-3)) {
      const decay = Math.exp(-4 * dt);
      o.dAz = clamp(o.dAz + o.vAz * dt, -lim.az, lim.az);
      o.dPol = clamp(o.dPol + o.vPol * dt, -lim.pol, lim.pol);
      o.vAz *= decay;
      o.vPol *= decay;
    } else if (!bus.dragging) {
      o.vAz = 0;
      o.vPol = 0;
    }
    // The homepage composition is home: a released drag drifts back to it.
    let settling = false;
    if (mode === "overview" && !bus.dragging && !reduced) {
      const k = Math.exp(-1.5 * dt);
      o.dAz *= k;
      o.dPol *= k;
      settling = Math.abs(o.dAz) > 1e-4 || Math.abs(o.dPol) > 1e-4;
    }

    const pose = poseFor(route, o, {
      aspect: width / height,
      wide,
      introBottom: bus.introBottom,
    });

    // Gentle pointer parallax (strongest on the homepage composition).
    const amount = reduced || bus.dragging ? 0 : mode === "overview" ? 1 : 0.35;
    s.px.target = bus.pointer.x * amount;
    s.py.target = bus.pointer.y * amount;

    // Direct manipulation should feel attached; travel should feel weighty.
    const cfg = bus.dragging || Math.abs(o.vAz) > 0.02 ? follow : travel;
    s.az.config = cfg;
    s.pol.config = cfg;

    s.tx.target = pose.target[0];
    s.ty.target = pose.target[1];
    s.tz.target = pose.target[2];
    s.az.target = pose.az;
    s.pol.target = pose.pol;
    s.dist.target = pose.dist;
    s.sx.target = pose.shiftX;
    s.sy.target = pose.shiftY;

    const instant = s.first || (reduced && !bus.dragging);
    let moving = settling;
    for (const k of ["tx", "ty", "tz", "az", "pol", "dist", "sx", "sy", "px", "py"] as const) {
      moving = s[k].step(dt, instant) || moving;
    }
    s.first = false;

    const az = s.az.value + s.px.value * ORBIT.parallaxAz;
    const pol = s.pol.value + s.py.value * ORBIT.parallaxPol;
    const sp = Math.sin(pol);
    cam.position.set(
      s.tx.value + s.dist.value * sp * Math.sin(az),
      s.ty.value + s.dist.value * Math.cos(pol),
      s.tz.value + s.dist.value * sp * Math.cos(az),
    );
    cam.lookAt(s.tx.value, s.ty.value, s.tz.value);

    const ox = -s.sx.value * width;
    const oy = s.sy.value * height;
    const key = `${width}|${height}|${ox.toFixed(1)}|${oy.toFixed(1)}`;
    if (key !== s.key) {
      cam.setViewOffset(width, height, ox, oy, width, height);
      s.key = key;
    }

    if (moving) state.invalidate();
  });

  return null;
}
