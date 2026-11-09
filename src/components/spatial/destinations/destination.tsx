"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import type { AreaId } from "@/content/areas";
import type { Route } from "@/lib/focus-store";
import { Spring, type SpringConfig } from "@/lib/spring";
import type { SpatialBus } from "../bus";
import { createMaterialKit, type MaterialKit } from "../materials";
import { softShadowTexture } from "../soft-shadow";
import { DEST_SCALE, destinations, destinationYaw, heroLayouts, STAGE } from "../world";

export interface DestinationProps {
  bus: SpatialBus;
  route: Route;
  reduced: boolean;
  wide: boolean;
}

const unfold: SpringConfig = { stiffness: 30, damping: 11, mass: 1 };
const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/**
 * An area's exhibit. Absent from the homepage composition; when its area is
 * selected it unfolds out of that area's glass tile and comes forward onto
 * the stage in front of the portrait (and folds back into it on return).
 */
export function Destination({
  id,
  route,
  reduced,
  wide,
  children,
}: DestinationProps & {
  id: AreaId;
  children: (kit: MaterialKit) => ReactNode;
}) {
  const kit = useMemo(() => createMaterialKit(), []);
  const ref = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const d = destinations[id];
  const presence = useMemo(() => new Spring(0, unfold), []);
  const shadow = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: softShadowTexture(),
        color: "#3d3352",
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [],
  );

  useEffect(() => {
    return () => {
      for (const m of [kit.glass, kit.frost, kit.porcelain, kit.graphite, kit.ink, kit.metal, kit.glow, shadow]) {
        m.dispose();
      }
    };
  }, [kit, shadow]);

  useFrame((state, dt) => {
    const g = ref.current;
    if (!g) return;
    presence.target = route.area === id ? 1 : 0;
    const moving = presence.step(dt, reduced);
    const p = presence.value;
    g.visible = p > 0.005;
    if (shadowRef.current) shadowRef.current.visible = g.visible;
    if (!g.visible) return;

    const tile = heroLayouts[wide ? "wide" : "narrow"].tiles[id];
    const from = tile.position;
    const e = smooth(0, 1, p);
    const t = state.clock.elapsedTime;
    const float = reduced ? 0 : Math.sin(t * 0.55 + id.length) * 0.02 * e;
    g.position.set(
      from[0] + (STAGE[0] - from[0]) * e,
      from[1] + (STAGE[1] - from[1]) * e + float,
      from[2] + (STAGE[2] - from[2]) * e,
    );
    g.rotation.y = tile.rotation[1] * (1 - e) + destinationYaw(id) * e;
    g.scale.setScalar(DEST_SCALE * (0.16 + 0.84 * e));
    kit.setPresence(smooth(0.15, 0.75, p));
    shadow.opacity = 0.2 * smooth(0.5, 1, p);
    if (!reduced) kit.tick(dt);
    if (moving) state.invalidate();
  });

  return (
    <>
      <group ref={ref} position={STAGE} rotation-y={destinationYaw(id)} scale={DEST_SCALE} visible={false}>
        {children(kit)}
      </group>
      {/* Soft shadow beneath the exhibit grounds it without a floor. */}
      <mesh
        ref={shadowRef}
        position={[STAGE[0], STAGE[1] + d.floor * DEST_SCALE - 0.04, STAGE[2]]}
        rotation-x={-Math.PI / 2}
        scale={[d.extent * 2.6, d.extent * 0.9, 1]}
        material={shadow}
        visible={false}
      >
        <planeGeometry />
      </mesh>
    </>
  );
}
