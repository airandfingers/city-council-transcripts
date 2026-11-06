import { getMeetingTabs } from "@/app/lib/meetingRecord";

/**
 * GET /meeting-tabs/<meeting slug> — JSON for the meeting page's hidden tabs
 * (Minutes, Agenda, Council Members & Votes), fetched by LazyMeetingTab when
 * a reader opens one (FIX-MEETING-TABS-LAZY-001). Those tabs aren't visible
 * on load, yet their text was serialized into every meeting-page view.
 *
 * Cached like the meeting page (no TTL, purged with it by /api/revalidate via
 * meetingContentPaths). Not for search engines: robots.ts disallows it and
 * the response says noindex.
 */
export const revalidate = false;
export const dynamic = "force-static";

export async function generateStaticParams() {
  return [];
}

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug: segments } = await params;
  const tabs = await getMeetingTabs(segments.map(safeDecode).join("/"));
  const headers = { "X-Robots-Tag": "noindex" };
  if (!tabs) return Response.json({ error: "Meeting not found" }, { status: 404, headers });
  return Response.json(tabs, { headers });
}
