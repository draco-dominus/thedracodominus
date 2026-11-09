"use client";

import { useSyncExternalStore } from "react";

function mediaQueryStore(query: string) {
  return {
    subscribe(cb: () => void) {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    get: () => window.matchMedia(query).matches,
  };
}

const stores = new Map<string, ReturnType<typeof mediaQueryStore>>();

/** Server snapshot is `fallback`; the client value is read after hydration. */
export function useMediaQuery(query: string, fallback = false) {
  let store = stores.get(query);
  if (!store) {
    store = mediaQueryStore(query);
    stores.set(query, store);
  }
  return useSyncExternalStore(store.subscribe, store.get, () => fallback);
}

export const useReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");

/** Matches the Tailwind `lg` breakpoint where the wide spatial layout applies. */
export const useWideLayout = () => useMediaQuery("(min-width: 1024px)", true);

export const useFinePointer = () => useMediaQuery("(hover: hover) and (pointer: fine)");
