/**
 * Percent-encoded *unreserved* characters (RFC 3986 §2.3: A–Z a–z 0–9 - . _ ~)
 * are equivalent to the characters themselves, and `encodeURIComponent` — which
 * builds every canonical URL on this site (see transcriptPath.ts) — never
 * encodes them. So a path containing e.g. `%2D` or `%5F` is always a
 * non-canonical spelling of some canonical path.
 *
 * Why this matters (INVESTIGATE-NEON-STRAY-WAKES-001, measured 2026-10-03):
 * Next decodes these in `params`, so the page renders the real meeting/city
 * and never redirects — but the cache keys on the raw URL. A transcript URL
 * spelled with `%2D` was a cache MISS on every request: a full render from
 * Neon and a 5-minute compute wake each time a crawler fetched it.
 *
 * Only unreserved characters are decoded. Reserved and other encodings
 * (`%20`, `%2F`, `%25`, non-ASCII) are left exactly as they are — canonical
 * slugs legitimately contain `%20`, and decoding `%2F` would change the path's
 * segment structure.
 */
const UNRESERVED_ESCAPE = /%(2[dD]|2[eE]|5[fF]|7[eE]|3[0-9]|4[1-9a-fA-F]|5[0-9aA]|6[1-9a-fA-F]|7[0-9aA])/g;

/** The canonical spelling of `pathname`, or null if it is already canonical. */
export function canonicalEncodedPath(pathname: string): string | null {
  if (!pathname.includes("%")) return null;
  const decoded = pathname.replace(UNRESERVED_ESCAPE, (_m, hex: string) => String.fromCharCode(parseInt(hex, 16)));
  return decoded === pathname ? null : decoded;
}
