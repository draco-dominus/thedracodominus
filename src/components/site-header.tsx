"use client";

import Link from "next/link";
import { useEffect, useId, useState, type MouseEvent } from "react";
import { site } from "@/content/site";
import { goOverview, hashFor, navigate, type Route } from "@/lib/focus-store";
import { Icon } from "./icons";

/**
 * The single navigation system. Every link is a real, shareable anchor that
 * also drives the camera in place. Résumé and Contact are objects inside the
 * About destination, so they deep-link straight to an inspected object.
 */
type NavLink = { id: string; label: string; route: Route };
const links: NavLink[] = [
  { id: "home", label: "Home", route: { area: null, item: null } },
  { id: "projects", label: "Projects", route: { area: "projects", item: null } },
  { id: "engineering", label: "Engineering", route: { area: "engineering", item: null } },
  { id: "design", label: "Design", route: { area: "design", item: null } },
  { id: "about", label: "About", route: { area: "about", item: null } },
  { id: "resume", label: "Résumé", route: { area: "about", item: "resume" } },
];
const contact: NavLink = { id: "contact", label: "Contact", route: { area: "about", item: "contact" } };

function go(e: MouseEvent<HTMLAnchorElement>, l: NavLink) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  if (l.id === "home") goOverview();
  else navigate(l.route);
}

function currentId(route: Route) {
  if (!route.area) return "home";
  if (route.area === "about" && (route.item === "resume" || route.item === "contact")) return route.item;
  return route.area;
}

export function SiteHeader({ route }: { route: Route }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const current = currentId(route);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-30 px-4 pt-4 sm:px-6 lg:px-[3vw] lg:pt-5">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          onClick={(e) => go(e, links[0])}
          className="monogram"
          aria-label={site.name ? `${site.name}, home` : "Home"}
        >
          <span aria-hidden="true">{site.monogram}</span>
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1 rounded-full p-1">
            {links.map((l) => (
              <li key={l.id}>
                <a
                  href={hashFor(l.route) || "/"}
                  onClick={(e) => go(e, l)}
                  aria-current={current === l.id ? "true" : undefined}
                  className="nav-link"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={hashFor(contact.route)}
            onClick={(e) => go(e, contact)}
            aria-current={current === "contact" ? "true" : undefined}
            className="btn-dark h-11 px-5 text-[15px]"
          >
            Contact <Icon name="arrow-up-right" size={16} />
          </a>
          <button
            type="button"
            className="glass grid size-11 place-items-center rounded-full lg:hidden"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <Icon name={menuOpen ? "close" : "menu"} />
            <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
          </button>
        </div>
      </div>

      <nav
        id={menuId}
        aria-label="Primary"
        hidden={!menuOpen}
        className="glass-strong absolute inset-x-4 top-[4.5rem] rounded-3xl p-2 sm:inset-x-6 lg:hidden"
      >
        <ul className="grid">
          {links.map((l) => (
            <li key={l.id}>
              <a
                href={hashFor(l.route) || "/"}
                onClick={(e) => {
                  setMenuOpen(false);
                  go(e, l);
                }}
                aria-current={current === l.id ? "true" : undefined}
                className="flex min-h-12 items-center justify-between rounded-2xl px-4 text-[17px] text-ink aria-[current]:bg-white/80"
              >
                {l.label}
                <Icon name="arrow-right" size={18} className="text-ink-soft" />
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
