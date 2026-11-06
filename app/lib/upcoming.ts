/**
 * Which upcoming meetings stay visible while the city page's Upcoming
 * group is collapsed (MeetingFilter). Showing only the soonest one hid the
 * next regular council meeting whenever a special meeting, work session or
 * commission meeting came first, so the collapsed view shows the soonest
 * meeting plus the next regular council meeting when that's a different
 * one. Meetings in between stay behind "Show N more".
 *
 * Titles differ by city ("City Council Regular Meeting" in Fort Collins
 * and Monterey Park, plain "City Council" in Seattle and Montebello), so
 * "regular" means a council meeting that isn't one of the known
 * non-regular kinds, rather than a title containing "Regular".
 */

const NON_REGULAR =
  /\b(special|work\s*session|study\s*session|workshop|briefing|committee|commission|board|closed\s*session)\b/i;

export function isRegularCouncilMeeting(title: string): boolean {
  return /\bcouncil\b/i.test(title) && !NON_REGULAR.test(title);
}

/** `upcoming` must already be sorted soonest-first. */
export function collapsedUpcoming<T extends { title: string }>(upcoming: T[]): T[] {
  if (upcoming.length === 0) return [];
  const [first] = upcoming;
  if (isRegularCouncilMeeting(first.title)) return [first];
  const nextRegular = upcoming.find((m) => isRegularCouncilMeeting(m.title));
  return nextRegular ? [first, nextRegular] : [first];
}

/*
 * Is a meeting's day past? (FIX-UPCOMING-PAST-DAY-001)
 *
 * `Meeting.date` stores midnight UTC of the meeting's calendar day (see
 * formatDate.ts), so the calendar day is just its UTC date. A meeting is
 * upcoming through the end of that day *in the city's time zone* and past
 * from the next local midnight.
 *
 * This replaced a flat 2-day grace after "now", which kept a Nov 4, 2026
 * special meeting under "Upcoming" all day Nov 5. Pages are cached until the
 * next publish (revalidate = false), so the server's answer is only right as
 * of render time: client components recompute it with useCityToday().
 */

/** City time zone by state. Unknown states use the westernmost zone, which
 * can only flip a meeting to "past" late, never early. */
const STATE_TIME_ZONES: Record<string, string> = {
  ca: "America/Los_Angeles",
  wa: "America/Los_Angeles",
  co: "America/Denver",
};
const DEFAULT_TIME_ZONE = "America/Los_Angeles";

export function cityTimeZone(stateCode: string): string {
  return STATE_TIME_ZONES[stateCode.toLowerCase()] ?? DEFAULT_TIME_ZONE;
}

/** "YYYY-MM-DD" of a stored meeting date (its UTC calendar day). */
export function meetingDay(date: string | Date): string {
  return new Date(date).toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" of `now` in `timeZone`. */
export function todayIn(timeZone: string, now: number): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
}

/** A SCHEDULED meeting this many days past still reads "transcript
 * pending"; older ones (the source data has SCHEDULED rows from 2010) get
 * no badge, since nothing is coming for them. */
export const PENDING_BADGE_DAYS = 14;

export type ScheduledBadge = "upcoming" | "pending" | null;

/** Badge for a SCHEDULED meeting, given today's date in its city. */
export function scheduledBadge(date: string | Date, today: string): ScheduledBadge {
  const day = meetingDay(date);
  if (day >= today) return "upcoming";
  const daysPast = (Date.parse(today) - Date.parse(day)) / 86_400_000;
  return daysPast <= PENDING_BADGE_DAYS ? "pending" : null;
}

/** Slugs of SCHEDULED meetings whose day hasn't passed yet in the city. */
export function upcomingSlugsAsOf(
  meetings: { slug: string; status: string; date: string | Date }[],
  today: string,
): Set<string> {
  return new Set(
    meetings
      .filter((m) => m.status === "SCHEDULED" && meetingDay(m.date) >= today)
      .map((m) => m.slug),
  );
}

/** scheduledBadge() as of now, for a server render. */
export function scheduledBadgeNow(date: string | Date, stateCode: string, now: number = Date.now()): ScheduledBadge {
  return scheduledBadge(date, todayIn(cityTimeZone(stateCode), now));
}
