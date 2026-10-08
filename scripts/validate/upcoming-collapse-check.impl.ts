import assert from "node:assert/strict";
import { collapsedUpcoming, isRegularCouncilMeeting } from "../../app/lib/upcoming";

// Real titles from each city's scraper.
for (const t of [
  "City Council Regular Meeting",
  "City Council",
  "This is the City of Montebello City Council Meeting 09-23-26",
]) assert.ok(isRegularCouncilMeeting(t), t);
for (const t of [
  "City Council Special Meeting",
  "City Council Work Session",
  "City Council Work Session (Meeting video starts at 1:49:13)",
  "Council Briefing",
  "Public Safety Committee",
  "Planning Commission Meeting",
  "Library Board",
  "Recreation and Parks Commission Special Meeting",
]) assert.ok(!isRegularCouncilMeeting(t), t);

const m = (title: string) => ({ title });
const special = m("City Council Special Meeting");
const planning = m("Planning Commission Meeting");
const regular = m("City Council Regular Meeting");
const regular2 = m("City Council Regular Meeting");

assert.deepEqual(collapsedUpcoming([]), []);
assert.deepEqual(collapsedUpcoming([regular, special]), [regular]); // next is already regular
assert.deepEqual(collapsedUpcoming([special, planning, regular, regular2]), [special, regular]);
assert.deepEqual(collapsedUpcoming([special, planning]), [special]); // no regular scheduled
assert.equal(collapsedUpcoming([special, regular])[1], regular); // same object, chronological order

console.log("upcoming-collapse-check: passed");
