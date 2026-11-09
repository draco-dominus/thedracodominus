"use client";

import { useEffect, useRef } from "react";
import { areaById, areas, findItem, type AreaId } from "@/content/areas";
import { hero } from "@/content/site";
import { back, goOverview, openArea, openItem, type Route } from "@/lib/focus-store";
import { Icon, type IconName } from "./icons";

/**
 * HTML layers coordinated with the camera. None of them is a permanent
 * column: each exists only in its camera state and gets out of the way when
 * the visitor moves on.
 */

const philosophyIcons: IconName[] = ["cube", "code", "layers"];

/** OVERVIEW: the editorial introduction, left of the composition. */
export function IntroOverlay({ shown }: { shown: boolean }) {
  // Break the headline where the approved design does ("The future feels /
  // futuristic until it exists."); narrow screens wrap naturally.
  const words = hero.headlineLead.split(" ");
  const lineOne = words.slice(0, 3).join(" ");
  const lineTwo = words.slice(3).join(" ");
  return (
    <section
      aria-labelledby="hero-heading"
      className="intro-overlay"
      data-shown={shown || undefined}
      inert={!shown}
    >
      <p className="eyebrow flex items-center gap-5">
        {hero.eyebrow}
        <span aria-hidden="true" className="hidden h-px w-12 bg-ink/50 sm:block" />
      </p>
      <h1 id="hero-heading" tabIndex={-1} className="hero-headline">
        <span className="lg:block">{lineOne}</span>{" "}
        <span className="lg:block">
          {lineTwo} <span className="accent-word">{hero.headlineAccent}</span>
        </span>
      </h1>
      <p className="hero-sub">{hero.subheading}</p>
      <p className="hero-description">{hero.description}</p>
      <ul aria-label="Philosophy" className="philosophy">
        {hero.philosophy.map((step, i) => (
          <li key={step}>
            <Icon name={philosophyIcons[i]} size={20} className="text-ink-muted" />
            {step}
          </li>
        ))}
      </ul>
      <a
        href="#projects"
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey) return;
          e.preventDefault();
          openArea("projects");
        }}
        className="btn-dark hero-cta"
      >
        {hero.cta}
        <Icon name="arrow-right" size={18} />
      </a>
    </section>
  );
}

/**
 * FOCUS / INSPECT: compact wayfinding. Breadcrumb for predictable return,
 * plus the destination's title and prompt while focused.
 */
export function Wayfinding({ route, live }: { route: Route; live: boolean }) {
  const area = route.area ? areaById[route.area] : null;
  const item = route.area ? findItem(route.area, route.item) : null;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusOnArrive = useRef(false);

  useEffect(() => {
    if (area && !item && focusOnArrive.current) headingRef.current?.focus({ preventScroll: true });
    focusOnArrive.current = true;
  }, [area, item]);

  if (!area) return null;
  const index = areas.findIndex((a) => a.id === area.id);
  const next = areas[(index + 1) % areas.length];

  return (
    <div className="wayfinding" key={area.id}>
      <nav aria-label="Breadcrumb" className="crumbs glass">
        <ol className="flex items-center gap-1 text-[14px]">
          <li>
            <button type="button" onClick={goOverview} className="crumb">
              <Icon name="arrow-left" size={14} /> Overview
            </button>
          </li>
          <li aria-hidden="true" className="text-ink-soft">/</li>
          <li>
            {item ? (
              <button type="button" onClick={back} className="crumb">
                {area.title}
              </button>
            ) : (
              <span className="crumb" aria-current="page">
                {area.title}
              </span>
            )}
          </li>
          {item && (
            <>
              <li aria-hidden="true" className="text-ink-soft">/</li>
              <li>
                <span className="crumb max-w-[12rem] truncate" aria-current="page">
                  {item.title}
                </span>
              </li>
            </>
          )}
        </ol>
      </nav>

      {!item && (
        <section aria-labelledby="area-title" className="area-intro">
          <p className="eyebrow flex items-center gap-2">
            <Icon name={area.icon} size={15} /> Destination {index + 1} of {areas.length}
          </p>
          <h2
            id="area-title"
            ref={headingRef}
            tabIndex={-1}
            className="mt-2 text-[clamp(1.9rem,3vw,3rem)] leading-[1.02] font-medium tracking-[-0.035em] text-ink outline-none"
          >
            {area.title}
          </h2>
          <p className="mt-3 max-w-[24rem] text-[15px] leading-relaxed text-ink-muted">{area.lede}</p>
          <p className="mt-4 flex items-center gap-2 text-[13px] font-medium text-ink">
            <span className="loading-dot" aria-hidden="true" /> {area.prompt}
          </p>
          {/* Without the 3D world, the objects are listed here instead. */}
          {!live && (
            <ul className="mt-4 grid gap-1.5" aria-label={`${area.title} items`}>
              {area.items.map((it) => (
                <li key={it.id}>
                  <button
                    type="button"
                    data-key={`item:${area.id}/${it.id}`}
                    className="item-label static"
                    onClick={() => openItem(area.id, it.id)}
                  >
                    {it.title}
                    <Icon name="arrow-right" size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="btn-ghost mt-5" onClick={() => openArea(next.id)}>
            Next: {next.title} <Icon name="arrow-right" size={15} />
          </button>
        </section>
      )}
    </div>
  );
}

/** INSPECT: readable content for the selected object, beside it in space. */
export function InspectCard({ area, itemId }: { area: AreaId; itemId: string }) {
  const a = areaById[area];
  const item = findItem(area, itemId);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [area, itemId]);

  if (!item) return null;
  const i = a.items.findIndex((x) => x.id === itemId);
  const prev = a.items[(i - 1 + a.items.length) % a.items.length];
  const next = a.items[(i + 1) % a.items.length];

  return (
    <section
      id="inspect-card"
      aria-labelledby="inspect-title"
      className="inspect-card glass-strong"
      key={`${area}/${itemId}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow flex items-center gap-2">
          <Icon name={a.icon} size={15} /> {a.title}
          {item.placeholder && <span className="status-badge">Placeholder</span>}
        </p>
        <button
          type="button"
          onClick={back}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-white/80 text-ink transition hover:bg-white"
        >
          <Icon name="close" size={18} />
          <span className="sr-only">Close and return to {a.title}</span>
        </button>
      </div>

      <h2
        id="inspect-title"
        ref={headingRef}
        tabIndex={-1}
        className="mt-4 text-[clamp(1.7rem,2.4vw,2.4rem)] leading-[1.05] font-medium tracking-[-0.03em] text-ink outline-none"
      >
        {item.title}
      </h2>
      <p className="mt-3 text-[16px] leading-relaxed text-ink-muted">{item.summary}</p>

      {item.tags && item.tags.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tags">
          {item.tags.map((t) => (
            <li key={t} className="rounded-full bg-paper-2 px-2.5 py-1 text-[12px] text-ink-muted">
              {t}
            </li>
          ))}
        </ul>
      )}

      {item.sections.length > 0 && (
        <dl className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {item.sections.map((s) => (
            <div key={s.heading} className="rounded-2xl border border-line bg-white/60 p-3.5">
              <dt className="text-[12px] font-medium tracking-[0.08em] text-ink uppercase">{s.heading}</dt>
              <dd className="mt-1 text-[14.5px] leading-relaxed text-ink-muted">{s.body}</dd>
            </div>
          ))}
        </dl>
      )}

      {item.links && item.links.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2">
          {item.links.map((l) => (
            <li key={l.href}>
              <a className="btn-dark h-11 px-5 text-[14px]" href={l.href} target={l.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                {l.label} <Icon name="arrow-up-right" size={15} />
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
        <button type="button" onClick={back} className="btn-ghost">
          <Icon name="arrow-left" size={15} /> Back to {a.title}
        </button>
        {a.items.length > 1 && (
          <div className="flex gap-2">
            <button type="button" className="btn-ghost !px-3" onClick={() => openItem(area, prev.id)}>
              <Icon name="arrow-left" size={15} />
              <span className="sr-only">Previous: {prev.title}</span>
            </button>
            <button type="button" className="btn-ghost" onClick={() => openItem(area, next.id)}>
              <span className="max-w-[9rem] truncate">{next.title}</span> <Icon name="arrow-right" size={15} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
