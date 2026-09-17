"use client";

import { useMemo, useState } from "react";
import { listGlossaryEntries } from "@/app/lib/glossary";
import { tokenizeQuery, matchesAllTokens } from "@/app/lib/search";

/**
 * Client-side search over the glossary — same search primitives as
 * TopicsFilter/MeetingFilter (tokenizeQuery/matchesAllTokens from
 * app/lib/search.ts), appropriate here for the same reason: a small,
 * already-available, static list.
 */
export default function GlossaryList() {
  const [query, setQuery] = useState("");
  const entries = useMemo(() => listGlossaryEntries(), []);
  const tokens = useMemo(() => tokenizeQuery(query), [query]);

  const filtered = useMemo(() => {
    if (tokens.length === 0) return entries;
    return entries.filter(([, entry]) =>
      matchesAllTokens(`${entry.term} ${entry.definition}`, tokens),
    );
  }, [entries, tokens]);

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search terms…"
        aria-label="Search glossary"
        className="w-full mb-6 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-transparent text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
      />

      {filtered.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">
          No terms match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <dl className="space-y-5">
          {filtered.map(([id, entry]) => (
            <div key={id} id={id} className="scroll-mt-20">
              <dt className="font-semibold text-gray-900 dark:text-gray-100">
                <a href={`#${id}`} className="hover:underline">
                  {entry.term}
                </a>
              </dt>
              <dd className="text-gray-600 dark:text-gray-400 mt-1">{entry.definition}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
