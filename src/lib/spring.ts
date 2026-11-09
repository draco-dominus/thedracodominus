/**
 * Minimal damped-spring integrator for frame-loop animation.
 *
 * Springs (rather than eased tweens) keep motion physically coherent: any
 * target change mid-flight preserves velocity, and `mass` gives each object a
 * consistent sense of weight.
 */
export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
}

export const springs = {
  /** Default UI response: quick, barely any overshoot. */
  ui: { stiffness: 170, damping: 22, mass: 1 },
  /** Heavier, slower: camera and large layout moves. */
  camera: { stiffness: 60, damping: 16, mass: 1 },
  /** Lively response for hover lift and tilt. */
  hover: { stiffness: 260, damping: 20, mass: 1 },
} satisfies Record<string, SpringConfig>;

export class Spring {
  value: number;
  velocity = 0;
  target: number;

  constructor(
    initial: number,
    public config: SpringConfig = springs.ui,
  ) {
    this.value = initial;
    this.target = initial;
  }

  /** Advance by `dt` seconds. Returns true while still moving. */
  step(dt: number, instant = false): boolean {
    if (instant) {
      this.value = this.target;
      this.velocity = 0;
      return false;
    }
    const { stiffness, damping, mass } = this.config;
    // Fixed sub-steps keep the integration stable on slow frames.
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = Math.min(dt, 0.1) / steps;
    for (let i = 0; i < steps; i++) {
      const force = -stiffness * (this.value - this.target) - damping * this.velocity;
      this.velocity += (force / mass) * h;
      this.value += this.velocity * h;
    }
    const moving =
      Math.abs(this.velocity) > 1e-4 || Math.abs(this.value - this.target) > 1e-4;
    if (!moving) {
      this.value = this.target;
      this.velocity = 0;
    }
    return moving;
  }
}

/** Soft limit: linear near zero, asymptotically approaching ±max. */
export function elastic(raw: number, max: number) {
  return max * Math.tanh(raw / max);
}
