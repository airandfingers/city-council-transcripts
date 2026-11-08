/**
 * Meeting slugs that were merged into another meeting, mapped to the slug that
 * replaced them. Their URLs went out in upcoming-meeting emails, so they
 * redirect instead of 404ing (FIX-RETIRED-MEETING-REDIRECTS-001).
 *
 * Montebello's agenda stub and its YouTube recording were published as two
 * meetings (transcriber FIX-MONTEBELLO-AGENDA-VIDEO-DUP-001). The transcriber
 * now puts the recording in the agenda folder, so new meetings stay one row;
 * these are the five pairs from before that fix. Static on purpose: no DB read
 * in the proxy, and the list isn't expected to grow.
 */
export const RETIRED_MEETING_SLUGS: Record<string, string> = {
  "2026-09-09/city-council": "2026-09-09/this-is-the-city-of-montebello-council-meeting-09-09-26",
  "2026-09-23/city-council": "2026-09-23/this-is-the-city-of-montebello-city-council-meeting-09-23-26",
  "2026-10-14/city-council": "2026-10-14/this-is-the-city-of-montebello-city-council-meeting-10-14-26",
  "2026-10-28/city-council": "2026-10-28/this-is-the-city-of-montebello-city-council-meeting-10-28-26",
  "2026-11-06/city-council-special": "2026-11-06/this-is-the-city-of-montebello-city-council-special-meeting-11-06-26",
};

/** Per-meeting URL prefixes that carry a slug (see transcriptPath.ts). */
const MEETING_PREFIXES = ["/transcripts/", "/transcript-text/", "/meeting-tabs/"];

/** Where `pathname` should redirect to if it names a retired meeting, else null. */
export function retiredMeetingRedirect(pathname: string): string | null {
  for (const prefix of MEETING_PREFIXES) {
    if (!pathname.startsWith(prefix)) continue;
    const rest = pathname.slice(prefix.length).replace(/\/+$/, "");
    let slug: string;
    try {
      slug = decodeURIComponent(rest);
    } catch {
      return null;
    }
    const target = RETIRED_MEETING_SLUGS[slug];
    return target ? prefix + target.split("/").map(encodeURIComponent).join("/") : null;
  }
  return null;
}
