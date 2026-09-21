/**
 * FIX-NEON-COMPUTE-CACHING-001: checks for the two things the compiler cannot.
 *
 *  1. The search corpus refactor changed *where* text is fetched, not *how* it
 *     is matched. `referenceMatch` below is a frozen copy of the pre-refactor
 *     inline loop in `searchMeetingsForCity`; the new pure matcher must agree
 *     with it on every fixture/query.
 *  2. `unstable_cache` stores `JSON.stringify(result)` and returns
 *     `JSON.parse(...)` on a hit, so a cached value must survive that round
 *     trip unchanged — TypeScript does not flag a `Date` that becomes a string.
 *     Both the corpus matcher and the sitemap grouping are run on a
 *     round-tripped copy and must produce identical output.
 *
 * Pure: no database, no Next runtime. Run via `tsx` (see the .mjs wrapper).
 */
import { tokenizeQuery, matchesAllTokens, buildMatchSnippet } from "../../app/lib/search";
import { summaryTypeLabel } from "../../app/lib/labels";
import {
  matchMeetingsInCorpus,
  toKeyPoints,
  type SearchCorpusMeeting,
  type MeetingSearchResult,
} from "../../app/lib/searchCorpus";
import { groupSitemapCatalog } from "../../app/lib/sitemapCatalog";

let failures = 0;
function check(label: string, ok: boolean, detail?: unknown) {
  if (ok) {
    console.log(`  ok   ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL ${label}${detail === undefined ? "" : `\n         ${JSON.stringify(detail)}`}`);
  }
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const roundTrip = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

// --- Frozen oracle: the pre-refactor loop, verbatim in behavior -------------
function referenceMatch(corpus: SearchCorpusMeeting[], tokens: string[]): MeetingSearchResult[] {
  const results: MeetingSearchResult[] = [];
  for (const m of corpus) {
    const visibleHaystack = `${m.title} ${m.summary ?? ""} ${m.logline ?? ""}`;
    const extraParts: { label: string; text: string }[] = m.items.map((item) => ({
      label: summaryTypeLabel(item.type),
      text: item.text,
    }));
    for (const topic of m.topics) {
      extraParts.push({ label: `Topic: ${topic.title}`, text: `${topic.title} ${topic.keyPoints.join(" ")}` });
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

const corpus: SearchCorpusMeeting[] = [
  {
    slug: "2026-09-02/city-council",
    title: "City Council Regular Meeting",
    logline: "Council debates the Hillcrest data center proposal",
    summary: "Members discussed zoning, parking minimums and a proposed data center.",
    items: [
      { type: "KEY_DECISION", text: "Approved a moratorium on new data center permits, 5-2." },
      { type: "ACTION_ITEM", text: "Staff to return with a parking study in October." },
    ],
    topics: [{ title: "Data Center Zoning", keyPoints: ["Noise limits", "Water use", "Tax abatement"] }],
  },
  {
    slug: "2026-08-19/planning-commission",
    title: "Planning Commission",
    logline: null,
    summary: null,
    items: [{ type: "TIMELINE_BULLET", text: "Public comment on the Elm Street bike lane." }],
    topics: [{ title: "Bike Infrastructure", keyPoints: ["Protected lanes", "Budget shortfall"] }],
  },
  {
    slug: "2026-07-08/parks-commission",
    title: "Parks & Recreation Commission",
    logline: "Splash pad hours extended",
    summary: "Routine business.",
    items: [],
    topics: [],
  },
];

const queries = [
  "data center", // in logline + summary -> visible, no extra snippet
  "moratorium", // only in a key decision -> extra snippet
  "moratorium zoning", // tokens spread across surfaces: AND across the combined haystack
  "tax abatement", // topic key points only
  "elm street", // timeline bullet only
  "PARKING", // case-insensitive; summary + action item
  "bike lane budget", // mixes a timeline bullet and topic key points
  "splash", // one meeting, visible
  "zzz-no-such-term", // nothing
  "  ", // whitespace-only -> no tokens
  "parks & recreation", // punctuation normalization
];

console.log("search corpus: matcher parity with the pre-refactor loop");
for (const q of queries) {
  const tokens = tokenizeQuery(q);
  if (tokens.length === 0) {
    check(`"${q}" -> no tokens (caller returns [] before matching)`, true);
    continue;
  }
  const expected = referenceMatch(corpus, tokens);
  const actual = matchMeetingsInCorpus(corpus, tokens);
  check(`"${q}" matches the reference (${actual.length} hit(s))`, same(actual, expected), { expected, actual });
}

console.log("search corpus: shape of the extra-snippet contract");
{
  const moratorium = matchMeetingsInCorpus(corpus, tokenizeQuery("moratorium"));
  check("key-decision-only match carries a labelled snippet", moratorium[0]?.extraSnippet?.label === summaryTypeLabel("KEY_DECISION"), moratorium);
  const spread = matchMeetingsInCorpus(corpus, tokenizeQuery("moratorium zoning"));
  check("tokens spread across visible text and a key decision still match, with a snippet", spread.length === 1 && spread[0].extraSnippet !== null, spread);
  const visible = matchMeetingsInCorpus(corpus, tokenizeQuery("splash"));
  check("a match already visible in title/logline/summary has no extra snippet", visible.length === 1 && visible[0].extraSnippet === null, visible);
  const topic = matchMeetingsInCorpus(corpus, tokenizeQuery("tax abatement"));
  check("topic-only match is labelled `Topic: <title>`", topic[0]?.extraSnippet?.label === "Topic: Data Center Zoning", topic);
}

console.log("search corpus: survives unstable_cache's JSON round trip");
for (const q of queries) {
  const tokens = tokenizeQuery(q);
  if (tokens.length === 0) continue;
  check(`"${q}" is identical on a JSON-round-tripped corpus`, same(matchMeetingsInCorpus(roundTrip(corpus), tokens), matchMeetingsInCorpus(corpus, tokens)));
}

console.log("search corpus: keyPoints normalization");
check("non-array keyPoints -> []", same(toKeyPoints(null), []) && same(toKeyPoints({ a: 1 }), []) && same(toKeyPoints("x"), []));
check("array keyPoints pass through", same(toKeyPoints(["a", "b"]), ["a", "b"]));

console.log("sitemap catalog: grouping");
const cities = [
  { stateCode: "co", slug: "fort-collins" },
  { stateCode: "wa", slug: "seattle" },
  { stateCode: "ca", slug: "montebello" }, // no meetings, no areas: must still appear
];
const meetings = [
  { slug: "2026-09-02/a", date: new Date("2026-09-02T00:00:00.000Z"), city: cities[0] },
  { slug: "2026-08-19/b", date: new Date("2026-08-19T00:00:00.000Z"), city: cities[1] },
  { slug: "2026-07-08/c", date: new Date("2026-07-08T00:00:00.000Z"), city: cities[0] },
  { slug: "2026-01-01/orphan", date: new Date("2026-01-01T00:00:00.000Z"), city: { stateCode: "zz", slug: "nowhere" } },
];
const areas = [
  { slug: "housing", city: cities[0] },
  { slug: "transit", city: cities[1] },
  { slug: "housing_costs", city: cities[0] },
];
const catalog = groupSitemapCatalog(cities, meetings, areas);
check("one entry per city, in the order given", same(catalog.map((c) => `${c.stateCode}/${c.slug}`), ["co/fort-collins", "wa/seattle", "ca/montebello"]), catalog);
check("a city's meetings keep the caller's (newest-first) order", same(catalog[0].meetings.map((m) => m.slug), ["2026-09-02/a", "2026-07-08/c"]), catalog[0]);
check("rows for an unknown city are dropped, not attached elsewhere", !catalog.some((c) => c.meetings.some((m) => m.slug.includes("orphan"))));
check("a city with no rows is kept with empty lists", catalog[2].meetings.length === 0 && catalog[2].areaSlugs.length === 0);
check("interest-area slugs group by city", same(catalog[0].areaSlugs, ["housing", "housing_costs"]) && same(catalog[1].areaSlugs, ["transit"]), catalog);
check("dates are ISO strings, not Date objects", catalog[0].meetings.every((m) => typeof m.date === "string" && m.date.endsWith("Z")), catalog[0]);
check("survives unstable_cache's JSON round trip unchanged", same(roundTrip(catalog), catalog));

if (failures > 0) {
  console.error(`\ncache-boundary-check: ${failures} check(s) failed`);
  process.exit(1);
}
console.log("\ncache-boundary-check: all checks passed");
