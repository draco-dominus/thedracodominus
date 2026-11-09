"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { areas, type AreaId } from "@/content/areas";
import type { Route } from "@/lib/focus-store";
import { Spring, springs, type SpringConfig } from "@/lib/spring";
import type { SpatialBus } from "./bus";
import { softShadowTexture } from "./soft-shadow";
import { STAGE, TILE_SIZE, type TileSpec } from "./world";

/**
 * The floating glass navigation tiles of the homepage composition.
 *
 * Each is a pillowy, frosted glass squircle (real transmission, so it picks
 * up what floats behind it) with a soft shadow. They drift gently, lean
 * toward the pointer when hovered, and on selection the chosen tile carries
 * the visitor forward: it travels toward the stage and dissolves as the
 * area's exhibit unfolds from it, while the others fall back with the
 * portrait. Their labels are real HTML buttons pinned to them.
 */
const flight: SpringConfig = { stiffness: 30, damping: 11, mass: 1 };

function squircle(size: number, radius: number) {
  const s = size / 2;
  const r = radius;
  const shape = new THREE.Shape();
  shape.moveTo(-s + r, -s);
  shape.lineTo(s - r, -s);
  shape.quadraticCurveTo(s, -s, s, -s + r);
  shape.lineTo(s, s - r);
  shape.quadraticCurveTo(s, s, s - r, s);
  shape.lineTo(-s + r, s);
  shape.quadraticCurveTo(-s, s, -s, s - r);
  shape.lineTo(-s, -s + r);
  shape.quadraticCurveTo(-s, -s, -s + r, -s);
  const bevel = 0.055;
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: bevel,
    bevelSegments: 10,
    curveSegments: 28,
  });
  g.center();
  g.computeVertexNormals();
  return g;
}

export function HeroTiles({
  bus,
  route,
  reduced,
  tiles,
}: {
  bus: SpatialBus;
  route: Route;
  reduced: boolean;
  tiles: Record<AreaId, TileSpec>;
}) {
  // The extrusion bevel adds to the footprint; keep the overall size TILE_SIZE.
  const geometry = useMemo(() => squircle(TILE_SIZE - 0.11, 0.15), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <>
      {areas.map((a, i) => (
        <Tile
          key={a.id}
          id={a.id}
          spec={tiles[a.id]}
          geometry={geometry}
          phase={i * 1.7}
          bus={bus}
          route={route}
          reduced={reduced}
        />
      ))}
    </>
  );
}

const world = new THREE.Vector3();
const projected = new THREE.Vector3();

function Tile({
  id,
  spec,
  geometry,
  phase,
  bus,
  route,
  reduced,
}: {
  id: AreaId;
  spec: TileSpec;
  geometry: THREE.BufferGeometry;
  phase: number;
  bus: SpatialBus;
  route: Route;
  reduced: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const key = `tile:${id}`;
  const glass = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        transmission: 0.9,
        roughness: 0.28,
        // A faint inner glow keeps the frosted glass milky white, as designed.
        emissive: new THREE.Color("#fbf8fb"),
        emissiveIntensity: 0.32,
        thickness: 0.35,
        ior: 1.42,
        attenuationColor: new THREE.Color("#f1ebff"),
        attenuationDistance: 1.4,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        iridescence: 0.5,
        iridescenceIOR: 1.3,
        iridescenceThicknessMinimum: 180,
        iridescenceThicknessMaximum: 520,
        specularIntensity: 1,
        envMapIntensity: 1.3,
        transparent: true,
      }),
    [],
  );
  const shadow = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: softShadowTexture(),
        color: "#3d3352",
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      }),
    [],
  );
  useEffect(
    () => () => {
      glass.dispose();
      shadow.dispose();
    },
    [glass, shadow],
  );

  const s = useMemo(
    () => ({
      hover: new Spring(0, springs.hover),
      tiltX: new Spring(0, springs.ui),
      tiltY: new Spring(0, springs.ui),
      chosen: new Spring(0, flight),
      away: new Spring(0, flight),
      track: { position: [0, 0, 0] as [number, number, number], size: TILE_SIZE },
    }),
    [],
  );

  useEffect(() => {
    bus.tracked.set(key, s.track);
    return () => {
      bus.tracked.delete(key);
    };
  }, [bus, key, s.track]);

  useFrame((state, dt) => {
    const g = ref.current;
    if (!g) return;
    const chosen = route.area === id;
    const away = route.area !== null && !chosen;
    const hovered = bus.hover === key && route.area === null;

    s.hover.target = hovered ? 1 : 0;
    s.chosen.target = chosen ? 1 : 0;
    s.away.target = away ? 1 : 0;

    // Lean toward the pointer while hovered; a faint lean always (parallax).
    world.set(...spec.position);
    projected.copy(world).project(state.camera);
    const dx = bus.pointer.x - projected.x;
    const dy = bus.pointer.y - projected.y;
    const lean = reduced ? 0 : 1;
    s.tiltY.target = lean * (hovered ? THREE.MathUtils.clamp(dx * 3, -0.4, 0.4) : bus.pointer.x * 0.06);
    s.tiltX.target = lean * (hovered ? THREE.MathUtils.clamp(-dy * 3, -0.35, 0.35) : -bus.pointer.y * 0.05);

    let moving = false;
    for (const k of ["hover", "tiltX", "tiltY", "chosen", "away"] as const) {
      moving = s[k].step(dt, reduced) || moving;
    }

    const h = s.hover.value;
    const c = s.chosen.value;
    const w = s.away.value;
    const t = state.clock.elapsedTime;
    const bob = reduced ? 0 : Math.sin(t * 0.7 + phase) * 0.022;

    // Chosen: travel toward the stage (the exhibit unfolds from it).
    // Others: fall back with the portrait.
    const [x, y, z] = spec.position;
    g.position.set(
      x + (STAGE[0] - x) * c * 0.85,
      y + bob + (STAGE[1] - y) * c * 0.85 - w * 0.25,
      z + h * 0.14 + (STAGE[2] - z) * c * 0.85 - w * 1.8,
    );
    g.rotation.set(
      spec.rotation[0] * (1 - c) + s.tiltX.value,
      spec.rotation[1] * (1 - c) + s.tiltY.value,
      spec.rotation[2] * (1 - c) + (reduced ? 0 : Math.sin(t * 0.5 + phase) * 0.012),
    );
    const scale = (1 + h * 0.05) * (1 + c * 0.5) * (1 - w * 0.2);
    g.scale.setScalar(scale);

    const fade = Math.max(0, 1 - Math.max(c * 1.6 - 0.35, 0)) * (1 - w);
    glass.opacity = fade;
    shadow.opacity = 0.16 * fade * (1 - h * 0.3);
    g.visible = fade > 0.01;

    s.track.position[0] = g.position.x;
    s.track.position[1] = g.position.y;
    s.track.position[2] = g.position.z;
    s.track.size = TILE_SIZE * scale;

    if (moving) state.invalidate();
  });

  return (
    <group ref={ref} position={spec.position}>
      <mesh geometry={geometry} material={glass} renderOrder={2} />
      {/* Soft shadow falling below and behind the tile */}
      <mesh position={[0.02, -0.13, -0.16]} scale={[TILE_SIZE * 1.6, TILE_SIZE * 1.25, 1]} material={shadow}>
        <planeGeometry />
      </mesh>
    </group>
  );
}
