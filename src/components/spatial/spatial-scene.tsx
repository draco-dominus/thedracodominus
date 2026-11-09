"use client";

import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import type { Route } from "@/lib/focus-store";
import type { SpatialBus } from "./bus";
import { CameraDirector } from "./camera-director";
import { Character, hasCharacter } from "./character/character";
import { AboutDestination } from "./destinations/about-destination";
import { DesignDestination } from "./destinations/design-destination";
import { EngineeringDestination } from "./destinations/engineering-destination";
import { ProjectsDestination } from "./destinations/projects-destination";
import { LabelProjector } from "./label-projector";
import { Ribbon } from "./ribbon";
import { Selectable } from "./selectable";
import { FOV } from "./world";

export interface SpatialSceneProps {
  bus: SpatialBus;
  route: Route;
  wide: boolean;
  reduced: boolean;
  /** When false (offscreen / hidden) the loop only renders on demand. */
  visible: boolean;
  onReady: () => void;
  onContextLost: () => void;
}

/**
 * The world. Lazy-loaded (next/dynamic, ssr: false) so three.js never blocks
 * first paint of the HTML layer.
 */
export default function SpatialScene(props: SpatialSceneProps) {
  const { bus, route, wide, reduced, visible, onReady, onContextLost } = props;
  const lost = useRef(onContextLost);
  useEffect(() => {
    lost.current = onContextLost;
  }, [onContextLost]);

  const destinationProps = { bus, route, reduced };

  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={reduced || !visible ? "demand" : "always"}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: FOV, near: 0.05, far: 60, position: [0, 1, 7] }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          lost.current();
        });
      }}
      onPointerMissed={() => {
        bus.hover = null;
      }}
      aria-hidden
      style={{ position: "absolute", inset: 0 }}
    >
      <CameraDirector bus={bus} route={route} wide={wide} reduced={reduced} />
      <LabelProjector bus={bus} />

      {/* Gallery lighting: soft overhead key, cool rim from behind, warm fill. */}
      <hemisphereLight args={["#ffffff", "#e4dbd2", 0.75]} />
      <directionalLight position={[-3, 5.5, 4]} intensity={1.9} color="#fff8f0" />
      <directionalLight position={[3, 2.5, -4]} intensity={1.1} color="#d4c8ff" />
      <directionalLight position={[4, 1.5, 3]} intensity={0.4} color="#ffdccb" />

      <Suspense fallback={null}>
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={2.4} position={[0, 5, 3]} scale={[10, 4, 1]} />
          <Lightformer form="rect" intensity={1.6} color="#d8ccff" position={[-6, 1.5, 1]} rotation-y={Math.PI / 2} scale={[8, 5, 1]} />
          <Lightformer form="rect" intensity={1.2} color="#ffe1d2" position={[6, 0.5, 1]} rotation-y={-Math.PI / 2} scale={[8, 5, 1]} />
          <Lightformer form="ring" intensity={1.4} position={[0, 3, -6]} scale={4} />
          {/* Thin strip lights give glass and clearcoat crisp edge highlights. */}
          <Lightformer form="rect" intensity={3} position={[-2, 4, 5]} scale={[0.4, 6, 1]} rotation-z={0.4} />
          <Lightformer form="rect" intensity={2} position={[3, 3, 5]} scale={[0.3, 5, 1]} rotation-z={-0.3} />
        </Environment>

        {/* Character slot: renders only when a production model is configured. */}
        {hasCharacter() && (
          <Selectable bus={bus} route={route} area="about" reduced={reduced}>
            <Character reduced={reduced} />
          </Selectable>
        )}
        <StageFloor />
        {/* A luminous path that threads through all four destinations. */}
        <Ribbon reduced={reduced} opacity={route.area ? 0.35 : 0.9} shape={pathShape} />

        <ProjectsDestination {...destinationProps} />
        <DesignDestination {...destinationProps} />
        <EngineeringDestination {...destinationProps} />
        <AboutDestination {...destinationProps} />

        <ContactShadows
          position={[0, 0.002, 0]}
          scale={8}
          resolution={1024}
          blur={2.2}
          opacity={0.5}
          far={2}
          color="#2e2640"
          frames={1}
        />
        <ReadySignal onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}

const pathShape = {
  rx: 2.25,
  rz: 2.25,
  center: [0, 0.32, 0] as [number, number, number],
  tilt: [0.06, 0, 0.04] as [number, number, number],
  width: 0.07,
};

/**
 * One stage holds the whole installation: a lighter porcelain floor in a
 * slightly darker room, so objects separate from the background. A quiet
 * inlay at the centre marks the character slot.
 */
function StageFloor() {
  return (
    <group>
      <mesh position={[0, -0.03, 0]} receiveShadow>
        <cylinderGeometry args={[3.55, 3.6, 0.06, 160]} />
        <meshPhysicalMaterial color="#faf8f5" roughness={0.28} clearcoat={0.9} clearcoatRoughness={0.12} />
      </mesh>
      <mesh position={[0, 0.0015, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[3.42, 3.43, 192]} />
        <meshBasicMaterial color="#d7ccf6" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.0015, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.52, 0.528, 128]} />
        <meshBasicMaterial color="#cdbff7" toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Fires once suspended assets are in and a couple of frames have drawn. */
function ReadySignal({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  const done = useRef(false);
  useFrame((state) => {
    if (done.current) return;
    frames.current += 1;
    if (frames.current >= 3) {
      done.current = true;
      onReady();
    } else {
      state.invalidate();
    }
  });
  return null;
}
