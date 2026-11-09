"use client";

import { useGLTF } from "@react-three/drei";
import { Suspense, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { character } from "@/content/character";
import { Boundary } from "../boundary";

/**
 * The figure slot of the homepage composition. Loads the production GLB when
 * `content/character.ts` names one; otherwise (or if loading fails) renders
 * `fallback`, the temporary photographic portrait.
 */
export const hasCharacter = () => !!character.model;

export function Character({ fallback, height }: { fallback: ReactNode; height: number }) {
  if (!character.model) return <>{fallback}</>;
  return (
    <Boundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <ModelCharacter url={character.model} height={height} />
      </Suspense>
    </Boundary>
  );
}

/** Fits the model to the portrait's frame: same height, centred on the slot. */
function ModelCharacter({ url, height }: { url: string; height: number }) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => {
    const root = scene.clone(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const scale = (height * 0.92) / Math.max(size.y, 1e-6);
    root.scale.setScalar(scale);
    const center = box.getCenter(new THREE.Vector3());
    root.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    return root;
  }, [scene, height]);
  return <primitive object={model} />;
}
