import type { MetadataRoute } from "next";
import prisma from "@/app/lib/prisma";
import { getCitySlugsOnly, getMeetingSlugsForCity } from "@/app/lib/cityData";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://transcripts.ayoshitake.com";

// This route is unauthenticated and directly linked from robots.ts, so
// every query it runs is crawler-facing traffic — keep all of them
// select-projected to slug/date only (FIX-NEON-EGRESS-CLIENT-001). An
// earlier version of this file called getMeetingsForCity/
// getInterestAreasForCity, which return full rows (summary, statusSummary,
// description, etc.) — that was a regression this route itself introduced
// while fixing egress elsewhere.
//
// Was `dynamic = "force-dynamic"`: every crawler fetch enumerated every
// meeting/interest-area across every city from Neon. Cached daily now, with
// POST /api/revalidate calling revalidatePath("/sitemap.xml") on every
// publish so it doesn't lag the real content by up to 24h
// (FIX-NEON-EGRESS-MEASURE-001). Not build-time prerendered: the daily
// fallback still means a deploy never *requires* DB availability to build,
// same reasoning as the original force-dynamic choice.
export const revalidate = 86400;

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
