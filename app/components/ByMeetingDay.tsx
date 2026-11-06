"use client";

import type { ReactNode } from "react";
import { scheduledBadge, type ScheduledBadge } from "@/app/lib/upcoming";
import { useCityToday } from "@/app/lib/useCityToday";

/**
 * Renders one of three variants for a SCHEDULED meeting, by whether its day
 * has passed in the city (FIX-UPCOMING-PAST-DAY-001): before or on the day,
 * `upcoming`; up to PENDING_BADGE_DAYS after, `pending`; later, `old`.
 *
 * The meeting page is cached until the next publish, so the server's choice
 * (`serverBadge`) is used for the first render and replaced after hydration
 * with one computed from the browser's clock.
 */
export default function ByMeetingDay({
  date,
  stateCode,
  serverBadge,
  upcoming,
  pending,
  old = null,
}: {
  date: string;
  stateCode: string;
  serverBadge: ScheduledBadge;
  upcoming: ReactNode;
  pending: ReactNode;
  old?: ReactNode;
}) {
  const today = useCityToday(stateCode);
  const badge = today ? scheduledBadge(date, today) : serverBadge;
  if (badge === "upcoming") return <>{upcoming}</>;
  if (badge === "pending") return <>{pending}</>;
  return <>{old}</>;
}
