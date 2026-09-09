/**
 * Shared query normalization + AND-token matching + highlight-range
 * mapping for city/topic search (FEAT-SEARCH-NORMALIZE-HIGHLIGHT-001).
 * Used by MeetingFilter/TopicsFilter (client-side filtering over an
 * already-fetched list — see those components' own comments on that
 * scope tradeoff) and by MeetingCard/TopicsFilter's card rendering
 * (highlighting + match-context snippets).
 *
 * Design: normalize by folding case and any run of non-alphanumeric
 * characters (hyphens, underscores, punctuation, whitespace) down to a
 * single space, so "data-center", "data  center", and "Data Centers" all
 * normalize to the same token stream. A query is split into tokens on
 * that same normalization and matched with AND semantics — every token
 * must appear, in any order, as a substring — not as one contiguous
 * string, so "center data" matches "Data Centers" too.
 *
 * Fuzzy/trigram/edit-distance matching is explicitly out of scope (AC-4)
 * — this is exact substring matching per token, after normalization.
 */

const WORD_CHAR_RE = /[\p{L}\p{N}]/u;

/** Lowercase and fold every run of non-alphanumeric characters to a single
 * space, trimmed. "Data-Centers" -> "data centers". */
export function normalizeForSearch(s: string): string {
  let out = "";
  let prevWasSep = true; // starts true so a leading separator run emits nothing
  for (const ch of s) {
    if (WORD_CHAR_RE.test(ch)) {
      out += ch.toLowerCase();
      prevWasSep = false;
    } else if (!prevWasSep) {
      out += " ";
      prevWasSep = true;
    }
  }
  return out.trimEnd();
}

/** Split a query into normalized, deduped, non-empty tokens. */
export function tokenizeQuery(query: string): string[] {
  const norm = normalizeForSearch(query);
  if (!norm) return [];
  return Array.from(new Set(norm.split(" ").filter(Boolean)));
}

/** AND semantics: every token must appear as a substring somewhere in the
 * normalized haystack. An empty tokens list (no query typed) matches
 * everything, so callers can use this unconditionally rather than special-
 * casing "no query" themselves. */
export function matchesAllTokens(haystack: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const normHaystack = normalizeForSearch(haystack);
  return tokens.every((t) => normHaystack.includes(t));
}

export type HighlightRange = readonly [start: number, end: number];

/** Build a normalized copy of `text` alongside a same-length index array
 * mapping each normalized character back to its original `text` index —
 * same technique as findRefCursor (app/lib/citations.ts) — so a match
 * found in normalized space (where "data-center" and "data center" look
 * identical) can be highlighted at the correct position in the real,
 * unmodified, differently-punctuated text. */
function buildNormalizedIndex(text: string): { norm: string; origIdx: number[] } {
  const chars: string[] = [];
  const origIdx: number[] = [];
  let prevWasSep = true;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (WORD_CHAR_RE.test(ch)) {
      chars.push(ch.toLowerCase());
      origIdx.push(i);
      prevWasSep = false;
    } else if (!prevWasSep) {
      chars.push(" ");
      origIdx.push(i);
      prevWasSep = true;
    }
  }
  while (chars.length > 0 && chars[chars.length - 1] === " ") {
    chars.pop();
    origIdx.pop();
  }
  return { norm: chars.join(""), origIdx };
}

/** Find every match range (in ORIGINAL `text` coordinates, not normalized
 * coordinates) for every token, merged into a sorted, non-overlapping list
 * ready to render as highlights. Empty input or no matches returns []. */
export function findHighlightRanges(text: string, tokens: string[]): HighlightRange[] {
  if (!text || tokens.length === 0) return [];
  const { norm, origIdx } = buildNormalizedIndex(text);
  if (!norm) return [];

  const raw: [number, number][] = [];
  for (const token of tokens) {
    if (!token) continue;
    let from = 0;
    for (;;) {
      const idx = norm.indexOf(token, from);
      if (idx === -1) break;
      const normEnd = idx + token.length - 1;
      raw.push([origIdx[idx], origIdx[normEnd] + 1]);
      from = idx + token.length;
    }
  }
  if (raw.length === 0) return [];

  raw.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: [number, number][] = [raw[0]];
  for (let i = 1; i < raw.length; i++) {
    const last = merged[merged.length - 1];
    const [s, e] = raw[i];
    if (s <= last[1]) {
      last[1] = Math.max(last[1], e);
    } else {
      merged.push([s, e]);
    }
  }
  return merged;
}

/**
 * Short excerpt around the first match, for surfacing why a result matched
 * when the match landed in a fetched field the card doesn't otherwise show
 * (FEAT-SEARCH-NORMALIZE-HIGHLIGHT-001 AC-3 — e.g. a meeting whose title
 * and logline don't mention "Poudre" but whose summary does). Returns null
 * when there's no match to excerpt.
 */
export function buildMatchSnippet(
  text: string,
  tokens: string[],
  radius = 50,
): string | null {
  const ranges = findHighlightRanges(text, tokens);
  if (ranges.length === 0) return null;
  const [start, end] = ranges[0];
  const from = Math.max(0, start - radius);
  const to = Math.min(text.length, end + radius);
  const prefix = from > 0 ? "…" : "";
  const suffix = to < text.length ? "…" : "";
  return prefix + text.slice(from, to).trim() + suffix;
}
