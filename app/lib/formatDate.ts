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

/**
 * Does `title` already spell out a "Month Day, Year"-shaped date somewhere
 * in it? Some cities' scraped titles do (Monterey Park: "City Council
 * Meeting — July 15, 2026"); others don't (Fort Collins:
 * "City Council Regular Meeting"). Used to decide whether to render a
 * *separate* date alongside the title — display suppression only, so a
 * title that already shows its date doesn't get a redundant one appended.
 *
 * This never feeds `Meeting.date` itself — that column stays the single
 * authoritative source, populated upstream by the transcriber's own
 * never-guess title/upload-date parsing (see `parse_meeting_date_from_title`
 * in city-council-transcriber/src/meeting_scraper.py). This is a much
 * looser pattern than that parser on purpose: false positives here just
 * hide a redundant date, where false positives there would risk minting a
 * wrong meeting directory.
 */
const _TITLE_DATE_PATTERN =
  /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s*\d{4}\b/i;

export function titleIncludesDate(title: string): boolean {
  return _TITLE_DATE_PATTERN.test(title);
}

/**
 * `title`, with the meeting date appended when the title doesn't already
 * show one. Shared by the transcript page and the admin/subscriber digest
 * builders so a date-less title ("City Council Regular Meeting") reads the
 * same everywhere it's surfaced, not just on the transcript page itself —
 * digest emails render `Alert.content.subject` (a title snapshot taken at
 * alert-creation time), which is exactly as date-less as the source title
 * was and needs the same suppression-aware append.
 */
export function titleWithDate(title: string, date: Date): string {
  return titleIncludesDate(title) ? title : `${title} — ${formatMeetingDate(date)}`;
}
