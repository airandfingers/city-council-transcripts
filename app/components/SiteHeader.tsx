"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

// Mirrors app/lib/cityData.ts's isValidStateCode/isValidSlug (not exported
// from there — this is a URL-shape heuristic for nav purposes, not input
// validation, so it's kept local rather than adding a shared-export
// dependency for two regexes).
const CITY_PATH_RE = /^\/([a-z]{2})\/([a-z0-9]+(?:[-_][a-z0-9]+)*)(?:\/|$)/;

/**
 * Persistent global navigation header.
 *
 * Gives every page a constant brand + navigation cue, addressing PoC
 * feedback that the site "felt flat" and had no clear sense of where you
 * were or how to get back to the directory.
 *
 * Once a city is selected (URL matches /{state}/{citySlug}/...), Meetings
 * and Topics tabs for that city fold into this same nav — rather than a
 * second, separate tab bar below it — so all navigation lives in one place
 * (US-NAV-UNIFY-CITY-TABS-001). Derived entirely from the pathname (no data
 * fetch): the tab labels don't need the city's display name, just its
 * state/slug for the link hrefs, so this stays a lightweight client
 * component with no per-city DB round-trip.
 */
export default function SiteHeader() {
  const pathname = usePathname() ?? "/";
  const cityMatch = pathname.match(CITY_PATH_RE);
  const cityHref = cityMatch ? `/${cityMatch[1]}/${cityMatch[2]}` : null;

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
      <div className="flex items-center gap-6 p-4">
        <Link href="/" className="flex items-center gap-2 font-display font-semibold text-lg tracking-tight">
          <Image
            src="/loris-city-skyline.png"
            alt="Counciloris logo"
            width={120}
            height={120}
            className="rounded-full w-16 h-16 md:w-24 md:h-24"
          />
          Counciloris
        </Link>
        <nav className="flex items-center gap-4 text-sm">
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
