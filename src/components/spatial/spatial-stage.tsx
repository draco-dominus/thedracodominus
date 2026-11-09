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
import { destinationLabelPosition, destinationYaw, itemLabelPosition, ORBIT } from "./world";
import { useWebGLSupport } from "./webgl-support";

const SpatialScene = dynamic(() => import("./spatial-scene"), { ssr: false });

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * The full-viewport spatial layer.
 *
 * Owns input (drag-to-orbit with momentum, wheel zoom, arrow keys), the
 * accessible label buttons pinned to 3D anchors, and progressive loading:
 * the WebGL world is lazy-loaded; without WebGL a static fallback is shown.
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

  // Wheel zoom in overview (canvas only; cards and panels scroll normally).
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !live) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.target instanceof HTMLCanvasElement) || mode !== "overview") return;
      e.preventDefault();
      bus.orbit.dist = clamp(bus.orbit.dist * Math.exp(e.deltaY * 0.0012), ORBIT.minDist, ORBIT.maxDist);
      bus.invalidate();
    };
    root.addEventListener("wheel", onWheel, { passive: false });
    return () => root.removeEventListener("wheel", onWheel);
  }, [bus, live, mode]);

  // Arrow keys look around when focus is on the page itself or the stage.
  useEffect(() => {
    if (!live) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!(t === document.body || t.closest(".spatial-stage"))) return;
      const step = reduced ? 0.4 : 0.26;
      const o = bus.orbit;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const dir = e.key === "ArrowLeft" ? 1 : -1;
        if (mode === "overview") o.az += dir * step;
        else o.dAz = clamp(o.dAz + dir * step * 0.5, -ORBIT.focusAz, ORBIT.focusAz);
      } else if ((e.key === "ArrowUp" || e.key === "ArrowDown") && mode === "overview") {
        o.pol = clamp(o.pol + (e.key === "ArrowUp" ? 0.08 : -0.08), ORBIT.minPol, ORBIT.maxPol);
      } else return;
      e.preventDefault();
      bus.invalidate();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bus, live, mode, reduced]);

  // Drag to orbit (with momentum). Starts only on the canvas itself.
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
    const k = d.touch ? 0.0085 : 0.0062;
    const o = bus.orbit;
    const dAz = -dx * k;
    const dPol = -dy * k * 0.6;
    if (mode === "overview") {
      o.az += dAz;
      o.pol = clamp(o.pol + dPol, ORBIT.minPol, ORBIT.maxPol);
    } else {
      // Look around a destination / object, with increasing resistance.
      const lim = mode === "focus" ? ORBIT.focusAz : ORBIT.inspectAz;
      const plim = mode === "focus" ? ORBIT.focusPol : ORBIT.inspectPol;
      o.dAz = clamp(o.dAz + dAz * (1 - Math.abs(o.dAz) / lim), -lim, lim);
      o.dPol = clamp(o.dPol + dPol * 0.6 * (1 - Math.abs(o.dPol) / plim), -plim, plim);
    }
    // Smoothed angular velocity carried into momentum on release.
    o.vAz = o.vAz * 0.6 + (dAz / dt) * 0.4;
    o.vPol = mode === "overview" ? o.vPol * 0.6 + (dPol / dt) * 0.4 : 0;
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
    (key: string, position: [number, number, number] | null, normal?: [number, number, number]) =>
    (el: HTMLElement | null) => {
      if (!el || !position) return;
      bus.anchors.set(key, { el, position, normal });
      bus.invalidate();
      return () => {
        bus.anchors.delete(key);
      };
    };

  const showFallback = webgl === false || failed;

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
        <StaticWorld />
      ) : (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Destination labels: OVERVIEW only */}
          {areas.map((area) => {
            // Labels dim when the exhibit is seen from behind (it faces its viewpoint).
            const yaw = destinationYaw(area.id);
            const shown = live && mode === "overview";
            return (
              <button
                key={area.id}
                type="button"
                ref={register(`dest:${area.id}`, destinationLabelPosition(area.id), [Math.sin(yaw), 0, Math.cos(yaw)])}
                data-key={`dest:${area.id}`}
                data-shown={shown || undefined}
                inert={!shown}
                className="dest-label"
                onClick={() => openArea(area.id)}
                onPointerEnter={() => setPreview(area.id)}
                onPointerLeave={() => setPreview(null)}
              >
                <span className="label-index" aria-hidden="true">
                  {String(areas.indexOf(area) + 1).padStart(2, "0")}
                </span>
                <span className="text-left">
                  <span className="block text-[15px] font-medium text-ink">{area.title}</span>
                  <span className="dest-blurb hidden text-[12.5px] text-ink-soft lg:block">{area.blurb}</span>
                </span>
              </button>
            );
          })}
          {/* Object labels: that destination's FOCUS state only */}
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
                  style={{ transitionDelay: shown ? `${450 + i * 80}ms` : "0ms" }}
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
 * No-WebGL fallback: the real photograph with the four destinations as plain
 * buttons. Focus and inspection still work through the same HTML overlays.
 */
function StaticWorld() {
  return (
    <div className="static-world absolute inset-0">
      <div className="relative mx-auto h-full w-full max-w-[40rem]">
        <div className="absolute inset-x-[20%] top-[14%] bottom-[24%]">
          <Image
            src={portrait.cutout}
            alt={portrait.alt}
            fill
            priority
            unoptimized
            sizes="40vw"
            className="object-contain"
          />
        </div>
        <ul
          className="absolute inset-x-4 bottom-[5%] grid grid-cols-2 gap-2 sm:grid-cols-4"
          aria-label="Destinations"
        >
          {areas.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                data-key={`dest:${a.id}`}
                className="dest-label static w-full"
                onClick={() => openArea(a.id)}
              >
                <Icon name={a.icon} size={18} />
                <span className="text-left">
                  <span className="block text-[15px] font-medium text-ink">{a.title}</span>
                  <span className="block text-[12.5px] text-ink-soft">{a.blurb}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
