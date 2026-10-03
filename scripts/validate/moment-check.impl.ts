import assert from "node:assert/strict";
import { areasAt, keyPointTexts, parseMomentSeconds, splitLead, topicAt } from "../../app/lib/moment";

assert.equal(parseMomentSeconds("2523"), 2523);
assert.equal(parseMomentSeconds(null), null);
assert.equal(parseMomentSeconds("0"), null);
assert.equal(parseMomentSeconds("abc"), null);

const topics = [
  { id: 1, title: "Land Use Code Amendments", startTime: 1419.6, endTime: 4713.5, summaryText: null, keyPoints: null, outcome: null },
  { id: 2, title: "Public Comment on Housing", startTime: 2492.1, endTime: 3635.1, summaryText: null, keyPoints: null, outcome: null },
];
assert.equal(topicAt(topics, 2523)?.title, "Public Comment on Housing"); // innermost wins
assert.equal(topicAt(topics, 2000)?.title, "Land Use Code Amendments");
assert.equal(topicAt(topics, 10), null);

const areas = [
  { slug: "housing", name: "Housing", startTimeSeconds: 2400, endTimeSeconds: 3700 },
  { slug: "housing", name: "Housing", startTimeSeconds: 2400, endTimeSeconds: 3700 },
  { slug: "budget", name: "Budget", startTimeSeconds: null, endTimeSeconds: null },
  { slug: "parks", name: "Parks", startTimeSeconds: 100, endTimeSeconds: 200 },
];
assert.deepEqual(areasAt(areas, 2523).map((a) => a.slug), ["housing"]);

assert.deepEqual(keyPointTexts(["a", "b", "c", "d"]), ["a", "b", "c"]);
assert.deepEqual(keyPointTexts([{ text: "x" }, 5, null]), ["x"]);
assert.deepEqual(keyPointTexts("nope"), []);

assert.deepEqual(splitLead("One. Two! Three? Four."), { lead: "One. Two!", rest: "Three? Four." });
assert.deepEqual(splitLead("Only one sentence"), { lead: "Only one sentence", rest: "" });
assert.deepEqual(splitLead("Talks at 64:39 to address items. Then more."), { lead: "Talks at 64:39 to address items. Then more.", rest: "" });
assert.deepEqual(splitLead(""), { lead: "", rest: "" });

console.log("moment-check: passed");
