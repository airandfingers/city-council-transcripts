import type { MetadataRoute } from "next";
import { getSitemapCatalog } from "@/app/lib/cityData";
import { FALLBACK_SITE_URL } from "@/app/lib/siteUrl";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? FALLBACK_SITE_URL;

// This route is unauthenticated and directly linked from robots.ts, so
// every query it runs is crawler-facing traffic — keep all of them
// select-projected to slug/date only (FIX-NEON-EGRESS-CLIENT-001). An
// earlier version of this file called getMeetingsForCity/
// getInterestAreasForCity, which return full rows (summary, statusSummary,
// description, etc.) — that was a regression this route itself introduced
// while fixing egress elsewhere.
//
// Tried switching this to a time-based `revalidate` window
// (FIX-NEON-EGRESS-MEASURE-001) to stop every crawler fetch from
// re-enumerating every meeting/interest-area from Neon. Reverted: a
// metadata route with no dynamic segments and a `revalidate` value gets
// statically prerendered at *build* time, not just cached at runtime —
// confirmed via `npm run build`, which failed outright with a Prisma
// connection error while trying to prerender this route with the local DB
// unreachable. That's the exact failure mode `dynamic = "force-dynamic"`
// was added for originally (commit 9239431 — /admin/alerts broke builds
// the same way). Coupling every deploy to Neon being reachable is worse
// than the egress this route generates; leaving it dynamic.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // One cached read for every city (FIX-NEON-COMPUTE-CACHING-001): this route
  // stays force-dynamic (see above), but the *data* is cached inside
  // getSitemapCatalog, so a crawler hit no longer wakes the Neon compute.
  // Meeting dates arrive as ISO strings (they went through the cache's JSON
  // round-trip), which `lastModified` accepts as-is.
  const catalog = await getSitemapCatalog();

  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily" },
    { url: `${SITE_URL}/glossary`, changeFrequency: "monthly" },
  ];

  for (const city of catalog) {
    const cityPath = `${SITE_URL}/${city.stateCode}/${city.slug}`;
    entries.push({ url: cityPath, changeFrequency: "hourly" });
    entries.push({ url: `${cityPath}/topics`, changeFrequency: "hourly" });

    for (const meeting of city.meetings) {
      const slugPath = meeting.slug.split("/").map(encodeURIComponent).join("/");
      entries.push({
        url: `${SITE_URL}/transcripts/${slugPath}`,
        lastModified: meeting.date,
        changeFrequency: "yearly",
      });
    }

    for (const areaSlug of city.areaSlugs) {
      entries.push({
        url: `${cityPath}/topics/${areaSlug}`,
        changeFrequency: "weekly",
      });
    }
  }

  return entries;
}
