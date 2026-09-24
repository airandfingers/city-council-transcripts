/**
 * Groups the three flat sitemap queries (cities, meetings, interest areas)
 * into one per-city catalog (FIX-NEON-COMPUTE-CACHING-001).
 *
 * The sitemap used to run 1 + 2 queries *per city* on every crawler hit.
 * `getSitemapCatalog` (cityData.ts) now builds this once per publish instead,
 * so crawler traffic never wakes the Neon endpoint. Pure and DB-free so it can be checked without a database.
 *
 * The result goes through `unstable_cache` (JSON round-trip), so meeting dates
 * are ISO *strings* here, never `Date`s: a `Date` would be a `Date` on a cache
 * miss and a string on a hit. `MetadataRoute.Sitemap`'s `lastModified` accepts
 * either, so strings pass straight through.
 */

export type SitemapCityEntry = {
  stateCode: string;
  slug: string;
  /** Newest first, in the order the caller supplied them. */
  meetings: { slug: string; date: string }[];
  areaSlugs: string[];
};

type CityKey = { stateCode: string; slug: string };

export function groupSitemapCatalog(
  cities: CityKey[],
  meetings: Array<{ slug: string; date: Date; city: CityKey }>,
  areas: Array<{ slug: string; city: CityKey }>,
): SitemapCityEntry[] {
  const key = (c: CityKey) => `${c.stateCode}/${c.slug}`;
  const byCity = new Map<string, SitemapCityEntry>();
  for (const c of cities) {
    byCity.set(key(c), { stateCode: c.stateCode, slug: c.slug, meetings: [], areaSlugs: [] });
  }
  for (const m of meetings) {
    byCity.get(key(m.city))?.meetings.push({ slug: m.slug, date: m.date.toISOString() });
  }
  for (const a of areas) {
    byCity.get(key(a.city))?.areaSlugs.push(a.slug);
  }
  return [...byCity.values()];
}

/*
 * Catalog membership checks (FIX-NEON-TOPIC-PAGES-CHEAP-404-001). Public
 * pages ask these before querying Neon, so a request for a city, topic or
 * meeting that doesn't exist is answered from the cached catalog instead of
 * waking the compute: 404s are never cached, so every stray crawler URL used
 * to cost a full database round trip (and, on Neon's free plan, a >=5-minute
 * wake).
 */

function findCity(catalog: SitemapCityEntry[], stateCode: string, slug: string) {
  return catalog.find((c) => c.stateCode === stateCode && c.slug === slug);
}

export function catalogHasCity(catalog: SitemapCityEntry[], stateCode: string, slug: string): boolean {
  return findCity(catalog, stateCode, slug) !== undefined;
}

export function catalogHasArea(
  catalog: SitemapCityEntry[],
  stateCode: string,
  citySlug: string,
  areaSlug: string,
): boolean {
  return findCity(catalog, stateCode, citySlug)?.areaSlugs.includes(areaSlug) ?? false;
}

export function catalogHasMeeting(catalog: SitemapCityEntry[], meetingSlug: string): boolean {
  return catalog.some((c) => c.meetings.some((m) => m.slug === meetingSlug));
}
