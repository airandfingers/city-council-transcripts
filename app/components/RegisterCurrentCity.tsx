"use client";

import { useSetCurrentCity } from "@/app/components/CityNavContext";
import type { CityNavEntry } from "@/app/lib/cityData";

/**
 * Registers this page's city with the persistent header (SiteHeader) via
 * CityNavContext, for pages outside the /{state}/{city}/... URL shape —
 * e.g. /transcripts/{slug} meeting pages — where the header can't derive
 * the city from the pathname alone. Renders nothing.
 */
export default function RegisterCurrentCity({ city }: { city: CityNavEntry }) {
  useSetCurrentCity(city);
  return null;
}
