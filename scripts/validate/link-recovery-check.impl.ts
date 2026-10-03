import assert from "node:assert/strict";
import { meetingCandidates, stripTruncation } from "../../app/lib/linkRecovery";

assert.equal(stripTruncation("2026-0..."), "2026-0");
assert.equal(stripTruncation("2026-09-15/city-council-reg…"), "2026-09-15/city-council-reg");
assert.equal(stripTruncation("2026-09-15/city-council-reg …  "), "2026-09-15/city-council-reg");
assert.equal(stripTruncation("2026-09-15/"), "2026-09-15");
assert.equal(stripTruncation("2026-09-15/city.council"), "2026-09-15/city.council"); // a single dot is content

const catalog = [
  { stateCode: "CO", slug: "fort-collins", areaSlugs: [], meetings: [
    { slug: "2026-09-15/city-council-regular-meeting", date: "2026-09-15T00:00:00.000Z" },
    { slug: "2026-09-15/city-council-work-session", date: "2026-09-15T00:00:00.000Z" },
    { slug: "2026-08-25/city-council-work-session", date: "2026-08-25T00:00:00.000Z" },
  ] },
  { stateCode: "CA", slug: "monterey-park", areaSlugs: [], meetings: [
    { slug: "2026-09-02/city-council-regular-meeting", date: "2026-09-02T00:00:00.000Z" },
  ] },
];

const unique = meetingCandidates(catalog, "2026-09-15/city-council-reg...");
assert.equal(unique.total, 1);
assert.equal(unique.matches[0].slug, "2026-09-15/city-council-regular-meeting");

const several = meetingCandidates(catalog, "2026-0...");
assert.equal(several.total, 4);
assert.deepEqual(several.matches.map((m) => m.slug.slice(0, 10)), ["2026-09-15", "2026-09-15", "2026-09-02", "2026-08-25"]); // newest first
assert.equal(meetingCandidates(catalog, "2026-0...", 2).matches.length, 2);

assert.equal(meetingCandidates(catalog, "20...").total, 0); // too short to guess
assert.equal(meetingCandidates(catalog, "2027-01-01/x...").total, 0);
assert.equal(meetingCandidates(catalog, "2026-09-15/CITY-COUNCIL-W…").matches[0].slug, "2026-09-15/city-council-work-session");

console.log("link-recovery-check: passed");
