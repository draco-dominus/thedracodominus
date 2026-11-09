"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import type { RibbonShape } from "./world";

/**
 * A soft iridescent band that orbits the subject. It passes in front of and
 * behind the figure (the portrait writes depth), which is the single strongest
 * cue that the composition occupies real space.
 */
const vertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalV;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormalV = normalize(normalMatrix * normal);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;
  varying vec3 vNormalV;
  varying vec3 vViewDir;

  // Pastel iridescence: lavender, ice blue, blush, white.
  vec3 iris(float x) {
    return vec3(0.86, 0.82, 0.93) + vec3(0.12, 0.13, 0.07) * cos(6.2831 * (x + vec3(0.0, 0.33, 0.67)));
  }

  void main() {
    float across = abs(vUv.y * 2.0 - 1.0);
    float body = 1.0 - smoothstep(0.55, 1.0, across);
    float facing = abs(dot(normalize(vNormalV), normalize(vViewDir)));
    float fres = pow(1.0 - facing, 2.0);

    vec3 col = iris(vUv.x * 2.0 - uTime * 0.03 + across * 0.25);
    // Bright specular streak along the band.
    float streak = smoothstep(0.22, 0.0, abs(vUv.y - 0.38));
    col = mix(col, vec3(1.0), streak * 0.7 + fres * 0.4);
    // Slightly deeper tone on the edges so it reads on a pale page.
    col = mix(col, vec3(0.66, 0.63, 0.82), smoothstep(0.5, 0.95, across) * 0.6);

    // Taper the ends of the band (they meet behind the subject).
    float ends = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
    float a = body * ends * (0.34 + 0.4 * fres + streak * 0.4) * uOpacity;
    gl_FragColor = vec4(col, a);
  }
`;

function buildRibbon({ rx, rz, center: c, tilt: t, width: w }: RibbonShape, segments = 360) {
  const tilt = new THREE.Euler(t[0], t[1], t[2]);
  const m = new THREE.Matrix4().makeRotationFromEuler(tilt);
  const planeNormal = new THREE.Vector3(0, 1, 0).applyMatrix4(m).normalize();
  const center = new THREE.Vector3(c[0], c[1], c[2]);

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const p = new THREE.Vector3();
  const pNext = new THREE.Vector3();
  const radial = new THREE.Vector3();
  const across = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const normal = new THREE.Vector3();

  const point = (t: number, out: THREE.Vector3) => {
    // Start the seam behind the subject (theta = -PI/2 -> z negative).
    const th = t * Math.PI * 2 - Math.PI / 2;
    return out.set(Math.cos(th) * rx, 0, Math.sin(th) * rz).applyMatrix4(m).add(center);
  };

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    point(t, p);
    point(t + 0.001, pNext);
    tangent.subVectors(pNext, p).normalize();
    radial.subVectors(p, center).normalize();
    // Twist the band between "flat ring" and "upright wall".
    const twist = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 1.5 + 0.6);
    across.copy(planeNormal).lerp(radial, twist * 0.75).normalize();
    // Wider at the front, narrow behind.
    const front = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
    const width = w * (0.25 + 0.75 * front);
    normal.crossVectors(tangent, across).normalize();
    for (const side of [-1, 1]) {
      positions.push(
        p.x + across.x * width * 0.5 * side,
        p.y + across.y * width * 0.5 * side,
        p.z + across.z * width * 0.5 * side,
      );
      normals.push(normal.x, normal.y, normal.z);
      uvs.push(t, side === -1 ? 0 : 1);
    }
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  return g;
}

export function Ribbon({
  reduced,
  opacity,
  shape,
}: {
  reduced: boolean;
  /** Mutable uniform, written by the parent each frame. */
  opacity: { value: number };
  shape: RibbonShape;
}) {
  const geometry = useMemo(() => buildRibbon(shape), [shape]);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uOpacity: opacity }), [opacity]);

  useFrame((_, dt) => {
    if (!reduced) uniforms.uTime.value += dt;
  });

  return (
    <mesh geometry={geometry} renderOrder={3}>
      <shaderMaterial
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
