import { getCityByParams, getMeetingsForCity } from "@/app/lib/cityData";

/**
 * GET /<state>/<city>/all-meetings — every meeting card for a city, as JSON
 * (FIX-CITY-PAGE-RECENT-ONLY-001). The city page renders only the upcoming
 * meetings and the CITY_PAGE_INITIAL_MEETINGS most recent past ones; this is
 * fetched when a reader asks for the rest ("Show all", a search, a status
 * filter or the oldest-first sort).
 *
 * Cached like the city page (no TTL, purged with it by /api/revalidate's
 * revalidateCityPaths). Not for search engines (robots.ts, noindex header):
 * every meeting is already in the sitemap.
 */
export const revalidate = false;
export const dynamic = "force-static";

export async function generateStaticParams() {
  return [];
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ state: string; city: string }> },
) {
  const { state, city } = await params;
  const headers = { "X-Robots-Tag": "noindex" };
  if (!(await getCityByParams(state, city))) {
    return Response.json({ error: "City not found" }, { status: 404, headers });
  }
  return Response.json(await getMeetingsForCity(state, city), { headers });
}
