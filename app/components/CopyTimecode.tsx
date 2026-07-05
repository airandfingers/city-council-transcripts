"use client";

import { useState } from "react";
import { formatSeconds } from "@/app/lib/videoSeek";

/**
 * Fallback for video providers with no seek API (e.g. Granicus) — surfaces
 * the timecode as copyable text instead of silently dropping the reference,
 * so the viewer can paste it into that provider's own player/search UI.
 */
export default function CopyTimecode({
  seconds,
  label,
  className,
}: {
  seconds: number;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const display = label ?? formatSeconds(seconds);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(display);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable — no-op, the text is still visible.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title="Copy timecode to jump to this moment in the video"
      className={
        className ??
        "inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
      }
    >
      <span aria-hidden="true">⧉</span>
      {copied ? "Copied!" : `Timecode ${display}`}
    </button>
  );
}
