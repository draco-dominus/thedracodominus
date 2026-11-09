"use client";

import { useSyncExternalStore } from "react";

let cached: boolean | undefined;

function detect(): boolean {
  if (cached !== undefined) return cached;
  try {
    // `?static` forces the fallback, useful for testing.
    if (new URLSearchParams(window.location.search).has("static")) {
      cached = false;
      return cached;
    }
    const canvas = document.createElement("canvas");
    const gl =
      (canvas.getContext("webgl2") as WebGLRenderingContext | null) ??
      canvas.getContext("webgl");
    cached = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    cached = false;
  }
  return cached;
}

const noopSubscribe = () => () => {};

/** null during SSR / before hydration, then true/false. */
export function useWebGLSupport(): boolean | null {
  return useSyncExternalStore(noopSubscribe, detect, () => null);
}
