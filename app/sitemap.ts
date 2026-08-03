import type { MetadataRoute } from "next";
import prisma from "@/app/lib/prisma";
import { getCitySlugsOnly, getMeetingSlugsForCity } from "@/app/lib/cityData";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://transcripts.ayoshitake.com";

// Not build-time prerendered: unlike the content pages, this route's
// queries are cheap (slugs/dates, not full transcript text), and forcing
// it dynamic avoids the deploy build depending on database availability.
//
// This route is unauthenticated and directly linked from robots.ts, so
// every query it runs is crawler-facing traffic — keep all of them
// select-projected to slug/date only (FIX-NEON-EGRESS-CLIENT-001). An
// earlier version of this file called getMeetingsForCity/
// getInterestAreasForCity, which return full rows (summary, statusSummary,
// description, etc.) — that was a regression this route itself introduced
// while fixing egress elsewhere.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cities = await getCitySlugsOnly();

  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily" },
  ];

  for (const city of cities) {
    const cityPath = `${SITE_URL}/${city.stateCode}/${city.slug}`;
    entries.push({ url: cityPath, changeFrequency: "hourly" });
    entries.push({ url: `${cityPath}/topics`, changeFrequency: "hourly" });

    const [meetings, interestAreas] = await Promise.all([
      getMeetingSlugsForCity(city.stateCode, city.slug),
      prisma.interestArea.findMany({
        where: { city: { stateCode: city.stateCode, slug: city.slug } },
        select: { slug: true },
      }),
    ]);

    for (const meeting of meetings) {
      const slugPath = meeting.slug.split("/").map(encodeURIComponent).join("/");
      entries.push({
        url: `${SITE_URL}/transcripts/${slugPath}`,
        lastModified: meeting.date,
        changeFrequency: "yearly",
      });
    }

    for (const area of interestAreas) {
      entries.push({
        url: `${cityPath}/topics/${area.slug}`,
        changeFrequency: "weekly",
      });
    }
  }

  return entries;
}
