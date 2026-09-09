import type { ReactNode } from "react";
import { findHighlightRanges } from "@/app/lib/search";

/**
 * Renders `text` as plain text with every search-token match wrapped in
 * `<mark>` (FEAT-SEARCH-NORMALIZE-HIGHLIGHT-001 AC-2). No client-only
 * hooks — safe to render from a server component (MeetingCard) or a
 * client one (TopicsFilter) alike, same as MeetingCard itself.
 *
 * `tokens` defaults to `[]` (no highlighting) so every existing call site
 * that doesn't pass it renders exactly as before.
 */
export default function HighlightedText({
  text,
  tokens = [],
  className,
}: {
  text: string;
  tokens?: string[];
  className?: string;
}) {
  const ranges = findHighlightRanges(text, tokens);
  if (ranges.length === 0) {
    return className ? <span className={className}>{text}</span> : <>{text}</>;
  }

  const parts: ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([start, end], i) => {
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(
      <mark
        key={i}
        className="bg-yellow-200 dark:bg-yellow-700/60 text-inherit rounded-sm"
      >
        {text.slice(start, end)}
      </mark>,
    );
    cursor = end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));

  return <span className={className}>{parts}</span>;
}
