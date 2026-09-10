"use client";

import { useMemo, useState } from "react";
import { tokenizeQuery, matchesAllTokens } from "@/app/lib/search";
import TopicCard, { type TopicCardData } from "./TopicCard";

export type { TopicCardData };

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

  // FEAT-SEARCH-NORMALIZE-HIGHLIGHT-001: same normalized AND-token matching
  // as MeetingFilter — see that component's comment. name/statusSummary/
  // mostRecentActivity are all already rendered in the card below, so
  // there's no AC-3 "hidden field" case here the way MeetingCard has one.
  const tokens = useMemo(() => tokenizeQuery(query), [query]);

  const filtered = useMemo(() => {
    let matched = tokens.length > 0
      ? topics.filter((t) => {
          const haystack = `${t.name} ${t.statusSummary ?? ""} ${t.mostRecentActivity ?? ""}`;
          return matchesAllTokens(haystack, tokens);
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
  }, [topics, tokens, sortOrder, activityFilter]);

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
            <TopicCard key={topic.id} topic={topic} cityHref={cityHref} tokens={tokens} />
          ))}
        </ul>
      )}
    </div>
  );
}
