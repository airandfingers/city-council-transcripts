import assert from "node:assert/strict";
import {
  cityTimeZone,
  meetingDay,
  scheduledBadge,
  todayIn,
  upcomingSlugsAsOf,
} from "../../app/lib/upcoming";
import { granicusEmbedUrl } from "../../app/lib/granicus";
import { canAutoSeek } from "../../app/lib/videoSeek";

// --- FIX-UPCOMING-PAST-DAY-001 ---------------------------------------------
// Meeting.date is midnight UTC of the calendar day.
const nov4 = "2026-11-04T00:00:00.000Z";
assert.equal(meetingDay(nov4), "2026-11-04");
assert.equal(meetingDay(new Date(nov4)), "2026-11-04");

assert.equal(cityTimeZone("ca"), "America/Los_Angeles");
assert.equal(cityTimeZone("CO"), "America/Denver");
assert.equal(cityTimeZone("zz"), "America/Los_Angeles");

// 2026-11-05 03:00 UTC is still the evening of Nov 4 in California and Colorado.
const nov4Evening = Date.parse("2026-11-05T03:00:00Z");
assert.equal(todayIn("America/Los_Angeles", nov4Evening), "2026-11-04");
assert.equal(todayIn("America/Denver", nov4Evening), "2026-11-04");
// 2026-11-05 18:00 UTC is Nov 5 everywhere in the US mainland.
const nov5Morning = Date.parse("2026-11-05T18:00:00Z");
assert.equal(todayIn("America/Los_Angeles", nov5Morning), "2026-11-05");

// The live bug: the Nov 4 special meeting was still "Upcoming" on Nov 5.
assert.equal(scheduledBadge(nov4, "2026-11-04"), "upcoming"); // meeting day itself
assert.equal(scheduledBadge(nov4, "2026-11-03"), "upcoming");
assert.equal(scheduledBadge(nov4, "2026-11-05"), "pending");
assert.equal(scheduledBadge(nov4, "2026-11-18"), "pending"); // 14 days
assert.equal(scheduledBadge(nov4, "2026-11-19"), null); // 15 days
assert.equal(scheduledBadge("2010-09-01T00:00:00.000Z", "2026-11-05"), null);

const rows = [
  { slug: "2026-11-04/city-council-special-meeting", status: "SCHEDULED", date: nov4 },
  { slug: "2026-11-04/city-council-regular-meeting", status: "PUBLISHED", date: nov4 },
  { slug: "2026-11-18/city-council-regular-meeting", status: "SCHEDULED", date: "2026-11-18T00:00:00.000Z" },
  { slug: "2010-09-01/city-council-meeting-sep-1-2010", status: "SCHEDULED", date: "2010-09-01T00:00:00.000Z" },
];
assert.deepEqual(
  [...upcomingSlugsAsOf(rows, "2026-11-04")].sort(),
  ["2026-11-04/city-council-special-meeting", "2026-11-18/city-council-regular-meeting"],
);
assert.deepEqual([...upcomingSlugsAsOf(rows, "2026-11-05")], ["2026-11-18/city-council-regular-meeting"]);

// --- FIX-GRANICUS-EMBED-SEEK-001 --------------------------------------------
const clip = "https://monterey-park.granicus.com/player/clip/1206?view_id=2&redirect=true";
{
  const u = new URL(granicusEmbedUrl(clip, 600.7, true)!);
  assert.equal(u.hostname, "monterey-park.granicus.com");
  assert.equal(u.searchParams.get("view_id"), "2");
  assert.equal(u.searchParams.get("entrytime"), "600");
  assert.equal(u.searchParams.get("autostart"), "1");
  assert.equal(u.searchParams.get("embed"), "1");
}
{
  const u = new URL(granicusEmbedUrl(clip + "&entrytime=99", 0, false)!);
  assert.equal(u.searchParams.get("entrytime"), null); // start of clip
  assert.equal(u.searchParams.get("autostart"), "0");
}
assert.equal(granicusEmbedUrl(clip, Number.NaN, false)?.includes("entrytime"), false);
// Never iframe anything that isn't https granicus.com.
assert.equal(granicusEmbedUrl("http://monterey-park.granicus.com/player/clip/1", 5, true), null);
assert.equal(granicusEmbedUrl("https://evil.example/granicus.com", 5, true), null);
assert.equal(granicusEmbedUrl("https://granicus.com.evil.example/x", 5, true), null);
assert.equal(granicusEmbedUrl("not a url", 5, true), null);

assert.ok(canAutoSeek("granicus"));
assert.ok(canAutoSeek("youtube"));
assert.ok(!canAutoSeek("vimeo"));

console.log("meeting-day-check: ok");
