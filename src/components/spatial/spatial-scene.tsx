"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Route } from "@/lib/focus-store";
import { Spring, type SpringConfig } from "@/lib/spring";
import type { SpatialBus } from "./bus";
import { CameraDirector } from "./camera-director";
import { Character } from "./character/character";
import { AboutDestination } from "./destinations/about-destination";
import { DesignDestination } from "./destinations/design-destination";
import { EngineeringDestination } from "./destinations/engineering-destination";
import { ProjectsDestination } from "./destinations/projects-destination";
import { HeroPortrait } from "./hero-portrait";
import { HeroTiles } from "./hero-tiles";
import { LabelProjector } from "./label-projector";
import { Ribbon } from "./ribbon";
import { FOV, heroLayouts, type HeroLayout } from "./world";

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
 *
 * Homepage: portrait, glass tiles and ribbon in the approved composition.
 * Selecting a tile brings that area's exhibit forward; the portrait recedes.
 */
export default function SpatialScene(props: SpatialSceneProps) {
  const { bus, route, wide, reduced, visible, onReady, onContextLost } = props;
  const lost = useRef(onContextLost);
  useEffect(() => {
    lost.current = onContextLost;
  }, [onContextLost]);

  const layout = heroLayouts[wide ? "wide" : "narrow"];
  const destinationProps = { bus, route, reduced, wide };

  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={reduced || !visible ? "demand" : "always"}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: FOV, near: 0.05, far: 60, position: [0, 0, 7] }}
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

      {/* Soft studio light, matching the warm, evenly lit backdrop. */}
      <hemisphereLight args={["#ffffff", "#efe6e4", 0.9]} />
      <directionalLight position={[-3, 5, 5]} intensity={1.6} color="#fff8f2" />
      <directionalLight position={[4, 2.5, -3]} intensity={0.9} color="#d9cdff" />
      <directionalLight position={[4, 0.5, 4]} intensity={0.35} color="#ffdcd0" />

      <Suspense fallback={null}>
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={2.2} position={[0, 5, 3]} scale={[10, 4, 1]} />
          <Lightformer form="rect" intensity={1.6} color="#d8ccff" position={[-6, 1.5, 1]} rotation-y={Math.PI / 2} scale={[8, 5, 1]} />
          <Lightformer form="rect" intensity={1.3} color="#ffd9cc" position={[6, 0.5, 1]} rotation-y={-Math.PI / 2} scale={[8, 5, 1]} />
          <Lightformer form="ring" intensity={1.2} position={[0, 3, -6]} scale={4} />
          {/* Thin strip lights give the glass crisp edge highlights. */}
          <Lightformer form="rect" intensity={3} position={[-2, 4, 5]} scale={[0.4, 6, 1]} rotation-z={0.4} />
          <Lightformer form="rect" intensity={2} position={[3, 3, 5]} scale={[0.3, 5, 1]} rotation-z={-0.3} />
        </Environment>

        <HeroComposition layout={layout} route={route} reduced={reduced} />
        <HeroTiles bus={bus} route={route} reduced={reduced} tiles={layout.tiles} />

        <ProjectsDestination {...destinationProps} />
        <DesignDestination {...destinationProps} />
        <EngineeringDestination {...destinationProps} />
        <AboutDestination {...destinationProps} />

        <ReadySignal onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}

const recedeSpring: SpringConfig = { stiffness: 26, damping: 10.4, mass: 1 };

/**
 * Portrait (or, once provided, the production model) with the ribbon around
 * it. When an area is selected the pair recedes: back, slightly aside, quieter.
 */
function HeroComposition({ layout, route, reduced }: { layout: HeroLayout; route: Route; reduced: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const u = useMemo(
    () => ({
      opacity: { value: 1 },
      recede: { value: 0 },
      ribbon: { value: 1 },
      spring: new Spring(0, recedeSpring),
    }),
    [],
  );

  useFrame((state, dt) => {
    const g = ref.current;
    if (!g) return;
    u.spring.target = route.area ? 1 : 0;
    const moving = u.spring.step(dt, reduced);
    const r = u.spring.value;
    g.position.set(r * 1.3, -r * 0.2, -r * 3.2);
    u.opacity.value = 1 - r * 0.93;
    u.recede.value = r;
    u.ribbon.value = 1 - r * 0.85;
    if (moving) state.invalidate();
  });

  const p = layout.portrait;
  return (
    <group ref={ref}>
      <group position={p.position}>
        <Character
          height={p.height}
          fallback={<HeroPortrait height={p.height} opacity={u.opacity} recede={u.recede} />}
        />
      </group>
      <Ribbon reduced={reduced} opacity={u.ribbon} shape={layout.ribbon} />
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
