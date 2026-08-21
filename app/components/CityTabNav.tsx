"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = {
  label: string;
  href: string;
  /** True if this tab's section is "active" for a given pathname. Exact
   * match for Meetings (the city index) — otherwise a prefix match would
   * also light up on /topics/* since it starts with the city path too. */
  isActive: (pathname: string) => boolean;
};

/**
 * Persistent per-city tab bar (Meetings / Topics / …), shown on every page
 * under /[state]/[city]/* once a city is selected — addresses feedback that
 * Topics was buried as a small pill link on the city page and easy to miss.
 *
 * Client component: active-tab highlighting needs the current pathname,
 * which isn't available to the server layout that renders this.
 */
export default function CityTabNav({
  state,
  citySlug,
  cityName,
}: {
  state: string;
  citySlug: string;
  cityName: string;
}) {
  const pathname = usePathname();
  const cityHref = `/${state}/${citySlug}`;

  const tabs: Tab[] = [
    {
      label: "Meetings",
      href: cityHref,
      isActive: (p) => p === cityHref,
    },
    {
      label: "Topics",
      href: `${cityHref}/topics`,
      isActive: (p) => p.startsWith(`${cityHref}/topics`),
    },
  ];

  return (
    <nav
      aria-label={`${cityName} sections`}
      className="border-b border-gray-200 dark:border-gray-800 px-8"
    >
      <ul className="flex gap-6 -mb-px">
        {tabs.map((tab) => {
          const active = tab.isActive(pathname);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`inline-block py-3 text-sm font-medium border-b-2 transition-colors ${
                  active
                    ? "border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
