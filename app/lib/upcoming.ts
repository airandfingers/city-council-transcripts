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
