import assert from "node:assert/strict";
import { resolveTranscriptSlug, transcriptPath } from "../../app/lib/transcriptPath";

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
  {
    segments: ["2026-07-08", "Housing_ Arts"],
    slug: "2026-07-08/Housing_ Arts",
    redirectTo: "/transcripts/2026-07-08/Housing_%20Arts",
  },
  { segments: ["a%2Fb", "c"], slug: "a/b/c", redirectTo: "/transcripts/a/b/c" },
  { segments: ["bad%E0%A4%A"], slug: "bad%E0%A4%A", redirectTo: "/transcripts/bad%25E0%25A4%25A" },
];

for (const c of cases) {
  assert.deepEqual(resolveTranscriptSlug(c.segments), { slug: c.slug, redirectTo: c.redirectTo }, c.segments.join("/"));
  if (c.redirectTo) {
    const target = c.redirectTo.slice("/transcripts/".length).split("/");
    assert.equal(resolveTranscriptSlug(target).redirectTo, null, `redirect target must be canonical: ${c.redirectTo}`);
  }
}

assert.equal(transcriptPath("2026-07-08/Housing_ Arts"), "/transcripts/2026-07-08/Housing_%20Arts");

console.log(`transcript-path-check: ${cases.length} cases passed`);
