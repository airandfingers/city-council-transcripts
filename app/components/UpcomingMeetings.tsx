"use client";

import { useState } from "react";
import MeetingCard from "./MeetingCard";
import type { MeetingCardData } from "@/app/lib/cityData";

// Static cap rather than measuring actual rendered height — a couple of
// cards is a reasonable "how much space should a preview take" call at
// any width, and avoids a layout-measurement/ResizeObserver dance for a
// small, low-stakes UI decision.
const DEFAULT_VISIBLE = 2;

/**
 * Upcoming meetings — a subsection nested inside the same "Meetings" unit
 * as the past-meetings list (not a separate top-level section), single-
 * column at every width. Only the first couple of meetings render by
 * default so this doesn't dominate the section above the past-meetings
 * list; the rest are revealed with a toggle, same behavior on mobile and
 * desktop.
 *
 * The city page only renders this component at all when there's at
 * least one upcoming meeting, so the empty-list guard below is just a
 * defensive fallback, not the mechanism that hides the subsection.
 */
export default function UpcomingMeetings({ meetings }: { meetings: MeetingCardData[] }) {
  const [expanded, setExpanded] = useState(false);

  if (meetings.length === 0) return null;

  const visible = expanded ? meetings : meetings.slice(0, DEFAULT_VISIBLE);
  const hiddenCount = meetings.length - visible.length;

  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
        Upcoming
      </h3>
      <div className="flex flex-col gap-4">
        {visible.map((meeting) => (
          <MeetingCard key={meeting.slug} meeting={meeting} />
        ))}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="self-start text-sm font-medium text-blue-600 dark:text-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 rounded"
          >
            {`Show ${hiddenCount} more upcoming meeting${hiddenCount === 1 ? "" : "s"}`}
          </button>
        )}
        {expanded && meetings.length > DEFAULT_VISIBLE && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="self-start text-sm font-medium text-blue-600 dark:text-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 rounded"
          >
            Show fewer
          </button>
        )}
      </div>
    </div>
  );
}
