import assert from "node:assert/strict";
import fs from "node:fs";
import {
  agendaFromSectionTopics,
  agendaFromVersions,
  buildOutline,
  matchScore,
  nestAgenda,
  type OutlineItem,
  type OutlineRow,
} from "../../app/lib/outline";

// Real meetings, one per agenda shape (scripts/validate/fixtures/outline).
type Fixture = {
  agendaItems?: { sourceItemId: string; itemNumber: string | null; title: string }[];
  topics?: { topicId: string; title: string; outcome: string | null }[];
  bullets: { text: string; startTimeSeconds: number | null; timecodeLabel: string | null }[];
};
const load = (name: string): Fixture =>
  JSON.parse(fs.readFileSync(`scripts/validate/fixtures/outline/${name}.json`, "utf8"));
const outlineOf = (f: Fixture) =>
  buildOutline(
    f.topics
      ? agendaFromSectionTopics(f.topics)
      : f.agendaItems!.map((a) => ({ key: a.sourceItemId, itemNumber: a.itemNumber, title: a.title })),
    f.bullets,
  );
const items = (rows: OutlineRow[]): OutlineItem[] =>
  rows.flatMap((r) => (r.kind === "item" ? [r, ...items(r.children)] : []));
/** The agenda item a bullet landed under ("6.A"-style path), or "+" if unlisted. */
function placeOf(rows: OutlineRow[], startsWith: string): string {
  for (const r of rows) {
    if (r.kind === "extra" && r.bullet.text.startsWith(startsWith)) return "+";
  }
  const walk = (list: OutlineItem[], path: string): string | null => {
    for (const it of list) {
      const p = path ? `${path}.${it.itemNumber}` : `${it.itemNumber ?? it.title}`;
      if (it.bullets.some((b) => b.text.startsWith(startsWith))) return p;
      const inner = walk(it.children, p);
      if (inner) return inner;
    }
    return null;
  };
  const found = walk(items(rows).filter((i) => rows.includes(i)), "");
  assert.ok(found, `bullet "${startsWith}" missing from the outline`);
  return found;
}

// Monterey Park 2026-11-04: numbered items with lettered sub-items.
{
  const rows = outlineOf(load("mp-2026-11-04"))!;
  assert.ok(rows);
  const top = rows.filter((r) => r.kind === "item") as OutlineItem[];
  assert.equal(top.length, 15, "lettered items nest under their numbered item");
  assert.deepEqual(top.find((t) => t.itemNumber === "10")!.children.map((c) => c.itemNumber), "ABCDEFGHI".split(""));
  assert.equal(placeOf(rows, "Council discusses bike"), "6.A");
  assert.equal(placeOf(rows, "Public comments on food"), "7");
  assert.equal(placeOf(rows, "Council member Lo proposes"), "+", "not on the agenda → its own line");
  assert.equal(placeOf(rows, "Council approves Garvey Ranch"), "10.D");
  assert.equal(placeOf(rows, "Council approves Downtown BID"), "12.A");
  assert.equal(placeOf(rows, "Council moves to adopt reporting language"), "12.B");
  // The unlisted line sits in meeting order: after Public Comments (56:04).
  const lo = rows.findIndex((r) => r.kind === "extra");
  assert.equal((rows[lo - 1] as OutlineItem).itemNumber, "7");
  assert.equal(top.find((t) => t.itemNumber === "2")!.quiet, true, "flag salute with nothing said is quiet");
  assert.equal(top.find((t) => t.itemNumber === "12")!.startSeconds, 6013.36, "a heading starts at its first sub-item");
}

// Fort Collins 2026-10-20: partial agenda, numbering restarts.
{
  const rows = outlineOf(load("fc-2026-10-20"))!;
  assert.equal(placeOf(rows, "Motion to adopt six"), "18");
  for (const b of ["Council reviews water", "Motion to withdraw Halligan", "Motion to approve participation", "Motion to adopt Ordinance"]) {
    assert.equal(placeOf(rows, b), "19", b);
  }
  assert.equal(placeOf(rows, "Council adjourns"), "2");
}

// Montebello 2026-11-12: unnumbered all-caps headings.
{
  const rows = outlineOf(load("montebello-2026-11-12"))!;
  assert.equal(placeOf(rows, "Public comments delivered"), "PUBLIC COMMENTS ON AGENDA ITEMS ONLY (30 MINUTES)");
  for (const b of ["City Manager presented interim", "Council members asked", "City Manager clarified", "Motion to approve agreement", "Vote taken"]) {
    assert.equal(placeOf(rows, b), "1", b);
  }
  assert.equal(placeOf(rows, "Meeting adjourned"), "ADJOURNMENT");
}

// Seattle 2026-11-10: no agenda → the plain timeline.
assert.equal(outlineOf(load("seattle-2026-11-10")), null);

// Older Monterey Park: TopicSummary rows are the agenda sections.
{
  const f = load("mp-2026-04-15-sections");
  const agenda = agendaFromSectionTopics(f.topics!);
  assert.deepEqual(agenda.slice(0, 2).map((a) => a.key), ["section_1", "section_2"]);
  assert.equal(agenda.find((a) => a.key === "section_10_H")!.parentKey, "section_10");
  const rows = outlineOf(f)!;
  assert.equal(placeOf(rows, "California Cities"), "10.H");
  assert.equal(placeOf(rows, "Motion to adopt SB"), "12.A");
  assert.equal(placeOf(rows, "Amendment to employment"), "12.B", "outcome text names the item");
  assert.notEqual(placeOf(rows, "Resolution"), "6", "not Public Communications");
}
assert.deepEqual(agendaFromSectionTopics([{ topicId: "tag_budget", title: "Budget" }, { topicId: "tag_zoning", title: "Zoning" }]), []);

// Agenda order is the first revision's row id, not the CivicClerk id.
assert.deepEqual(
  agendaFromVersions([
    { id: 10, sourceItemId: "7933", itemNumber: "4", title: "Telecom" },
    { id: 9, sourceItemId: "7932", itemNumber: "3", title: "Roll Call" },
    { id: 11, sourceItemId: "9889", itemNumber: "A", title: "E-Bike Safety" },
    { id: 40, sourceItemId: "7932", itemNumber: "3", title: "Roll Call (revised)" },
  ]).map((a) => `${a.itemNumber} ${a.title}`),
  ["3 Roll Call (revised)", "4 Telecom", "A E-Bike Safety"],
);

// Nesting rules.
const nested = nestAgenda([
  { key: "1", itemNumber: "7", title: "Staff" },
  { key: "2", itemNumber: "A", title: "Library" },
  { key: "3", itemNumber: null, title: "REGULAR BUSINESS" },
  { key: "4", itemNumber: "B", title: "Orphan letter" },
  { key: "5", itemNumber: "7.C", title: "Dotted" },
]);
assert.deepEqual(nested.map((n) => n.key), ["1", "3", "4"]);
assert.deepEqual(nested[0].children.map((c) => c.key), ["2", "5"]);

// Scoring floors.
assert.equal(matchScore("Council discusses the budget", { title: "Budget Hearing" }), 0, "one ordinary word is not a match");
assert.ok(matchScore("Bill 121-276 passed 8-0", { title: "Council Bill 121-276" }) >= 0.5, "a shared bill number is");

console.log("outline-check: passed");
