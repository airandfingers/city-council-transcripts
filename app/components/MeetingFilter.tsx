"use client";

import { useMemo, useState } from "react";
import MeetingCard from "./MeetingCard";
import type { Meeting } from "@/app/lib/cityData";

/**
 * Client-side search & filter over a city's meeting list.
 *
 * PoC feedback: "at some point there will be a hundred meetings... filter
 * and search, so it's easier." Meetings for a single city are a small,
 * already-fetched list, so filtering in the browser (no extra round trip)
 * is the right scope for now; if a city's meeting count grows large
 * enough that this becomes sluggish, move the same matching logic into
 * a server-side query in app/lib/cityData.ts instead.
 */
type StatusFilter = "all" | "published" | "upcoming" | "pending";

export default function MeetingFilter({ meetings }: { meetings: Meeting[] }) {
  const [query, setQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

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
      matched = matched.filter((m) => m.status === "SCHEDULED");
    } else if (statusFilter === "pending") {
      matched = matched.filter((m) => m.status === "OCCURRED");
    }

    const sorted = [...matched].sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return sortOrder === "newest" ? -diff : diff;
    });

    return sorted;
  }, [meetings, query, sortOrder, statusFilter]);

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
          {filtered.map((meeting) => (
            <MeetingCard key={meeting.slug} meeting={meeting} />
          ))}
        </div>
      )}
    </div>
  );
}
