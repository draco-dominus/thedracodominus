import * as THREE from "three";

/**
 * One coherent material language for the whole world:
 *
 *   glass      iridescent, translucent: the "information" surfaces
 *   frost      milky glass: secondary panels
 *   porcelain  warm solid white: bodies, plinths, paper
 *   graphite   polished dark: chassis, frames, bases (gives silhouettes contrast)
 *   ink        near-black satin: small accents and type-like marks
 *   metal      satin aluminium: stands, connectors
 *   glow       emissive lavender: signals, nodes, paths
 *
 * Each destination owns its own kit so it can fade as a unit when another
 * destination has focus.
 */
export interface MaterialKit {
  glass: THREE.MeshPhysicalMaterial;
  frost: THREE.MeshPhysicalMaterial;
  porcelain: THREE.MeshPhysicalMaterial;
  graphite: THREE.MeshPhysicalMaterial;
  ink: THREE.MeshPhysicalMaterial;
  metal: THREE.MeshStandardMaterial;
  glow: THREE.MeshBasicMaterial;
  /** Register a screen shader so it fades with the kit. Returns it. */
  screen: (palette: ScreenPalette, layout?: ScreenLayout, aspect?: number) => THREE.ShaderMaterial;
  /** Advance animated screens. */
  tick: (dt: number) => void;
  /** 0..1, scales opacity of every material in the kit. */
  setPresence: (p: number) => void;
}

export type ScreenPalette = [string, string, string];
/** 0 = feature page, 1 = editorial, 2 = grid, 3 = media only. */
export type ScreenLayout = 0 | 1 | 2 | 3;

export function createMaterialKit(): MaterialKit {
  const glass = new THREE.MeshPhysicalMaterial({
    color: "#efeafc",
    transparent: true,
    opacity: 0.42,
    roughness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    iridescence: 1,
    iridescenceIOR: 1.45,
    iridescenceThicknessMinimum: 200,
    iridescenceThicknessMaximum: 620,
    sheen: 0.6,
    sheenColor: new THREE.Color("#d9ccff"),
    envMapIntensity: 1.6,
  });
  const frost = new THREE.MeshPhysicalMaterial({
    color: "#fbfaf8",
    transparent: true,
    opacity: 0.86,
    roughness: 0.42,
    clearcoat: 0.6,
    clearcoatRoughness: 0.22,
    sheen: 0.3,
    sheenColor: new THREE.Color("#efe8ff"),
  });
  const porcelain = new THREE.MeshPhysicalMaterial({
    color: "#f8f5f1",
    transparent: true,
    roughness: 0.34,
    clearcoat: 0.8,
    clearcoatRoughness: 0.16,
    envMapIntensity: 1.1,
  });
  const graphite = new THREE.MeshPhysicalMaterial({
    color: "#26252b",
    transparent: true,
    roughness: 0.26,
    metalness: 0.15,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    envMapIntensity: 1.3,
  });
  const ink = new THREE.MeshPhysicalMaterial({
    color: "#18171c",
    transparent: true,
    roughness: 0.5,
    metalness: 0,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: "#d2d0d8",
    transparent: true,
    metalness: 1,
    roughness: 0.22,
    envMapIntensity: 1.2,
  });
  const glow = new THREE.MeshBasicMaterial({
    color: "#b9a6ff",
    transparent: true,
    toneMapped: false,
  });

  const entries: [THREE.Material, number][] = [
    [glass, glass.opacity],
    [frost, frost.opacity],
    [porcelain, 1],
    [graphite, 1],
    [ink, 1],
    [metal, 1],
    [glow, 1],
  ];

  const screens: THREE.ShaderMaterial[] = [];

  return {
    glass,
    frost,
    porcelain,
    graphite,
    ink,
    metal,
    glow,
    screen(palette, layout = 3, aspect = 1.6) {
      const m = createScreenMaterial(palette, layout, aspect);
      screens.push(m);
      return m;
    },
    tick(dt) {
      for (const m of screens) m.uniforms.uTime.value += dt;
    },
    setPresence(p) {
      for (const m of screens) m.uniforms.uOpacity.value = p;
      for (const [m, base] of entries) {
        m.opacity = base * p;
        // Solid materials only need blending while fading.
        const solid = base === 1;
        const shouldBlend = !solid || p < 0.999;
        if (m.transparent !== shouldBlend) {
          m.transparent = shouldBlend;
          m.needsUpdate = true;
        }
        m.depthWrite = solid ? p > 0.6 : false;
      }
    },
  };
}

/**
 * Interface "screens": a soft iridescent ground with an abstract layout of
 * rounded blocks drawn on top (signed-distance shapes), so each object reads
 * as a product rather than a gradient swatch. Placeholder art until real
 * imagery exists.
 */
export function createScreenMaterial(palette: ScreenPalette, layout: ScreenLayout, aspect: number) {
  const [a, b, c] = palette;
  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uA: { value: new THREE.Color(a) },
      uB: { value: new THREE.Color(b) },
      uC: { value: new THREE.Color(c) },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uLayout: { value: layout },
      uAspect: { value: aspect },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uA; uniform vec3 uB; uniform vec3 uC;
      uniform float uTime; uniform float uOpacity; uniform int uLayout; uniform float uAspect;
      varying vec2 vUv;

      // Rounded rectangle in aspect-corrected space; centre c, half size h (uv units).
      float box(vec2 p, vec2 c, vec2 h, float r) {
        vec2 s = vec2(uAspect, 1.0);
        vec2 d = abs((p - c) * s) - h * s + r;
        return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
      }
      float fill(float d) { return 1.0 - smoothstep(0.0, 0.006, d); }

      void main() {
        vec2 p = vUv;
        float w1 = sin(p.x * 3.0 + uTime * 0.22) * 0.5 + 0.5;
        float w2 = sin((p.y + p.x * 0.6) * 3.6 - uTime * 0.16) * 0.5 + 0.5;
        vec3 col = mix(uA, uB, smoothstep(0.0, 1.0, p.y + 0.22 * w1 - 0.1));
        col = mix(col, uC, 0.5 * smoothstep(0.3, 1.0, w2 * (1.0 - p.y)));

        vec3 paper = vec3(0.985, 0.98, 0.975);
        vec3 inkc = vec3(0.13, 0.12, 0.16);
        float k;
        if (uLayout == 0) {
          // Feature page: nav, hero media + headline, three cards.
          col = mix(col, paper, 0.55 * fill(box(p, vec2(0.5, 0.92), vec2(0.46, 0.035), 0.02)));
          col = mix(col, inkc, 0.8 * fill(box(p, vec2(0.12, 0.92), vec2(0.05, 0.012), 0.01)));
          col = mix(col, inkc, 0.85 * fill(box(p, vec2(0.26, 0.7), vec2(0.2, 0.035), 0.01)));
          col = mix(col, inkc, 0.45 * fill(box(p, vec2(0.22, 0.6), vec2(0.16, 0.018), 0.01)));
          col = mix(col, inkc, 0.85 * fill(box(p, vec2(0.16, 0.48), vec2(0.1, 0.035), 0.03)));
          col = mix(col, paper, 0.35 * fill(box(p, vec2(0.74, 0.6), vec2(0.21, 0.24), 0.04)));
          for (int i = 0; i < 3; i++) {
            float x = 0.2 + float(i) * 0.3;
            col = mix(col, paper, 0.7 * fill(box(p, vec2(x, 0.17), vec2(0.13, 0.11), 0.03)));
          }
        } else if (uLayout == 1) {
          // Editorial: large circle, headline and text lines.
          vec2 q = (p - vec2(0.7, 0.5)) * vec2(uAspect, 1.0);
          k = 1.0 - smoothstep(0.3, 0.306, length(q));
          col = mix(col, paper, 0.4 * k);
          col = mix(col, inkc, 0.85 * fill(box(p, vec2(0.25, 0.74), vec2(0.17, 0.045), 0.01)));
          for (int i = 0; i < 5; i++) {
            float y = 0.56 - float(i) * 0.08;
            col = mix(col, inkc, 0.35 * fill(box(p, vec2(0.25 - float(i % 2) * 0.02, y), vec2(0.17 - float(i % 2) * 0.02, 0.012), 0.01)));
          }
        } else if (uLayout == 2) {
          // Grid of tiles.
          for (int i = 0; i < 3; i++) {
            for (int j = 0; j < 2; j++) {
              vec2 c = vec2(0.2 + float(i) * 0.3, 0.32 + float(j) * 0.38);
              col = mix(col, paper, (0.45 + 0.2 * float((i + j) % 2)) * fill(box(p, c, vec2(0.13, 0.16), 0.03)));
              col = mix(col, inkc, 0.5 * fill(box(p, c + vec2(-0.03, -0.11), vec2(0.07, 0.012), 0.01)));
            }
          }
        }
        // Soft diagonal light sweep, like glass over a display.
        float sweep = smoothstep(0.1, 0.0, abs(p.x - p.y * 0.55 - 0.32));
        col += 0.08 * sweep;
        gl_FragColor = vec4(col, uOpacity);
      }
    `,
  });
}
