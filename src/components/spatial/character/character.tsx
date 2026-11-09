"use client";

import { useGLTF } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { character } from "@/content/character";
import { Boundary } from "../boundary";
import { ProceduralCharacter } from "./procedural-character";

/**
 * The character slot. Loads the production GLB when `content/character.ts`
 * names one. Without a model it renders nothing (or, in development only, the
 * procedural stand-in). A failed model load falls back the same way.
 */
export const hasCharacter = () => !!character.model || character.placeholder === "procedural";

export function Character({ reduced }: { reduced: boolean }) {
  const fallback = character.placeholder === "procedural" ? <ProceduralCharacter reduced={reduced} /> : null;
  if (!character.model) return fallback;
  return (
    <Boundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <ModelCharacter url={character.model} height={character.height} />
      </Suspense>
    </Boundary>
  );
}

function ModelCharacter({ url, height }: { url: string; height: number }) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => {
    const root = scene.clone(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const scale = height / Math.max(size.y, 1e-6);
    root.scale.setScalar(scale);
    // Ground it and centre it on the origin.
    const center = box.getCenter(new THREE.Vector3());
    root.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    return root;
  }, [scene, height]);
  return <primitive object={model} />;
}
