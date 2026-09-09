import Link from "next/link";
import type { MeetingCardData } from "@/app/lib/cityData";
import { formatMeetingDate } from "@/app/lib/formatDate";
import { annotateTextPlain } from "@/app/lib/citations";
import HighlightedText from "./HighlightedText";
import { matchesAllTokens, buildMatchSnippet } from "@/app/lib/search";

export type MeetingCardProps = {
  meeting: MeetingCardData;
  /** Search tokens to highlight (FEAT-SEARCH-NORMALIZE-HIGHLIGHT-001).
   * Defaults to [] so every call site that predates search highlighting
   * renders identically to before. */
  tokens?: string[];
};

export default function MeetingCard({ meeting, tokens = [] }: MeetingCardProps) {
  const href = `/transcripts/${meeting.slug
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
  const isPublished = meeting.status === "PUBLISHED";
  // This component is rendered from MeetingFilter ("use client"), so this
  // formatting genuinely executes in the viewer's browser — must pin to
  // UTC or a meeting stored as e.g. 2026-08-05T00:00:00Z displays as
  // "Aug 4" for any US-timezone viewer. See app/lib/formatDate.ts.
  const dateStr = formatMeetingDate(meeting.date);

  // FEAT-SEARCH-NORMALIZE-HIGHLIGHT-001 AC-2/AC-3: highlight ranges are
  // computed against the *displayed* string, not the raw `logline` field —
  // annotateTextPlain() splices in citation text ("...approved it (12:34)")
  // before this ever reaches the DOM, so highlighting the raw logline would
  // find the right substring but mark the wrong character offsets in the
  // spliced version actually rendered (same class of bug as
  // FIX-ANNOTATEDTEXT-REMAINDER-DUP-001 — offsets computed against one
  // string, applied to a different one).
  const displayText = meeting.logline
    ? annotateTextPlain(meeting.logline, meeting.tldrReferences)
    : meeting.summary;

  // AC-3: MeetingFilter only renders this card when `${title} ${summary}
  // ${logline}` combined satisfies every token — but the card shows title
  // + (logline OR summary), never summary alongside a present logline. If
  // the visible text alone doesn't already satisfy every token, the match
  // must be hiding in `summary` while `logline` is what's shown — surface
  // why it matched with a short excerpt (the Poudre case: a river name
  // mentioned in the AI summary paragraph, not the one-line logline).
  const hiddenSummaryMatch =
    tokens.length > 0 &&
    meeting.logline != null &&
    meeting.summary != null &&
    !matchesAllTokens(`${meeting.title} ${displayText ?? ""}`, tokens)
      ? buildMatchSnippet(meeting.summary, tokens)
      : null;

  // The whole card is clickable (not just a small text link below the
  // summary) and styled with hover/focus affordances so it reads as an
  // interactive element rather than a static container — PoC testers
  // didn't realize these were clickable.
  return (
    <Link
      href={href}
      aria-label={
        isPublished
          ? `View summary and transcript for ${meeting.title}`
          : `View details for ${meeting.title}, ${dateStr}`
      }
      className="group block border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-400 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-medium mb-2">
          <HighlightedText text={meeting.title} tokens={tokens} />
        </h3>
        <span
          aria-hidden="true"
          className="text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform shrink-0 mt-1"
        >
          →
        </span>
      </div>
      {displayText && (
        <p className="text-gray-600 dark:text-gray-400 mb-3">
          <HighlightedText text={displayText} tokens={tokens} />
        </p>
      )}
      {hiddenSummaryMatch && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3 -mt-2">
          Matches in summary: <HighlightedText text={hiddenSummaryMatch} tokens={tokens} />
        </p>
      )}
      {isPublished ? (
        <span className="inline-block text-sm font-medium text-blue-600 dark:text-blue-400">
          View summary &amp; transcript
        </span>
      ) : (
        <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
          {dateStr}
          {meeting.status === "SCHEDULED" && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              Upcoming meeting
            </span>
          )}
          {meeting.status === "OCCURRED" && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              Transcript pending
            </span>
          )}
          {meeting.status === "NO_RECORDING" && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              No recording published
            </span>
          )}
          {meeting.status === "CANCELED" && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              Canceled
            </span>
          )}
        </span>
      )}
    </Link>
  );
}
