/**
 * Meeting outline (FEAT-MEETING-OUTLINE-001): the Timeline tab drawn as the
 * agenda, with each timestamped timeline bullet nested under the agenda item
 * it belongs to, plus its own line for anything that happened but isn't on
 * the agenda.
 *
 * No agenda item carries a timestamp for current meetings (TopicSummary is
 * theme clusters now, MeetingSegment is rare), so a bullet is attached by
 * matching its words against the item's title. It is attached only on a
 * confident match: a miss becomes an "unlisted" line in time order rather
 * than a wrong claim about which agenda item something happened under.
 *
 * Pure and dependency-free so scripts/validate/outline-check.impl.ts can
 * run it against real meetings.
 */

export type OutlineBullet = {
  text: string;
  startTimeSeconds?: number | null;
  timecodeLabel?: string | null;
  speaker?: string | null;
  position?: string | null;
  references?: unknown;
};

/** An agenda row, in agenda order. */
export type OutlineAgendaItem = {
  key: string;
  itemNumber: string | null;
  title: string;
  /** Present for TopicSummary section rows, which carry an outcome. */
  outcome?: string | null;
  /** Explicit parent, when the source encodes it (section_10_A → section_10). */
  parentKey?: string | null;
};

export type OutlineItem = {
  kind: "item";
  key: string;
  itemNumber: string | null;
  title: string;
  outcome: string | null;
  /** Earliest attached bullet's time, for the item's own play link. */
  startSeconds: number | null;
  timecodeLabel: string | null;
  bullets: OutlineBullet[];
  children: OutlineItem[];
  /** Nothing happened under it that we know of (flag salute, roll call…). */
  quiet: boolean;
};

export type OutlineExtra = { kind: "extra"; bullet: OutlineBullet };

export type OutlineRow = OutlineItem | OutlineExtra;

const STOPWORDS = new Set(
  (
    "a an and are as at be by for from has have in into is it its of on or that the this to was were will with " +
    "council councilmember councilmembers member members city meeting item items mr ms mrs dr mayor staff " +
    "approve approves approved approval adopt adopts adopted adoption pass passes passed discuss discusses discussed " +
    "discussion motion moved move moves second seconded vote votes voted unanimous unanimously consider consideration " +
    "possible action report presents presented presentation hold holds held regarding related about after before " +
    "new old business request requested if required as other all one two three no not 2025 2026 2027"
  ).split(" "),
);

/** Procedural phrases that name a standard agenda item without sharing its exact words. */
const PROCEDURAL: { item: RegExp; bullet: RegExp; score?: number }[] = [
  { item: /public\s+(comment|communication|hearing\s+of\s+the\s+public)/i, bullet: /public[\s‑-]+comment|residents?\s+(spoke|speak|address)|speakers?\s+(address|urge|call)/i },
  { item: /consent\s+calendar|consent\s+agenda/i, bullet: /consent\s+(calendar|agenda)/i },
  // "Council adjourns after approving the water plan" is about adjourning.
  { item: /adjourn/i, bullet: /adjourn/i, score: 1 },
  { item: /call\s+to\s+order/i, bullet: /call(ed)?\s+to\s+order|opens?\s+(the\s+)?meeting/i },
  { item: /roll\s+call/i, bullet: /roll\s+call/i },
  { item: /flag\s+salute|pledge/i, bullet: /flag\s+salute|pledge\s+of\s+allegiance/i },
  { item: /closed\s+session/i, bullet: /closed\s+session/i },
  { item: /proclamation/i, bullet: /proclamation/i },
];

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[‐‑‒–—]/g, "-")
    .split(/[^a-z0-9-]+/)
    .flatMap((t) => (/\d/.test(t) ? [t] : t.split("-")))
    .map((t) => t.replace(/^-+|-+$/g, ""))
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map((t) => (/\d/.test(t) ? t : t.replace(/(ies)$/, "y").replace(/(?<=[a-z]{3})s$/, "")));
}

/** Numbers like bill/resolution ids say far more than ordinary words. */
const weight = (t: string) => (/\d/.test(t) ? 3 : 1);

/**
 * How well a bullet names an agenda item, 0..1. Coverage of the item's
 * distinctive words, so a long bullet doesn't win by sheer length.
 */
export function matchScore(bulletText: string, item: { title: string; outcome?: string | null }): number {
  // A standard item named by its usual phrase. Below a strong word match,
  // so "Resolution 2026-R23 (public-comment rules)" goes to the item that
  // adopted R23, not to Public Comment.
  const rule = PROCEDURAL.find((p) => p.item.test(item.title) && p.bullet.test(bulletText));
  const procedural = rule ? rule.score ?? 0.6 : 0;
  const titleTokens = new Set(tokens(item.title));
  const itemTokens = new Set([...titleTokens, ...tokens(item.outcome ?? "")]);
  const bulletTokens = new Set(tokens(bulletText));
  let shared = 0;
  let fromTitle = false;
  let numeric = false;
  for (const t of itemTokens) {
    if (!bulletTokens.has(t)) continue;
    shared += weight(t);
    if (titleTokens.has(t)) fromTitle = true;
    if (/\d/.test(t)) numeric = true;
  }
  // One shared ordinary word is never enough on its own ("budget",
  // "water"); a shared number, or two words, can be. A match through the
  // outcome alone needs a number (a resolution or bill id): outcomes
  // repeat generic phrases like "on the Consent Calendar", so a match
  // through the outcome alone needs a number (a resolution or bill id) or
  // three shared words.
  if (shared < 2 || !(fromTitle || numeric || shared >= 3)) return procedural;
  let titleWeight = 0;
  for (const t of titleTokens) titleWeight += weight(t);
  let bulletWeight = 0;
  for (const t of bulletTokens) bulletWeight += weight(t);
  const words = Math.min(1, shared / Math.max(2, Math.min(titleWeight, bulletWeight, 6)));
  return Math.max(procedural, words);
}

/**
 * A weaker tie: the bullet shares a word with the item, or is a motion or
 * vote (which is about whatever was being discussed). Used only to keep a
 * bullet with the item just before it, never to place one on its own.
 */
function continues(bulletText: string, item: { title: string; outcome?: string | null }): boolean {
  if (/\b(motion|vote[sd]?|passe[sd]|seconded|carried|failed)\b/i.test(bulletText)) return true;
  const itemTokens = new Set(tokens(`${item.title} ${item.outcome ?? ""}`));
  return tokens(bulletText).some((t) => itemTokens.has(t));
}

const CONFIDENT = 0.5;

/** "A", "b." → a lettered sub-item. */
const LETTER = /^\(?([A-Za-z])[.)]?$/;
/** "7.A", "7A", "10.1", "7-a" → explicit parent number + child part. */
const DOTTED = /^(\d+)[.\-]?([A-Za-z]|\d+)[.)]?$/;
const NUMBER = /^(\d+)[.)]?$/;

/**
 * Nest agenda rows. Explicit parentKey wins; otherwise a lettered item
 * belongs to the latest numbered one, and "7.A" to item 7.
 */
export function nestAgenda(items: OutlineAgendaItem[]): OutlineItem[] {
  const top: OutlineItem[] = [];
  const byKey = new Map<string, OutlineItem>();
  const byNumber = new Map<string, OutlineItem>();
  let lastNumbered: OutlineItem | null = null;
  for (const it of items) {
    const node: OutlineItem = {
      kind: "item",
      key: it.key,
      itemNumber: it.itemNumber?.trim() || null,
      title: it.title.trim(),
      outcome: it.outcome?.trim() || null,
      startSeconds: null,
      timecodeLabel: null,
      bullets: [],
      children: [],
      quiet: true,
    };
    byKey.set(it.key, node);
    const num = node.itemNumber ?? "";
    let parent: OutlineItem | undefined;
    if (it.parentKey) parent = byKey.get(it.parentKey);
    else if (DOTTED.test(num) && !NUMBER.test(num)) parent = byNumber.get(DOTTED.exec(num)![1]);
    else if (LETTER.test(num)) parent = lastNumbered ?? undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      top.push(node);
      if (NUMBER.test(num)) {
        lastNumbered = node;
        byNumber.set(NUMBER.exec(num)![1], node);
      } else if (!num) {
        // An unnumbered heading ends the run of a numbered item's letters.
        lastNumbered = null;
      }
    }
  }
  return top;
}

function flatten(items: OutlineItem[]): OutlineItem[] {
  return items.flatMap((i) => [i, ...flatten(i.children)]);
}

/**
 * Build the outline, or null when there's no agenda to hang the timeline on
 * (or nothing in the timeline matched it — an agenda with every line marked
 * unlisted would say less than the plain timeline).
 */
export function buildOutline(agenda: OutlineAgendaItem[], bullets: OutlineBullet[]): OutlineRow[] | null {
  if (agenda.length < 2 || bullets.length === 0) return null;
  const tree = nestAgenda(agenda);
  const all = flatten(tree);

  const sorted = [...bullets].sort(
    (a, b) => (a.startTimeSeconds ?? Infinity) - (b.startTimeSeconds ?? Infinity),
  );

  const parentOf = new Map<OutlineItem, OutlineItem>();
  for (const n of all) for (const c of n.children) parentOf.set(c, n);
  const ancestorOf = (a: OutlineItem, b: OutlineItem) => {
    for (let p = parentOf.get(b); p; p = parentOf.get(p)) if (p === a) return true;
    return false;
  };

  // 1. Confident matches. A heading with sub-items scores a little lower
  //    than an equally good sub-item: the more specific line wins.
  const assigned: (OutlineItem | null)[] = sorted.map((b) => {
    let best: OutlineItem | null = null;
    let bestScore = 0;
    for (const node of all) {
      const s = matchScore(b.text, node) * (node.children.length ? 0.9 : 1);
      if (s > bestScore) {
        best = node;
        bestScore = s;
      }
    }
    return bestScore >= CONFIDENT ? best : null;
  });

  if (!assigned.some(Boolean)) return null;

  // 2. A later bullet stays with the item last talked about if it is a
  //    motion/vote or shares a word with it ("Motion to withdraw the
  //    Halligan permit" after "Council reviews water-storage strategy").
  let current: OutlineItem | null = null;
  for (let i = 0; i < sorted.length; i++) {
    if (assigned[i]) current = assigned[i];
    else if (current && continues(sorted[i].text, current)) assigned[i] = current;
  }

  // 3. A bullet between two bullets of the same item (or of an item and
  //    its own sub-item) is part of that discussion: the debate between a
  //    staff report and the vote. It goes to the outer of the two.
  const anchors = assigned.map((a, i) => (a ? i : -1)).filter((i) => i >= 0);
  for (let k = 0; k + 1 < anchors.length; k++) {
    const [i, j] = [anchors[k], anchors[k + 1]];
    const [a, b] = [assigned[i]!, assigned[j]!];
    const outer = a === b || ancestorOf(a, b) ? a : ancestorOf(b, a) ? b : null;
    if (outer) for (let m = i + 1; m < j; m++) assigned[m] = outer;
  }

  const extras: OutlineBullet[] = [];
  sorted.forEach((b, i) => {
    const node = assigned[i];
    if (node) node.bullets.push(b);
    else extras.push(b);
  });

  // 4. Times and quietness, bottom-up.
  const settle = (node: OutlineItem) => {
    node.children.forEach(settle);
    // Start = earliest of its own first bullet and its sub-items' starts,
    // with that source's own label so "60:10" doesn't turn into "1:00:10".
    const first = node.bullets.find((b) => b.startTimeSeconds != null);
    const candidates: { s: number; label: string | null }[] = [
      ...(first ? [{ s: first.startTimeSeconds!, label: first.timecodeLabel ?? null }] : []),
      ...node.children
        .filter((c) => c.startSeconds != null)
        .map((c) => ({ s: c.startSeconds!, label: c.timecodeLabel })),
    ];
    const earliest = candidates.reduce<{ s: number; label: string | null } | null>(
      (m, c) => (m == null || c.s < m.s ? c : m),
      null,
    );
    node.startSeconds = earliest?.s ?? null;
    node.timecodeLabel = earliest?.label ?? null;
    node.quiet = node.bullets.length === 0 && !node.outcome && node.children.every((c) => c.quiet);
  };
  tree.forEach(settle);

  // 5. Each unlisted line goes in meeting order: right after the last
  //    top-level row that started before it, or, when nothing timed came
  //    before it, right before the first row that started after it (so it
  //    doesn't jump above procedural items like Call to Order).
  const rows: OutlineRow[] = [...tree];
  const startOf = (r: OutlineRow) => (r.kind === "item" ? r.startSeconds : r.bullet.startTimeSeconds ?? null);
  for (const b of extras) {
    const t = b.startTimeSeconds;
    let at = rows.length;
    if (t != null) {
      let after = -1;
      let before = -1;
      rows.forEach((r, i) => {
        const s = startOf(r);
        if (s == null) return;
        if (s <= t) after = i;
        else if (before < 0) before = i;
      });
      at = after >= 0 ? after + 1 : before >= 0 ? before : rows.length;
    }
    rows.splice(at, 0, { kind: "extra", bullet: b });
  }
  return rows;
}

/**
 * Agenda rows from the page's data, in agenda order.
 *
 * AgendaItemVersion has no order column: the publisher inserts a scrape's
 * items in agenda order, so the first revision's row id is the agenda
 * position. (Sorting by sourceItemId, a CivicClerk id, scrambles it.)
 */
export function agendaFromVersions(
  versions: { id: number; sourceItemId: string; itemNumber: string | null; title: string }[],
): OutlineAgendaItem[] {
  const firstId = new Map<string, number>();
  const latest = new Map<string, { itemNumber: string | null; title: string; rev: number }>();
  for (const v of versions) {
    firstId.set(v.sourceItemId, Math.min(firstId.get(v.sourceItemId) ?? Infinity, v.id));
    const cur = latest.get(v.sourceItemId);
    if (!cur || v.id > cur.rev) latest.set(v.sourceItemId, { itemNumber: v.itemNumber, title: v.title, rev: v.id });
  }
  return [...latest.entries()]
    .sort((a, b) => firstId.get(a[0])! - firstId.get(b[0])!)
    .map(([key, v]) => ({ key, itemNumber: v.itemNumber, title: v.title }));
}

/**
 * Agenda rows from older Monterey Park meetings, whose TopicSummary rows are
 * the agenda sections themselves (topicId "section_10_A" under "section_10").
 * Theme clusters ("tag_budget_finance") aren't an agenda; none → [].
 */
export function agendaFromSectionTopics(
  topics: { topicId: string; title: string; outcome?: string | null }[],
): OutlineAgendaItem[] {
  const sections = topics.filter((t) => /^section_\d+(_[A-Za-z0-9]+)?$/.test(t.topicId));
  if (sections.length < topics.length / 2) return [];
  const keys = new Set(sections.map((s) => s.topicId));
  const rows = sections.map((s) => {
    const m = /^section_(\d+)(?:_([A-Za-z0-9]+))?$/.exec(s.topicId)!;
    const parent = m[2] ? `section_${m[1]}` : null;
    return {
      key: s.topicId,
      itemNumber: m[2] ?? m[1],
      title: s.title,
      outcome: s.outcome ?? null,
      parentKey: parent && keys.has(parent) ? parent : null,
      n: Number(m[1]),
    };
  });
  // Agenda order: section number, parent before its children (the topic
  // sortOrder sometimes files a child before an earlier section).
  rows.sort((a, b) => a.n - b.n || (a.parentKey ? 1 : 0) - (b.parentKey ? 1 : 0));
  return rows.map((r) => ({ key: r.key, itemNumber: r.itemNumber, title: r.title, outcome: r.outcome, parentKey: r.parentKey }));
}
