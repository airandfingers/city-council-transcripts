"use client";

import { useState } from "react";
import MeetingCard from "./MeetingCard";
import type { MeetingCardData } from "@/app/lib/cityData";

/**
 * Upcoming (SCHEDULED) meetings, shown as a right-hand sidebar column on
 * desktop and a compact "next meeting + expand" block on mobile.
 *
 * Mobile constraint: only the single next meeting renders by default so
 * the past-meetings list below still gets some cards above the fold; the
 * rest are revealed with a toggle. Desktop always shows the full list —
 * the `lg:hidden` / `lg:flex` pair below is what keeps that split purely
 * CSS-driven instead of relying on viewport checks in JS.
 */
export default function UpcomingMeetings({ meetings }: { meetings: MeetingCardData[] }) {
  const [expanded, setExpanded] = useState(false);

  if (meetings.length === 0) return null;

  const [next, ...rest] = meetings;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Upcoming meetings</h2>
      <div className="flex flex-col gap-4">
        <MeetingCard meeting={next} />
        {rest.length > 0 && (
          <div
            className={
              expanded
                ? "flex flex-col gap-4"
                : "hidden lg:flex lg:flex-col lg:gap-4"
            }
          >
            {rest.map((meeting) => (
              <MeetingCard key={meeting.slug} meeting={meeting} />
            ))}
          </div>
        )}
        {rest.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            className="lg:hidden self-start text-sm font-medium text-blue-600 dark:text-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 rounded"
          >
            {expanded
              ? "Show fewer"
              : `Show ${rest.length} more upcoming meeting${rest.length === 1 ? "" : "s"}`}
          </button>
        )}
      </div>
    </div>
  );
}
