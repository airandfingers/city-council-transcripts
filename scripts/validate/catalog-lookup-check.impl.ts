import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  catalogHasArea,
  catalogHasCity,
  catalogHasMeeting,
  type SitemapCityEntry,
} from "../../app/lib/sitemapCatalog";

const catalog: SitemapCityEntry[] = [
  {
    stateCode: "wa",
    slug: "seattle",
    meetings: [{ slug: "2026-07-08/Housing_ Arts_ and Civil Rights Committee", date: "2026-07-08T00:00:00.000Z" }],
    areaSlugs: ["jumpstart_tax"],
  },
  {
    stateCode: "ca",
    slug: "monterey-park",
    meetings: [{ slug: "monterey-park-2026-01-27-city-council", date: "2026-01-27T00:00:00.000Z" }],
    areaSlugs: [],
  },
];

// Known things are always found (a false "missing" would 404 a real page).
assert.equal(catalogHasCity(catalog, "wa", "seattle"), true);
assert.equal(catalogHasArea(catalog, "wa", "seattle", "jumpstart_tax"), true);
assert.equal(catalogHasMeeting(catalog, "2026-07-08/Housing_ Arts_ and Civil Rights Committee"), true);
assert.equal(catalogHasMeeting(catalog, "monterey-park-2026-01-27-city-council"), true);

// Unknown things are reported missing.
assert.equal(catalogHasCity(catalog, "zz", "nowhere"), false);
assert.equal(catalogHasCity(catalog, "ca", "seattle"), false, "city must match its own state");
assert.equal(catalogHasArea(catalog, "ca", "monterey-park", "jumpstart_tax"), false, "area must match its own city");
assert.equal(catalogHasArea(catalog, "zz", "nowhere", "jumpstart_tax"), false);
assert.equal(catalogHasMeeting(catalog, "2026-07-08/Housing_%20Arts_%20and%20Civil%20Rights%20Committee"), false);
assert.equal(catalogHasMeeting(catalog, "x/y"), false);

// Source-level wiring: each public lookup consults the catalog before Neon,
// and falls back to Neon when the catalog is unavailable.
const cityData = readFileSync("app/lib/cityData.ts", "utf8");
const fnBody = (name: string) => {
  const start = cityData.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} not found`);
  return cityData.slice(start, cityData.indexOf("\n});", start));
};
for (const [name, check] of [
  ["getCityByParams", "catalogHasCity"],
  ["getInterestArea", "catalogHasArea"],
] as const) {
  const body = fnBody(name);
  assert.ok(body.indexOf(check) >= 0 && body.indexOf(check) < body.indexOf("prisma."), `${name} must check the catalog before querying`);
  assert.match(body, /catalog && !/, `${name} must fall back to Neon when the catalog is unavailable`);
}
assert.match(cityData, /catalog === null \|\| catalogHasMeeting/, "mayBeKnownMeeting must fall back when the catalog is unavailable");
assert.match(cityData, /catalog\.length > 0 \? catalog : null/, "an empty catalog must count as unavailable");

// Transcript pages check existence per meeting instead (see
// per-meeting-refresh-check), so a known-missing slug is still a 404
// without the full meeting query.
const transcriptPage = readFileSync("app/transcripts/[...slug]/page.tsx", "utf8");
const getMeeting = transcriptPage.slice(transcriptPage.indexOf("const getMeeting"));
assert.ok(
  getMeeting.indexOf("isKnownMeeting") >= 0 && getMeeting.indexOf("isKnownMeeting") < getMeeting.indexOf("prisma.meeting"),
  "getMeeting must check existence before querying",
);

// Topic detail pages have no TTL, so the city-level refresh must reach them,
// and the route pattern must match the real directory.
const topicPage = "app/[state]/[city]/topics/[slug]/page.tsx";
assert.match(readFileSync(topicPage, "utf8"), /export const revalidate = false;/);
const route = readFileSync("app/api/revalidate/route.ts", "utf8");
const pattern = route.match(/TOPIC_DETAIL_ROUTE = "([^"]+)"/)?.[1];
assert.ok(pattern, "TOPIC_DETAIL_ROUTE missing");
assert.ok(existsSync(`app${pattern}/page.tsx`), `TOPIC_DETAIL_ROUTE ${pattern} must match a real page`);
const cityPaths = route.slice(route.indexOf("function revalidateCityPaths"));
assert.match(cityPaths.slice(0, cityPaths.indexOf("\n}")), /revalidatePath\(TOPIC_DETAIL_ROUTE, "page"\)/);

console.log("catalog-lookup-check: all checks passed");
