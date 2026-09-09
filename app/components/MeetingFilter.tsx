"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import MeetingCard from "./MeetingCard";
import type { MeetingCardData, MeetingSearchResult } from "@/app/lib/cityData";
import { tokenizeQuery } from "@/app/lib/search";
import { searchMeetings } from "@/app/actions/searchMeetings";

/**
 * Search & filter over a city's full meeting list, including upcoming
 * ones — they're ordinary entries here (same MeetingCard, same size/shape,
 * real siblings in one list), just grouped under an "Upcoming" subheader
 * via `upcomingSlugs` rather than pulled out into a separate section/
 * component. `upcomingSlugs` (not raw SCHEDULED status) is what decides
 * that grouping, and what backs the "Upcoming" status filter below — see
 * getUpcomingMeetingSlugs for why status alone isn't a safe signal.
 *
 * Status/sort filtering stays entirely client-side (cheap, already-fetched
 * data, no text-payload concern). Text search does not: it's answered by
 * `searchMeetings` (FEAT-SEARCH-SERVERSIDE-SURFACE-001), a server action
 * that reproduces FEAT-SEARCH-NORMALIZE-HIGHLIGHT-001's exact matching
 * semantics but over a broader surface (key decisions, action items,
 * timeline bullets, topics) than `meetings` carries client-side — see
 * `searchMeetingsForCity` in app/lib/cityData.ts for why that surface
 * isn't just fetched eagerly onto every page load instead. The debounced
 * round trip (~DEBOUNCE_MS) replaces what used to be instant client-side
 * filtering over title/summary/logline alone; while a search is in
 * flight, the previous result set stays visible rather than flashing to
 * empty (see `matchedSlugs` below).
 */
type StatusFilter = "all" | "published" | "upcoming" | "pending";

// Only this many upcoming meetings show by default — a city with a busy
// commission calendar can have a dozen-plus SCHEDULED meetings at once,
// which would otherwise push every past meeting below the fold. "Show
// all" reveals the rest.
const DEFAULT_VISIBLE_UPCOMING = 1;

// How long to wait after the last keystroke before hitting the server
// action (AC-4/AC-2's round trip) or writing the query to the URL. Short
// enough to feel responsive, long enough that a fast typist doesn't fire
// a server call per keystroke.
const DEBOUNCE_MS = 300;

export default function MeetingFilter({
  meetings,
  upcomingSlugs,
  stateCode,
  citySlug,
}: {
  meetings: MeetingCardData[];
  upcomingSlugs: Set<string>;
  /** Needed to call the search server action for the right city — see
   * FEAT-SEARCH-SERVERSIDE-SURFACE-001. */
  stateCode: string;
  citySlug: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Seeded from the URL so a shared/reloaded search link (AC-4) restores
  // the same query. `lastSyncedQRef` tracks the `q` value this component
  // itself last wrote to the URL, so the read-side effect below (which
  // reacts to `searchParams` changing) can tell "the URL changed because
  // we just wrote it" apart from "the URL changed underneath us" (back/
  // forward navigation, or a fresh link opened over an already-mounted
  // instance) — without it, Back after typing a search reverts the URL's
  // `q` but leaves `query`/the rendered results stuck on the old value.
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const lastSyncedQRef = useRef(query);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [upcomingExpanded, setUpcomingExpanded] = useState(false);

  // FEAT-SEARCH-NORMALIZE-HIGHLIGHT-001: tokens matched with AND semantics
  // over a normalized haystack (case/hyphen/whitespace-insensitive), not a
  // single contiguous substring — "data center" now matches "data-center",
  // "Data Centers", etc. Passed down to MeetingCard for highlighting (AC-2)
  // and its match-context snippet (AC-3). Derived from the *raw* query
  // (not debounced) so highlighting in the search box's own results feels
  // instant even though the underlying result set updates on a debounce.
  const tokens = useMemo(() => tokenizeQuery(query), [query]);

  // Debounced copy of `query` — drives both the URL sync and the server
  // search call, so neither fires on every keystroke.
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  // AC-4: keep the URL in sync with the debounced query so a search is
  // linkable/shareable. `replace` (not `push`) so typing doesn't spam
  // browser history — each keystroke would otherwise be its own back-
  // button stop.
  useEffect(() => {
    // Skip when the URL already says this — otherwise mounting on
    // `?q=already-there` (a shared search link) fires a redundant replace
    // on every load.
    const currentQ = searchParams.get("q") ?? "";
    if (debouncedQuery === currentQ) return;

    const params = new URLSearchParams(searchParams.toString());
    if (debouncedQuery) {
      params.set("q", debouncedQuery);
    } else {
      params.delete("q");
    }
    // Record what we're about to write *before* the navigation resolves,
    // so the read-side effect below (which fires when `searchParams`
    // changes) recognizes this as our own write rather than an external
    // one and skips re-syncing `query` from it.
    lastSyncedQRef.current = debouncedQuery;
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // Only re-run when the debounced query itself changes — including
    // `searchParams`/`router`/`pathname` would re-fire this on the
    // navigation it just caused.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  // Catch the *other* direction: the URL's `q` changing without us having
  // driven it (browser Back/Forward, or a fresh link opened over an
  // already-mounted instance). Without this, navigating back after typing
  // a search reverts the URL but leaves `query`/the rendered results
  // stuck on the stale value — the input and the page disagree with the
  // address bar.
  useEffect(() => {
    const urlQ = searchParams.get("q") ?? "";
    if (urlQ === lastSyncedQRef.current) return; // our own write, or nothing changed
    lastSyncedQRef.current = urlQ;
    setQuery(urlQ);
    setDebouncedQuery(urlQ);
  }, [searchParams]);

  // Server-side search results for the current debounced query (AC-2).
  // `resolvedFor` tracks which query the current `results` answer, so a
  // slow response can't clobber a faster, more recent one (e.g. the user
  // typed past it) — and so the UI can tell "still on the previous
  // results" apart from "this query genuinely has zero matches".
  const [searchState, setSearchState] = useState<{
    resolvedFor: string;
    results: MeetingSearchResult[];
  } | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const debouncedTokens = tokenizeQuery(debouncedQuery);
    if (debouncedTokens.length === 0) {
      setSearchState(null);
      return;
    }
    const requestId = ++requestIdRef.current;
    searchMeetings(stateCode, citySlug, debouncedQuery).then((results) => {
      // Ignore a stale response from a query that's no longer current.
      if (requestId !== requestIdRef.current) return;
      setSearchState({ resolvedFor: debouncedQuery, results });
    });
  }, [debouncedQuery, stateCode, citySlug]);

  // Only trust searchState's matched set once it actually answers the
  // *current* debounced query — otherwise (still in flight, or query
  // cleared) fall back to "no text filter yet" rather than flashing to an
  // empty list while a request is outstanding.
  const searchAnswersCurrentQuery = searchState?.resolvedFor === debouncedQuery;
  const matchedSlugs = useMemo(
    () =>
      searchAnswersCurrentQuery
        ? new Set(searchState!.results.map((r) => r.slug))
        : null,
    [searchAnswersCurrentQuery, searchState]
  );
  const extraSnippets = useMemo(() => {
    const map = new Map<string, MeetingSearchResult["extraSnippet"]>();
    if (searchAnswersCurrentQuery) {
      for (const r of searchState!.results) map.set(r.slug, r.extraSnippet);
    }
    return map;
  }, [searchAnswersCurrentQuery, searchState]);

  // A query is typed but the server hasn't answered *this exact* query yet
  // (still debouncing, or the request is in flight) — the list below is
  // still showing the previous query's results (or everything, if this is
  // the first search), not this one's. Surface that so a slow response
  // reads as "pending," not as "these are the results."
  const isSearching = tokens.length > 0 && !searchAnswersCurrentQuery;

  const matched = useMemo(() => {
    let result = meetings;
    if (tokenizeQuery(debouncedQuery).length > 0 && matchedSlugs) {
      result = result.filter((m) => matchedSlugs.has(m.slug));
    }
    // else: no active (resolved) text filter — either no query, or a
    // request is still in flight for a query that hasn't resolved yet;
    // either way, don't filter by text.

    if (statusFilter === "published") {
      result = result.filter((m) => m.status === "PUBLISHED");
    } else if (statusFilter === "upcoming") {
      result = result.filter((m) => upcomingSlugs.has(m.slug));
    } else if (statusFilter === "pending") {
      result = result.filter((m) => m.status === "OCCURRED");
    }

    return result;
  }, [meetings, debouncedQuery, matchedSlugs, statusFilter, upcomingSlugs]);

  // Upcoming meetings lead under their own subheader, capped and
  // expandable; everything else follows under its own "Past Meetings"
  // subheader — the two never mix. The Newest/Oldest sort toggle applies
  // to the past group only; Upcoming always sorts soonest-first
  // regardless of it, since that's what "the next meeting" (the one that
  // stays visible when collapsed) has to mean — sorting it by the same
  // toggle would put the *farthest-out* meeting in that slot under the
  // default "Newest first" order.
  const allUpcoming = useMemo(
    () =>
      matched
        .filter((m) => upcomingSlugs.has(m.slug))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [matched, upcomingSlugs]
  );
  const rest = useMemo(() => {
    const nonUpcoming = matched.filter((m) => !upcomingSlugs.has(m.slug));
    return nonUpcoming.sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return sortOrder === "newest" ? -diff : diff;
    });
  }, [matched, upcomingSlugs, sortOrder]);
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
      {isSearching && (
        <p className="text-xs text-gray-400 dark:text-gray-500 -mt-4 mb-4" role="status">
          Searching…
        </p>
      )}

      {matched.length === 0 ? (
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
            <MeetingCard
              key={meeting.slug}
              meeting={meeting}
              tokens={tokens}
              extraSnippet={extraSnippets.get(meeting.slug) ?? null}
            />
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
            <MeetingCard
              key={meeting.slug}
              meeting={meeting}
              tokens={tokens}
              extraSnippet={extraSnippets.get(meeting.slug) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
