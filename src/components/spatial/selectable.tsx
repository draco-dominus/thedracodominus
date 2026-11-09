"use client";

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import type * as THREE from "three";
import type { AreaId } from "@/content/areas";
import { openArea, openItem, setPreview, type Route } from "@/lib/focus-store";
import { Spring, springs } from "@/lib/spring";
import type { SpatialBus } from "./bus";

/**
 * Makes a group of meshes a spatial target: hover lifts it toward the viewer
 * (with mass), click travels to it. Clicks that were really drags are ignored.
 *
 * Clicking anything in another destination travels to that destination first,
 * so selection is always progressive: overview -> area -> object.
 */
export function Selectable({
  bus,
  route,
  area,
  item,
  reduced,
  focusedScale = 1,
  side = 0,
  children,
}: {
  bus: SpatialBus;
  route: Route;
  area: AreaId;
  item?: string;
  reduced: boolean;
  /** Extra scale while this item is being inspected. */
  focusedScale?: number;
  /** Which way (-1 left, 1 right) to step aside while a sibling is inspected. */
  side?: number;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const key = item ? `${area}/${item}` : area;
  const s = useMemo(
    () => ({
      lift: new Spring(0, springs.hover),
      scale: new Spring(1, springs.ui),
      recede: new Spring(0, springs.camera),
    }),
    [],
  );

  const inArea = route.area === area;
  // What a click does from the current state.
  const actionable = item ? true : !inArea;

  useFrame((state, dt) => {
    const g = ref.current;
    if (!g) return;
    const hovered = bus.hover === key && actionable;
    const inspected = inArea && item !== undefined && route.item === item;
    // Siblings of the inspected object step back out of the way.
    const sibling = inArea && item !== undefined && route.item !== null && route.item !== item;
    s.lift.target = hovered && !inspected ? 1 : 0;
    s.scale.target = inspected ? focusedScale : 1;
    s.recede.target = sibling ? 1 : 0;
    let moving = s.lift.step(dt, reduced);
    moving = s.scale.step(dt, reduced) || moving;
    moving = s.recede.step(dt, reduced) || moving;
    const r = s.recede.value;
    g.position.z = s.lift.value * 0.06 - r * 0.6;
    g.position.x = side * r * 0.9;
    g.position.y = -r * 0.05;
    g.scale.setScalar(s.scale.value * (1 + s.lift.value * 0.03) * (1 - r * 0.12));
    if (moving) state.invalidate();
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (bus.dragging) return;
    bus.hover = key;
    setPreview(key);
    document.body.style.cursor = actionable ? "pointer" : "";
    bus.invalidate();
  };
  const out = () => {
    if (bus.hover === key) {
      bus.hover = null;
      setPreview(null);
    }
    document.body.style.cursor = "";
    bus.invalidate();
  };
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (bus.dragDistance > 6) return;
    if (item && (inArea || route.area === null)) {
      // From overview, clicking an object goes to its area first.
      if (route.area === null) openArea(area);
      else openItem(area, item);
    } else if (!inArea) {
      openArea(area);
    }
  };

  return (
    <group ref={ref} onPointerOver={over} onPointerOut={out} onClick={click}>
      {children}
    </group>
  );
}
