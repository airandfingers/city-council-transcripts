/**
 * Lazy-loaded meeting content (FIX-TRANSCRIPT-LAZY-LOAD-001,
 * FEAT-TRANSCRIPT-PLAIN-PAGE-001, FIX-MEETING-TABS-LAZY-001,
 * FIX-CITY-PAGE-RECENT-ONLY-001):
 *  - the plain transcript page escapes text and carries the data-* attributes
 *    TranscriptViewer's parser reads (the parse itself needs a browser
 *    DOMParser; it was checked in Playwright),
 *  - every cached URL of a meeting is purged together,
 *  - the city page keeps every upcoming meeting plus the N most recent past.
 */
import assert from "node:assert/strict";
import { renderTranscriptTextPage, renderTurnsHtml } from "../../app/lib/transcriptText";
import { meetingContentPaths, cityMeetingsPath } from "../../app/lib/transcriptPath";
import { initialCityMeetings, type MeetingCardData } from "../../app/lib/cityData";

const html = renderTurnsHtml([
  { label: "Mayor <Jane> & Co", startTime: 12.5, endTime: 40.25, firstId: 7, text: 'Hi "all"\n\n<script>x</script>' },
]);
assert.ok(!html.includes("<script>"), "turn text is escaped");
assert.ok(html.includes("&lt;script&gt;x&lt;/script&gt;"));
assert.ok(html.includes("<b>Mayor &lt;Jane&gt; &amp; Co</b>"));
assert.ok(html.includes('data-s="12.5" data-e="40.25" data-i="7"'));
assert.equal((html.match(/<p>/g) ?? []).length, 2, "one <p> per paragraph");
assert.ok(html.includes("<span>0:13</span>"), "start time shown");

const page = renderTranscriptTextPage({
  slug: "2026-07-01/city council",
  title: "Council <b>",
  dateLabel: "Jul 1, 2026",
  cityName: "Monterey Park",
  turns: [],
});
assert.ok(!/<script/i.test(page), "plain page has no scripts");
assert.ok(page.includes('href="/transcripts/2026-07-01/city%20council"'), "links the meeting page");
assert.ok(page.includes("/transcript-text/2026-07-01/city%20council"), "canonical is itself");
assert.ok(page.includes("Council &lt;b&gt;"));

assert.deepEqual(meetingContentPaths("2026-07-01/a b"), [
  "/transcripts/2026-07-01/a%20b",
  "/transcript-text/2026-07-01/a%20b",
  "/meeting-tabs/2026-07-01/a%20b",
]);
assert.equal(cityMeetingsPath("ca", "monterey-park"), "/ca/monterey-park/all-meetings");

const card = (slug: string): MeetingCardData => ({
  slug,
  status: "PUBLISHED",
  date: new Date("2026-01-01"),
  title: slug,
  logline: null,
  summaryExcerpt: null,
  tldrReferences: null,
});
const meetings = ["u2", "u1", "p1", "p2", "p3", "old-upcoming", "p4"].map(card);
const upcoming = new Set(["u1", "u2", "old-upcoming"]);
assert.deepEqual(
  initialCityMeetings(meetings, upcoming, 2).map((m) => m.slug),
  ["u2", "u1", "p1", "p2", "old-upcoming"],
  "all upcoming plus the first 2 past",
);

console.log("lazy-content-check: passed");
