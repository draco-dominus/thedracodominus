"use client";

import { RoundedBox, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { portrait } from "@/content/portrait";
import type { MaterialKit } from "../materials";
import { Selectable } from "../selectable";
import { destinations } from "../world";
import { Destination, type DestinationProps } from "./destination";

/**
 * ABOUT: an editorial still life on one table.
 *  - Background: the real photograph, framed like a print (honest: a photo,
 *    not a reconstruction), propped against the wall of the table.
 *  - Philosophy: three objects resting together (imagine / build / useful).
 *  - Résumé: a leaning sheet. Contact: a standing glass card.
 */
const TABLE_TOP = -0.32;

export function AboutDestination(props: DestinationProps) {
  return (
    <Destination id="about" {...props}>
      {(kit) => <StillLife kit={kit} {...props} />}
    </Destination>
  );
}

function StillLife({ kit, ...props }: DestinationProps & { kit: MaterialKit }) {
  const p = destinations.about.items;
  const photo = useTexture(portrait.cutout, (t) => {
    (t as THREE.Texture).colorSpace = THREE.SRGBColorSpace;
  });
  const photoMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: photo, transparent: true, toneMapped: false }),
    [photo],
  );
  const matMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#ede7df", roughness: 0.92, transparent: true }),
    [],
  );
  useFrame(() => {
    photoMat.opacity = kit.porcelain.opacity;
    matMat.opacity = kit.porcelain.opacity;
  });

  const ph = 0.62;
  const pw = ph * portrait.aspect;

  return (
    <>
      {/* Table */}
      <RoundedBox args={[1.66, 0.1, 0.62]} radius={0.03} smoothness={4} position={[0, TABLE_TOP - 0.05, 0]} material={kit.porcelain} />
      <RoundedBox args={[1.58, 0.05, 0.54]} radius={0.015} position={[0, TABLE_TOP - 0.125, 0]} material={kit.graphite} />

      {/* Background: the framed photograph */}
      <group position={p.background.position} rotation={[-0.07, 0.12, 0]}>
        <Selectable {...props} area="about" item="background" focusedScale={1.02}>
          <RoundedBox args={[0.6, 0.8, 0.032]} radius={0.012} smoothness={3} material={kit.graphite} />
          <mesh position={[0, 0, 0.0165]} material={matMat}>
            <planeGeometry args={[0.52, 0.72]} />
          </mesh>
          <mesh position={[0, -0.01, 0.0175]} material={photoMat}>
            <planeGeometry args={[pw, ph]} />
          </mesh>
        </Selectable>
      </group>

      {/* Philosophy: imagine (glass sphere), build (porcelain block), make it useful (graphite ring) */}
      <group position={p.philosophy.position}>
        <Selectable {...props} area="about" item="philosophy" focusedScale={1.03}>
          <mesh position={[-0.18, 0.005, 0]} material={kit.glass}>
            <sphereGeometry args={[0.075, 48, 32]} />
          </mesh>
          <RoundedBox args={[0.13, 0.13, 0.13]} radius={0.016} position={[0, -0.005, -0.03]} rotation-y={0.5} material={kit.porcelain} />
          <mesh position={[0.18, 0.005, 0.02]} rotation-y={-0.5} material={kit.graphite}>
            <torusGeometry args={[0.055, 0.02, 24, 48]} />
          </mesh>
        </Selectable>
      </group>

      {/* Résumé: a sheet leaning back */}
      <group position={p.resume.position} rotation={[-0.2, -0.1, 0.03]}>
        <Selectable {...props} area="about" item="resume" focusedScale={1.04}>
          <RoundedBox args={[0.27, 0.37, 0.006]} radius={0.002} smoothness={2} material={kit.porcelain} />
          <RoundedBox args={[0.12, 0.016, 0.002]} radius={0.001} position={[-0.055, 0.135, 0.004]} material={kit.ink} />
          {Array.from({ length: 9 }, (_, i) => (
            <mesh key={i} position={[-0.012 - (i % 3) * 0.01, 0.085 - i * 0.026, 0.0035]} material={kit.metal}>
              <planeGeometry args={[0.2 - (i % 3) * 0.02, 0.006]} />
            </mesh>
          ))}
        </Selectable>
      </group>

      {/* Contact: a standing glass card */}
      <group position={p.contact.position} rotation-y={-0.28}>
        <Selectable {...props} area="about" item="contact" focusedScale={1.05}>
          <RoundedBox args={[0.26, 0.16, 0.016]} radius={0.02} smoothness={3} material={kit.glass} />
          <RoundedBox args={[0.24, 0.14, 0.004]} radius={0.016} position={[0, 0, -0.006]} material={kit.graphite} />
          <mesh position={[-0.075, 0.03, 0.009]} material={kit.glow}>
            <circleGeometry args={[0.016, 24]} />
          </mesh>
          <RoundedBox args={[0.13, 0.012, 0.002]} radius={0.004} position={[0.0, -0.035, 0.009]} material={kit.porcelain} />
        </Selectable>
      </group>
    </>
  );
}
