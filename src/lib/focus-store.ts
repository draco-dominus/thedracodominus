"use client";

import { useSyncExternalStore } from "react";
import { findItem, isAreaId, type AreaId } from "@/content/areas";

/**
 * Navigation state for the spatial homepage, mirrored in the URL hash:
 *
 *   ""                         -> OVERVIEW
 *   "#projects"                -> AREA FOCUS
 *   "#projects/example-project"-> CONTENT INSPECTION
 *
 * Every entry point (header, 3D objects, labels, fallback) goes through here,
 * so links are shareable and the browser back button retraces camera moves.
 */
export interface Route {
  area: AreaId | null;
  item: string | null;
}

export type CameraState = "overview" | "focus" | "inspect";

export function cameraStateOf(route: Route): CameraState {
  return route.item ? "inspect" : route.area ? "focus" : "overview";
}

interface State {
  route: Route;
  /** Area or item key being hovered/focused anywhere (e.g. "projects" or "projects/x"). */
  preview: string | null;
}

const OVERVIEW: Route = { area: null, item: null };
let state: State = { route: OVERVIEW, preview: null };
const listeners = new Set<() => void>();

function emit(next: Partial<State>) {
  const merged = { ...state, ...next };
  if (
    merged.preview === state.preview &&
    merged.route.area === state.route.area &&
    merged.route.item === state.route.item
  )
    return;
  state = merged;
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const serverState: State = { route: OVERVIEW, preview: null };

export function useNavState() {
  return useSyncExternalStore(subscribe, () => state, () => serverState);
}

export function hashFor(route: Route) {
  if (!route.area) return "";
  return `#${route.area}${route.item ? `/${route.item}` : ""}`;
}

/** Parse a hash, including legacy shortcuts (#resume, #contact). */
export function parseHash(hash: string): Route {
  const raw = decodeURIComponent(hash.replace(/^#/, ""));
  if (raw === "resume" || raw === "contact") return { area: "about", item: raw };
  const [area, item] = raw.split("/");
  if (!isAreaId(area)) return OVERVIEW;
  return { area, item: findItem(area, item) ? item : null };
}

/** Where focus should land after navigating back (set by `back`). */
let pendingFocus: string | null = null;
export function takePendingFocus() {
  const f = pendingFocus;
  pendingFocus = null;
  return f;
}

export function navigate(route: Route) {
  if (typeof window === "undefined") return;
  const hash = hashFor(route);
  if (window.location.hash !== hash) {
    window.history.pushState(null, "", hash || window.location.pathname + window.location.search);
  }
  emit({ route });
}

export const goOverview = () => {
  if (state.route.area) pendingFocus = `dest:${state.route.area}`;
  navigate(OVERVIEW);
};
export const openArea = (area: AreaId) => navigate({ area, item: null });
export const openItem = (area: AreaId, item: string) => navigate({ area, item });

/** One level up: inspect -> focus -> overview. */
export function back() {
  const { area, item } = state.route;
  if (area && item) {
    pendingFocus = `item:${area}/${item}`;
    navigate({ area, item: null });
  } else if (area) {
    goOverview();
  }
}

export function setPreview(key: string | null) {
  emit({ preview: key });
}

export function syncFromLocation() {
  emit({ route: parseHash(window.location.hash) });
}
