"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { areaById } from "@/content/areas";
import type { MaterialKit } from "../materials";
import { Selectable } from "../selectable";
import { destinations } from "../world";
import { Destination, type DestinationProps } from "./destination";
import { Floating } from "./parts";

/**
 * ENGINEERING: a layered system. Glass layers framed in graphite (so each
 * reads crisply against the room) carry modules; light travels along paths
 * between layers. Each layer is inspectable. A graphite base anchors it.
 */
const PLATE: [number, number, number] = [0.98, 0.026, 0.72];

const layouts: [number, number][][] = [
  [
    [-0.3, -0.18],
    [0.02, -0.18],
    [0.32, 0.15],
  ],
  [
    [-0.3, 0.15],
    [0.0, 0.0],
    [0.3, -0.16],
    [0.3, 0.16],
  ],
  [
    [-0.32, -0.12],
    [-0.05, 0.16],
    [0.25, 0.0],
  ],
];

export function EngineeringDestination(props: DestinationProps) {
  return (
    <Destination id="engineering" {...props}>
      {(kit) => <SystemStack kit={kit} {...props} />}
    </Destination>
  );
}

function SystemStack({ kit, ...props }: DestinationProps & { kit: MaterialKit }) {
  const placement = destinations.engineering.items;
  const items = areaById.engineering.items;

  const paths = useMemo(() => {
    const segs: [THREE.Vector3, THREE.Vector3][] = [];
    for (let i = 0; i < items.length - 1; i++) {
      const a = placement[items[i].id].position;
      const b = placement[items[i + 1].id].position;
      for (const [x, z] of layouts[i]) {
        let best: [number, number] = layouts[i + 1][0];
        let bd = Infinity;
        for (const m of layouts[i + 1]) {
          const dd = (m[0] + b[0] - x - a[0]) ** 2 + (m[1] + b[2] - z - a[2]) ** 2;
          if (dd < bd) {
            bd = dd;
            best = m;
          }
        }
        segs.push([
          new THREE.Vector3(a[0] + x, a[1] - 0.015, a[2] + z),
          new THREE.Vector3(b[0] + best[0], b[1] + 0.06, b[2] + best[1]),
        ]);
      }
    }
    return segs;
  }, [items, placement]);

  return (
    <>
      {items.map((item, i) => {
        const p = placement[item.id];
        return (
          <Floating key={item.id} position={p.position} phase={i * 1.3} reduced={props.reduced} amplitude={0.006}>
            <Selectable {...props} area="engineering" item={item.id} focusedScale={1.02}>
              {/* Graphite frame under the glass layer gives a crisp edge line. */}
              <RoundedBox args={[PLATE[0] + 0.03, 0.014, PLATE[2] + 0.03]} radius={0.007} position={[0, -0.018, 0]} material={kit.graphite} />
              <RoundedBox args={PLATE} radius={0.012} smoothness={3} material={kit.glass} />
              {layouts[i].map(([x, z], k) => (
                <group key={k} position={[x, 0.034, z]}>
                  <RoundedBox args={[0.16, 0.036, 0.12]} radius={0.012} smoothness={3} material={kit.graphite} />
                  <RoundedBox args={[0.12, 0.012, 0.08]} radius={0.005} position={[0, 0.022, 0]} material={k % 2 ? kit.porcelain : kit.frost} />
                  <mesh position={[0.055, 0.03, 0.035]} material={kit.glow}>
                    <sphereGeometry args={[0.011, 16, 12]} />
                  </mesh>
                </group>
              ))}
              {/* Layer index tab on the front edge */}
              <RoundedBox args={[0.1, 0.02, 0.012]} radius={0.006} position={[-0.42, 0, PLATE[2] / 2 + 0.01]} material={kit.ink} />
            </Selectable>
          </Floating>
        );
      })}
      {paths.map(([a, b], i) => (
        <Path key={i} a={a} b={b} kit={kit} phase={i} reduced={props.reduced} />
      ))}
      {/* Base */}
      <RoundedBox args={[1.12, 0.07, 0.84]} radius={0.025} smoothness={3} position={[0, -0.47, 0]} material={kit.graphite} />
      <RoundedBox args={[1.0, 0.006, 0.006]} radius={0.002} position={[0, -0.47, 0.424]} material={kit.glow} />
    </>
  );
}

function Path({
  a,
  b,
  kit,
  phase,
  reduced,
}: {
  a: THREE.Vector3;
  b: THREE.Vector3;
  kit: MaterialKit;
  phase: number;
  reduced: boolean;
}) {
  const { mid, quat, len } = useMemo(() => {
    const dir = b.clone().sub(a);
    return {
      mid: a.clone().add(b).multiplyScalar(0.5),
      quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()),
      len: dir.length(),
    };
  }, [a, b]);
  const pulse = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!pulse.current || reduced) return;
    const t = (state.clock.elapsedTime * 0.35 + phase * 0.27) % 1;
    pulse.current.position.lerpVectors(a, b, t);
  });
  return (
    <>
      <mesh position={mid} quaternion={quat} material={kit.metal}>
        <cylinderGeometry args={[0.0026, 0.0026, len, 6]} />
      </mesh>
      <mesh ref={pulse} position={mid} material={kit.glow}>
        <sphereGeometry args={[0.009, 10, 8]} />
      </mesh>
    </>
  );
}
