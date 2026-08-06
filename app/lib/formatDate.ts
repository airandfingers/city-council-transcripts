/**
 * Shared date-only formatting for meeting/city calendar dates.
 *
 * `Meeting.date` (and similar timestamp fields we treat as calendar dates,
 * not date-times) is stored as UTC midnight — there is no meaningful
 * time-of-day component. `Date.prototype.toLocaleDateString()` without an
 * explicit `timeZone` uses the *executing* environment's local timezone,
 * which is fine when a Server Component renders it (Vercel's runtime is
 * UTC), but breaks silently the moment the same code executes in a client
 * component: a viewer in any US timezone (all UTC-negative) sees the
 * calendar date shifted back by one day, e.g. a meeting stored as
 * `2026-08-05T00:00:00Z` renders as "Aug 4" in Pacific time.
 *
 * Confirmed live in production (2026-08-06, user report): MeetingCard is
 * rendered from MeetingFilter, a "use client" component, so its date
 * formatting genuinely executes in the browser and was showing this
 * one-day-early date for viewers west of UTC.
 *
 * Always use this helper (not `date.toLocaleDateString()` directly) for
 * any calendar-date display, so the date shown is the same regardless of
 * where the formatting call actually runs.
 */
export function formatMeetingDate(
  date: Date,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" },
): string {
  return date.toLocaleDateString("en-US", { ...options, timeZone: "UTC" });
}
