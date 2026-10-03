import assert from "node:assert/strict";
import { canonicalEncodedPath } from "../../app/lib/canonicalPath";
import { transcriptPath } from "../../app/lib/transcriptPath";

// Canonical paths (including legitimately encoded ones) must never redirect —
// a wrong answer here is a redirect loop on a real page.
const canonical = [
  "/",
  "/transcripts/2026-09-02/city-council-regular-meeting",
  "/ca/monterey-park/topics/public_engagement",
  "/transcripts/2026-07-08/Housing_%20Arts_%20and%20Civil%20Rights%20Committee",
  "/transcripts/a%2Fb",       // %2F is reserved: decoding would add a segment
  "/transcripts/caf%C3%A9",   // non-ASCII stays encoded
  "/transcripts/100%25",      // a literal percent sign
  transcriptPath("2026-07-08/Housing_ Arts.~-"),
];
for (const p of canonical) assert.equal(canonicalEncodedPath(p), null, `must not redirect: ${p}`);

const variants: Array<[string, string]> = [
  ["/transcripts/2026-09-02/city%2Dcouncil%2Dregular%2Dmeeting", "/transcripts/2026-09-02/city-council-regular-meeting"],
  ["/transcripts/2026-09-02/city%2dcouncil", "/transcripts/2026-09-02/city-council"],
  ["/ca/monterey-park/topics/public%5Fengagement", "/ca/monterey-park/topics/public_engagement"],
  ["/ca/monterey%2Dpark", "/ca/monterey-park"],
  ["/%63%61/monterey-park", "/ca/monterey-park"],
  ["/transcripts/x%2E%7E%30", "/transcripts/x.~0"],
  ["/transcripts/2026-07-08/Housing%5F%20Arts", "/transcripts/2026-07-08/Housing_%20Arts"],
];
for (const [input, want] of variants) {
  assert.equal(canonicalEncodedPath(input), want, input);
  assert.equal(canonicalEncodedPath(want), null, `redirect target must be canonical: ${want}`);
}

console.log(`encoded-path-check: ${canonical.length + variants.length} cases passed`);
