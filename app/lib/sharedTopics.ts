/**
 * Groups every city's interest areas into the cross-city topic list behind
 * /topics (FIX-GLOBAL-TOPICS-NAV-001, FEAT-GLOBAL-TOPIC-GROUPING-001).
 *
 * An area joins the topic named by its `globalTopicId`, the transcriber's
 * config/global_topics.json tag (Seattle's "tenant_protections" → "housing",
 * Fort Collins' "flock_cameras" → "privacy_surveillance"). Untagged areas,
 * and rows published before the column existed, fall back to their slug:
 * every city gets the baseline areas under the same slug, so those still
 * group. A topic only one city tracks stays on that city's own topics page,
 * as does a shared one no city has discussed yet.
 *
 * Pure and DB-free so it can be checked without a database. The result goes
 * through `unstable_cache` (JSON round trip), so it holds only primitives.
 */

export type SharedTopicArea = {
  stateCode: string;
  citySlug: string;
  cityName: string;
  stateName: string;
  /** The city's own area: its topic page lives at /{state}/{city}/topics/{areaSlug}. */
  areaSlug: string;
  areaName: string;
  meetingsDiscussed: number;
};

export type SharedTopic = {
  /** The global topic id (or the shared slug, for untagged areas). */
  slug: string;
  name: string;
  description: string | null;
  /** Sum of `meetingsDiscussed` across areas; the page's sort key. */
  meetingsDiscussed: number;
  /** Most-discussed first. A city can have more than one (Seattle's
   * "Housing" and "Tenant Protections" are both housing). */
  areas: SharedTopicArea[];
};

type AreaRow = {
  slug: string;
  name: string;
  description: string | null;
  source: string | null;
  /** Undefined when read before the column existed in the database. */
  globalTopicId?: string | null;
  meetingsDiscussed: number | null;
  city: { stateCode: string; slug: string; name: string; stateName: string };
};

export function groupSharedTopics(rows: AreaRow[], minCities = 2): SharedTopic[] {
  const byTopic = new Map<string, AreaRow[]>();
  for (const r of rows) {
    const key = r.globalTopicId || r.slug;
    const group = byTopic.get(key);
    if (group) group.push(r);
    else byTopic.set(key, [r]);
  }

  const topics: SharedTopic[] = [];
  for (const [key, group] of byTopic) {
    if (new Set(group.map(cityKey)).size < minCities) continue;
    const areas = withoutIdleDuplicates(
      group.map((r) => ({
        stateCode: r.city.stateCode,
        citySlug: r.city.slug,
        cityName: r.city.name,
        stateName: r.city.stateName,
        areaSlug: r.slug,
        areaName: r.name,
        meetingsDiscussed: r.meetingsDiscussed ?? 0,
      })),
    ).sort((x, y) => y.meetingsDiscussed - x.meetingsDiscussed || x.cityName.localeCompare(y.cityName));
    const meetingsDiscussed = areas.reduce((sum, a) => sum + a.meetingsDiscussed, 0);
    // Like the city page's hot topics: a topic no city has discussed yet
    // would be a card of "not yet discussed" chips.
    if (meetingsDiscussed === 0) continue;
    const canonical = canonicalRow(key, group);
    topics.push({
      slug: key,
      name: canonical?.name ?? mostCommon(group.map((r) => r.name)),
      // Only the registry's own text describes the whole topic. A city's
      // custom description is written for the classifier and can contradict
      // the grouping (Monterey Park's "housing" says it is "distinct from
      // ... Tenant Protections", which this topic includes).
      description: group.find((r) => r.source === "baseline" && r.description)?.description ?? null,
      meetingsDiscussed,
      areas,
    });
  }
  return topics.sort((x, y) => y.meetingsDiscussed - x.meetingsDiscussed || x.name.localeCompare(y.name));
}

function cityKey(r: AreaRow): string {
  return `${r.city.stateCode}/${r.city.slug}`;
}

/** The row that names the whole topic: a baseline area carries the global
 * registry's own name; failing that, the area whose slug is the topic id. A city's custom area (Monterey Park's older
 * "spending") shouldn't name the shared "Finance & Budget" topic. */
function canonicalRow(key: string, group: AreaRow[]): AreaRow | undefined {
  return group.find((r) => r.source === "baseline") ?? group.find((r) => r.slug === key);
}

/** A city with two areas in one topic shows only the discussed ones: a
 * never-discussed "Housing" chip beside the city's busy "Tenant Protections"
 * is noise. A city with nothing discussed keeps one chip. */
function withoutIdleDuplicates(areas: SharedTopicArea[]): SharedTopicArea[] {
  const discussedCities = new Set(
    areas.filter((a) => a.meetingsDiscussed > 0).map((a) => `${a.stateCode}/${a.citySlug}`),
  );
  const keptIdle = new Set<string>();
  return areas.filter((a) => {
    const city = `${a.stateCode}/${a.citySlug}`;
    if (a.meetingsDiscussed > 0) return true;
    if (discussedCities.has(city) || keptIdle.has(city)) return false;
    keptIdle.add(city);
    return true;
  });
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
