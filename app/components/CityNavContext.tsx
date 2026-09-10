"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { CityNavEntry } from "@/app/lib/cityData";

type CityNavOverride = { city: CityNavEntry; pathname: string };

type CityNavContextValue = {
  override: CityNavOverride | null;
  setOverride: (override: CityNavOverride | null) => void;
};

const CityNavContext = createContext<CityNavContextValue | null>(null);

/**
 * Wraps SiteHeader + page content (root layout) so a page whose URL
 * doesn't encode its city — e.g. /transcripts/{slug}, whose slug format is
 * {date}/{title} with no city segment (see meetingSlug.ts) — can still
 * tell the persistent header which city it belongs to, so the city
 * switcher and Meetings/Topics tabs appear there too instead of only on
 * /{state}/{city}/... pages (US-NAV-PERSISTENT-CITY-SWITCHER-001,
 * US-NAV-UNIFY-CITY-TABS-001).
 */
export function CityNavProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<CityNavOverride | null>(null);
  const value = useMemo(() => ({ override, setOverride }), [override]);
  return <CityNavContext.Provider value={value}>{children}</CityNavContext.Provider>;
}

/**
 * The current override, if any. SiteHeader only honors it once it
 * confirms `pathname` matches the route currently rendering — a stale
 * value left behind by a page you've since navigated away from is then
 * simply ignored, rather than relying on unmount-before-mount effect
 * ordering to clear it in time.
 */
export function useCityNavOverride(): CityNavOverride | null {
  // No provider (e.g. used outside the root layout by mistake) degrades
  // to "no override" rather than throwing — a missing switcher/tabs is a
  // far smaller failure than breaking the whole page, matching how
  // SiteHeader already treats a failed /api/cities fetch.
  return useContext(CityNavContext)?.override ?? null;
}

/**
 * Registers `city` as the page's city for the persistent header. Call
 * from a page outside the /{state}/{city}/... URL shape; a no-op if
 * `city` is null/undefined or there's no CityNavProvider in the tree.
 */
export function useSetCurrentCity(city: CityNavEntry | null | undefined) {
  // Read only the (stable, useState-identity) setter, not the whole
  // context value — depending on the value object itself would re-fire
  // this effect every time the override changes, including when *this*
  // call is what changed it, looping.
  const setOverride = useContext(CityNavContext)?.setOverride;
  const pathname = usePathname() ?? "/";
  const { stateCode, slug, name, stateName } = city ?? {};

  useEffect(() => {
    if (!setOverride || !stateCode || !slug || !name || !stateName) return;
    setOverride({ city: { stateCode, slug, name, stateName }, pathname });
  }, [setOverride, stateCode, slug, name, stateName, pathname]);
}
