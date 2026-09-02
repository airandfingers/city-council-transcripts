"use client";

import { useMemo, useState } from "react";
import MeetingCard from "./MeetingCard";
import type { MeetingCardData } from "@/app/lib/cityData";

/**
 * Client-side search & filter over a city's full meeting list, including
 * upcoming ones — they're ordinary entries here (same MeetingCard, same
 * size/shape, real siblings in one list), just grouped under an
 * "Upcoming" subheader via `upcomingSlugs` rather than pulled out into a
 * separate section/component. `upcomingSlugs` (not raw SCHEDULED status)
 * is what decides that grouping, and what backs the "Upcoming" status
 * filter below — see getUpcomingMeetingSlugs for why status alone isn't
 * a safe signal.
 *
 * PoC feedback: "at some point there will be a hundred meetings... filter
 * and search, so it's easier." Meetings for a single city are a small,
 * already-fetched list, so filtering in the browser (no extra round trip)
 * is the right scope for now; if a city's meeting count grows large
 * enough that this becomes sluggish, move the same matching logic into
 * a server-side query in app/lib/cityData.ts instead.
 */
type StatusFilter = "all" | "published" | "upcoming" | "pending";

// Only this many upcoming meetings show by default — a city with a busy
// commission calendar can have a dozen-plus SCHEDULED meetings at once,
// which would otherwise push every past meeting below the fold. "Show
// all" reveals the rest.
const DEFAULT_VISIBLE_UPCOMING = 1;

export default function MeetingFilter({
  meetings,
  upcomingSlugs,
}: {
  meetings: MeetingCardData[];
  upcomingSlugs: Set<string>;
}) {
  const [query, setQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [upcomingExpanded, setUpcomingExpanded] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let matched = q
      ? meetings.filter((m) => {
          const haystack = `${m.title} ${m.summary ?? ""} ${m.logline ?? ""}`.toLowerCase();
          return haystack.includes(q);
        })
      : meetings;

    if (statusFilter === "published") {
      matched = matched.filter((m) => m.status === "PUBLISHED");
    } else if (statusFilter === "upcoming") {
      matched = matched.filter((m) => upcomingSlugs.has(m.slug));
    } else if (statusFilter === "pending") {
      matched = matched.filter((m) => m.status === "OCCURRED");
    }

    const sorted = [...matched].sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return sortOrder === "newest" ? -diff : diff;
    });

    return sorted;
  }, [meetings, query, sortOrder, statusFilter, upcomingSlugs]);

  // Upcoming meetings lead under their own subheader, capped and
  // expandable; everything else follows under its own "Past Meetings"
  // subheader — the two never mix, and sort order is preserved within
  // each group.
  const allUpcoming = filtered.filter((m) => upcomingSlugs.has(m.slug));
  const rest = filtered.filter((m) => !upcomingSlugs.has(m.slug));
  const upcoming = upcomingExpanded
    ? allUpcoming
    : allUpcoming.slice(0, DEFAULT_VISIBLE_UPCOMING);
  const hiddenUpcomingCount = allUpcoming.length - upcoming.length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6 max-w-3xl">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search meetings by title or topic…"
          aria-label="Search meetings"
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-transparent text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
        />
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
          aria-label="Sort meetings"
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-transparent text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          aria-label="Filter meetings by status"
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-transparent text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
        >
          <option value="all">All meetings</option>
          <option value="published">Published only</option>
          <option value="upcoming">Upcoming</option>
          <option value="pending">Awaiting transcript</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">
          {query
            ? <>No meetings match &ldquo;{query}&rdquo;.</>
            : "No meetings match the selected filter."}
        </p>
      ) : (
        <div className="flex flex-col gap-4 max-w-3xl">
          {upcoming.length > 0 && (
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Upcoming
            </h3>
          )}
          {upcoming.map((meeting) => (
            <MeetingCard key={meeting.slug} meeting={meeting} />
          ))}
          {hiddenUpcomingCount > 0 && (
            <button
              type="button"
              onClick={() => setUpcomingExpanded(true)}
              className="self-start text-sm font-medium text-blue-600 dark:text-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 rounded"
            >
              {`Show ${hiddenUpcomingCount} more upcoming meeting${hiddenUpcomingCount === 1 ? "" : "s"}`}
            </button>
          )}
          {upcomingExpanded && allUpcoming.length > DEFAULT_VISIBLE_UPCOMING && (
            <button
              type="button"
              onClick={() => setUpcomingExpanded(false)}
              className="self-start text-sm font-medium text-blue-600 dark:text-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 rounded"
            >
              Show fewer
            </button>
          )}
          {rest.length > 0 && (
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Past Meetings
            </h3>
          )}
          {rest.map((meeting) => (
            <MeetingCard key={meeting.slug} meeting={meeting} />
          ))}
        </div>
      )}
    </div>
  );
}
