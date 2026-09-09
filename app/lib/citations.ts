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

/**
 * Walks `refs` in order and locates each one's `textBefore` inside `text`
 * via a forward-advancing cursor, rather than assuming the refs that
 * survived `isValidRef` sum to the correct offset on their own
 * (FIX-ANNOTATEDTEXT-REMAINDER-DUP-001).
 *
 * Both extraction functions that produce this JSON (`extract_annotated_text`
 * and `extract_annotated_text_from_citations` in the transcriber) only add
 * an entry to `references` when its anchor was actually found, advancing
 * their own cursor exactly that far -- so under normal operation every
 * entry that reaches the frontend already has a `textBefore` that starts
 * exactly where the previous one's ended, and a plain length-sum works. The
 * gap this guards against is a malformed/legacy `references` blob (a stale
 * row from a different extraction mechanism, a hand-edited value, or any
 * future producer that doesn't hold that invariant) where an entry got
 * silently dropped by `isValidRef` (non-string `textBefore`) while its
 * neighbors survived: a plain length-sum then desyncs from `text`'s real
 * offsets, and the remainder slice can either re-render already-shown text
 * or silently drop a span. Searching for each surviving ref's own
 * `textBefore` from the running cursor (instead of trusting array order +
 * length) self-corrects for exactly that gap, since it finds where the text
 * actually is rather than where a naive sum assumes it is.
 *
 * Returns the offset immediately after the last ref's match -- i.e. where
 * the final remainder should start.
 */
export function findRefCursor(text: string, refs: AnnotatedTextRef[]): number {
  let cursor = 0;
  for (const ref of refs) {
    const idx = text.indexOf(ref.textBefore, cursor);
    // If even a defensive forward search can't locate this chunk (the
    // stored JSON is inconsistent with `text` itself -- not just missing an
    // entry, but actively wrong), fall back to treating it as adjacent to
    // whatever's already consumed. That reproduces the old
    // best-effort-but-can-drift behavior for this one ref only, rather than
    // losing track of every ref after it too.
    cursor = (idx === -1 ? cursor : idx) + ref.textBefore.length;
  }
  return cursor;
}

// A citation gap is authored ending in a connector word anticipating the
// citation that follows (e.g. "...approved the plan at "). When a ref
// carries no seconds/label/provenance at all (FIX-TIMESTAMP-LABEL-EMPTY-001
// AC-3), nothing renders after that connector, so printing textBefore as-is
// leaves a dangling "...approved the plan at Next, the council...". Trimmed
// here rather than left to the caller, since both renderers hit this case
// the same way.
const TRAILING_CONNECTOR_RE = /\s+(?:at|on|in|during|around|near|by|from|starting at|beginning at)\s*$/i;

/**
 * Trims a trailing connector word (or just whitespace, if none matches) off
 * `textBefore` for a reference with no content to show after it
 * (FIX-TIMESTAMP-LABEL-EMPTY-001 AC-3).
 *
 * Current backend extraction (`extract_annotated_text`/
 * `extract_annotated_text_from_citations` in the transcriber) always skips
 * adding a reference when seconds/label/provenance are all absent, so this
 * is defensive against malformed/legacy data — same posture as
 * `findRefCursor` above — not a path exercised by current production data.
 * The connector list is deliberately small and English-specific; an
 * unmatched trailing word just gets whitespace-trimmed, which is safe (a
 * dangling preposition reads awkwardly but not "broken") rather than
 * guessed at further.
 */
export function stripDanglingLeadIn(textBefore: string): string {
  return textBefore.replace(TRAILING_CONNECTOR_RE, "").trimEnd();
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

  // Cursor-based, not a length-sum — see findRefCursor's docstring
  // (FIX-ANNOTATEDTEXT-REMAINDER-DUP-001).
  const remainder = text.slice(findRefCursor(text, refs));

  let out = "";
  for (const ref of refs) {
    const hasTimecode = ref.seconds != null || !!ref.label;
    const hasContent = hasTimecode || !!ref.provenance;
    // textBefore is authored ending in its own trailing space before the
    // citation gap ("...partnership at "). Normalize to exactly one space
    // before "(" rather than concatenating blindly, which double-spaces
    // ("at  (33:06)") since a literal " (" gets added on top of it.
    out += hasContent ? ref.textBefore.trimEnd() + " (" : stripDanglingLeadIn(ref.textBefore);
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
