/**
 * Shaping and derivation rules for the topic detail page.
 *
 * The topic page (`/{state}/{city}/topics/{slug}`) renders a *topic*, but
 * every fact behind it is stored per *meeting*: an InterestAreaMeetingStatus
 * row per meeting that discussed the topic, plus — when that row carries a
 * `sourceItemId` — the meeting's matching TopicSummary (speakers, stances,
 * outcome) and the MeetingSummaryItem rows inside the discussion's time
 * window. This module holds the pure logic that turns those per-meeting
 * records into the page's cross-meeting views (voices, public comment,
 * per-meeting kind chips, dormancy), so the Prisma access in cityData.ts
 * stays a query and the page stays markup.
 *
 * Two rules matter more than the rest, because they decide what the page
 * is willing to *claim*:
 *
 * 1. Speaker names in this data are a mix of real names and diarization
 *    placeholders ("SPEAKER_04", "Speaker_Unknown"). Placeholders are
 *    dropped everywhere a person is named — they read as data corruption
 *    to a reader, and they're not people.
 * 2. A status row's [startTimeSeconds, endTimeSeconds] window is the
 *    *agenda item's* span, which routinely covers neighbouring items too
 *    (an observed Fort Collins window ran 2.3 hours). So summary items
 *    found in the window are only attributed to the topic when their
 *    speaker is also listed in that meeting's topic summary — precision
 *    over recall, since the failure mode is quoting a resident about the
 *    wrong subject under their real name.
 *
 * @module topicDetail
 */

/** Where a speaker landed on the topic, collapsed to what a bar can show. */
export type TopicStance = "support" | "concern" | "neutral" | "mixed";

export type TopicSpeaker = {
  name: string;
  stance: TopicStance;
  /** How many of the topic's meetings this person spoke in. */
  meetingCount: number;
  /** Short "key points" the summarizer attributed to them, deduped. */
  points: string[];
};

export type TopicPublicComment = {
  speaker: string;
  stance: TopicStance;
  text: string;
  /** Transcript-time seconds, or null when the item carried no timecode. */
  seconds: number | null;
  /** Video-time seconds (offset-mapped), null when unmapped/unseekable. */
  videoSeconds: number | null;
  meetingSlug: string;
  meetingDate: Date;
};

/** The chips a meeting card carries, and the facets the filter row counts. */
export type TopicMeetingKind = "decision" | "public" | "discussion";

export const KIND_LABEL: Record<TopicMeetingKind, string> = {
  decision: "Decision",
  public: "Public comment",
  discussion: "Discussion",
};

/** Same kinds as a filter label, where the count makes them plural. */
export const KIND_FACET_LABEL: Record<TopicMeetingKind, string> = {
  decision: "Decisions",
  public: "Public comment",
  discussion: "Discussion",
};

/**
 * Diarization placeholders and non-identifying labels the summarizer emits
 * when it can't name someone. Anything matching is excluded from the
 * voices rail, the public-comment tab, and the per-card speaker chips.
 */
const PLACEHOLDER_NAME_RE =
  /^(?:speaker[\s_-]*\d+|speaker[\s_-]*unknown|unknown(?:\s+speaker)?|unidentified.*|.*name not provided.*|public|staff|resident)$/i;

export function isNamedSpeaker(name: string | null | undefined): boolean {
  const trimmed = name?.trim();
  if (!trimmed) return false;
  return !PLACEHOLDER_NAME_RE.test(trimmed);
}

/**
 * Collapse the summarizer's free-text stance ("supportive",
 * "neutral/supporting resolution", "opposed", "critical") into one of the
 * three rendered buckets. Opposition wins over support when a string
 * carries both, since "supports X but opposes Y" is a concern in the only
 * sense the page uses stance for (who might push back).
 */
export function normalizeStance(raw: string | null | undefined): TopicStance {
  const s = (raw ?? "").toLowerCase();
  if (!s) return "neutral";
  if (/oppos|against|critical|concern|worried|skeptic/.test(s)) return "concern";
  if (/support|favor|in favour|endorse/.test(s)) return "support";
  return "neutral";
}

/** One speaker's stance across several meetings; disagreement reads "mixed". */
export function combineStances(stances: TopicStance[]): TopicStance {
  const set = new Set(stances.filter((s) => s !== "neutral"));
  if (set.size === 0) return "neutral";
  if (set.size > 1) return "mixed";
  return [...set][0];
}

/**
 * Strip the honorifics, role prefixes and parentheticals the summarizer
 * attaches inconsistently to the same person ("Resident Rich Stave",
 * "Ross Cunniff (Board Chair)", "Councilmember Gutowski"), so the same
 * human matches across two differently-worded records.
 */
export function normalizePersonName(name: string): string {
  return name
    .replace(/\(.*?\)/g, " ")
    .replace(
      /\b(?:councilmember|council member|councilwoman|councilman|mayor pro[\s‑-]*tem|mayor|resident|staff|dr|mr|mrs|ms)\b\.?/gi,
      " ",
    )
    .replace(/[^\p{L}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Do two differently-written names refer to the same person? True on an
 * exact normalized match, or when one normalized name fully contains the
 * other as whole words ("rich stave" ⊂ "rich stave jr"). Deliberately not
 * a fuzzy/edit-distance match: a near-miss here attaches a real quote to
 * the wrong named resident.
 */
export function namesMatch(a: string, b: string): boolean {
  const na = normalizePersonName(a);
  const nb = normalizePersonName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const [short, long] = na.length <= nb.length ? [na, nb] : [nb, na];
  // Single-token names ("rich", "jill") are too common to match by
  // containment — require the full multi-word name.
  if (!short.includes(" ")) return false;
  return new RegExp(`(?:^|\\s)${short.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s|$)`).test(long);
}

/**
 * A topic with no meeting in the last six months is dormant — the edge
 * state the wireframes call for, so a page that looks alive can't imply
 * activity that stopped two years ago.
 */
export const DORMANT_AFTER_DAYS = 183;

export function isDormant(lastActivity: Date | null, now: Date = new Date()): boolean {
  if (!lastActivity) return true;
  return now.getTime() - lastActivity.getTime() > DORMANT_AFTER_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Which chips a meeting carries. `decision` comes from the topic
 * summary's own `outcome` field (topic-scoped, so it can't drift onto a
 * neighbouring agenda item the way a window match can); `public` from
 * comments that survived the name-intersection rule above. Everything
 * else is plain discussion — never an empty card.
 */
export function meetingKinds(args: {
  outcome: string | null;
  publicCommentCount: number;
}): TopicMeetingKind[] {
  const kinds: TopicMeetingKind[] = [];
  if (args.outcome?.trim()) kinds.push("decision");
  if (args.publicCommentCount > 0) kinds.push("public");
  if (kinds.length === 0) kinds.push("discussion");
  return kinds;
}
