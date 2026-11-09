"use client";

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { portrait } from "@/content/portrait";

/**
 * TEMPORARY PORTRAIT: the real photograph (cut out from its backdrop) on a
 * finely subdivided plane, displaced by a soft pseudo-depth map. Under
 * parallax the body gains gentle relief and the ribbon can pass in front of
 * and behind it. It is a layered photo, not a 3D reconstruction or a likeness
 * model; replace it via `content/character.ts` when a production model exists.
 */
const vertex = /* glsl */ `
  uniform sampler2D uDepth;
  uniform float uRelief;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.z += texture2D(uDepth, uv).r * uRelief;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform float uRecede;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D(uMap, vUv);
    if (c.a < 0.015) discard;
    vec3 col = c.rgb;
    // Receding: quieter and closer to the paper, so focused content leads.
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, vec3(l), uRecede * 0.5);
    col = mix(col, vec3(0.93, 0.9, 0.9), uRecede * 0.35);
    gl_FragColor = vec4(col, c.a * uOpacity);
    #include <colorspace_fragment>
  }
`;

export function HeroPortrait({
  height,
  opacity,
  recede,
}: {
  height: number;
  /** Mutable presence values written by the parent each frame. */
  opacity: { value: number };
  recede: { value: number };
}) {
  const [map, depth] = useTexture([portrait.cutout, portrait.depth]);
  const material = useMemo(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    return new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: {
        uMap: { value: map },
        uDepth: { value: depth },
        uRelief: { value: 0.32 },
        uOpacity: opacity,
        uRecede: recede,
      },
      transparent: true,
    });
  }, [map, depth, opacity, recede]);

  useFrame(() => {
    material.visible = opacity.value > 0.01;
  });

  const width = height * portrait.aspect;
  return (
    <mesh material={material} renderOrder={1}>
      <planeGeometry args={[width, height, 96, 144]} />
    </mesh>
  );
}
