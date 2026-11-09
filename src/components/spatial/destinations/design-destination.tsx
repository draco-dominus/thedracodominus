"use client";

import { RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import type * as THREE from "three";
import type { MaterialKit } from "../materials";
import { Selectable } from "../selectable";
import { destinations } from "../world";
import { Destination, type DestinationProps } from "./destination";
import { Floating, Rod } from "./parts";

/**
 * DESIGN: interface compositions.
 *  - Interface studies: a graphite device in exploded view; each layer of the
 *    interface (chrome, content, list, controls) floats at its own depth,
 *    tied back to the device by fine guides.
 *  - Product thinking: a user flow, three screens joined by a directed path.
 */
export function DesignDestination(props: DestinationProps) {
  return (
    <Destination id="design" {...props}>
      {(kit) => <Compositions kit={kit} {...props} />}
    </Destination>
  );
}

function Compositions({ kit, ...props }: DestinationProps & { kit: MaterialKit }) {
  const p = destinations.design.items;
  const base = useMemo(() => kit.screen(["#f7f3ff", "#e3daf8", "#fbe9df"], 3, 0.49), [kit]);
  const media = useMemo(() => kit.screen(["#efe5ff", "#bfaef4", "#ffd6c2"], 3, 2.2), [kit]);
  const flow = useMemo(
    () => [
      kit.screen(["#eef3fb", "#c4d4f2", "#e9e1fb"], 0, 1.45),
      kit.screen(["#fbf1ea", "#efcdd7", "#e7defb"], 1, 1.45),
      kit.screen(["#edf6f1", "#c3e0d4", "#e6e5fb"], 2, 1.45),
    ],
    [kit],
  );

  return (
    <>
      <Floating position={p["interface-studies"].position} rotationY={0.32} phase={0.4} reduced={props.reduced}>
        <Selectable {...props} area="design" item="interface-studies" focusedScale={1.02} side={-1}>
          <Device kit={kit} base={base} media={media} />
        </Selectable>
      </Floating>

      <Floating position={p["product-thinking"].position} rotationY={-0.18} phase={1.9} reduced={props.reduced}>
        <Selectable {...props} area="design" item="product-thinking" focusedScale={1.03} side={1}>
          <Flow kit={kit} art={flow} />
        </Selectable>
      </Floating>
    </>
  );
}

function Device({ kit, base, media }: { kit: MaterialKit; base: THREE.ShaderMaterial; media: THREE.ShaderMaterial }) {
  const L = [0.11, 0.2, 0.29, 0.38]; // layer depths
  return (
    <group>
      {/* Device body */}
      <RoundedBox args={[0.5, 0.96, 0.034]} radius={0.075} smoothness={5} material={kit.graphite} />
      <mesh position={[0, 0, 0.0175]} material={base}>
        <planeGeometry args={[0.44, 0.9]} />
      </mesh>

      {/* Layer 1: navigation chrome */}
      <RoundedBox args={[0.38, 0.055, 0.012]} radius={0.027} position={[0, 0.36, L[0]]} material={kit.ink} />
      <mesh position={[-0.13, 0.36, L[0] + 0.007]} material={kit.glow}>
        <circleGeometry args={[0.012, 20]} />
      </mesh>

      {/* Layer 2: content card with media */}
      <group position={[0, 0.12, L[1]]}>
        <RoundedBox args={[0.42, 0.29, 0.014]} radius={0.03} material={kit.porcelain} />
        <mesh position={[0, 0.035, 0.0075]} material={media}>
          <planeGeometry args={[0.37, 0.17]} />
        </mesh>
        <RoundedBox args={[0.22, 0.022, 0.004]} radius={0.009} position={[-0.075, -0.09, 0.009]} material={kit.ink} />
        <RoundedBox args={[0.14, 0.012, 0.003]} radius={0.005} position={[-0.115, -0.12, 0.009]} material={kit.metal} />
      </group>

      {/* Layer 3: list */}
      {[-0.11, -0.18, -0.25].map((y, i) => (
        <group key={y} position={[0, y, L[2]]}>
          <RoundedBox args={[0.4, 0.052, 0.01]} radius={0.024} material={kit.frost} />
          <mesh position={[-0.165, 0, 0.006]} material={i === 0 ? kit.glow : kit.ink}>
            <circleGeometry args={[0.012, 20]} />
          </mesh>
          <RoundedBox args={[0.18 - i * 0.03, 0.012, 0.003]} radius={0.005} position={[-0.04, 0, 0.006]} material={kit.ink} />
        </group>
      ))}

      {/* Layer 4: controls */}
      <group position={[0, -0.37, L[3]]}>
        <RoundedBox args={[0.22, 0.064, 0.02]} radius={0.032} position={[-0.075, 0, 0]} material={kit.ink} />
        <RoundedBox args={[0.11, 0.054, 0.018]} radius={0.027} position={[0.12, 0, 0]} material={kit.porcelain} />
        <mesh position={[0.145, 0, 0.014]} material={kit.glow}>
          <sphereGeometry args={[0.02, 20, 16]} />
        </mesh>
      </group>

      {/* Exploded-view guides from the device corners */}
      {[
        [-0.235, 0.46],
        [0.235, 0.46],
        [-0.235, -0.46],
        [0.235, -0.46],
      ].map(([x, y], i) => (
        <Rod key={i} a={[x, y, 0.02]} b={[x * 0.92, y * 0.92, L[3] + 0.02]} radius={0.0016} material={kit.metal} />
      ))}
    </group>
  );
}

const flowPoints: [number, number, number][] = [
  [-0.24, 0.22, -0.06],
  [0.03, 0.0, 0.05],
  [0.28, -0.22, 0.16],
];

function Flow({ kit, art }: { kit: MaterialKit; art: THREE.ShaderMaterial[] }) {
  return (
    <>
      {flowPoints.map((pos, i) => (
        <group key={i} position={pos}>
          <RoundedBox args={[0.26, 0.19, 0.018]} radius={0.024} material={kit.graphite} />
          <mesh position={[0, 0, 0.0095]} material={art[i]}>
            <planeGeometry args={[0.235, 0.165]} />
          </mesh>
        </group>
      ))}
      {flowPoints.slice(1).map((b, i) => {
        const a = flowPoints[i];
        return (
          <group key={i}>
            <Rod a={[a[0] + 0.13, a[1] - 0.04, a[2]]} b={[b[0] - 0.13, b[1] + 0.04, b[2]]} radius={0.003} material={kit.glow} />
            <mesh position={[b[0] - 0.13, b[1] + 0.04, b[2]]} material={kit.glow}>
              <sphereGeometry args={[0.012, 16, 12]} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}
