"use client";

import { useVideoSync } from "./VideoSyncProvider";
import { applyOffset, type OffsetModel } from "@/app/lib/offset";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

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
  const { seekTo, play } = useVideoSync();

  // `seconds` is in reference (transcript / granicus) time; convert to
  // target (youtube) time before seeking or building the URL.
  const mapped = applyOffset(offsetModel, seconds);
  const targetSeconds = mapped == null ? Math.max(0, seconds) : Math.max(0, mapped);
  const inGap = mapped == null && offsetModel != null;

  const m = Math.floor(targetSeconds / 60);
  const s = Math.floor(targetSeconds % 60);
  const href = `?t=${m}m${s}s`;

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
      }}
    >
      {label ?? formatTime(targetSeconds)}
    </a>
  );
}
