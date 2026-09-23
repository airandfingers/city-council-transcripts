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
