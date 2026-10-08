import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// FIX-NEON-PER-MEETING-REFRESH-001. A page carries the tags of every cached
// read it makes, and /api/revalidate purges CACHE_TAGS on every city refresh.
// When transcript pages read the catalog (`sitemap` tag), each sync window made
// all of them stale and the warm re-rendered the whole site (~80 MB of Neon
// egress). These checks keep transcript pages off the shared tags and keep the
// route refreshing the meetings that did change.

const src = (p: string) => readFileSync(p, "utf8");
const cityData = src("app/lib/cityData.ts");
const page = src("app/transcripts/[...slug]/page.tsx");
const route = src("app/api/revalidate/route.ts");

// meetingTag: deterministic, distinct per slug, within Next's 256-char tag cap.
const tagBody = cityData.slice(cityData.indexOf("export function meetingTag"));
assert.match(tagBody.slice(0, 300), /createHash\("sha256"\)\.update\(meetingSlug\)\.digest\("hex"\)\.slice\(0, 32\)/);
assert.equal(`meeting:${"0".repeat(32)}`.length <= 256, true);

// isKnownMeeting carries only its own meeting's tag.
const known = cityData.slice(cityData.indexOf("export function isKnownMeeting"));
const knownBody = known.slice(0, known.indexOf("\n}\n"));
assert.match(knownBody, /tags: \[meetingTag\(meetingSlug\)\]/);
assert.doesNotMatch(knownBody, /CACHE_TAGS|getSitemapCatalog|getCatalogForLookup/);

// The transcript page renders known meetings without any CACHE_TAGS read. The
// catalog may only be read on the not-found path (link recovery), whose 404 or
// "which meeting?" response doesn't affect known pages.
assert.doesNotMatch(page, /mayBeKnownMeeting|getSitemapCatalog|getCities\(|getSearchCorpus/);
const getMeeting = page.slice(page.indexOf("const getMeeting"), page.indexOf("export default async function"));
assert.doesNotMatch(getMeeting, /recoverMeetingLink|getCitiesForNav/);
for (const m of page.matchAll(/await (recoverMeetingLink|getCitiesForNav)\(/g)) {
  const before = page.slice(0, m.index);
  assert.ok(before.lastIndexOf("if (!meeting)") > before.lastIndexOf("{\n  const slug"), `${m[1]} must only run when the meeting is missing`);
}

// The route refreshes changed meetings' pages and existence checks, expiring
// the existence check immediately (a stale "doesn't exist" would 404 a new meeting).
const revalidateMeeting = route.slice(route.indexOf("function revalidateMeeting"));
const rmBody = revalidateMeeting.slice(0, revalidateMeeting.indexOf("\n}\n"));
assert.match(rmBody, /revalidatePath\(path\)/);
assert.match(rmBody, /revalidateTag\(meetingTag\(meetingSlug\), \{ expire: 0 \}\)/);
const post = route.slice(route.indexOf("export async function POST"));
assert.match(post, /revalidateChangedMeetings\(stateCode, city_slug, changed_since\)/, "city refresh must refresh changed meetings");
assert.match(post.slice(0, post.indexOf("// City.stateCode")), /revalidateMeeting\(meeting\.slug\)/, "meeting_id refresh must refresh that meeting");
assert.match(route, /changed_since: z\.string\(\)\.datetime\(\{ offset: true \}\)\.optional\(\)/);
assert.match(cityData, /updatedAt: \{ gte: since \}/);

console.log("per-meeting-refresh-check: passed");
