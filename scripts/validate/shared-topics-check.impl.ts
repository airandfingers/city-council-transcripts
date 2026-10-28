import assert from "node:assert/strict";
import { groupSharedTopics } from "../../app/lib/sharedTopics";

const fc = { stateCode: "co", slug: "fort-collins", name: "Fort Collins", stateName: "Colorado" };
const mp = { stateCode: "ca", slug: "monterey-park", name: "Monterey Park", stateName: "California" };
const sea = { stateCode: "wa", slug: "seattle", name: "Seattle", stateName: "Washington" };

const topics = groupSharedTopics([
  { slug: "housing", name: "Housing", description: "Housing policy", meetingsDiscussed: 4, city: fc },
  { slug: "housing", name: "Housing", description: "Housing policy", meetingsDiscussed: 9, city: mp },
  { slug: "housing", name: "Homes", description: null, meetingsDiscussed: null, city: sea },
  { slug: "data_centers", name: "Data Centers", description: null, meetingsDiscussed: 20, city: sea },
  { slug: "data_centers", name: "Data Centers", description: "DCs", meetingsDiscussed: 0, city: fc },
  { slug: "hughes_site", name: "Hughes Site", description: null, meetingsDiscussed: 50, city: fc },
]);

// One-city areas stay off /topics; busiest topic first.
assert.deepEqual(topics.map((t) => t.slug), ["data_centers", "housing"]);

const housing = topics[1];
assert.equal(housing.name, "Housing"); // the name most cities use
assert.equal(housing.meetingsDiscussed, 13); // null counts as 0
assert.deepEqual(housing.cities.map((c) => c.citySlug), ["monterey-park", "fort-collins", "seattle"]);
assert.equal(housing.cities[2].meetingsDiscussed, 0);

assert.equal(topics[0].description, "DCs"); // first non-empty description

// Survives unstable_cache's JSON round trip unchanged.
assert.deepEqual(JSON.parse(JSON.stringify(topics)), topics);

assert.deepEqual(groupSharedTopics([]), []);

console.log("shared-topics-check: passed");
