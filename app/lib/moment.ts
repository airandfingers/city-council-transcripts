/**
 * "What was this moment about?" — pure selection logic for MomentCard
 * (FEAT-MOMENT-CARD-001). A visitor arriving on a meeting page with `?t=`
 * (every video description and closing card links that way) should see, at
 * a glance, the agenda item being discussed at that second and the ongoing
 * issue it belongs to.
 */

export type MomentTopic = {
  id: number;
  title: string;
  startTime: number;
  endTime: number;
  summaryText: string | null;
  keyPoints: unknown;
  outcome: string | null;
};

export type MomentArea = {
  slug: string;
  name: string;
  startTimeSeconds: number | null;
  endTimeSeconds: number | null;
};

/** Parse `?t=` the same way VideoPlayer does; null when absent or not positive. */
export function parseMomentSeconds(raw: string | null): number | null {
  const t = Number(raw);
  return Number.isFinite(t) && t > 0 ? t : null;
}

/**
 * The innermost (shortest) topic span covering `t`. Spans nest — a long
 * "Land Use Code Amendments" item contains its "Public Comment on Housing…"
 * span — and the inner one is the more specific answer.
 */
export function topicAt<T extends Pick<MomentTopic, "startTime" | "endTime">>(topics: T[], t: number): T | null {
  const covering = topics.filter((x) => x.startTime <= t && t <= x.endTime);
  if (covering.length === 0) return null;
  return covering.reduce((a, b) => (b.endTime - b.startTime < a.endTime - a.startTime ? b : a));
}

/** Topic pages ("follow this issue") whose discussion in this meeting covers `t`. */
export function areasAt(areas: MomentArea[], t: number): MomentArea[] {
  const seen = new Set<string>();
  return areas.filter((a) => {
    if (a.startTimeSeconds == null || a.endTimeSeconds == null) return false;
    if (!(a.startTimeSeconds <= t && t <= a.endTimeSeconds) || seen.has(a.slug)) return false;
    seen.add(a.slug);
    return true;
  });
}

/** keyPoints is JSON: a list of strings, or of {text}. Anything else → []. */
export function keyPointTexts(keyPoints: unknown, max = 3): string[] {
  if (!Array.isArray(keyPoints)) return [];
  return keyPoints
    .map((k) => (typeof k === "string" ? k : k && typeof k === "object" && "text" in k ? String((k as { text: unknown }).text) : ""))
    .filter(Boolean)
    .slice(0, max);
}

/**
 * Split a summary into a glanceable lead (first `n` sentences) and the rest,
 * so the card stays readable at a glance; the rest sits behind "More".
 */
export function splitLead(text: string, n = 2): { lead: string; rest: string } {
  const sentences = text.match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g)?.map((x) => x.trim()).filter(Boolean) ?? [text];
  return { lead: sentences.slice(0, n).join(" "), rest: sentences.slice(n).join(" ") };
}
