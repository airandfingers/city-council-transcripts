import assert from "node:assert/strict";
import { resolveTranscriptSlug, transcriptPath } from "../../app/lib/transcriptPath";
import { RETIRED_MEETING_SLUGS, retiredMeetingRedirect } from "../../app/lib/retiredMeetings";

const cases: Array<{ segments: string[]; slug: string; redirectTo: string | null }> = [
  { segments: ["2026-08-18", "city-council"], slug: "2026-08-18/city-council", redirectTo: null },
  {
    segments: ["2026-07-08", "Housing_%20Arts_%20and%20Civil%20Rights%20Committee"],
    slug: "2026-07-08/Housing_ Arts_ and Civil Rights Committee",
    redirectTo: null,
  },
  {
    segments: ["monterey-park-2026-01-27-city-council-meeting-monday-jan-27-2026"],
    slug: "monterey-park-2026-01-27-city-council-meeting-monday-jan-27-2026",
    redirectTo: null,
  },
  // What Next 16.4+ passes for the canonical /transcripts/2026-07-08/Housing_%20Arts:
  // already decoded. Must not redirect, or it loops (FIX-TRANSCRIPT-SLUG-DECODED-PARAMS-001).
  { segments: ["2026-07-08", "Housing_ Arts"], slug: "2026-07-08/Housing_ Arts", redirectTo: null },
  { segments: ["a%2Fb", "c"], slug: "a/b/c", redirectTo: "/transcripts/a/b/c" },
  { segments: ["bad%E0%A4%A"], slug: "bad%E0%A4%A", redirectTo: null },
];

const safeDecode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

for (const c of cases) {
  assert.deepEqual(resolveTranscriptSlug(c.segments), { slug: c.slug, redirectTo: c.redirectTo }, c.segments.join("/"));
  if (c.redirectTo) {
    const target = c.redirectTo.slice("/transcripts/".length).split("/");
    assert.equal(resolveTranscriptSlug(target).redirectTo, null, `redirect target must be canonical: ${c.redirectTo}`);
    // ...and still canonical when Next hands the segments over decoded.
    assert.equal(
      resolveTranscriptSlug(target.map(safeDecode)).redirectTo,
      null,
      `redirect target must not loop once decoded: ${c.redirectTo}`,
    );
  }
}

assert.equal(transcriptPath("2026-07-08/Housing_ Arts"), "/transcripts/2026-07-08/Housing_%20Arts");

// Retired (merged) meetings redirect to their replacement on every per-meeting
// route, and a replacement is never itself retired (no chains or loops).
for (const [oldSlug, newSlug] of Object.entries(RETIRED_MEETING_SLUGS)) {
  assert.ok(!(newSlug in RETIRED_MEETING_SLUGS), `retired target is itself retired: ${newSlug}`);
  for (const prefix of ["/transcripts/", "/transcript-text/", "/meeting-tabs/"]) {
    const target = retiredMeetingRedirect(prefix + oldSlug);
    assert.equal(target, prefix + newSlug, `retired ${prefix}${oldSlug}`);
    assert.equal(retiredMeetingRedirect(target!), null, `redirect target must not redirect again: ${target}`);
  }
}
assert.equal(retiredMeetingRedirect("/transcripts/2026-11-11/city-council"), null);
assert.equal(retiredMeetingRedirect("/ca/montebello/2026-10-28/city-council"), null);
assert.equal(retiredMeetingRedirect("/transcripts/2026-10-28/city-council/"), "/transcripts/" + RETIRED_MEETING_SLUGS["2026-10-28/city-council"]);

console.log(`transcript-path-check: ${cases.length} cases passed`);
