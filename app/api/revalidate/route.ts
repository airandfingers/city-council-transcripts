import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/app/lib/prisma";
import { isAuthorized } from "@/app/lib/publish";
import { getMeetingSlugsForCity } from "@/app/lib/cityData";

/**
 * POST /api/revalidate
 *
 * Body: { "meeting_id": <number> } | { "city_state_code": <string>, "city_slug": <string> }
 * Auth: Authorization: Bearer <PUBLISH_API_KEY>
 *
 * Invalidates the ISR cache for content that the publish sweep
 * (src/publish.py `cmd_publish`) just wrote. Deliberately NOT piggybacked
 * on /api/publish-to-admins, which only fires when a meeting is new or
 * `notify_updates` is set — a republished-but-not-alert-worthy meeting
 * would get zero invalidation calls that way, and with the long/indefinite
 * `revalidate` windows this route exists to support
 * (FIX-NEON-EGRESS-MEASURE-001), that means serving stale content forever.
 *
 * Two call shapes, matching the two places `cmd_publish` actually writes:
 *
 *  - `meeting_id`: called once per meeting, right after that meeting's
 *    Neon write, for every meeting that passes the content-hash gate.
 *    Invalidates that meeting's transcript page.
 *  - `city_state_code`/`city_slug`: called once per city, at the end of
 *    that city's sweep — after `_update_city_recent_summary`,
 *    `_publish_interest_areas`, `_publish_roster_members`, which run once
 *    per city *after* the per-meeting loop, not per meeting. Invalidates
 *    the city page and its topics listing, which read that rolled-up data
 *    — AND every transcript page for the city, since
 *    `_publish_roster_members` writes `RosterMember` rows and
 *    `app/transcripts/[...slug]/page.tsx` resolves each speaker's title
 *    as-of the meeting date from that table (FEAT-ROSTER-TITLES-OVER-TIME-001)
 *    without being tied to any single meeting's own publish. Missing this
 *    was caught in review: under `revalidate = false`, a roster change
 *    (e.g. a mayor rotation) would otherwise have no invalidation trigger
 *    at all and go stale forever on every transcript page in the city.
 *
 * Interest-area detail pages (`/[state]/[city]/topics/[slug]`) are left on
 * their existing 1h time-based `revalidate` window rather than moved to
 * `false` here — this route's per-city call covers the topics *listing*
 * page, but rolling that invalidation down to each individual area's page
 * would need per-area diffing this route doesn't do yet. Moving that page
 * to indefinite caching without a matching invalidation trigger would
 * silently serve stale content forever, so it stays time-based for now.
 */

const RevalidateBody = z.union([
  z.object({ meeting_id: z.number().int().positive() }),
  z.object({
    city_state_code: z.string().min(1),
    city_slug: z.string().min(1),
  }),
]);

function revalidateCityPaths(stateCode: string, slug: string): string[] {
  const cityPath = `/${stateCode}/${slug}`;
  const paths = [cityPath, `${cityPath}/topics`];
  for (const path of paths) revalidatePath(path);
  return paths;
}

/** Revalidates every transcript page for a city — see the roster-staleness
 * note above. Narrow slug-only query, same one the sitemap uses. */
async function revalidateCityTranscriptPaths(
  stateCode: string,
  slug: string,
): Promise<string[]> {
  const meetings = await getMeetingSlugsForCity(stateCode, slug);
  const paths = meetings.map(
    (m) => `/transcripts/${m.slug.split("/").map(encodeURIComponent).join("/")}`,
  );
  for (const path of paths) revalidatePath(path);
  return paths;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RevalidateBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Provide either meeting_id (positive integer) or city_state_code + city_slug",
      },
      { status: 400 },
    );
  }

  if ("meeting_id" in parsed.data) {
    const meeting = await prisma.meeting.findUnique({
      where: { id: parsed.data.meeting_id },
      select: {
        slug: true,
        city: { select: { stateCode: true, slug: true } },
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const slugPath = meeting.slug.split("/").map(encodeURIComponent).join("/");
    revalidatePath(`/transcripts/${slugPath}`);
    const cityPaths = revalidateCityPaths(meeting.city.stateCode, meeting.city.slug);

    return NextResponse.json({
      ok: true,
      revalidated: [`/transcripts/${slugPath}`, ...cityPaths],
    });
  }

  const { city_state_code, city_slug } = parsed.data;
  const city = await prisma.city.findUnique({
    where: { stateCode_slug: { stateCode: city_state_code, slug: city_slug } },
    select: { id: true },
  });

  if (!city) {
    return NextResponse.json({ error: "City not found" }, { status: 404 });
  }

  const cityPaths = revalidateCityPaths(city_state_code, city_slug);
  const transcriptPaths = await revalidateCityTranscriptPaths(city_state_code, city_slug);
  return NextResponse.json({ ok: true, revalidated: [...cityPaths, ...transcriptPaths] });
}
