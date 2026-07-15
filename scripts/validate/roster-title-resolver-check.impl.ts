import { resolveTitleAt, type TitleEntry } from "../../app/lib/roster";

/** Monterey Park mayor-rotation fixture (see FEAT-ROSTER-TITLES-OVER-TIME-001). */
const yang: TitleEntry[] = [
  { title: "Council Member", startDate: "2020-01-01", endDate: "2024-11-30" },
  { title: "Mayor", startDate: "2024-12-01", endDate: "2025-11-30", isPrimary: true },
  { title: "Council Member", startDate: "2025-12-01", endDate: null },
];

const lo: TitleEntry[] = [
  { title: "Council Member", startDate: "2020-01-01", endDate: null },
  { title: "Mayor Pro Tem", startDate: "2024-12-01", endDate: "2025-11-30", isPrimary: true },
  { title: "Mayor", startDate: "2025-12-01", endDate: null, isPrimary: true },
];

const sanchez: TitleEntry[] = [
  { title: "Council Member", startDate: "2020-01-01", endDate: null },
  { title: "Mayor Pro Tem", startDate: "2025-12-01", endDate: null, isPrimary: true },
];

type Case = { label: string; titles: TitleEntry[]; asOf: string; expected: string | null };

const cases: Case[] = [
  { label: "Yang @ 2025-06-04", titles: yang, asOf: "2025-06-04", expected: "Mayor" },
  { label: "Lo @ 2025-06-04", titles: lo, asOf: "2025-06-04", expected: "Mayor Pro Tem" },
  { label: "Lo @ 2026-02-04", titles: lo, asOf: "2026-02-04", expected: "Mayor" },
  { label: "Sanchez @ 2026-02-04", titles: sanchez, asOf: "2026-02-04", expected: "Mayor Pro Tem" },
  { label: "Sanchez @ 2025-06-04 (not yet MPT)", titles: sanchez, asOf: "2025-06-04", expected: "Council Member" },
  { label: "empty titles", titles: [], asOf: "2025-06-04", expected: null },
];

let failures = 0;
for (const c of cases) {
  const actual = resolveTitleAt(c.titles, new Date(`${c.asOf}T00:00:00Z`));
  const ok = actual === c.expected;
  console.log(`${ok ? "✔" : "✖"} ${c.label}: expected ${JSON.stringify(c.expected)}, got ${JSON.stringify(actual)}`);
  if (!ok) failures++;
}

if (failures > 0) {
  console.error(`\n${failures} case(s) failed.`);
  process.exit(1);
}
console.log("\nAll roster title resolution cases passed.");
