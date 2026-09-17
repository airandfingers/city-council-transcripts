/**
 * Plain-language glossary of civic/procedural jargon used across meeting
 * summaries and transcripts (US-GLOSSARY-001).
 *
 * Same shape and motivation as `app/lib/labels.ts` (PoC testers found the
 * site's language jargon-heavy and asked for short, accessible
 * explanations) — kept as a separate module rather than folded into
 * `labels.ts` because that module is scoped specifically to
 * `MeetingSummaryItem.type` values, while this one covers general council
 * vocabulary (motions, ordinances, zoning terms, transit acronyms, …) that
 * shows up anywhere in rendered prose, not just section headings. Both the
 * in-page `<GlossaryTerm>` tooltip and the standalone `/glossary` page read
 * from this single source so the two can't drift.
 *
 * Starter set grounded in real usage across the archive (the Monterey Park
 * 2026-09-16 meeting alone uses BRT, TSP, recusal, quorum, recital, and
 * mobility hub) — extend this record as new jargon shows up.
 *
 * @module glossary
 */

export type GlossaryEntry = {
  /** Display term, e.g. "Motion". */
  term: string;
  /** One-or-two-sentence, jargon-free explanation. */
  definition: string;
};

/** Keyed by a stable kebab-case id, used for lookups and as the `/glossary`
 * page's per-entry anchor (`#<id>`). */
export const GLOSSARY: Record<string, GlossaryEntry> = {
  tldr: {
    term: "TL;DR",
    definition:
      "\"Too long; didn't read\" — a short summary placed at the top, meant to be read even by someone who doesn't read anything else on the page.",
  },
  motion: {
    term: "Motion",
    definition:
      "A formal proposal a council member puts forward — to approve an item, adopt a resolution, etc. Someone else must \"second\" it before the council can vote.",
  },
  second: {
    term: "Second",
    definition:
      "A council member's agreement that a motion someone else just made is worth voting on. A motion generally can't move to a vote without one.",
  },
  quorum: {
    term: "Quorum",
    definition:
      "The minimum number of council members who must be present for the body to conduct official business and vote.",
  },
  recusal: {
    term: "Recusal",
    definition:
      "A council member stepping aside from discussing or voting on a specific item, usually because of a personal or financial conflict of interest.",
  },
  "consent-calendar": {
    term: "Consent Calendar",
    definition:
      "A batch of routine items — often already reviewed by staff — that the council approves in a single vote without individual discussion, unless a member asks to pull one out first.",
  },
  ordinance: {
    term: "Ordinance",
    definition:
      "A local law passed by the council. Most ordinances need two separate readings (see First Reading / Second Reading) before they take effect.",
  },
  resolution: {
    term: "Resolution",
    definition:
      "A formal statement of the council's position, intent, or a specific action — appointing someone, endorsing a measure, authorizing an agreement. Simpler to pass than an ordinance and doesn't carry the force of law an ordinance does.",
  },
  "first-reading": {
    term: "First Reading",
    definition:
      "The first time an ordinance is formally introduced and voted on. Most cities require a second, final reading — usually at least a week later — before it takes effect.",
  },
  "second-reading": {
    term: "Second Reading",
    definition:
      "An ordinance's final vote, after its first reading (usually at least a week earlier). Passing second reading is what actually puts the ordinance into effect.",
  },
  "public-hearing": {
    term: "Public Hearing",
    definition:
      "A formal, legally-required opportunity for residents to comment on a specific item — often zoning or land use — before the council acts on it.",
  },
  "public-comment": {
    term: "Public Comment",
    definition:
      "A period, usually near the start of a meeting or before a specific item, when any resident can address the council directly — on any topic, or the item currently on the floor.",
  },
  "staff-report": {
    term: "Staff Report",
    definition:
      "A written analysis and recommendation city staff prepares for a specific agenda item, usually included in the agenda packet.",
  },
  "agenda-packet": {
    term: "Agenda Packet",
    definition:
      "The full set of documents for a meeting — the agenda plus every staff report, attachment, and supporting document for each item — usually published a few days beforehand.",
  },
  minutes: {
    term: "Minutes",
    definition:
      "The official written record of what happened at a meeting: motions made, votes taken, and who spoke — not a full transcript.",
  },
  continuance: {
    term: "Continuance",
    definition:
      "A vote to postpone an item to a future meeting, usually because more information, analysis, or public input is needed first.",
  },
  cip: {
    term: "CIP (Capital Improvement Program)",
    definition:
      "A city's multi-year plan and budget for major, one-time physical projects — roads, parks, buildings — as opposed to day-to-day operating expenses.",
  },
  appropriation: {
    term: "Appropriation",
    definition: "A council vote authorizing the city to spend a specific amount of money on a specific purpose.",
  },
  rhna: {
    term: "RHNA (Regional Housing Needs Allocation)",
    definition:
      "A state-assigned number, given to each California city, of new housing units it must plan for (not necessarily build) at each income level over a set planning period.",
  },
  "housing-element": {
    term: "Housing Element",
    definition:
      "The part of a city's General Plan showing how it will accommodate its RHNA housing target — required by California state law and updated on a regular cycle.",
  },
  "inclusionary-housing": {
    term: "Inclusionary Housing",
    definition:
      "A policy requiring or encouraging new residential developments to include a percentage of units priced as affordable to lower-income households.",
  },
  "zoning-overlay": {
    term: "Zoning Overlay",
    definition:
      "An additional layer of zoning rules applied on top of a property's existing (\"base\") zoning, without changing that base zoning — often used, as with a housing overlay, to allow an extra use like housing on sites that wouldn't normally permit it.",
  },
  variance: {
    term: "Variance",
    definition:
      "Permission for a property owner to deviate from a specific zoning rule — a setback or height limit, for example — because of some unusual circumstance particular to that property.",
  },
  entitlement: {
    term: "Entitlement",
    definition:
      "The government approvals — permits, zoning clearance, environmental review, and so on — a project needs before it can be built.",
  },
  easement: {
    term: "Easement",
    definition:
      "A legal right for someone other than the property owner — often the city or a utility — to use a defined part of a property for a specific purpose, such as running a pipe or sidewalk.",
  },
  ceqa: {
    term: "CEQA (California Environmental Quality Act)",
    definition:
      "A California state law requiring public agencies to study and disclose a project's environmental impacts before approving it.",
  },
  abatement: {
    term: "Abatement",
    definition:
      "Official action to remove or reduce a nuisance condition on a property — most often overgrown weeds/brush (\"weed abatement\") or a hazardous or blighted structure.",
  },
  "joint-powers-authority": {
    term: "Joint Powers Authority (JPA)",
    definition:
      "A separate public agency created when two or more government bodies — say, a city and a water district — agree to jointly exercise a power or run a service together.",
  },
  brt: {
    term: "BRT (Bus Rapid Transit)",
    definition:
      "Bus service designed to run more like rail transit — often with dedicated lanes, priority at traffic signals, and fewer, more widely-spaced stops — so it moves faster and more reliably than a regular bus route.",
  },
  tsp: {
    term: "TSP (Transit Signal Priority)",
    definition:
      "Traffic-signal technology that detects an approaching bus or train and extends a green light (or shortens a red one), so transit vehicles spend less time waiting at intersections.",
  },
  "mobility-hub": {
    term: "Mobility Hub",
    definition:
      "A location designed to make it easy to switch between ways of getting around — bus, bike share, rideshare pickup, parking — usually near a major transit stop.",
  },
  recital: {
    term: "Recital",
    definition:
      "An introductory \"whereas\" statement in a resolution or ordinance explaining its background or reasoning, as opposed to the operative part that actually does something.",
  },
};

export type GlossaryTermId = keyof typeof GLOSSARY;

/** All entries as `[id, entry]` pairs, sorted alphabetically by display term. */
export function listGlossaryEntries(): Array<[string, GlossaryEntry]> {
  return Object.entries(GLOSSARY).sort((a, b) => a[1].term.localeCompare(b[1].term));
}
