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
 *
 * Since Next 16.4 (#112, merged 2026-11-02) `params` arrive already decoded:
 * the canonical `/transcripts/2026-04-01/City%20Council` gives
 * `["2026-04-01", "City Council"]`. Comparing that to the encoded canonical
 * path redirected every slug with a space to itself, an endless 308 loop on
 * 44 meetings (FIX-TRANSCRIPT-SLUG-DECODED-PARAMS-001). So segments that are
 * already the decoded slug count as canonical too; only segments that still
 * decode to something else (an encoded `/`) redirect.
 */
export function resolveTranscriptSlug(segments: string[]): {
  slug: string;
  redirectTo: string | null;
} {
  const slug = segments.map(safeDecode).join("/");
  const canonical = transcriptPath(slug);
  const raw = segments.join("/");
  const isCanonical = raw === slug || `/transcripts/${raw}` === canonical;
  return { slug, redirectTo: isCanonical ? null : canonical };
}
