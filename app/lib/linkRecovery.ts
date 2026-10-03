import type { SitemapCityEntry } from "@/app/lib/sitemapCatalog";

/**
 * Recovering cut-off links (FIX-TRUNCATED-LINKS-001).
 *
 * YouTube shortens long URLs in video descriptions for display
 * ("https://counciloris.com/transcripts/2026-0..."), and a channel without
 * advanced features can't make them clickable, so people copy the shortened
 * text. The path they land on is a prefix of a real meeting URL, often with
 * a trailing "..." or "…". Instead of a dead-end 404, match it against the
 * cached meeting catalog: one match → go there; several → let them pick.
 */

const TRAILING_TRUNCATION = /(?:\s|\.{2,}|…|%E2%80%A6)+$/i;
/** Shorter than this, a prefix matches too much to be a useful guess. */
const MIN_PREFIX_LENGTH = 4;

/** The slug without a trailing ellipsis ("...", "…") or whitespace. */
export function stripTruncation(slug: string): string {
  return slug.replace(TRAILING_TRUNCATION, "").replace(/\/+$/, "");
}

export type MeetingCandidate = { slug: string; date: string; stateCode: string; citySlug: string };

/**
 * Catalog meetings whose slug starts with the (de-truncated) requested slug,
 * newest first. `total` is the full count; `matches` is capped at `limit`.
 */
export function meetingCandidates(
  catalog: SitemapCityEntry[],
  requestedSlug: string,
  limit = 12,
): { prefix: string; matches: MeetingCandidate[]; total: number } {
  const prefix = stripTruncation(requestedSlug);
  if (prefix.length < MIN_PREFIX_LENGTH) return { prefix, matches: [], total: 0 };
  const needle = prefix.toLowerCase();
  const all: MeetingCandidate[] = [];
  for (const city of catalog) {
    for (const m of city.meetings) {
      if (m.slug.toLowerCase().startsWith(needle)) {
        all.push({ slug: m.slug, date: m.date, stateCode: city.stateCode, citySlug: city.slug });
      }
    }
  }
  all.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug)));
  return { prefix, matches: all.slice(0, limit), total: all.length };
}
