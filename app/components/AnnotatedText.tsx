import TimestampLink from "./TimestampLink";
import type { OffsetModel } from "@/app/lib/offset";
import { isValidRef, findRefCursor, stripDanglingLeadIn, type AnnotatedTextRef } from "@/app/lib/citations";

export type { AnnotatedTextRef };

/** Strips a trailing provenance tag from legacy (pre-references) text. */
function stripLegacyTrailingTag(text: string): string {
  return text.replace(/\s*\[(?:minutes|transcript|mixed)\]\s*$/i, "");
}

/**
 * Renders prose plus a list of inline timecode/provenance citations
 * ("AnnotatedText" — see FIX-AI-SUMMARY-INLINE-TIMESTAMPS-001). Each
 * reference carries the literal text run that precedes it ("runs-in-JSON"),
 * so citations are rendered in place rather than as one link appended after
 * the whole paragraph.
 *
 * Falls back to legacy plain-text rendering (trailing tag stripped, no
 * inline links) when `references` is null/empty/malformed — the case for
 * every row written before this feature shipped.
 */
export default function AnnotatedText({
  text,
  references,
  offsetModel = null,
  scrollTargetId = "video",
  openDetailsId,
  className,
}: {
  text: string;
  references?: unknown;
  offsetModel?: OffsetModel | null;
  scrollTargetId?: string;
  openDetailsId?: string;
  className?: string;
}) {
  const refs = Array.isArray(references) ? references.filter(isValidRef) : [];

  if (refs.length === 0) {
    return <span className={className}>{stripLegacyTrailingTag(text)}</span>;
  }

  // Cursor-based, not a length-sum — see findRefCursor's docstring
  // (FIX-ANNOTATEDTEXT-REMAINDER-DUP-001). This is JS-side arithmetic on JS
  // strings throughout — no cross-language offset is ever reused, so
  // UTF-16-vs-code-point indexing never comes up.
  const remainder = text.slice(findRefCursor(text, refs));

  return (
    <span className={className}>
      {refs.map((ref, i) => {
        const hasTimecode = ref.seconds != null || !!ref.label;
        const hasContent = hasTimecode || !!ref.provenance;
        return (
          <span key={i}>
            {/* textBefore is authored ending in its own trailing space
                before the citation gap ("...partnership at "). Trim it when
                a citation follows so the added " (" doesn't double-space
                ("at  (33:06)"). When nothing follows (FIX-TIMESTAMP-LABEL-
                EMPTY-001 AC-3), strip the dangling connector word too, so a
                ref with no seconds/label/provenance to show doesn't leave
                "...approved it at Next, the council..." */}
            {hasContent ? ref.textBefore.trimEnd() : stripDanglingLeadIn(ref.textBefore)}
            {hasContent && <span className="text-gray-400 dark:text-gray-500">{" ("}</span>}
            {ref.seconds != null ? (
              <TimestampLink
                seconds={ref.seconds}
                label={ref.label ?? undefined}
                offsetModel={offsetModel}
                scrollTargetId={scrollTargetId}
                openDetailsId={openDetailsId}
                className="text-xs text-blue-500 dark:text-blue-400 hover:underline"
              />
            ) : ref.label ? (
              // Timecode was cited but couldn't be snapped to a transcript
              // segment (e.g. outside the video's range) — show the plain
              // label rather than silently dropping the citation.
              <span className="text-xs text-gray-500 dark:text-gray-400" title="Approximate — could not be linked to the video">
                {ref.label}
              </span>
            ) : null}
            {ref.provenance && (
              <span className="text-xs text-gray-500 dark:text-gray-400" title={`Source: ${ref.provenance}`}>
                {hasTimecode ? ` · ${ref.provenance}` : ref.provenance}
              </span>
            )}
            {hasContent && <span className="text-gray-400 dark:text-gray-500">)</span>}
          </span>
        );
      })}
      {remainder}
    </span>
  );
}
