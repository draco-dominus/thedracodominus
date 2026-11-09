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
 *  OVERVIEW  free orbit around the character (drag, momentum, wheel zoom,
 *            bounded vertical angle and distance)
 *  FOCUS     travel to a destination's designed viewpoint; small look-around
 *  INSPECT   move close to one object, framed beside the content card
 *
 * Target, azimuth, polar angle, distance and screen framing are separate
 * springs sharing one tuning, so position, orientation and depth move as one
 * coordinated motion. Azimuth is interpolated around the subject (spherical),
 * so travel arcs around the character instead of cutting through it.
 */
const travel: SpringConfig = { stiffness: 26, damping: 10.4, mass: 1 };
const follow: SpringConfig = { stiffness: 140, damping: 24, mass: 1 };

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

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

    // Momentum after a drag is released.
    if (!bus.dragging && !reduced && (Math.abs(o.vAz) > 1e-3 || Math.abs(o.vPol) > 1e-3)) {
      const decay = Math.exp(-3.2 * dt);
      if (mode === "overview") {
        o.az += o.vAz * dt;
        o.pol = Math.min(ORBIT.maxPol, Math.max(ORBIT.minPol, o.pol + o.vPol * dt));
      } else {
        const lim = mode === "focus" ? ORBIT.focusAz : ORBIT.inspectAz;
        o.dAz = Math.max(-lim, Math.min(lim, o.dAz + o.vAz * dt));
      }
      o.vAz *= decay;
      o.vPol *= decay;
    } else if (!bus.dragging) {
      o.vAz = 0;
      o.vPol = 0;
    }

    const pose = poseFor(route, o, width / height, wide);

    // Direct manipulation should feel attached; travel should feel weighty.
    const cfg = bus.dragging || Math.abs(o.vAz) > 0.02 ? follow : travel;
    s.az.config = cfg;
    s.pol.config = cfg;

    s.tx.target = pose.target[0];
    s.ty.target = pose.target[1];
    s.tz.target = pose.target[2];
    // Shortest way around.
    s.az.target = s.az.value + wrap(pose.az - s.az.value);
    s.pol.target = pose.pol;
    s.dist.target = pose.dist;
    s.sx.target = pose.shiftX;
    s.sy.target = pose.shiftY;

    const instant = s.first || (reduced && !bus.dragging);
    let moving = false;
    for (const k of ["tx", "ty", "tz", "az", "pol", "dist", "sx", "sy"] as const) {
      moving = s[k].step(dt, instant) || moving;
    }
    s.first = false;

    const sp = Math.sin(s.pol.value);
    cam.position.set(
      s.tx.value + s.dist.value * sp * Math.sin(s.az.value),
      s.ty.value + s.dist.value * Math.cos(s.pol.value),
      s.tz.value + s.dist.value * sp * Math.cos(s.az.value),
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
