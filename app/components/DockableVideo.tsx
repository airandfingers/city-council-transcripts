"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useVideoSync } from "./VideoSyncProvider";

// The player counts as on-screen when at least this much of it shows.
const VISIBLE_RATIO = 0.6;

/**
 * Wraps the transcript page's video player so a citation click can play the
 * moment without moving the page (FEAT-TRANSCRIPT-DOCK-PLAYER-001). When a
 * TimestampLink asks to dock (`requestDock`) and the player is off-screen, it
 * pops into a fixed mini-player in the corner; it goes back in place when the
 * reader scrolls to the video section or closes it.
 *
 * The player is never remounted or moved in the DOM: only this wrapper's
 * classes change. Moving or re-keying a YouTube iframe reloads it and
 * re-registers the player, losing the position. The slot keeps its measured
 * height while docked, so the page doesn't shift.
 */
export default function DockableVideo({ children }: { children: ReactNode }) {
  const { dockNonce, jumpWithReturn } = useVideoSync();
  const slotRef = useRef<HTMLDivElement>(null);
  const onScreen = useRef(true);
  const [docked, setDocked] = useState(false);
  const [slotHeight, setSlotHeight] = useState<number | null>(null);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen.current = entry.intersectionRatio >= VISIBLE_RATIO;
        if (onScreen.current) setDocked(false);
      },
      { threshold: [0, VISIBLE_RATIO, 1] },
    );
    observer.observe(slot);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (dockNonce === 0 || onScreen.current) return;
    const slot = slotRef.current;
    if (slot) setSlotHeight(slot.offsetHeight);
    setDocked(true);
  }, [dockNonce]);

  const showInTranscript = () => {
    const transcript = document.getElementById("full-transcript");
    if (transcript instanceof HTMLDetailsElement) transcript.open = true;
    jumpWithReturn(transcript);
  };

  return (
    <div
      ref={slotRef}
      style={docked && slotHeight ? { height: slotHeight } : undefined}
      className={docked ? "rounded-lg bg-gray-100 dark:bg-gray-800/50" : undefined}
    >
      <div
        className={
          docked
            ? "fixed z-40 right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] w-[min(360px,60vw)] rounded-lg bg-black shadow-2xl ring-1 ring-black/20 overflow-hidden"
            : undefined
        }
        role={docked ? "region" : undefined}
        aria-label={docked ? "Mini video player" : undefined}
      >
        {/* Always rendered, only hidden: inserting it would shift the
            player's position among siblings and remount it. */}
        <div
          className={
            docked
              ? "flex items-center justify-between gap-2 px-2 py-1 text-xs text-white bg-gray-900"
              : "hidden"
          }
        >
          <button
            type="button"
            onClick={showInTranscript}
            className="hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 rounded"
          >
            Show in transcript
          </button>
          <button
            type="button"
            onClick={() => setDocked(false)}
            aria-label="Close mini player"
            className="px-1 text-base leading-none opacity-80 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 rounded"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
