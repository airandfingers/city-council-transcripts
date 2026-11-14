"use client";

import { type ReactNode, useState } from "react";
import GlossaryTerm from "./GlossaryTerm";

/**
 * The meeting page's TL;DR cell, which flips in place to the full Summary
 * (FEAT-TLDR-SUMMARY-TOGGLE-001). Saves the full-width Summary section
 * that used to sit under the TL;DR/Timeline row.
 *
 * Both states are server-rendered into the cached HTML and only their
 * visibility changes, so the summary prose stays in the page for crawlers
 * and for find-in-page; the toggle needs no fetch.
 */
export default function TldrToggle({
  tldr,
  summary,
  defaultExpanded = false,
}: {
  tldr: ReactNode;
  /** The prose summary; null hides the toggle icon. */
  summary: ReactNode | null;
  /** Open on the Summary, for a meeting with a summary but no TL;DR line. */
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const showSummary = expanded && summary != null;

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
        {showSummary ? "Summary" : <GlossaryTerm id="tldr" />}
        {summary != null && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={showSummary}
            aria-controls="meeting-summary"
            title={showSummary ? "Back to the TL;DR" : "Expand to the full summary"}
            className="cursor-pointer p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="sr-only">{showSummary ? "Show the TL;DR" : "Show the full summary"}</span>
            {/* Arrows out = expand to Summary; arrows in = back to TL;DR. */}
            <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              {showSummary ? (
                <path d="M6.5 2.5v4h-4M9.5 13.5v-4h4M6.5 6.5 2 2M9.5 9.5 14 14" />
              ) : (
                <path d="M10 2h4v4M6 14H2v-4M14 2 9.5 6.5M2 14l4.5-4.5" />
              )}
            </svg>
          </button>
        )}
      </h2>
      <div hidden={showSummary}>{tldr}</div>
      {summary != null && (
        <div id="meeting-summary" hidden={!showSummary}>
          {summary}
        </div>
      )}
    </section>
  );
}
