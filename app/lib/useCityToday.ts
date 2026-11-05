"use client";

import { useSyncExternalStore } from "react";
import { cityTimeZone, todayIn } from "./upcoming";

const noSubscribe = () => () => {};

/**
 * Today's date ("YYYY-MM-DD") in the city's time zone, read in the browser;
 * null during server render and hydration (FIX-UPCOMING-PAST-DAY-001).
 *
 * The city and meeting pages are cached until the next publish, so a
 * date-based answer baked in at render time goes stale. Components render
 * the server's answer first and switch to this one after hydration, without
 * a hydration mismatch. The snapshot is a date string, so it stays equal
 * between calls, as useSyncExternalStore requires.
 */
export function useCityToday(stateCode: string): string | null {
  return useSyncExternalStore(
    noSubscribe,
    () => todayIn(cityTimeZone(stateCode), Date.now()),
    () => null,
  );
}
