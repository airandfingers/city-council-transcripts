"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatMeetingDate } from "@/app/lib/formatDate";

export type TopicCardData = {
  id: number;
  slug: string;
  name: string;
  statusSummary: string | null;
  mostRecentActivity: string | null;
  discussedCount: number;
  /** Date of the most recent meeting that discussed this topic, or null
   * for a topic with no discussed-meeting record yet. */
  lastDate: Date | null;
};

type SortOrder = "updated" | "name" | "meetings";
type ActivityFilter = "all" | "active" | "no-activity";

/**
 * Client-side search/sort/filter over a city's topics list — same shape
 * as MeetingFilter (search box, sort dropdown, filter dropdown) for a
 * consistent pattern across both listing pages. Topics for a single city
 * are a small, already-fetched list (see MeetingFilter's own comment on
 * this same tradeoff), so client-side filtering is the right scope here
 * too.
 */
export default function TopicsFilter({
  topics,
  cityHref,
}: {
  topics: TopicCardData[];
  cityHref: string;
}) {
  const [query, setQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("updated");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let matched = q
      ? topics.filter((t) => {
          const haystack = `${t.name} ${t.statusSummary ?? ""} ${t.mostRecentActivity ?? ""}`.toLowerCase();
          return haystack.includes(q);
        })
      : topics;

    if (activityFilter === "active") {
      matched = matched.filter((t) => t.discussedCount > 0);
    } else if (activityFilter === "no-activity") {
      matched = matched.filter((t) => t.discussedCount === 0);
    }

    const sorted = [...matched].sort((a, b) => {
      if (sortOrder === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sortOrder === "meetings") {
        return b.discussedCount - a.discussedCount;
      }
      // "updated" — most recently discussed first; a topic with no
      // discussed meeting yet sorts last regardless of direction, since
      // there's no "last updated" to rank it by.
      const aTime = a.lastDate ? new Date(a.lastDate).getTime() : -Infinity;
      const bTime = b.lastDate ? new Date(b.lastDate).getTime() : -Infinity;
      return bTime - aTime;
    });

    return sorted;
  }, [topics, query, sortOrder, activityFilter]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search topics by name or summary…"
          aria-label="Search topics"
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-transparent text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
        />
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as SortOrder)}
          aria-label="Sort topics"
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-transparent text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
        >
          <option value="updated">Last updated</option>
          <option value="name">Name (A–Z)</option>
          <option value="meetings">Most discussed</option>
        </select>
        <select
          value={activityFilter}
          onChange={(e) => setActivityFilter(e.target.value as ActivityFilter)}
          aria-label="Filter topics by activity"
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-transparent text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
        >
          <option value="all">All topics</option>
          <option value="active">Discussed in a meeting</option>
          <option value="no-activity">No meetings yet</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">
          {query
            ? <>No topics match &ldquo;{query}&rdquo;.</>
            : "No topics match the selected filter."}
        </p>
      ) : (
        <ul className="space-y-4">
          {filtered.map((topic) => (
            <li key={topic.id}>
              <Link
                href={`${cityHref}/topics/${topic.slug}`}
                className="block rounded-lg border border-gray-200 dark:border-gray-700 p-5 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-lg leading-tight mb-1">
                      {topic.name}
                    </h2>
                    {topic.statusSummary && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {topic.statusSummary}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0 text-sm text-gray-500 dark:text-gray-400">
                    {topic.discussedCount > 0 && (
                      <div>
                        {topic.discussedCount} meeting{topic.discussedCount !== 1 ? "s" : ""}
                      </div>
                    )}
                    {topic.lastDate && (
                      <div>
                        {formatMeetingDate(topic.lastDate, { month: "short", year: "numeric" })}
                      </div>
                    )}
                  </div>
                </div>
                {topic.mostRecentActivity && (
                  <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                    Last activity: {topic.mostRecentActivity}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
