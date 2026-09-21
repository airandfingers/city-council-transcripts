/**
 * Pure matching over a city's cached search corpus.
 *
 * Split out of `cityData.ts` (FIX-NEON-COMPUTE-CACHING-001) so the corpus can
 * be fetched once per city and cached, while the token matching — the part
 * with actual behavior — stays a plain function of (corpus, tokens) that a
 * check script can exercise without a database. Semantics are unchanged from
 * the previous inline loop in `searchMeetingsForCity` (FEAT-SEARCH-SERVERSIDE-
 * SURFACE-001); see that function's docs for the matching rules.
 *
 * Everything in `SearchCorpusMeeting` is JSON-safe on purpose: the corpus goes
 * through `unstable_cache`, which stores `JSON.stringify(result)` and returns
 * `JSON.parse(...)` on a hit, so a `Date` or `bigint` here would silently
 * change shape between a cache miss and a hit while TypeScript still claimed
 * otherwise.
 */

import { matchesAllTokens, buildMatchSnippet } from "@/app/lib/search";
import { summaryTypeLabel } from "@/app/lib/labels";

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

export type SearchCorpusMeeting = {
  slug: string;
  title: string;
  logline: string | null;
  summary: string | null;
  /** KEY_DECISION / ACTION_ITEM / TIMELINE_BULLET rows. */
  items: { type: string; text: string }[];
  /** `keyPoints` is already normalized to strings (see toKeyPoints). */
  topics: { title: string; keyPoints: string[] }[];
};

/** `TopicSummary.keyPoints` is a Json column; treat anything that isn't an
 * array as "no key points", exactly as the pre-cache code did. */
export function toKeyPoints(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : [];
}

/** Meetings in `corpus` whose combined text matches every token. */
export function matchMeetingsInCorpus(
  corpus: SearchCorpusMeeting[],
  tokens: string[],
): MeetingSearchResult[] {
  const results: MeetingSearchResult[] = [];
  for (const m of corpus) {
    const visibleHaystack = `${m.title} ${m.summary ?? ""} ${m.logline ?? ""}`;

    const extraParts: { label: string; text: string }[] = m.items.map((item) => ({
      label: summaryTypeLabel(item.type),
      text: item.text,
    }));
    for (const topic of m.topics) {
      extraParts.push({
        label: `Topic: ${topic.title}`,
        text: `${topic.title} ${topic.keyPoints.join(" ")}`,
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
