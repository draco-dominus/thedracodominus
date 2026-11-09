"use client";

import { useEffect, useState } from "react";
import {
  back,
  cameraStateOf,
  syncFromLocation,
  takePendingFocus,
  useNavState,
} from "@/lib/focus-store";
import { useWideLayout } from "@/lib/hooks";
import { InspectCard, IntroOverlay, OrbitHint, Wayfinding } from "./overlays";
import { SiteHeader } from "./site-header";
import { SpatialStage } from "./spatial/spatial-stage";

/**
 * The homepage is one spatial interface. A single route (mirrored in the URL
 * hash) drives the camera, the 3D world and the HTML layers:
 *
 *   overview -> intro + orbit hint + destination labels
 *   focus    -> breadcrumb + destination intro + object labels
 *   inspect  -> breadcrumb + inspect card beside the framed object
 */
export function HomeExperience() {
  const { route } = useNavState();
  const wide = useWideLayout();
  const [live, setLive] = useState(false);
  const mode = cameraStateOf(route);

  useEffect(() => {
    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);
    window.addEventListener("hashchange", syncFromLocation);
    return () => {
      window.removeEventListener("popstate", syncFromLocation);
      window.removeEventListener("hashchange", syncFromLocation);
    };
  }, []);

  // Escape always steps back one level: inspect -> focus -> overview.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // After stepping back, return keyboard focus to what was opened.
  useEffect(() => {
    const key = takePendingFocus();
    if (!key) return;
    // Labels fade in after the camera starts moving; retry until one is focusable.
    let tries = 0;
    let timer = 0;
    const attempt = () => {
      const el = document.querySelector<HTMLElement>(`[data-key="${key}"]`);
      const focusable = el && !el.closest("[inert]") && getComputedStyle(el).visibility !== "hidden";
      if (focusable) {
        el.focus({ preventScroll: true });
        if (document.activeElement === el) return;
      }
      if (++tries < 12) timer = window.setTimeout(attempt, 100);
      else document.getElementById("hero-heading")?.focus({ preventScroll: true });
    };
    timer = window.setTimeout(attempt, 50);
    return () => clearTimeout(timer);
  }, [route]);

  const inspecting = mode === "inspect" && route.area && route.item ? route : null;
  const sheetOpen = !!inspecting && !wide;

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div inert={sheetOpen}>
        <SiteHeader route={route} />
      </div>
      <main id="main" className="fixed inset-0 overflow-hidden" data-mode={mode}>
        <div inert={sheetOpen} className="absolute inset-0">
          <SpatialStage route={route} onLiveChange={setLive} />
        </div>
        <div inert={sheetOpen}>
          <IntroOverlay shown={mode === "overview"} />
          <OrbitHint shown={mode === "overview" && live} />
          <Wayfinding route={route} live={live} />
        </div>
        {inspecting && (
          <>
            <button
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              className="sheet-scrim fixed inset-0 z-40 lg:hidden"
              onClick={back}
            />
            <InspectCard area={inspecting.area!} itemId={inspecting.item!} />
          </>
        )}
      </main>
    </>
  );
}
