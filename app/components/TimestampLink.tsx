"use client";

import { useVideoSync } from "./VideoSyncProvider";

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
}: {
  seconds: number;
  label?: string;
  className?: string;
}) {
  const { seekTo, play } = useVideoSync();

  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const href = `?t=${m}m${s}s`;

  return (
    <a
      href={href}
      className={
        className ??
        "text-xs text-blue-500 dark:text-blue-400 hover:underline"
      }
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        seekTo(seconds);
        play();
        // Update URL without reload
        window.history.replaceState(null, "", href);
        // Scroll video into view
        document.getElementById("video")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }}
    >
      {label ?? formatTime(seconds)}
    </a>
  );
}
