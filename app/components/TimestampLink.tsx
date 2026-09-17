"use client";

import { useVideoSync } from "./VideoSyncProvider";
import { applyOffset, type OffsetModel } from "@/app/lib/offset";
import { formatTime } from "@/app/lib/citations";

export default function TimestampLink({
  seconds,
  label,
  className,
  offsetModel = null,
  scrollTargetId = "video",
  openDetailsId,
}: {
  seconds: number;
  label?: string;
  className?: string;
  offsetModel?: OffsetModel | null;
  /** Element id to scroll into view after seeking (defaults to the video player). */
  scrollTargetId?: string;
  /** If set, opens this `<details>` element (e.g. the collapsed transcript) before scrolling to it. */
  openDetailsId?: string;
}) {
  const { seekTo, play, scrollToTime } = useVideoSync();

  // `seconds` is in reference (transcript / granicus) time; convert to
  // target (youtube) time before seeking or building the URL.
  const mapped = applyOffset(offsetModel, seconds);
  const targetSeconds = mapped == null ? Math.max(0, seconds) : Math.max(0, mapped);
  const inGap = mapped == null && offsetModel != null;

  // Plain seconds — matches what every consumer actually parses
  // (YouTubePlayer/Mp4Player/ExternalLinkVideo all do
  // `Number(searchParams.get("t")) || 0`) and what videoSeek.ts's
  // buildTranscriptTimestampUrl and TranscriptViewer's own click handler
  // already write. The previous "Nm Ss" format never round-tripped through
  // any of them — `Number("129m43s")` is NaN — silently zeroing every
  // reload/shared link and the CopyTimecode fallback that depends on
  // startSeconds > 0 (FIX-TIMECODE-SEEK-GRANICUS-001).
  const href = `?t=${Math.floor(targetSeconds)}`;

  // `label` is `string | undefined` by prop type, but callers pass through
  // Prisma `timecodeLabel`/reference `label` values that are only checked
  // for null/undefined upstream (`?? undefined`), not for an empty or
  // whitespace-only string. `label ?? formatTime(...)` alone doesn't
  // coalesce `""`, so a stored empty label rendered a clickable but
  // visually blank link (FIX-TIMESTAMP-LABEL-EMPTY-001).
  const displayLabel = label?.trim() || formatTime(targetSeconds);

  return (
    <a
      href={href}
      className={
        className ??
        "text-xs text-blue-500 dark:text-blue-400 hover:underline"
      }
      title={inGap ? "Approximate — outside calibrated range" : undefined}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        seekTo(targetSeconds);
        play();
        window.history.replaceState(null, "", href);
        if (openDetailsId) {
          const details = document.getElementById(openDetailsId);
          if (details instanceof HTMLDetailsElement) details.open = true;
        }
        document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: "smooth", block: "center" });
        // Ask any mounted TranscriptViewer to scroll to this moment too.
        // Independent of seekTo/scrollTargetId above — this is what actually
        // moves the reader to the cited passage for a provider with no
        // seekable player (e.g. Granicus link-out), where seekTo() is a
        // silent no-op and scrollTargetId only brings the *player section*
        // into view (FIX-TIMECODE-SEEK-GRANICUS-001). Uses `seconds`
        // (reference time), not `targetSeconds`, since transcript segment
        // start/end times are stored in reference time.
        scrollToTime(seconds);
      }}
    >
      {displayLabel}
    </a>
  );
}
