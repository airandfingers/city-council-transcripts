import TimestampLink from "./TimestampLink";
import type { OffsetModel } from "@/app/lib/offset";

export type AnnotatedTextRef = {
  textBefore: string;
  seconds: number | null;
  label: string | null;
  provenance: "minutes" | "transcript" | "mixed" | null;
  linkStatus?: string | null;
};

/** Strips a trailing provenance tag from legacy (pre-references) text. */
function stripLegacyTrailingTag(text: string): string {
  return text.replace(/\s*\[(?:minutes|transcript|mixed)\]\s*$/i, "");
}

function isValidRef(r: unknown): r is AnnotatedTextRef {
  return (
    typeof r === "object" &&
    r !== null &&
    typeof (r as AnnotatedTextRef).textBefore === "string"
  );
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

  // Reconstruct the trailing remainder (text after the last citation) by
  // subtracting every textBefore run's own JS-native length from `text`.
  // This is JS-side arithmetic on JS strings throughout — no cross-language
  // offset is ever reused, so UTF-16-vs-code-point indexing never comes up.
  const consumed = refs.reduce((acc, r) => acc + r.textBefore.length, 0);
  const remainder = text.slice(consumed);

  return (
    <span className={className}>
      {refs.map((ref, i) => {
        const hasTimecode = ref.seconds != null || !!ref.label;
        const hasContent = hasTimecode || !!ref.provenance;
        return (
          <span key={i}>
            {ref.textBefore}
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
