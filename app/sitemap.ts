import type { MetadataRoute } from "next";
import { getCities, getMeetingsForCity, getInterestAreasForCity } from "@/app/lib/cityData";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://transcripts.ayoshitake.com";

// Not build-time prerendered: unlike the content pages, this route's
// queries are cheap (slugs/dates, not full transcript text), and forcing
// it dynamic avoids the deploy build depending on database availability.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cities = await getCities();

  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily" },
  ];

  for (const city of cities) {
    const cityPath = `${SITE_URL}/${city.stateCode}/${city.slug}`;
    entries.push({ url: cityPath, changeFrequency: "hourly" });
    entries.push({ url: `${cityPath}/topics`, changeFrequency: "hourly" });

    const [meetings, interestAreas] = await Promise.all([
      getMeetingsForCity(city.stateCode, city.slug),
      getInterestAreasForCity(city.stateCode, city.slug),
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
