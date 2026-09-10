/**
 * Prisma-backed city data access.
 *
 * @module cityData
 */

import { cache } from "react";
import { unstable_cache } from "next/cache";
import prisma from "@/app/lib/prisma";
import type { City, Meeting, TranscriptLine } from "@prisma/client";
import { tokenizeQuery, matchesAllTokens, buildMatchSnippet } from "@/app/lib/search";
import { summaryTypeLabel } from "@/app/lib/labels";

export type { City, Meeting, TranscriptLine };

export type InterestAreaMeetingEntry = {
  meetingId: number;
  slug: string;
  title: string;
  date: Date;
  summary: string | null;
  confidence: number | null;
  startTimeSeconds: number | null;
  timecodeLabel: string | null;
  videoProvider: string | null;
};

export type InterestAreaWithMeetings = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  source: string | null;
  statusSummary: string | null;
  meetingsDiscussed: number | null;
  totalMeetings: number | null;
  mostRecentActivity: string | null;
  generatedAt: Date | null;
  meetings: InterestAreaMeetingEntry[];
};

/** Narrow projection for the city page's hot-topics block
 * (FEAT-CITY-HOT-TOPICS-001) — no per-meeting detail beyond the single
 * most-recent discussed date. Deliberately not InterestAreaWithMeetings,
 * which requires the full meetings[] join. */
export type InterestAreaSummary = {
  id: number;
  slug: string;
  name: string;
  statusSummary: string | null;
  meetingsDiscussed: number | null;
  mostRecentActivity: string | null;
  lastDate: Date | null;
};

/**
 * Validates that a string is a valid slug format.
 * Valid slugs contain lowercase letters, numbers, hyphens, and underscores
 * (InterestArea slugs are snake_case, generated from the transcriber's
 * area ids, e.g. "hybrid_meeting_requirements").
 *
 * @param value - The string to validate
 * @returns True if the value is a valid slug, false otherwise
 */
function isValidSlug(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  return /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(value);
}

/**
 * Validates that a string is a valid two-letter state code.
 *
 * @param value - The string to validate
 * @returns True if the value is a valid state code, false otherwise
 */
function isValidStateCode(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  return /^[a-z]{2}$/.test(value);
}

/**
 * Returns all cities for the directory.
 *
 * @returns An array of all cities
 * @example
 * const cities = await getCities();
 * // [{ stateCode: "ca", name: "Monterey Park", ... }, ...]
 */
export async function getCities(): Promise<Omit<City, "recentMeetingsSummary">[]> {
  return prisma.city.findMany({
    orderBy: [{ stateCode: "asc" }, { name: "asc" }],
    // recentMeetingsSummary (@db.Text) is only rendered on the individual
    // city page (getCityByParams), never by CityCard on this list.
    omit: { recentMeetingsSummary: true },
  });
}

/** Slug/state-only variant for the sitemap, which links to cities but
 * renders no city text at all. */
export function getCitySlugsOnly(): Promise<Array<{ stateCode: string; slug: string }>> {
  return prisma.city.findMany({
    orderBy: [{ stateCode: "asc" }, { name: "asc" }],
    select: { stateCode: true, slug: true },
  });
}

export type CityNavEntry = { stateCode: string; slug: string; name: string; stateName: string };

/**
 * Cities list for the persistent header's city switcher (SiteHeader), which
 * renders on every single page — unlike getCities()/getCitySlugsOnly()
 * (called once per page load by their own routes), fetching this uncached
 * would mean a Neon round-trip on every navigation across the whole site.
 * Wrapped in unstable_cache with a 1h revalidate: the city directory changes
 * approximately never (new cities are a manual onboarding event, not a
 * runtime one), so a page load momentarily not reflecting a city added
 * minutes ago is an acceptable trade-off for not re-querying on every
 * request. See the many FIX-NEON-EGRESS-* stories in city-council-
 * transcriber's prd.md for why this codebase treats per-request DB calls
 * from a widely-shared component as worth avoiding.
 */
export const getCitiesForNav = unstable_cache(
  async (): Promise<CityNavEntry[]> => {
    return prisma.city.findMany({
      orderBy: [{ stateCode: "asc" }, { name: "asc" }],
      select: { stateCode: true, slug: true, name: true, stateName: true },
    });
  },
  ["cities-for-nav"],
  { revalidate: 3600 },
);

/**
 * Returns a city by state code and city slug, or null if not found.
 * Validates input format before searching.
 *
 * @param stateCode - Two-letter state code in lowercase (e.g., "ca")
 * @param citySlug - URL-friendly city slug (e.g., "monterey-park")
 * @returns The matching city object, or null if not found or inputs are invalid
 * @example
 * const city = await getCityByParams("ca", "monterey-park");
 * if (city) {
 *   console.log(city.name); // "Monterey Park"
 * }
 */
export const getCityByParams = cache(function getCityByParams(
  stateCode: string,
  citySlug: string
): Promise<City | null> {
  // Validate input format
  if (!isValidStateCode(stateCode) || !isValidSlug(citySlug)) {
    return Promise.resolve(null);
  }

  return prisma.city.findUnique({
    where: {
      stateCode_slug: {
        stateCode,
        slug: citySlug,
      },
    },
  });
});

/**
 * Returns all meetings for a given city.
 * Returns an empty array for invalid inputs or if no meetings exist.
 *
 * @param stateCode - Two-letter state code in lowercase (e.g., "ca")
 * @param citySlug - URL-friendly city slug (e.g., "monterey-park")
 * @returns An array of meetings for the city, or empty array if none found or inputs invalid
 * @example
 * const meetings = await getMeetingsForCity("ca", "monterey-park");
 * // [{ slug: "...", title: "City Council Meeting...", ... }, ...]
 */
/** Fields MeetingCard/MeetingFilter actually render — everything else on
 * Meeting (minutesText, transcriptReviewNotes, timelineBullets,
 * youtubeOffsetModel, review flags, etc.) is dead weight on the city page
 * and would also be serialized into the client RSC payload via
 * MeetingFilter. */
const MEETING_CARD_SELECT = {
  slug: true,
  status: true,
  date: true,
  title: true,
  logline: true,
  summary: true,
  // logline is authored as a template with inline citation gaps (see
  // app/lib/citations.ts) — only the TL;DR's own references can complete
  // it. Narrowed to just `references` (not startTimeSeconds/timecodeLabel,
  // unused here) to keep the per-meeting payload small.
  summaryItems: {
    where: { type: "TLDR_BLOCK" },
    select: { references: true },
    take: 1,
  },
} as const;

export type MeetingCardData = {
  slug: string;
  status: string;
  date: Date;
  title: string;
  logline: string | null;
  summary: string | null;
  /** The logline's own citation references (see MEETING_CARD_SELECT) —
   * pass to annotateTextPlain() alongside `logline`, never render `logline`
   * bare (FIX-TIMESTAMP-LABEL-EMPTY-001). */
  tldrReferences: unknown;
};

// Same 2-day buffer, same reasoning, as the transcriber repo's own
// SCHEDULED -> OCCURRED aging sweep (NeonWriter.age_scheduled_meetings_
// to_occurred): `Meeting.date` stores midnight UTC of the meeting's
// calendar day (see formatDate.ts), not a real timestamp, so a naive
// `date >= now` goes false shortly after midnight UTC — up to ~7-8 hours
// *before* a Pacific-timezone evening meeting even starts — demoting a
// same-day meeting out of "Upcoming" while it's still hours away. Found
// live: a 2026-09-02 meeting stopped showing as upcoming and appeared
// under "Past Meetings" (with its "Upcoming meeting" badge still on,
// since MeetingCard reads raw status) once the UTC clock ticked past
// midnight into 2026-09-02, well before that evening's Pacific meeting.
const UPCOMING_MEETING_GRACE_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * Slugs of a city's genuinely-upcoming meetings, for MeetingFilter's
 * "Upcoming" grouping — the meetings themselves stay in one filterable
 * list (see MeetingFilter) rather than being split into a separate array,
 * so this only needs to say which ones qualify.
 *
 * A meeting only counts as upcoming if it's SCHEDULED *and* still within
 * the grace window above: the source data also has SCHEDULED rows with
 * dates over a decade in the past (upstream ingestion bug — nothing in
 * this repo sets that status), so status alone isn't a safe signal
 * either way.
 *
 * Lives here rather than inline in the page component so the `Date.now()`
 * call isn't flagged by the react-hooks/purity rule, which treats any
 * component-body call to an impure function as a lint error.
 */
export function getUpcomingMeetingSlugs(
  meetings: MeetingCardData[],
  now: number = Date.now()
): Set<string> {
  return new Set(
    meetings
      .filter(
        (m) =>
          m.status === "SCHEDULED" &&
          new Date(m.date).getTime() >= now - UPCOMING_MEETING_GRACE_MS
      )
      .map((m) => m.slug)
  );
}

export async function getMeetingsForCity(
  stateCode: string,
  citySlug: string
): Promise<MeetingCardData[]> {
  // Return empty array for invalid inputs
  if (!isValidStateCode(stateCode) || !isValidSlug(citySlug)) {
    return [];
  }

  const meetings = await prisma.meeting.findMany({
    where: {
      city: {
        stateCode,
        slug: citySlug,
      },
    },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    select: MEETING_CARD_SELECT,
  });

  return meetings.map(({ summaryItems, ...rest }) => ({
    ...rest,
    tldrReferences: summaryItems[0]?.references ?? null,
  }));
}

export type MeetingSearchResult = {
  slug: string;
  /** A short excerpt from a matched field MeetingCard doesn't otherwise
   * show (a key decision, action item, timeline bullet, or topic) — same
   * idea as MeetingCard's own `hiddenSummaryMatch`, extended to the wider
   * surface this adds. Null when the match is already visible in
   * title/logline/summary; MeetingCard keeps computing that narrower case
   * itself (it needs the logline-vs-summary distinction this function
   * doesn't track), so this deliberately doesn't duplicate it. */
  extraSnippet: { label: string; text: string } | null;
};

// MeetingSummaryItem types worth searching but not already fetched by
// MEETING_CARD_SELECT (SUMMARY_BLOCK/TLDR_BLOCK/PUBLIC_COMMENT_SUMMARY are
// either covered by `summary`/`logline` already or too verbose to be
// useful as a match reason here).
const EXTRA_SEARCHABLE_SUMMARY_TYPES = ["KEY_DECISION", "ACTION_ITEM", "TIMELINE_BULLET"] as const;

/**
 * Server-side search over a city's meetings (FEAT-SEARCH-SERVERSIDE-
 * SURFACE-001). Reproduces FEAT-SEARCH-NORMALIZE-HIGHLIGHT-001's exact
 * token-AND/normalization semantics (app/lib/search.ts, reused verbatim —
 * not reimplemented) but over a broader surface: key decisions, action
 * items, timeline bullets, and topic titles/key points, none of which
 * MEETING_CARD_SELECT fetches today (AC-1). A token may match anywhere
 * across title/logline/summary *and* this broader surface combined — e.g.
 * "data center vote" can match a meeting whose summary says "data center"
 * and whose key decisions mention a "vote", even though neither field
 * alone contains both tokens.
 *
 * Deliberately not backed by Postgres FTS or pg_trgm, despite the story's
 * original framing suggesting one of those. At this data volume (381
 * meetings, ~9K summary-item/topic rows as of 2026-09-09) a plain
 * server-side pass over Prisma-fetched text is both simpler and
 * semantically identical to what's already shipped, where FTS's stemming
 * or pg_trgm's fuzzy/similarity matching would each quietly change
 * matching behavior from what FEAT-SEARCH-NORMALIZE-HIGHLIGHT-001's AC-4
 * scoped out ("no fuzzy/trigram matching"). Revisit if/when a second city
 * reaches Seattle's volume, or real latency here is profiled and found
 * wanting — not before.
 *
 * Callers (MeetingFilter) should treat this as authoritative for text
 * matching once a query is non-empty — it already covers
 * title/logline/summary, so there's no need to separately re-check those
 * client-side. An empty query returns [] (no meetings "match" nothing);
 * callers should treat an empty query as "show everything" themselves,
 * same convention as `matchesAllTokens([])`.
 */
export async function searchMeetingsForCity(
  stateCode: string,
  citySlug: string,
  query: string
): Promise<MeetingSearchResult[]> {
  if (!isValidStateCode(stateCode) || !isValidSlug(citySlug)) return [];
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return [];

  const meetings = await prisma.meeting.findMany({
    where: {
      city: { stateCode, slug: citySlug },
    },
    select: {
      slug: true,
      title: true,
      logline: true,
      summary: true,
      summaryItems: {
        where: { type: { in: [...EXTRA_SEARCHABLE_SUMMARY_TYPES] } },
        select: { type: true, text: true },
      },
      topicSummaries: {
        select: { title: true, keyPoints: true },
      },
    },
  });

  const results: MeetingSearchResult[] = [];
  for (const m of meetings) {
    const visibleHaystack = `${m.title} ${m.summary ?? ""} ${m.logline ?? ""}`;

    const extraParts: { label: string; text: string }[] = m.summaryItems.map((item) => ({
      label: summaryTypeLabel(item.type),
      text: item.text,
    }));
    for (const topic of m.topicSummaries) {
      const keyPoints = Array.isArray(topic.keyPoints) ? (topic.keyPoints as string[]) : [];
      extraParts.push({
        label: `Topic: ${topic.title}`,
        text: `${topic.title} ${keyPoints.join(" ")}`,
      });
    }

    const fullHaystack = [visibleHaystack, ...extraParts.map((p) => p.text)].join(" ");
    if (!matchesAllTokens(fullHaystack, tokens)) continue;

    let extraSnippet: MeetingSearchResult["extraSnippet"] = null;
    if (!matchesAllTokens(visibleHaystack, tokens)) {
      for (const part of extraParts) {
        const snippet = buildMatchSnippet(part.text, tokens);
        if (snippet) {
          extraSnippet = { label: part.label, text: snippet };
          break;
        }
      }
    }

    results.push({ slug: m.slug, extraSnippet });
  }

  return results;
}

/** Narrow slug/date-only variant for the sitemap — that's all it renders
 * into <url> entries, and this is a route hit by every crawler. */
export function getMeetingSlugsForCity(
  stateCode: string,
  citySlug: string
): Promise<Array<{ slug: string; date: Date }>> {
  if (!isValidStateCode(stateCode) || !isValidSlug(citySlug)) {
    return Promise.resolve([]);
  }

  return prisma.meeting.findMany({
    where: {
      city: { stateCode, slug: citySlug },
    },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    select: { slug: true, date: true },
  });
}

export type LatestMeetingSummary = {
  slug: string;
  title: string;
  date: Date;
  logline: string | null;
  /** Pass to annotateTextPlain() alongside `logline` — see MeetingCardData.tldrReferences. */
  tldrReferences: unknown;
  startTimeSeconds: number | null;
  timecodeLabel: string | null;
};

/**
 * Returns the most recent meeting's logline (TL;DR) for a city, for display
 * at the top of the city page. Returns null if the city has no meetings or
 * inputs are invalid.
 */
export async function getLatestMeetingSummary(
  stateCode: string,
  citySlug: string,
): Promise<LatestMeetingSummary | null> {
  if (!isValidStateCode(stateCode) || !isValidSlug(citySlug)) {
    return null;
  }

  const meeting = await prisma.meeting.findFirst({
    where: { city: { stateCode, slug: citySlug } },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    select: {
      slug: true,
      title: true,
      date: true,
      logline: true,
      summaryItems: {
        where: { type: "TLDR_BLOCK" },
        select: { startTimeSeconds: true, timecodeLabel: true, references: true },
        take: 1,
      },
    },
  });

  if (!meeting) return null;

  const tldrBlock = meeting.summaryItems[0];
  return {
    slug: meeting.slug,
    title: meeting.title,
    date: meeting.date,
    logline: meeting.logline,
    tldrReferences: tldrBlock?.references ?? null,
    startTimeSeconds: tldrBlock?.startTimeSeconds ?? null,
    timecodeLabel: tldrBlock?.timecodeLabel ?? null,
  };
}

/**
 * Returns interest areas for a city, each with the meetings where it was
 * discussed (sorted most-recent-first).
 */
export async function getInterestAreasForCity(
  stateCode: string,
  citySlug: string,
): Promise<InterestAreaWithMeetings[]> {
  if (!isValidStateCode(stateCode) || !isValidSlug(citySlug)) {
    return [];
  }

  const areas = await prisma.interestArea.findMany({
    where: {
      city: { stateCode, slug: citySlug },
    },
    // select:-projected to the fields the mapping below actually reads
    // (cityId/runId/sortOrder/createdAt/updatedAt are internal bookkeeping,
    // never rendered) — was a bare `include:`, the last one on this page's
    // read path (FIX-NEON-EGRESS-CLIENT-001 covered the transcript page;
    // this is its city/topics-page counterpart).
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      source: true,
      statusSummary: true,
      meetingsDiscussed: true,
      totalMeetings: true,
      mostRecentActivity: true,
      generatedAt: true,
      meetingStatuses: {
        where: { discussed: true },
        select: {
          summary: true,
          confidence: true,
          startTimeSeconds: true,
          timecodeLabel: true,
          meeting: {
            select: { id: true, slug: true, title: true, date: true, videoProvider: true },
          },
        },
        orderBy: { meeting: { date: "desc" } },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return areas.map((a) => ({
    id: a.id,
    slug: a.slug,
    name: a.name,
    description: a.description,
    source: a.source,
    statusSummary: a.statusSummary,
    meetingsDiscussed: a.meetingsDiscussed,
    totalMeetings: a.totalMeetings,
    mostRecentActivity: a.mostRecentActivity,
    generatedAt: a.generatedAt,
    meetings: a.meetingStatuses.map((s) => ({
      meetingId: s.meeting.id,
      slug: s.meeting.slug,
      title: s.meeting.title,
      date: s.meeting.date,
      summary: s.summary,
      confidence: s.confidence,
      startTimeSeconds: s.startTimeSeconds,
      timecodeLabel: s.timecodeLabel,
      videoProvider: s.meeting.videoProvider,
    })),
  }));
}

/**
 * Narrow, capped projection of a city's interest areas for the city page's
 * hot-topics block (FEAT-CITY-HOT-TOPICS-001): only areas actually
 * discussed in a meeting, in curated sortOrder, capped at `limit`.
 *
 * Deliberately a sibling of getInterestAreasForCity rather than a
 * narrowing of it: topics/page.tsx reads area.meetings[0].date off that
 * function's full meetingStatuses join, so it can't be narrowed in place.
 * This one joins a single status row per area (take: 1, date only)
 * instead of the whole history — ~5 rows for a capped city page vs.
 * dozens/hundreds for the full listing — keeping the shared TopicCard's
 * right-rail date without the egress (cf. FIX-NEON-EGRESS-CLIENT-001).
 *
 * `meetingsDiscussed: { gt: 0 }` excludes NULL as well as 0 in Prisma, so
 * a freshly-curated, never-discussed area (e.g. a contested-siting area
 * with zero corroboration yet) is filtered out automatically.
 *
 * @returns Areas ordered by curated sortOrder, capped at `limit`. Empty
 * array if the city has no interest areas, none with real activity yet,
 * or inputs are invalid.
 */
export async function getInterestAreaSummariesForCity(
  stateCode: string,
  citySlug: string,
  limit = 5,
): Promise<InterestAreaSummary[]> {
  if (!isValidStateCode(stateCode) || !isValidSlug(citySlug)) {
    return [];
  }

  const areas = await prisma.interestArea.findMany({
    where: {
      city: { stateCode, slug: citySlug },
      meetingsDiscussed: { gt: 0 },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      statusSummary: true,
      meetingsDiscussed: true,
      mostRecentActivity: true,
      meetingStatuses: {
        where: { discussed: true },
        orderBy: { meeting: { date: "desc" } },
        take: 1,
        select: { meeting: { select: { date: true } } },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    take: limit,
  });

  return areas.map((a) => ({
    id: a.id,
    slug: a.slug,
    name: a.name,
    statusSummary: a.statusSummary,
    meetingsDiscussed: a.meetingsDiscussed,
    mostRecentActivity: a.mostRecentActivity,
    lastDate: a.meetingStatuses[0]?.meeting.date ?? null,
  }));
}

/**
 * Returns a single interest area by slug, with full meeting history.
 * Returns null if not found or inputs are invalid.
 */
export const getInterestArea = cache(async function getInterestArea(
  stateCode: string,
  citySlug: string,
  areaSlug: string,
): Promise<InterestAreaWithMeetings | null> {
  if (
    !isValidStateCode(stateCode) ||
    !isValidSlug(citySlug) ||
    !isValidSlug(areaSlug)
  ) {
    return null;
  }

  const area = await prisma.interestArea.findFirst({
    where: {
      slug: areaSlug,
      city: { stateCode, slug: citySlug },
    },
    // Same select: projection as getInterestAreasForCity above, including
    // the same `discussed: true` filter on meetingStatuses
    // (FIX-INTERESTAREA-COUNT-CONSISTENCY-001) -- this used to be
    // unfiltered here, so the detail-page timeline could include
    // PREVIEW-phase/not-discussed rows the index page's card never showed,
    // whenever such a row happened to carry a `summary`.
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      source: true,
      statusSummary: true,
      meetingsDiscussed: true,
      totalMeetings: true,
      mostRecentActivity: true,
      generatedAt: true,
      meetingStatuses: {
        where: { discussed: true },
        select: {
          summary: true,
          confidence: true,
          startTimeSeconds: true,
          timecodeLabel: true,
          meeting: {
            select: { id: true, slug: true, title: true, date: true, videoProvider: true },
          },
        },
        orderBy: { meeting: { date: "desc" } },
      },
    },
  });

  if (!area) return null;

  return {
    id: area.id,
    slug: area.slug,
    name: area.name,
    description: area.description,
    source: area.source,
    statusSummary: area.statusSummary,
    meetingsDiscussed: area.meetingsDiscussed,
    totalMeetings: area.totalMeetings,
    mostRecentActivity: area.mostRecentActivity,
    generatedAt: area.generatedAt,
    meetings: area.meetingStatuses.map((s) => ({
      meetingId: s.meeting.id,
      slug: s.meeting.slug,
      title: s.meeting.title,
      date: s.meeting.date,
      summary: s.summary,
      confidence: s.confidence,
      startTimeSeconds: s.startTimeSeconds,
      timecodeLabel: s.timecodeLabel,
      videoProvider: s.meeting.videoProvider,
    })),
  };
});

/**
 * Returns static params for generateStaticParams in dynamic routes.
 * Used by Next.js App Router to pre-render city pages at build time.
 *
 * @returns An array of param objects with state and city slugs
 * @example
 * // In app/[state]/[city]/page.tsx:
 * export async function generateStaticParams() {
 *   return await getStaticCityParams();
 * }
 * // Returns: [{ state: "ca", city: "monterey-park" }, ...]
 */
export async function getStaticCityParams(): Promise<
  Array<{ state: string; city: string }>
> {
  const cities = await prisma.city.findMany({
    select: {
      stateCode: true,
      slug: true,
    },
    orderBy: [{ stateCode: "asc" }, { slug: "asc" }],
  });

  return cities.map((city: { stateCode: string; slug: string }) => ({
    state: city.stateCode,
    city: city.slug,
  }));
}
