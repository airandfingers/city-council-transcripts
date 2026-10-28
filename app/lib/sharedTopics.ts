/**
 * Groups every city's interest areas into the cross-city topic list behind
 * /topics (FIX-GLOBAL-TOPICS-NAV-001).
 *
 * The transcriber gives every city the same baseline areas (Housing, Data
 * Centers, Finance & Budget, …) under the same slug, so "the same topic in
 * several cities" is simply "the same slug in several cities". No
 * globalTopicId column needed. A slug only one city tracks stays on that
 * city's own topics page, as does a shared one no city has discussed yet.
 *
 * Pure and DB-free so it can be checked without a database. The result goes
 * through `unstable_cache` (JSON round trip), so it holds only primitives.
 */

export type SharedTopicCity = {
  stateCode: string;
  citySlug: string;
  cityName: string;
  stateName: string;
  meetingsDiscussed: number;
};

export type SharedTopic = {
  slug: string;
  name: string;
  description: string | null;
  /** Sum of `meetingsDiscussed` across cities; the page's sort key. */
  meetingsDiscussed: number;
  /** Most-discussed city first. */
  cities: SharedTopicCity[];
};

type AreaRow = {
  slug: string;
  name: string;
  description: string | null;
  meetingsDiscussed: number | null;
  city: { stateCode: string; slug: string; name: string; stateName: string };
};

export function groupSharedTopics(areas: AreaRow[], minCities = 2): SharedTopic[] {
  const bySlug = new Map<string, AreaRow[]>();
  for (const a of areas) {
    const rows = bySlug.get(a.slug);
    if (rows) rows.push(a);
    else bySlug.set(a.slug, [a]);
  }

  const topics: SharedTopic[] = [];
  for (const [slug, rows] of bySlug) {
    if (rows.length < minCities) continue;
    const cities = rows
      .map((r) => ({
        stateCode: r.city.stateCode,
        citySlug: r.city.slug,
        cityName: r.city.name,
        stateName: r.city.stateName,
        meetingsDiscussed: r.meetingsDiscussed ?? 0,
      }))
      .sort((x, y) => y.meetingsDiscussed - x.meetingsDiscussed || x.cityName.localeCompare(y.cityName));
    const meetingsDiscussed = cities.reduce((sum, c) => sum + c.meetingsDiscussed, 0);
    // Like the city page's hot topics: a topic no city has discussed yet
    // would be a card of "not yet discussed" chips.
    if (meetingsDiscussed === 0) continue;
    topics.push({
      slug,
      name: mostCommon(rows.map((r) => r.name)),
      description: rows.find((r) => r.description)?.description ?? null,
      meetingsDiscussed,
      cities,
    });
  }
  return topics.sort((x, y) => y.meetingsDiscussed - x.meetingsDiscussed || x.name.localeCompare(y.name));
}

/** A city can rename a shared area; show the name most cities use. Ties go
 * to the first seen. */
function mostCommon(names: string[]): string {
  const counts = new Map<string, number>();
  for (const n of names) counts.set(n, (counts.get(n) ?? 0) + 1);
  let best = names[0];
  for (const [n, c] of counts) if (c > (counts.get(best) ?? 0)) best = n;
  return best;
}
