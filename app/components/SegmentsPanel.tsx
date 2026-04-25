"use client";

import { useState } from "react";
import TimestampLink from "./TimestampLink";

type Segment = {
  id: number;
  itemNumber: string;
  title: string;
  startTime: number;
  endTime: number;
  durationSeconds: number | null;
  skip: boolean;
  skipReason: string | null;
  discussionSummary: string | null;
  officialAction: string | null;
  tags: unknown;
  speakerPositions: unknown;
  keyQuotes: unknown;
  publicComments: unknown;
};

const MISC_PATTERN = /off[\s-]?agenda|miscellaneous\s+discussion/i;

export default function SegmentsPanel({
  segments,
}: {
  segments: Segment[];
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const visible = segments.filter(
    (s) => !s.skip && !MISC_PATTERN.test(s.title),
  );

  if (visible.length === 0) {
    return (
      <p className="text-gray-500 dark:text-gray-400">
        No agenda segments available for this meeting yet.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {visible.map((seg) => {
        const open = expandedId === seg.id;
        const tags = Array.isArray(seg.tags) ? (seg.tags as string[]) : [];
        const quotes = Array.isArray(seg.keyQuotes)
          ? (seg.keyQuotes as { speaker: string; quote: string }[])
          : [];
        const positions = Array.isArray(seg.speakerPositions)
          ? (seg.speakerPositions as { speaker: string; position: string }[])
          : [];
        const comments = Array.isArray(seg.publicComments)
          ? (seg.publicComments as { speaker?: string; summary: string }[])
          : [];

        return (
          <div
            key={seg.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg"
          >
            <button
              onClick={() => setExpandedId(open ? null : seg.id)}
              className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="text-xs font-mono text-gray-400 shrink-0">
                {seg.itemNumber}
              </span>
              <span className="font-medium flex-1">{seg.title}</span>
              <TimestampLink seconds={seg.startTime} className="text-xs text-blue-500 dark:text-blue-400 hover:underline shrink-0" />
              <span
                className={`text-xs transition-transform ${open ? "rotate-90" : ""}`}
              >
                ▶
              </span>
            </button>

            {open && (
              <div className="px-4 pb-4 space-y-3 text-sm">
                {seg.discussionSummary && (
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {seg.discussionSummary}
                  </p>
                )}
                {seg.officialAction && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-3">
                    <span className="font-semibold text-blue-800 dark:text-blue-300 text-xs uppercase tracking-wide">
                      Official Action
                    </span>
                    <p className="mt-1 text-gray-700 dark:text-gray-300">
                      {seg.officialAction}
                    </p>
                  </div>
                )}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {positions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-xs uppercase tracking-wide text-gray-500 mb-1">
                      Speaker Positions
                    </h4>
                    <ul className="space-y-1">
                      {positions.map((p, i) => (
                        <li key={i}>
                          <span className="font-medium">{p.speaker}:</span>{" "}
                          <span className="text-gray-600 dark:text-gray-400">
                            {p.position}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {quotes.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-xs uppercase tracking-wide text-gray-500 mb-1">
                      Key Quotes
                    </h4>
                    {quotes.map((q, i) => (
                      <blockquote
                        key={i}
                        className="border-l-2 border-gray-300 dark:border-gray-600 pl-3 italic text-gray-600 dark:text-gray-400 mb-2"
                      >
                        &ldquo;{q.quote}&rdquo;
                        <span className="not-italic text-xs ml-1">
                          — {q.speaker}
                        </span>
                      </blockquote>
                    ))}
                  </div>
                )}
                {comments.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-xs uppercase tracking-wide text-gray-500 mb-1">
                      Public Comments
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                      {comments.map((c, i) => (
                        <li key={i}>
                          {c.speaker && (
                            <span className="font-medium">{c.speaker}: </span>
                          )}
                          {c.summary}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
