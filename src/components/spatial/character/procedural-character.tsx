"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * TEMPORARY procedural character.
 *
 * A stylised, figurine-like seated figure built from sculpted primitives:
 * lathe-turned torso, tapered limbs, and an instanced mass of curls. Loosely
 * informed by the reference photo (curly dark hair, dark quarter-zip, seated
 * on a stool, gaze to the side). It is NOT a likeness and should be replaced
 * by a production GLB (see `content/character.ts`).
 *
 * Units: metres. Faces +Z. Floor at y = 0.
 */

type V3 = [number, number, number];

function taperedCapsule(r1: number, r2: number, len: number, seg = 10, radial = 28) {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= seg; i++) {
    const a = -Math.PI / 2 + (i / seg) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.max(0, Math.cos(a) * r1), Math.sin(a) * r1));
  }
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.max(0, Math.cos(a) * r2), len + Math.sin(a) * r2));
  }
  const g = new THREE.LatheGeometry(pts, radial);
  g.translate(0, -len / 2, 0);
  return g;
}

function Limb({ a, b, r1, r2, material }: { a: V3; b: V3; r1: number; r2: number; material: THREE.Material }) {
  const { geometry, position, quaternion } = useMemo(() => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    return {
      geometry: taperedCapsule(r1, r2, dir.length()),
      position: va.clone().add(vb).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()),
    };
  }, [a, b, r1, r2]);
  return <mesh geometry={geometry} position={position} quaternion={quaternion} material={material} />;
}

function Blob({
  position,
  scale,
  rotation = [0, 0, 0],
  material,
}: {
  position: V3;
  scale: V3;
  rotation?: V3;
  material: THREE.Material;
}) {
  return (
    <mesh position={position} scale={scale} rotation={rotation} material={material}>
      <sphereGeometry args={[1, 40, 28]} />
    </mesh>
  );
}

/** Deterministic PRNG so the hair is identical on every load. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/**
 * One continuous sculpted head surface (no intersecting primitives, so no
 * shading creases): a sphere tapered toward the jaw, fuller at the back.
 */
function headGeometry() {
  const g = new THREE.SphereGeometry(1, 72, 54);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const low = smooth(0.1, -0.95, v.y); // 0 above the cheekbones, 1 at the chin
    const sx = 0.088 * (1 - 0.34 * low * low);
    const sy = 0.116;
    const sz = v.z < 0 ? 0.104 + 0.006 * Math.max(0, v.y) : 0.1 * (1 - 0.12 * low);
    const forward = v.z > 0 ? 0.009 * low * v.z : 0;
    p.setXYZ(i, v.x * sx, v.y * sy, v.z * sz + forward);
  }
  g.computeVertexNormals();
  return g;
}

function useMaterials() {
  return useMemo(
    () => ({
      skin: new THREE.MeshPhysicalMaterial({
        color: "#c99d82",
        roughness: 0.58,
        sheen: 0.5,
        sheenColor: new THREE.Color("#f3cdb6"),
        sheenRoughness: 0.45,
        clearcoat: 0.06,
      }),
      lips: new THREE.MeshStandardMaterial({ color: "#a9786a", roughness: 0.6 }),
      knit: new THREE.MeshPhysicalMaterial({
        color: "#24252b",
        roughness: 0.92,
        sheen: 1,
        sheenColor: new THREE.Color("#5c5c6e"),
        sheenRoughness: 0.6,
      }),
      trousers: new THREE.MeshPhysicalMaterial({
        color: "#1b1c20",
        roughness: 0.82,
        sheen: 0.7,
        sheenColor: new THREE.Color("#46464f"),
      }),
      hair: new THREE.MeshPhysicalMaterial({
        color: "#1b1613",
        roughness: 0.48,
        sheen: 1,
        sheenColor: new THREE.Color("#6e5d53"),
        sheenRoughness: 0.35,
      }),
      eye: new THREE.MeshPhysicalMaterial({ color: "#191513", roughness: 0.2, clearcoat: 1 }),
      shoe: new THREE.MeshPhysicalMaterial({ color: "#1a1a1d", roughness: 0.45, clearcoat: 0.5 }),
      sole: new THREE.MeshStandardMaterial({ color: "#eeebe6", roughness: 0.7 }),
      zip: new THREE.MeshStandardMaterial({ color: "#bdbbc4", metalness: 1, roughness: 0.3 }),
      watch: new THREE.MeshPhysicalMaterial({ color: "#151517", roughness: 0.25, clearcoat: 1 }),
      seat: new THREE.MeshPhysicalMaterial({ color: "#2b2a30", roughness: 0.42, clearcoat: 0.6 }),
      chrome: new THREE.MeshStandardMaterial({ color: "#d9d7df", metalness: 1, roughness: 0.16 }),
    }),
    [],
  );
}

export function ProceduralCharacter({ reduced }: { reduced: boolean }) {
  const m = useMaterials();
  const upper = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);

  const torso = useMemo(() => {
    const profile: [number, number][] = [
      [0.001, 0],
      [0.152, 0.0],
      [0.16, 0.06],
      [0.166, 0.16],
      [0.18, 0.28],
      [0.198, 0.38],
      [0.205, 0.43],
      [0.188, 0.48],
      [0.14, 0.515],
      [0.075, 0.532],
      [0.001, 0.536],
    ];
    return new THREE.LatheGeometry(
      profile.map(([r, y]) => new THREE.Vector2(r, y)),
      48,
    );
  }, []);

  // Subtle life: breathing and a slow drift of the head. Off for reduced motion.
  useFrame((state) => {
    if (reduced) return;
    const t = state.clock.elapsedTime;
    if (upper.current) upper.current.position.y = Math.sin(t * 1.15) * 0.0025;
    if (head.current) {
      head.current.rotation.y = -0.55 + Math.sin(t * 0.23) * 0.06;
      head.current.rotation.x = 0.1 + Math.sin(t * 0.31 + 1) * 0.015;
    }
  });

  return (
    <group>
      <Stool m={m} />

      {/* Lower body */}
      <Blob position={[0, 0.75, 0.0]} scale={[0.178, 0.098, 0.155]} material={m.trousers} />
      {([1, -1] as const).map((s) => (
        <group key={s}>
          <Limb a={[0.1 * s, 0.745, 0.04]} b={[0.125 * s, 0.77, 0.47]} r1={0.088} r2={0.066} material={m.trousers} />
          <Blob position={[0.125 * s, 0.77, 0.47]} scale={[0.067, 0.067, 0.067]} material={m.trousers} />
          <Limb a={[0.125 * s, 0.77, 0.47]} b={[0.13 * s, 0.35, 0.26]} r1={0.062} r2={0.047} material={m.trousers} />
          <group position={[0.13 * s, 0.305, 0.31]} rotation-y={0.12 * s}>
            <mesh rotation-x={Math.PI / 2} scale={[1, 1, 0.72]} material={m.shoe}>
              <capsuleGeometry args={[0.046, 0.15, 6, 18]} />
            </mesh>
            <mesh position={[0, -0.03, 0.004]} rotation-x={Math.PI / 2} scale={[1.04, 1.02, 0.18]} material={m.sole}>
              <capsuleGeometry args={[0.046, 0.15, 6, 18]} />
            </mesh>
          </group>
        </group>
      ))}

      <group ref={upper}>
        {/* Upper body, leaning slightly forward like the reference pose */}
        <group position={[0, 0.8, 0]} rotation-x={0.14}>
          <mesh geometry={torso} scale={[1, 1, 0.66]} material={m.knit} />
          {/* Ribbed hem */}
          <group scale={[1, 1, 0.66]} position={[0, 0.02, 0]}>
            <mesh rotation-x={Math.PI / 2} material={m.knit}>
              <torusGeometry args={[0.153, 0.013, 10, 48]} />
            </mesh>
          </group>
          {/* Shoulders */}
          {([1, -1] as const).map((s) => (
            <Blob key={s} position={[0.185 * s, 0.445, 0]} scale={[0.078, 0.07, 0.075]} material={m.knit} />
          ))}
          {/* Quarter-zip collar */}
          <mesh position={[0, 0.555, 0.008]} material={m.knit}>
            <cylinderGeometry args={[0.064, 0.078, 0.065, 36, 1, true]} />
          </mesh>
          <mesh position={[0, 0.588, 0.008]} rotation-x={Math.PI / 2} material={m.knit}>
            <torusGeometry args={[0.064, 0.009, 8, 36]} />
          </mesh>
          <mesh position={[0, 0.45, 0.13]} rotation-x={-0.12} material={m.zip}>
            <boxGeometry args={[0.006, 0.17, 0.005]} />
          </mesh>
          <mesh position={[0.008, 0.52, 0.12]} rotation-x={-0.12} material={m.zip}>
            <boxGeometry args={[0.012, 0.024, 0.006]} />
          </mesh>
          {/* Neck */}
          <Limb a={[0, 0.53, 0.0]} b={[0, 0.63, 0.018]} r1={0.05} r2={0.047} material={m.skin} />
          <group ref={head} position={[0, 0.715, 0.03]} rotation={[0.1, -0.55, 0.03]}>
            <Head m={m} />
          </group>
        </group>

        {/* Arms (in body space): elbows out, hands clasped between the knees */}
        {([1, -1] as const).map((s) => (
          <group key={s}>
            <Limb a={[0.19 * s, 1.245, 0.06]} b={[0.25 * s, 0.99, 0.2]} r1={0.07} r2={0.058} material={m.knit} />
            <Blob position={[0.25 * s, 0.99, 0.2]} scale={[0.059, 0.059, 0.059]} material={m.knit} />
            <Limb a={[0.25 * s, 0.99, 0.2]} b={[0.078 * s, 0.875, 0.39]} r1={0.058} r2={0.047} material={m.knit} />
            <Limb a={[0.09 * s, 0.882, 0.375]} b={[0.06 * s, 0.868, 0.41]} r1={0.034} r2={0.032} material={m.skin} />
          </group>
        ))}
        {/* Clasped hands */}
        <Blob position={[0.034, 0.858, 0.435]} scale={[0.042, 0.038, 0.062]} rotation={[0.1, -0.55, 0.2]} material={m.skin} />
        <Blob position={[-0.034, 0.862, 0.435]} scale={[0.042, 0.038, 0.062]} rotation={[0.1, 0.55, -0.2]} material={m.skin} />
        <Blob position={[0, 0.875, 0.46]} scale={[0.03, 0.022, 0.03]} material={m.skin} />
        {/* Watch on the left wrist */}
        <group position={[0.083, 0.89, 0.38]} rotation={[0.4, 0.9, 0.2]}>
          <mesh material={m.watch}>
            <torusGeometry args={[0.036, 0.007, 8, 28]} />
          </mesh>
          <mesh position={[0, 0.036, 0]} material={m.watch}>
            <boxGeometry args={[0.03, 0.01, 0.036]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function Head({ m }: { m: ReturnType<typeof useMaterials> }) {
  const head = useMemo(() => headGeometry(), []);
  return (
    <group>
      <mesh geometry={head} position={[0, -0.006, 0]} material={m.skin} />
      {/* Nose */}
      <Blob position={[0, -0.02, 0.095]} scale={[0.014, 0.028, 0.018]} rotation={[-0.25, 0, 0]} material={m.skin} />
      {/* Ears */}
      {([1, -1] as const).map((s) => (
        <Blob key={s} position={[0.086 * s, -0.012, -0.006]} scale={[0.014, 0.03, 0.021]} material={m.skin} />
      ))}
      {/* Eyes and brows: quiet, stylised */}
      {([1, -1] as const).map((s) => (
        <group key={s}>
          <Blob position={[0.032 * s, 0.006, 0.091]} scale={[0.009, 0.0045, 0.0035]} rotation={[0, 0.3 * s, 0]} material={m.eye} />
        </group>
      ))}
      <Blob position={[0, -0.064, 0.08]} scale={[0.019, 0.005, 0.006]} material={m.lips} />
      <Hair material={m.hair} />
    </group>
  );
}

/** Thick curly hair: a base cap plus several hundred instanced curls. */
function Hair({ material }: { material: THREE.Material }) {
  const curls = useRef<THREE.InstancedMesh>(null);
  const beads = useRef<THREE.InstancedMesh>(null);
  const CURLS = 560;
  const BEADS = 260;

  const torus = useMemo(() => new THREE.TorusGeometry(1, 0.42, 6, 14), []);
  const sphere = useMemo(() => new THREE.SphereGeometry(1, 10, 8), []);

  useLayoutEffect(() => {
    const rand = mulberry32(7);
    const dummy = new THREE.Object3D();
    const center = new THREE.Vector3(0, 0.022, -0.012);
    const d = new THREE.Vector3();

    const place = (mesh: THREE.InstancedMesh, count: number, kind: "curl" | "bead") => {
      let i = 0;
      let guard = 0;
      while (i < count && guard++ < count * 40) {
        // Uniform direction on the sphere
        const u = rand() * 2 - 1;
        const th = rand() * Math.PI * 2;
        const r = Math.sqrt(1 - u * u);
        d.set(r * Math.cos(th), u, r * Math.sin(th));
        // Hairline: high at the forehead, low at the nape, clear of the ears.
        const hairline = -0.5 + 1.08 * smooth(-0.4, 0.65, d.z);
        if (d.y < hairline) continue;
        if (Math.abs(d.x) > 0.7 && d.y < 0.26 && d.z > -0.35) continue;
        const volume = 0.014 + 0.036 * smooth(-0.1, 1, d.y) + 0.014 * Math.max(0, d.z) * smooth(0, 1, d.y);
        const R = 0.104 + volume + (rand() - 0.5) * 0.012;
        dummy.position.set(d.x * R * 0.98, d.y * R, d.z * R * 1.04).add(center);
        // A few curls fall onto the forehead.
        if (kind === "curl" && d.z > 0.5 && d.y > 0.55 && d.y < 0.72 && rand() < 0.3) {
          dummy.position.y -= 0.014;
          dummy.position.z += 0.01;
        }
        dummy.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
        const s = kind === "curl" ? 0.015 + rand() * 0.011 : 0.014 + rand() * 0.009;
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i++, dummy.matrix);
      }
      mesh.count = i;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    };
    if (curls.current) place(curls.current, CURLS, "curl");
    if (beads.current) place(beads.current, BEADS, "bead");
  }, []);

  return (
    <group>
      <mesh position={[0, 0.022, -0.012]} rotation-x={-0.55} scale={[0.97, 1, 1.03]} material={material}>
        <sphereGeometry args={[0.108, 40, 28, 0, Math.PI * 2, 0, 1.6]} />
      </mesh>
      <instancedMesh ref={curls} args={[torus, material, CURLS]} />
      <instancedMesh ref={beads} args={[sphere, material, BEADS]} />
    </group>
  );
}

function Stool({ m }: { m: ReturnType<typeof useMaterials> }) {
  return (
    <group>
      <mesh position={[0, 0.655, -0.02]} material={m.seat}>
        <cylinderGeometry args={[0.19, 0.18, 0.05, 48]} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        const top: V3 = [Math.sin(a) * 0.12, 0.63, -0.02 + Math.cos(a) * 0.12];
        const bottom: V3 = [Math.sin(a) * 0.22, 0.0, -0.02 + Math.cos(a) * 0.22];
        return <Limb key={i} a={top} b={bottom} r1={0.011} r2={0.011} material={m.chrome} />;
      })}
      <mesh position={[0, 0.265, -0.02]} rotation-x={Math.PI / 2} material={m.chrome}>
        <torusGeometry args={[0.18, 0.009, 10, 64]} />
      </mesh>
    </group>
  );
}
