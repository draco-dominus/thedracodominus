"use client";

import { RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import type * as THREE from "three";
import { areaById } from "@/content/areas";
import type { MaterialKit, ScreenLayout, ScreenPalette } from "../materials";
import { Selectable } from "../selectable";
import { destinations } from "../world";
import { Destination, type DestinationProps } from "./destination";
import { Floating, Rod } from "./parts";

/**
 * PROJECTS: a gallery. Each project is a mounted artifact (thick iridescent
 * glass block, graphite chassis, interface screen) standing on a shared
 * shelf. The featured project is larger and forward: clear hierarchy.
 */
const SHELF_TOP = -0.395;

const art: { palette: ScreenPalette; layout: ScreenLayout; scale: number; rotY: number }[] = [
  { palette: ["#efe6ff", "#c4b2f6", "#ffd8c4"], layout: 0, scale: 1.18, rotY: 0 },
  { palette: ["#e7f0fb", "#b4c9f0", "#dff2ea"], layout: 1, scale: 0.92, rotY: 0.26 },
  { palette: ["#fbeee7", "#eec4d2", "#e5dafb"], layout: 2, scale: 0.92, rotY: -0.26 },
];

export function ProjectsDestination(props: DestinationProps) {
  return (
    <Destination id="projects" {...props}>
      {(kit) => <Gallery kit={kit} {...props} />}
    </Destination>
  );
}

function Gallery({ kit, ...props }: DestinationProps & { kit: MaterialKit }) {
  const placement = destinations.projects.items;
  const screens = useMemo(() => art.map((a) => kit.screen(a.palette, a.layout, 1.58)), [kit]);

  return (
    <>
      {/* Shelf: porcelain top over a graphite rail. */}
      <RoundedBox args={[2.36, 0.05, 0.44]} radius={0.02} smoothness={3} position={[0, SHELF_TOP - 0.025, 0]} material={kit.porcelain} />
      <RoundedBox args={[2.28, 0.03, 0.36]} radius={0.012} position={[0, SHELF_TOP - 0.065, -0.01]} material={kit.graphite} />

      {areaById.projects.items.map((item, i) => {
        const p = placement[item.id];
        const a = art[i % art.length];
        if (!p) return null;
        const bottom = p.position[1] - 0.25 * a.scale;
        return (
          <group key={item.id}>
            {/* Stand down to the shelf */}
            <Rod a={[p.position[0], bottom, p.position[2] - 0.01]} b={[p.position[0], SHELF_TOP, p.position[2] - 0.01]} radius={0.007} material={kit.metal} />
            <mesh position={[p.position[0], SHELF_TOP + 0.004, p.position[2] - 0.01]} material={kit.graphite}>
              <cylinderGeometry args={[0.05, 0.055, 0.008, 32]} />
            </mesh>
            <Floating position={p.position} rotationY={a.rotY} phase={i * 1.7} reduced={props.reduced} amplitude={0.006}>
              <group scale={a.scale}>
                <Selectable {...props} area="projects" item={item.id} focusedScale={1.03} side={Math.sign(p.position[0])}>
                  <Artifact kit={kit} screen={screens[i]} index={i} />
                </Selectable>
              </group>
            </Floating>
          </group>
        );
      })}
    </>
  );
}

function Artifact({ kit, screen, index }: { kit: MaterialKit; screen: THREE.ShaderMaterial; index: number }) {
  return (
    <group>
      {/* Thick glass block: catches iridescent edge light. */}
      <RoundedBox args={[0.74, 0.5, 0.06]} radius={0.03} smoothness={4} material={kit.glass} />
      {/* Graphite chassis and the interface screen, set into the front face. */}
      <RoundedBox args={[0.66, 0.43, 0.014]} radius={0.018} smoothness={3} position={[0, 0, 0.034]} material={kit.graphite} />
      <mesh position={[0, 0, 0.0415]} material={screen}>
        <planeGeometry args={[0.625, 0.395]} />
      </mesh>
      {/* Index marks: a quiet, physical way to number the works. */}
      {Array.from({ length: index + 1 }, (_, k) => (
        <mesh key={k} position={[-0.32 + k * 0.022, -0.232, 0.031]} material={kit.ink}>
          <circleGeometry args={[0.006, 16]} />
        </mesh>
      ))}
    </group>
  );
}

