import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import prisma from "@/app/lib/prisma";
import { isAuthorized } from "@/app/lib/publish";
import {
  CACHE_TAGS,
  getMeetingSlugsChangedSince,
  getMeetingSlugsForCity,
  meetingTag,
} from "@/app/lib/cityData";

/**
 * POST /api/revalidate
 *
 * Body: { "meeting_id": <number> }
 *     | { "city_state_code": <string>, "city_slug": <string>, "include_transcripts"?: <boolean>,
 *         "changed_since"?: <ISO 8601 timestamp> }
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
 * `include_transcripts` (default **true**, so a publisher that predates it
 * keeps today's behavior against this route in any deploy order): the
 * transcript-wide purge above exists only because of roster changes, so a
 * publisher that knows the roster did not change sends `false` and skips it.
 * Purging every transcript page after every publish sweep made each one a
 * cold render — the heaviest query in the app — the next time it was visited,
 * and on Neon's free plan each such visit can wake the compute
 * (FIX-NEON-COMPUTE-CACHING-001).
 *
 * Both call shapes also refresh every Data Cache entry tagged in `CACHE_TAGS`
 * (city lists, search corpus, sitemap catalog). Those entries have no TTL
 * (FIX-NEON-TAG-ONLY-CACHES-001), so this route is their ONLY refresh trigger:
 * any code that writes Neon must call it afterwards, or the site keeps serving
 * the old data.
 *
 * Transcript pages don't read those tags (FIX-NEON-PER-MEETING-REFRESH-001):
 * each one's existence check is cached under its own `meetingTag`, because a
 * page carries the tags of every cached read it makes, and when they read the
 * catalog every city refresh made all ~430 of them stale and the warm
 * re-rendered the whole site (~80 MB of Neon egress) once per sync window. So
 * the per-city call refreshes only the transcript pages of meetings written
 * since `changed_since` (by `Meeting.updatedAt`, which every transcriber
 * write sets), defaulting to the last DEFAULT_CHANGED_LOOKBACK_MS when the
 * caller doesn't send it.
 *
 * The per-city call also marks every interest-area detail page
 * (`/[state]/[city]/topics/[slug]`) stale, via the route pattern. Those pages
 * have no TTL (FIX-NEON-TOPIC-PAGES-CHEAP-404-001), so this is their only
 * refresh trigger too. The pattern covers every city's topic pages rather
 * than just this one's: there are only a few dozen, and the publisher warms
 * the whole site right after refreshing.
 */

const RevalidateBody = z.union([
  z.object({ meeting_id: z.number().int().positive() }),
  z.object({
    city_state_code: z.string().min(1),
    city_slug: z.string().min(1),
    include_transcripts: z.boolean().optional(),
    changed_since: z.string().datetime({ offset: true }).optional(),
  }),
]);

/** Marks the tagged Data Cache entries stale ("max" = stale-while-revalidate:
 * the next request is served the old value while a fresh one is fetched, so the
 * first visitor after a publish never waits on a cold database). */
function revalidateDataCacheTags(): string[] {
  const tags = Object.values(CACHE_TAGS);
  for (const tag of tags) revalidateTag(tag, "max");
  return tags;
}

/** Route pattern (not a URL) for every interest-area detail page. */
const DEFAULT_CHANGED_LOOKBACK_MS = 48 * 60 * 60 * 1000;
const MAX_CHANGED_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;

function transcriptPathFor(meetingSlug: string): string {
  return `/transcripts/${meetingSlug.split("/").map(encodeURIComponent).join("/")}`;
}

/** Refreshes one meeting's transcript page and its existence check. Expired
 * immediately, not stale-while-revalidate: a cached "doesn't exist" served
 * once more would 404 a meeting that was just created. */
function revalidateMeeting(meetingSlug: string): string {
  const path = transcriptPathFor(meetingSlug);
  revalidatePath(path);
  revalidateTag(meetingTag(meetingSlug), { expire: 0 });
  return path;
}

async function revalidateChangedMeetings(
  stateCode: string,
  slug: string,
  changedSince: string | undefined,
): Promise<string[]> {
  const now = Date.now();
  const requested = changedSince ? new Date(changedSince).getTime() : now - DEFAULT_CHANGED_LOOKBACK_MS;
  const since = new Date(Math.min(now, Math.max(requested, now - MAX_CHANGED_LOOKBACK_MS)));
  const meetings = await getMeetingSlugsChangedSince(stateCode, slug, since);
  return meetings.map((m) => revalidateMeeting(m.slug));
}

const TOPIC_DETAIL_ROUTE = "/[state]/[city]/topics/[slug]";

function revalidateCityPaths(stateCode: string, slug: string): string[] {
  const cityPath = `/${stateCode}/${slug}`;
  const paths = [cityPath, `${cityPath}/topics`];
  for (const path of paths) revalidatePath(path);
  revalidatePath(TOPIC_DETAIL_ROUTE, "page");
  return [...paths, TOPIC_DETAIL_ROUTE];
}

/** Revalidates every transcript page for a city — see the roster-staleness
 * note above. Uses the deliberately UNCACHED `getMeetingSlugsForCity`: a cached
 * list could miss a meeting published moments ago. */
async function revalidateCityTranscriptPaths(
  stateCode: string,
  slug: string,
): Promise<string[]> {
  const meetings = await getMeetingSlugsForCity(stateCode, slug);
  const paths = meetings.map((m) => transcriptPathFor(m.slug));
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

    const meetingPath = revalidateMeeting(meeting.slug);
    const cityPaths = revalidateCityPaths(meeting.city.stateCode, meeting.city.slug);
    const tags = revalidateDataCacheTags();

    return NextResponse.json({
      ok: true,
      revalidated: [meetingPath, ...cityPaths],
      tags,
    });
  }

  // City.stateCode is always stored lowercase (see src/neon_writer.py's
  // `state_code = state_code.lower()` at every write site — "to match the
  // web app's URL scheme"), but every config/cities/<slug>/city.json's own
  // `state_code` field is uppercase ("CO", "CA", "WA") and gets passed
  // through here unnormalized by every city that calls this route (verified
  // live: a real production Fort Collins publish sweep 404'd here on
  // "CO" vs "co", silently skipping cache invalidation for the city/topics
  // pages — not a Fort-Collins-specific bug, every city.json uses the same
  // uppercase convention). Normalize once and use it everywhere below —
  // `revalidateCityPaths`/`revalidateCityTranscriptPaths` need the lowercase
  // form too: the former builds the literal `/co/fort-collins`-shaped path
  // `revalidatePath` matches against (uppercase would silently invalidate a
  // path nothing ever renders at), and the latter calls
  // `getMeetingSlugsForCity`, whose `isValidStateCode` guard requires
  // lowercase and silently returns `[]` — zero transcript pages revalidated
  // — on anything else, rather than erroring.
  const { city_state_code, city_slug, include_transcripts, changed_since } = parsed.data;
  const stateCode = city_state_code.toLowerCase();
  const city = await prisma.city.findUnique({
    where: { stateCode_slug: { stateCode, slug: city_slug } },
    select: { id: true },
  });

  if (!city) {
    return NextResponse.json({ error: "City not found" }, { status: 404 });
  }

  const cityPaths = revalidateCityPaths(stateCode, city_slug);
  const changedPaths = await revalidateChangedMeetings(stateCode, city_slug, changed_since);
  // Absent means "yes" — see `include_transcripts` in the header comment.
  const transcriptPaths =
    include_transcripts === false
      ? []
      : await revalidateCityTranscriptPaths(stateCode, city_slug);
  const tags = revalidateDataCacheTags();
  return NextResponse.json({
    ok: true,
    revalidated: [...cityPaths, ...new Set([...changedPaths, ...transcriptPaths])],
    changed_meetings: changedPaths.length,
    transcripts_purged: include_transcripts !== false,
    tags,
  });
}
