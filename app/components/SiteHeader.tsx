"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { CityNavEntry } from "@/app/lib/cityData";

// Mirrors app/lib/cityData.ts's isValidStateCode/isValidSlug (not exported
// from there — this is a URL-shape heuristic for nav purposes, not input
// validation, so it's kept local rather than adding a shared-export
// dependency for two regexes).
const CITY_PATH_RE = /^\/([a-z]{2})\/([a-z0-9]+(?:[-_][a-z0-9]+)*)(?:\/|$)/;

/**
 * Persistent global navigation header.
 *
 * Always shows "Counciloris"; once a city is selected (URL matches
 * /{state}/{citySlug}/...), a Craigslist-style city switcher — the
 * selected city's name, click to jump to any other city — appears next to
 * it, and Meetings/Topics tabs for that city fold into the same nav
 * (US-NAV-UNIFY-CITY-TABS-001, US-NAV-PERSISTENT-CITY-SWITCHER-001). All
 * site navigation lives in this one bar rather than a separate tab strip.
 *
 * Fetches the city list client-side from GET /api/cities on mount, rather
 * than as a server-passed prop — SiteHeader renders (via the root layout)
 * on every page, and an async layout awaiting a DB call would make the
 * *entire site's* static build depend on DB reachability. See
 * /api/cities/route.ts's docstring for the full rationale. The switcher
 * and city name simply don't render until the fetch resolves (typically
 * near-instant — the API route's own data layer is cached).
 */
export default function SiteHeader() {
  const pathname = usePathname() ?? "/";
  const [cities, setCities] = useState<CityNavEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/cities")
      .then((res) => (res.ok ? res.json() : { cities: [] }))
      .then((data) => {
        if (!cancelled) setCities(data.cities ?? []);
      })
      .catch(() => {
        /* Nav degrades gracefully to no switcher/city name — not worth
           surfacing an error for a non-critical nav enhancement. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cityMatch = pathname.match(CITY_PATH_RE);
  const cityHref = cityMatch ? `/${cityMatch[1]}/${cityMatch[2]}` : null;
  const currentCity = cityMatch
    ? cities.find((c) => c.stateCode === cityMatch[1] && c.slug === cityMatch[2])
    : undefined;

  const links = [
    { label: "Cities", href: "/", active: pathname === "/", divider: false },
    ...(cityHref
      ? [
          { label: "Meetings", href: cityHref, active: pathname === cityHref, divider: true },
          {
            label: "Topics",
            href: `${cityHref}/topics`,
            active: pathname.startsWith(`${cityHref}/topics`),
            divider: false,
          },
        ]
      : []),
    { label: "About", href: "/#about", active: false, divider: false },
  ];

  return (
    <header className="border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-3 p-4">
        <Link href="/" className="flex items-center gap-2 font-display font-semibold text-lg tracking-tight shrink-0">
          <Image
            src="/loris-city-skyline.png"
            alt="Counciloris logo"
            width={120}
            height={120}
            className="rounded-full w-16 h-16 md:w-24 md:h-24"
          />
          Counciloris
        </Link>

        {currentCity && (
          <>
            <span aria-hidden="true" className="text-gray-300 dark:text-gray-600 text-lg font-light">
              /
            </span>
            <CitySwitcher cities={cities} currentCity={currentCity} />
          </>
        )}

        <nav className="flex items-center gap-4 text-sm ml-2">
          {links.map((link) => (
            <span key={link.href} className="flex items-center gap-4">
              {/* Divider between the global links (Cities) and the
                  city-scoped ones (Meetings/Topics) once they appear —
                  visually groups "where am I" from "what can I browse". */}
              {link.divider && (
                <span aria-hidden="true" className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
              )}
              <Link
                href={link.href}
                aria-current={link.active ? "page" : undefined}
                className={
                  link.active
                    ? "text-gray-900 dark:text-gray-100 font-medium"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                }
              >
                {link.label}
              </Link>
            </span>
          ))}
        </nav>
      </div>
    </header>
  );
}

/**
 * Craigslist-style "current city, click to pick another" control. Plain
 * <details>/<summary> — native disclosure semantics (keyboard-operable,
 * closes on outside click in every evergreen browser) without hand-rolling
 * open/close state or a click-outside listener for what's a fairly minor
 * piece of UI.
 */
function CitySwitcher({
  cities,
  currentCity,
}: {
  cities: CityNavEntry[];
  currentCity: CityNavEntry;
}) {
  return (
    <details className="relative group">
      <summary
        className="list-none flex items-center gap-1 cursor-pointer font-display font-semibold text-lg tracking-tight text-gray-900 dark:text-gray-100 select-none [&::-webkit-details-marker]:hidden"
      >
        {currentCity.name}
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4 text-gray-400 dark:text-gray-500 group-open:rotate-180 transition-transform"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </summary>
      <ul
        className="absolute left-0 top-full mt-2 min-w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1 z-20 text-sm"
      >
        {cities.map((city) => {
          const isCurrent = city.stateCode === currentCity.stateCode && city.slug === currentCity.slug;
          return (
            <li key={`${city.stateCode}/${city.slug}`}>
              <Link
                href={`/${city.stateCode}/${city.slug}`}
                aria-current={isCurrent ? "page" : undefined}
                className={`block px-4 py-2 ${
                  isCurrent
                    ? "text-gray-900 dark:text-gray-100 font-medium bg-gray-50 dark:bg-gray-800"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                }`}
              >
                {city.name}, {city.stateName}
              </Link>
            </li>
          );
        })}
        <li>
          <Link
            href="/"
            className="block px-4 py-2 border-t border-gray-100 dark:border-gray-800 mt-1 pt-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            View all cities →
          </Link>
        </li>
      </ul>
    </details>
  );
}
