"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";

type V3 = [number, number, number];

/** Gentle independent drift so objects read as physically suspended. */
export function Floating({
  position,
  rotationY = 0,
  phase,
  reduced,
  amplitude = 0.014,
  children,
}: {
  position: V3;
  rotationY?: number;
  phase: number;
  reduced: boolean;
  amplitude?: number;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    const g = ref.current;
    if (!g || reduced) return;
    const t = state.clock.elapsedTime;
    g.position.y = position[1] + Math.sin(t * 0.8 + phase) * amplitude;
    g.rotation.z = Math.sin(t * 0.5 + phase) * 0.008;
  });
  return (
    <group ref={ref} position={position} rotation-y={rotationY}>
      {children}
    </group>
  );
}

/** A thin cylinder between two points (stands, connectors, guides). */
export function Rod({
  a,
  b,
  radius = 0.004,
  material,
}: {
  a: V3;
  b: V3;
  radius?: number;
  material: THREE.Material;
}) {
  const [ax, ay, az] = a;
  const [bx, by, bz] = b;
  const { mid, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(ax, ay, az);
    const vb = new THREE.Vector3(bx, by, bz);
    const dir = vb.clone().sub(va);
    return {
      mid: va.clone().add(vb).multiplyScalar(0.5),
      quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()),
      len: dir.length(),
    };
  }, [ax, ay, az, bx, by, bz]);
  return (
    <mesh position={mid} quaternion={quat} material={material}>
      <cylinderGeometry args={[radius, radius, len, 10]} />
    </mesh>
  );
}
