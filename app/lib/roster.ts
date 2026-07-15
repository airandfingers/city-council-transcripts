/**
 * Resolving a RosterMember's title as-of a given meeting date. Titles can be
 * concurrent (e.g. a Mayor Pro Tem is still a Councilmember) — `isPrimary`
 * picks the single title to display. Mirrors the Python resolver in
 * city-council-transcriber's webapp/helpers.py::_resolve_title_at — keep the
 * two in sync.
 */

export type TitleEntry = {
  title: string;
  startDate: string | null;
  endDate: string | null;
  isPrimary?: boolean;
};

export type RosterMemberRow = {
  globalSpeakerUuid: string | null;
  name: string;
  titles: TitleEntry[];
};

/** Format a Date as "YYYY-MM-DD" (UTC) for lexicographic date comparison. */
function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Resolve the displayed title as of a given date.
 *
 * Active titles are those where startDate <= asOf <= (endDate ?? infinity),
 * inclusive on both ends. Among active titles, prefers the one marked
 * isPrimary, then falls back to the most recently started. Returns null if
 * no title is active on that date (do not fall back to an arbitrary title).
 */
export function resolveTitleAt(
  titles: TitleEntry[],
  asOf: Date,
): string | null {
  if (!titles || titles.length === 0) return null;

  const asOfStr = toDateString(asOf);
  const active = titles.filter((t) => {
    if (!t.startDate || t.startDate > asOfStr) return false;
    if (t.endDate && t.endDate < asOfStr) return false;
    return true;
  });

  if (active.length === 0) return null;

  const primary = active.find((t) => t.isPrimary);
  if (primary) return primary.title;

  const mostRecent = [...active].sort((a, b) =>
    (b.startDate ?? "").localeCompare(a.startDate ?? ""),
  )[0];
  return mostRecent.title;
}

/** Prepend a resolved title to a speaker's name, e.g. "Mayor Jane Doe". */
export function speakerLabel(name: string, titleAsOf: string | null): string {
  return titleAsOf ? `${titleAsOf} ${name}` : name;
}

/** Build a globalSpeakerUuid -> title lookup for a set of roster rows as of a meeting date. */
export function buildTitleByUuid(
  members: RosterMemberRow[],
  meetingDate: Date,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const member of members) {
    if (!member.globalSpeakerUuid) continue;
    const title = resolveTitleAt(
      member.titles as TitleEntry[],
      meetingDate,
    );
    if (title) map.set(member.globalSpeakerUuid, title);
  }
  return map;
}
