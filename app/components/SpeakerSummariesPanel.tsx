"use client";

import { useState } from "react";

type SpeakerSummary = {
  id: number;
  speakerName: string;
  speakingTime: number | null;
  summaryText: string | null;
  keyQuotes: unknown;
  actionsOrMotions: unknown;
  positionsByTopic: unknown;
};

type QuoteItem = string | { quote: string; context?: string };

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function quoteText(q: QuoteItem): string {
  return typeof q === "string" ? q : q.quote;
}

export default function SpeakerSummariesPanel({
  speakers,
}: {
  speakers: SpeakerSummary[];
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (speakers.length === 0) {
    return (
      <p className="text-gray-500 dark:text-gray-400">
        No speaker summaries available for this meeting yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {speakers.map((sp) => {
        const open = expandedId === sp.id;
        const quotes = Array.isArray(sp.keyQuotes)
          ? (sp.keyQuotes as QuoteItem[])
          : [];
        const actions = Array.isArray(sp.actionsOrMotions)
          ? (sp.actionsOrMotions as string[])
          : [];
        const positions = Array.isArray(sp.positionsByTopic)
          ? (sp.positionsByTopic as { topic: string; position: string }[])
          : [];

        return (
          <div
            key={sp.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg"
          >
            <button
              onClick={() => setExpandedId(open ? null : sp.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-gray-500">
                {sp.speakerName.charAt(0)}
              </div>
              <span className="font-medium flex-1">{sp.speakerName}</span>
              {sp.speakingTime != null && (
                <span className="text-xs text-gray-400">
                  {formatDuration(sp.speakingTime)}
                </span>
              )}
              <span
                className={`text-xs transition-transform ${open ? "rotate-90" : ""}`}
              >
                ▶
              </span>
            </button>

            {open && (
              <div className="px-4 pb-4 space-y-3 text-sm">
                {sp.summaryText && (
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {sp.summaryText}
                  </p>
                )}
                {actions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-xs uppercase tracking-wide text-gray-500 mb-1">
                      Actions &amp; Motions
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                      {actions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {positions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-xs uppercase tracking-wide text-gray-500 mb-1">
                      Positions by Topic
                    </h4>
                    <ul className="space-y-1">
                      {positions.map((p, i) => (
                        <li key={i}>
                          <span className="font-medium">{p.topic}:</span>{" "}
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
                        &ldquo;{quoteText(q)}&rdquo;
                      </blockquote>
                    ))}
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
