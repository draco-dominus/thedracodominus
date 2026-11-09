"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { areas } from "@/content/areas";
import { portrait } from "@/content/portrait";
import { cameraStateOf, openArea, openItem, setPreview, type Route } from "@/lib/focus-store";
import { useReducedMotion, useWideLayout } from "@/lib/hooks";
import { Icon } from "../icons";
import { Boundary } from "./boundary";
import { createSpatialBus } from "./bus";
import { heroLayouts, itemLabelPosition, ORBIT, type Vec3 } from "./world";
import { useWebGLSupport } from "./webgl-support";

const SpatialScene = dynamic(() => import("./spatial-scene"), { ssr: false });

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function limits(mode: ReturnType<typeof cameraStateOf>) {
  if (mode === "overview") return { az: ORBIT.heroAz, pol: ORBIT.heroPol };
  if (mode === "focus") return { az: ORBIT.focusAz, pol: ORBIT.focusPol };
  return { az: ORBIT.inspectAz, pol: ORBIT.inspectPol };
}

/**
 * The full-viewport spatial layer.
 *
 * Owns input (pointer parallax, bounded drag with momentum, arrow keys), the
 * accessible buttons pinned to 3D objects (the glass tiles and exhibit
 * objects), and progressive loading: the WebGL world is lazy-loaded; without
 * WebGL the same composition is drawn with HTML and CSS.
 */
export function SpatialStage({
  route,
  onLiveChange,
}: {
  route: Route;
  onLiveChange?: (live: boolean) => void;
}) {
  const wide = useWideLayout();
  const reduced = useReducedMotion();
  const webgl = useWebGLSupport();
  const [bus] = useState(createSpatialBus);
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const use3D = webgl === true && !failed;
  const live = use3D && ready;
  const mode = cameraStateOf(route);

  useEffect(() => onLiveChange?.(live), [live, onLiveChange]);

  useEffect(() => {
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Pointer position drives parallax and the tiles' lean.
  useEffect(() => {
    if (!live) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      bus.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      bus.pointer.y = 1 - (e.clientY / window.innerHeight) * 2;
      bus.invalidate();
    };
    const onLeave = () => {
      bus.pointer.x = 0;
      bus.pointer.y = 0;
      bus.invalidate();
    };
    window.addEventListener("pointermove", onMove);
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [bus, live]);

  // Phones: the composition starts where the intro copy ends.
  useEffect(() => {
    const intro = document.querySelector<HTMLElement>(".intro-overlay");
    if (!intro) return;
    const measure = () => {
      bus.introBottom = wide ? 0 : (intro.offsetTop + intro.offsetHeight) / window.innerHeight;
      bus.invalidate();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(intro);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [bus, wide]);

  // Arrow keys shift perspective when focus is on the page itself or the stage.
  useEffect(() => {
    if (!live) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!(t === document.body || t.closest(".spatial-stage"))) return;
      const lim = limits(mode);
      const o = bus.orbit;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const dir = e.key === "ArrowLeft" ? 1 : -1;
        o.dAz = clamp(o.dAz + dir * lim.az * 0.5, -lim.az, lim.az);
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        const dir = e.key === "ArrowUp" ? 1 : -1;
        o.dPol = clamp(o.dPol + dir * lim.pol * 0.5, -lim.pol, lim.pol);
      } else return;
      e.preventDefault();
      bus.invalidate();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bus, live, mode]);

  // Drag to shift perspective (bounded, with momentum). Starts only on the canvas.
  const drag = useRef<{ id: number; x: number; y: number; t: number; touch: boolean } | null>(null);
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!live || !(e.target instanceof HTMLCanvasElement)) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      t: performance.now(),
      touch: e.pointerType === "touch",
    };
    bus.dragDistance = 0;
    bus.orbit.vAz = 0;
    bus.orbit.vPol = 0;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    const now = performance.now();
    const dt = Math.max(8, now - d.t) / 1000;
    d.x = e.clientX;
    d.y = e.clientY;
    d.t = now;
    bus.dragDistance += Math.hypot(dx, dy);
    if (bus.dragDistance < 4) return;
    if (!bus.dragging) {
      bus.dragging = true;
      rootRef.current?.setAttribute("data-dragging", "");
    }
    const k = d.touch ? 0.006 : 0.0042;
    const o = bus.orbit;
    const lim = limits(mode);
    const dAz = -dx * k;
    const dPol = -dy * k * 0.6;
    // Increasing resistance toward the bounds keeps the composition intact.
    o.dAz = clamp(o.dAz + dAz * (1 - Math.abs(o.dAz) / lim.az), -lim.az, lim.az);
    o.dPol = clamp(o.dPol + dPol * (1 - Math.abs(o.dPol) / lim.pol), -lim.pol, lim.pol);
    // Smoothed angular velocity carried into momentum on release.
    o.vAz = o.vAz * 0.6 + (dAz / dt) * 0.4;
    o.vPol = o.vPol * 0.6 + (dPol / dt) * 0.4;
    bus.invalidate();
  };
  const endDrag = () => {
    const d = drag.current;
    drag.current = null;
    // A pause before release means "place it here", not "fling".
    if (d && performance.now() - d.t > 90) {
      bus.orbit.vAz = 0;
      bus.orbit.vPol = 0;
    }
    bus.dragging = false;
    rootRef.current?.removeAttribute("data-dragging");
    bus.invalidate();
  };

  const register =
    (key: string, position: Vec3 | null, track?: string) => (el: HTMLElement | null) => {
      if (!el || !position) return;
      bus.anchors.set(key, { el, position, track });
      bus.invalidate();
      return () => {
        bus.anchors.delete(key);
      };
    };

  const showFallback = webgl === false || failed;
  const tiles = heroLayouts[wide ? "wide" : "narrow"].tiles;

  return (
    <div
      ref={rootRef}
      className="spatial-stage absolute inset-0"
      data-live={live || undefined}
      data-mode={mode}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {use3D && (
        <div
          className="absolute inset-0 transition-opacity duration-1000 ease-out"
          style={{ opacity: live ? 1 : 0 }}
        >
          <Boundary onError={() => setFailed(true)}>
            <SpatialScene
              bus={bus}
              route={route}
              wide={wide}
              reduced={reduced}
              visible={visible}
              onReady={() => setReady(true)}
              onContextLost={() => setFailed(true)}
            />
          </Boundary>
        </div>
      )}

      {use3D && !ready && (
        <p className="loading-pill" role="status">
          <span className="loading-dot" aria-hidden="true" /> Preparing the space…
        </p>
      )}

      {showFallback ? (
        <StaticComposition />
      ) : (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Glass tile labels: the homepage composition only */}
          <nav aria-label="Explore by area">
            <ul>
              {areas.map((area) => {
                const shown = live && mode === "overview";
                const hover = (on: boolean) => {
                  bus.hover = on ? `tile:${area.id}` : null;
                  setPreview(on ? area.id : null);
                  bus.invalidate();
                };
                return (
                  <li key={area.id}>
                    <button
                      type="button"
                      ref={register(`dest:${area.id}`, tiles[area.id].position, `tile:${area.id}`)}
                      data-key={`dest:${area.id}`}
                      data-shown={shown || undefined}
                      inert={!shown}
                      className="tile-label"
                      onClick={() => openArea(area.id)}
                      onPointerEnter={() => hover(true)}
                      onPointerLeave={() => hover(false)}
                      onFocus={() => hover(true)}
                      onBlur={() => hover(false)}
                    >
                      <Icon name={area.icon} className="tile-icon" />
                      <span className="tile-title">{area.title}</span>
                      <span className="sr-only">: {area.blurb}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          {/* Object labels: that area's FOCUS state only */}
          {areas.flatMap((area) =>
            area.items.map((item, i) => {
              const shown = live && mode === "focus" && route.area === area.id;
              const key = `${area.id}/${item.id}`;
              const hover = (on: boolean) => {
                bus.hover = on ? key : null;
                bus.invalidate();
              };
              return (
                <button
                  key={key}
                  type="button"
                  ref={register(`item:${key}`, itemLabelPosition(area.id, item.id))}
                  data-key={`item:${key}`}
                  data-shown={shown || undefined}
                  inert={!shown}
                  className="item-label"
                  style={{ transitionDelay: shown ? `${650 + i * 80}ms` : "0ms" }}
                  onClick={() => openItem(area.id, item.id)}
                  onPointerEnter={() => hover(true)}
                  onPointerLeave={() => hover(false)}
                  onFocus={() => hover(true)}
                  onBlur={() => hover(false)}
                >
                  {item.title}
                  {item.placeholder && <span className="sr-only"> (placeholder)</span>}
                  <Icon name="arrow-right" size={14} />
                </button>
              );
            }),
          )}
        </div>
      )}
    </div>
  );
}

/**
 * No-WebGL fallback: the same composition in HTML and CSS (the portrait and
 * the glass tiles as plain buttons). Focus and inspection still work through
 * the same HTML overlays.
 */
function StaticComposition() {
  return (
    <div className="static-world absolute inset-0 overflow-hidden">
      <div className="static-portrait">
        <Image src={portrait.cutout} alt={portrait.alt} fill priority unoptimized sizes="60vh" className="object-contain" />
      </div>
      <nav aria-label="Explore by area">
        <ul>
          {areas.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                data-key={`dest:${a.id}`}
                data-area={a.id}
                className="tile-label is-static"
                onClick={() => openArea(a.id)}
              >
                <Icon name={a.icon} className="tile-icon" />
                <span className="tile-title">{a.title}</span>
                <span className="sr-only">: {a.blurb}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
