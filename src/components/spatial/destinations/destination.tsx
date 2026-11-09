"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import type * as THREE from "three";
import type { AreaId } from "@/content/areas";
import type { Route } from "@/lib/focus-store";
import { Spring, springs } from "@/lib/spring";
import type { SpatialBus } from "../bus";
import { createMaterialKit, type MaterialKit } from "../materials";
import { DEST_SCALE, destinationCenter, destinations, destinationYaw } from "../world";

export interface DestinationProps {
  bus: SpatialBus;
  route: Route;
  reduced: boolean;
}

/**
 * Places a destination on the ring around the character, facing outward, and
 * manages its presence: when another destination has focus, this one fades
 * and sinks back so the focused content owns the view.
 */
/** A plinth from the floor up to `top` (local units), under the exhibit. */
export interface Pedestal {
  width: number;
  depth: number;
  top: number;
  z?: number;
}

export function Destination({
  id,
  route,
  reduced,
  pedestal,
  children,
}: DestinationProps & {
  id: AreaId;
  /** Exhibits on a pedestal stand still; the others hover. */
  pedestal?: Pedestal;
  children: (kit: MaterialKit) => ReactNode;
}) {
  const kit = useMemo(() => createMaterialKit(), []);
  const ref = useRef<THREE.Group>(null);
  const d = destinations[id];
  const center = useMemo(() => destinationCenter(id), [id]);
  const presence = useMemo(() => new Spring(1, springs.camera), []);
  const phase = d.angle * 3;

  useEffect(() => {
    return () => {
      for (const m of [kit.glass, kit.frost, kit.porcelain, kit.graphite, kit.ink, kit.metal, kit.glow]) {
        m.dispose();
      }
    };
  }, [kit]);

  useFrame((state, dt) => {
    const g = ref.current;
    if (!g) return;
    const active = route.area === null || route.area === id;
    // Out-of-focus destinations keep only a faint trace for orientation.
    presence.target = active ? 1 : 0.07;
    const moving = presence.step(dt, reduced);
    kit.setPresence(presence.value);
    g.visible = presence.value > 0.02;
    const t = state.clock.elapsedTime;
    const float = reduced || pedestal ? 0 : Math.sin(t * 0.55 + phase) * 0.025;
    // Recede slightly outward when out of focus (pedestals stay grounded).
    const away = 1 - presence.value;
    g.position.set(
      center[0] * (1 + away * 0.1),
      center[1] + float - (pedestal ? 0 : away * 0.15),
      center[2] * (1 + away * 0.1),
    );
    if (!reduced) kit.tick(dt);
    if (moving) state.invalidate();
  });

  return (
    <>
      <group ref={ref} position={center} rotation-y={destinationYaw(id)} scale={DEST_SCALE}>
        {children(kit)}
        {pedestal && <PedestalBlock p={pedestal} floorY={-center[1] / DEST_SCALE} kit={kit} />}
      </group>
      {/* Floor marker: grounds the floating exhibit and maps it on the stage. */}
      <group position={[center[0], 0.003, center[2]]} rotation-x={-Math.PI / 2}>
        <mesh material={kit.porcelain}>
          <circleGeometry args={[0.6, 96]} />
        </mesh>
        <mesh position={[0, 0, 0.001]} material={kit.glow}>
          <ringGeometry args={[0.597, 0.603, 128]} />
        </mesh>
      </group>
    </>
  );
}

function PedestalBlock({ p, floorY, kit }: { p: Pedestal; floorY: number; kit: MaterialKit }) {
  const h = p.top - floorY;
  return (
    <group position={[0, floorY + h / 2, p.z ?? 0]}>
      <RoundedBox args={[p.width, h, p.depth]} radius={0.03} smoothness={3} material={kit.porcelain} />
      {/* Shadow gap at the foot: a fine graphite reveal */}
      <RoundedBox args={[p.width - 0.04, 0.03, p.depth - 0.04]} radius={0.01} position={[0, -h / 2 + 0.015, 0]} material={kit.graphite} />
    </group>
  );
}
