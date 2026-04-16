"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useVideoSync } from "./VideoSyncProvider";
import {
  formatTimestamp,
  displayName,
  type GroupedLine,
} from "@/app/lib/transcript";

/**
 * Client component that renders grouped transcript lines with:
 * - Clickable timestamps that seek the video & update ?t=
 * - Auto-scroll that tracks playback, with proportional positioning
 *   inside tall cards and line-height–snapped discrete steps.
 * - An "Auto Scroll" checkbox that disables on user scroll and
 *   re-syncs immediately when re-enabled.
 */
export default function TranscriptViewer({
  groupedLines,
}: {
  groupedLines: GroupedLine[];
}) {
  const { currentTime, seekTo } = useVideoSync();
  const router = useRouter();
  const pathname = usePathname();

  // --- Refs for DOM elements ---
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<number, HTMLElement>>(new Map());

  // --- Auto-scroll state ---
  const [autoScroll, setAutoScroll] = useState(true);
  // Guards to distinguish programmatic scrolls from user scrolls
  const isAutoScrolling = useRef(false);
  // The last scroll target we computed (so we can detect divergence)
  const lastProgrammaticTop = useRef<number | null>(null);

  // ---------------------------------------------------------------
  // Handle clicking a timestamp → seek + update URL
  // ---------------------------------------------------------------
  const handleTimestampClick = useCallback(
    (seconds: number) => {
      seekTo(seconds);
      router.replace(`${pathname}?t=${Math.floor(seconds)}`, {
        scroll: false,
      });
    },
    [seekTo, router, pathname],
  );

  // ---------------------------------------------------------------
  // Detect user scroll → disable auto-scroll
  // ---------------------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function onScroll() {
      if (isAutoScrolling.current) return; // ignore our own scrolls
      setAutoScroll(false);
    }

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  // ---------------------------------------------------------------
  // Auto-scroll logic: proportional + snapped
  // ---------------------------------------------------------------
  useEffect(() => {
    if (!autoScroll) return;

    const container = containerRef.current;
    if (!container) return;

    // Find the active group
    const activeIndex = groupedLines.findIndex(
      (g) => currentTime >= g.startTime && currentTime < g.endTime,
    );
    if (activeIndex === -1) return;

    const group = groupedLines[activeIndex];
    const card = cardRefs.current.get(group.firstId);
    if (!card) return;

    // Proportional progress through this group's time range
    const duration = group.endTime - group.startTime;
    const progress = duration > 0
      ? Math.min(Math.max((currentTime - group.startTime) / duration, 0), 1)
      : 0;

    // We want the scroll position so that the relevant part of the
    // card is in view.  For a tall card we scroll proportionally
    // through it, but we bias early: only start scrolling within the
    // card once the top would leave the viewport.
    const cardTop = card.offsetTop;
    const cardHeight = card.offsetHeight;
    const viewHeight = container.clientHeight;

    // Ideal: place the "current" part of the card at 25% from the top
    const targetAnchor = viewHeight * 0.25;
    const rawTop = cardTop + progress * cardHeight - targetAnchor;

    // Snap to ~24px increments (approx one line of text) so scrolling
    // is discrete rather than continuous.
    const SNAP = 24;
    const snappedTop = Math.floor(rawTop / SNAP) * SNAP;

    // Clamp
    const maxScroll = container.scrollHeight - viewHeight;
    const clampedTop = Math.max(0, Math.min(snappedTop, maxScroll));

    // Only scroll if the position actually changed
    if (lastProgrammaticTop.current === clampedTop) return;
    lastProgrammaticTop.current = clampedTop;

    isAutoScrolling.current = true;
    container.scrollTo({ top: clampedTop, behavior: "smooth" });

    // Clear the guard after the smooth scroll settles
    const timer = setTimeout(() => {
      isAutoScrolling.current = false;
    }, 150);

    return () => clearTimeout(timer);
  }, [currentTime, autoScroll, groupedLines]);

  // When user re-enables auto-scroll, jump immediately
  const handleAutoScrollToggle = useCallback(
    (checked: boolean) => {
      setAutoScroll(checked);
      if (checked) {
        // Reset so the next effect tick computes fresh
        lastProgrammaticTop.current = null;
      }
    },
    [],
  );

  // ---------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------
  return (
    <section className="lg:col-span-1 flex flex-col max-h-[800px]">
      {/* Header row: title + auto-scroll toggle */}
      <div className="flex items-end justify-between mb-4 shrink-0">
        <h2 className="text-2xl font-semibold">Transcript</h2>
        <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 select-none">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => handleAutoScrollToggle(e.target.checked)}
            className="accent-blue-600"
          />
          Auto Scroll
        </label>
      </div>

      {/* Scrollable transcript body */}
      <div ref={containerRef} className="overflow-y-auto space-y-3 pr-2">
        {groupedLines.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">
            No transcript lines are available for this meeting yet.
          </p>
        ) : (
          groupedLines.map((group) => {
            const isActive =
              currentTime >= group.startTime && currentTime < group.endTime;

            return (
              <article
                key={group.firstId}
                ref={(el) => {
                  if (el) cardRefs.current.set(group.firstId, el);
                  else cardRefs.current.delete(group.firstId);
                }}
                className={`border rounded-lg p-4 transition-colors ${
                  isActive
                    ? "border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  <span className="font-medium">
                    {displayName(group.speakerName, group.speaker)}
                  </span>
                  <span className="mx-2">•</span>
                  <button
                    type="button"
                    onClick={() => handleTimestampClick(group.startTime)}
                    className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                    title={`Seek to ${formatTimestamp(group.startTime)}`}
                  >
                    {formatTimestamp(group.startTime)}
                  </button>
                  <span> - </span>
                  <button
                    type="button"
                    onClick={() => handleTimestampClick(group.endTime)}
                    className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                    title={`Seek to ${formatTimestamp(group.endTime)}`}
                  >
                    {formatTimestamp(group.endTime)}
                  </button>
                </div>
                <div className="text-gray-900 dark:text-gray-100 space-y-3">
                  {group.text.split("\n\n").map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
