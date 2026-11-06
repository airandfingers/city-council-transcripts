/** The one canonical URL path for a meeting slug (each `/`-separated part encoded). */
export function transcriptPath(slug: string): string {
  return `/transcripts/${slug.split("/").map(encodeURIComponent).join("/")}`;
}

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * The slug the route's `[...slug]` segments name, plus the canonical path when
 * the segments aren't canonically encoded (e.g. an encoded `/` as in `a%2Fb`).
 * Each URL spelling is its own ISR cache entry, so a variant is a full cold
 * render of the heaviest page in the app; redirecting sends it to the
 * already-cached canonical page without touching the database.
 *
 * Next already normalizes percent-encoded unreserved characters (`%5F`, `%2D`)
 * in `params`, so those variants look canonical here even though Vercel caches
 * them separately; catching them needs the raw path in `proxy.ts`, which runs on
 * every request, so it waits on evidence that such traffic matters
 * (FIX-NEON-TAG-ONLY-CACHES-001).
 */
export function resolveTranscriptSlug(segments: string[]): {
  slug: string;
  redirectTo: string | null;
} {
  const slug = segments.map(safeDecode).join("/");
  const canonical = transcriptPath(slug);
  const requested = `/transcripts/${segments.join("/")}`;
  return { slug, redirectTo: requested === canonical ? null : canonical };
}

function encodedSlug(slug: string): string {
  return slug.split("/").map(encodeURIComponent).join("/");
}

/** A meeting's plain, script-free transcript page (FEAT-TRANSCRIPT-PLAIN-PAGE-001).
 * Search engines index the transcript text here; the meeting page's
 * TranscriptViewer fetches it only when the reader opens the transcript, so
 * the text no longer rides along with every meeting-page view
 * (FIX-TRANSCRIPT-LAZY-LOAD-001). */
export function transcriptTextPath(slug: string): string {
  return `/transcript-text/${encodedSlug(slug)}`;
}

/** JSON for a meeting page's hidden tabs (Minutes, Agenda, Council Members &
 * Votes), fetched when one is opened (FIX-MEETING-TABS-LAZY-001). */
export function meetingTabsPath(slug: string): string {
  return `/meeting-tabs/${encodedSlug(slug)}`;
}

/** Every cached URL that shows one meeting's content. /api/revalidate purges
 * all of them together, and the publisher re-warms what it reports. */
export function meetingContentPaths(slug: string): string[] {
  return [transcriptPath(slug), transcriptTextPath(slug), meetingTabsPath(slug)];
}

/** JSON list of every meeting in a city, fetched when a reader goes past the
 * city page's first CITY_PAGE_INITIAL_MEETINGS (FIX-CITY-PAGE-RECENT-ONLY-001). */
export function cityMeetingsPath(stateCode: string, citySlug: string): string {
  return `/${stateCode}/${citySlug}/all-meetings`;
}
