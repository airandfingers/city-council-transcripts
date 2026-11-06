import { getTranscriptRecord } from "@/app/lib/meetingRecord";
import { renderTranscriptTextPage } from "@/app/lib/transcriptText";

/**
 * GET /transcript-text/<meeting slug> — the meeting's full transcript as a
 * plain HTML page with no scripts and no React data
 * (FEAT-TRANSCRIPT-PLAIN-PAGE-001).
 *
 * Two readers:
 *  - search engines, so transcript text stays indexed now that the meeting
 *    page no longer embeds it (it's in the sitemap and linked from the
 *    meeting page);
 *  - the meeting page's TranscriptViewer, which fetches this page when the
 *    reader opens the transcript and reads the turns from its `data-*`
 *    attributes (FIX-TRANSCRIPT-LAZY-LOAD-001).
 *
 * Cached like the meeting page: no TTL, purged by /api/revalidate together
 * with it (meetingContentPaths), and generated on first request.
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
  const record = await getTranscriptRecord(segments.map(safeDecode).join("/"));
  if (!record) {
    return new Response("Transcript not found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return new Response(renderTranscriptTextPage(record), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
