import assert from "node:assert/strict";
import { groupSharedTopics } from "../../app/lib/sharedTopics";

const fc = { stateCode: "co", slug: "fort-collins", name: "Fort Collins", stateName: "Colorado" };
const mp = { stateCode: "ca", slug: "monterey-park", name: "Monterey Park", stateName: "California" };
const sea = { stateCode: "wa", slug: "seattle", name: "Seattle", stateName: "Washington" };

type Row = Parameters<typeof groupSharedTopics>[0][number];
const row = (r: Partial<Row> & Pick<Row, "slug" | "name" | "city">): Row => ({
  description: null,
  source: "custom",
  globalTopicId: null,
  meetingsDiscussed: null,
  ...r,
});

// --- Grouping by shared slug (rows from before globalTopicId existed) ---
{
  const topics = groupSharedTopics([
    { slug: "housing", name: "Housing", description: "Housing policy", source: null, meetingsDiscussed: 4, city: fc },
    { slug: "housing", name: "Housing", description: "Housing policy", source: null, meetingsDiscussed: 9, city: mp },
    { slug: "housing", name: "Homes", description: null, source: null, meetingsDiscussed: null, city: sea },
    { slug: "data_centers", name: "Data Centers", description: null, source: null, meetingsDiscussed: 20, city: sea },
    { slug: "data_centers", name: "Data Centers", description: "DCs", source: "baseline", meetingsDiscussed: 0, city: fc },
    { slug: "climate", name: "Climate", description: null, source: null, meetingsDiscussed: 0, city: fc },
    { slug: "climate", name: "Climate", description: null, source: null, meetingsDiscussed: null, city: mp },
    { slug: "hughes_site", name: "Hughes Site", description: null, source: null, meetingsDiscussed: 50, city: fc },
  ]);

  // One-city and never-discussed topics stay off /topics; busiest first.
  assert.deepEqual(topics.map((t) => t.slug), ["data_centers", "housing"]);

  const housing = topics[1];
  assert.equal(housing.name, "Housing"); // the name most cities use
  assert.equal(housing.meetingsDiscussed, 13); // null counts as 0
  assert.deepEqual(housing.areas.map((a) => a.citySlug), ["monterey-park", "fort-collins", "seattle"]);
  assert.equal(housing.areas[2].meetingsDiscussed, 0);

  assert.equal(topics[0].description, "DCs"); // the baseline row's description
  assert.equal(housing.description, null); // no baseline row: custom text never describes the topic

  // Survives unstable_cache's JSON round trip unchanged.
  assert.deepEqual(JSON.parse(JSON.stringify(topics)), topics);
}

// --- Grouping by globalTopicId (FEAT-GLOBAL-TOPIC-GROUPING-001) ---
{
  const topics = groupSharedTopics([
    // Fort Collins' own housing area replaced the baseline one.
    row({ slug: "housing_affordability_zoning", name: "Housing Affordability & Zoning", globalTopicId: "housing", meetingsDiscussed: 6, city: fc }),
    row({ slug: "housing", name: "Housing", description: "Registry text", source: "baseline", globalTopicId: "housing", meetingsDiscussed: 3, city: mp }),
    // Seattle has two housing areas; the idle one is dropped.
    row({ slug: "housing", name: "Housing (Seattle)", globalTopicId: "housing", meetingsDiscussed: 0, city: sea }),
    row({ slug: "tenant_protections", name: "Tenant Protections", globalTopicId: "housing", meetingsDiscussed: 5, city: sea }),
    // Monterey Park's custom "spending" vs. the baseline name elsewhere.
    row({ slug: "spending", name: "Municipal Spending", globalTopicId: "spending", meetingsDiscussed: 8, city: mp }),
    row({ slug: "spending", name: "Finance & Budget", source: "baseline", globalTopicId: "spending", meetingsDiscussed: 1, city: fc }),
    // Two areas in one city only: not cross-city.
    row({ slug: "comprehensive_plan", name: "Comprehensive Plan", globalTopicId: "comprehensive_plan", meetingsDiscussed: 4, city: sea }),
    row({ slug: "zoning_updates", name: "Zoning Updates", globalTopicId: "comprehensive_plan", meetingsDiscussed: 2, city: sea }),
    // A tagged custom area joins untagged rows that share the slug.
    row({ slug: "flock_cameras", name: "Flock Cameras", globalTopicId: "privacy_surveillance", meetingsDiscussed: 2, city: fc }),
    row({ slug: "privacy_surveillance", name: "Privacy & Surveillance", globalTopicId: undefined, meetingsDiscussed: 1, city: mp }),
  ]);

  assert.deepEqual(topics.map((t) => t.slug), ["housing", "spending", "privacy_surveillance"]);

  const housing = topics[0];
  assert.equal(housing.name, "Housing"); // the baseline row speaks for the topic
  assert.equal(housing.description, "Registry text");
  assert.equal(housing.meetingsDiscussed, 14);
  assert.deepEqual(
    housing.areas.map((a) => `${a.citySlug}/${a.areaSlug}`),
    ["fort-collins/housing_affordability_zoning", "seattle/tenant_protections", "monterey-park/housing"],
  );

  assert.equal(topics[1].name, "Finance & Budget"); // not the busier custom row's name
  assert.equal(topics[2].description, null);

  // No baseline row: the area whose slug is the topic id names it.
  assert.equal(topics[2].name, "Privacy & Surveillance");
  assert.deepEqual(topics[2].areas.map((a) => a.areaSlug), ["flock_cameras", "privacy_surveillance"]);
}

// A city with only idle areas in a topic keeps exactly one chip.
{
  const [topic] = groupSharedTopics([
    row({ slug: "housing", name: "Housing", globalTopicId: "housing", meetingsDiscussed: 2, city: fc }),
    row({ slug: "housing", name: "Housing", globalTopicId: "housing", meetingsDiscussed: 0, city: sea }),
    row({ slug: "tenant_protections", name: "Tenant Protections", globalTopicId: "housing", meetingsDiscussed: null, city: sea }),
  ]);
  assert.deepEqual(topic.areas.map((a) => `${a.citySlug}/${a.areaSlug}`), ["fort-collins/housing", "seattle/housing"]);
}

assert.deepEqual(groupSharedTopics([]), []);

console.log("shared-topics-check: passed");
