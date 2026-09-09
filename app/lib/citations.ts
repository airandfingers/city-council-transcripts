/**
 * Shared logic for splicing inline timecode/provenance citations
 * ("references" — see FIX-AI-SUMMARY-INLINE-TIMESTAMPS-001) back into the
 * flat text they were generated alongside. `Meeting.logline` and
 * `MeetingSummaryItem.text` are authored as templates with citation gaps
 * (e.g. "...supported the plan at ") that only read correctly once a
 * citation is spliced in at each reference's position — see
 * AnnotatedText.tsx for the interactive (JSX/clickable) version used on the
 * meeting detail page.
 *
 * This module holds the pieces reused by both that JSX renderer and
 * `annotateTextPlain` below (the non-interactive, plain-string version for
 * contexts that can't host a clickable link — already nested inside another
 * `<Link>`, e.g. MeetingCard/city page cards, or a static email template).
 */

export type AnnotatedTextRef = {
  textBefore: string;
  seconds: number | null;
  label: string | null;
  provenance: "minutes" | "transcript" | "mixed" | null;
  linkStatus?: string | null;
};

export function isValidRef(r: unknown): r is AnnotatedTextRef {
  return (
    typeof r === "object" &&
    r !== null &&
    typeof (r as AnnotatedTextRef).textBefore === "string"
  );
}

/** Formats a seconds offset as "m:ss" (or "h:mm:ss" past an hour). */
export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Plain-text counterpart to AnnotatedText.tsx's JSX rendering. Reconstructs
 * the same citation content AnnotatedText would render — "(label)", or
 * "(label · provenance)" — as plain text with no link, for contexts where a
 * clickable TimestampLink can't be nested (MeetingCard, the city page's
 * "latest meeting" fallback, and the recap email's TL;DR/key-decision text
 * — see FIX-TIMESTAMP-LABEL-EMPTY-001).
 *
 * Falls back to the raw text unchanged when `references` is
 * null/empty/malformed — the case for every row written before the
 * citation feature shipped, or any plain (non-templated) field.
 */
export function annotateTextPlain(text: string, references: unknown): string {
  const refs = Array.isArray(references) ? references.filter(isValidRef) : [];
  if (refs.length === 0) return text;

  // Same consumed-length reconstruction as AnnotatedText.tsx — see that
  // file's comment. Shares its known edge case (FIX-ANNOTATEDTEXT-REMAINDER-DUP-001):
  // a reference dropped by isValidRef (non-string textBefore) still needs
  // its length accounted for here, which this doesn't handle either.
  const consumed = refs.reduce((acc, r) => acc + r.textBefore.length, 0);
  const remainder = text.slice(consumed);

  let out = "";
  for (const ref of refs) {
    const hasTimecode = ref.seconds != null || !!ref.label;
    const hasContent = hasTimecode || !!ref.provenance;
    // textBefore is authored ending in its own trailing space before the
    // citation gap ("...partnership at "). Normalize to exactly one space
    // before "(" rather than concatenating blindly, which double-spaces
    // ("at  (33:06)") since a literal " (" gets added on top of it.
    out += hasContent ? ref.textBefore.trimEnd() + " (" : ref.textBefore;
    if (ref.seconds != null) {
      out += ref.label?.trim() || formatTime(ref.seconds);
    } else if (ref.label) {
      out += ref.label;
    }
    if (ref.provenance) {
      out += hasTimecode ? ` · ${ref.provenance}` : ref.provenance;
    }
    if (hasContent) out += ")";
  }
  out += remainder;
  return out;
}
