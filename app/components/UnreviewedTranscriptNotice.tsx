"use client";

import { useState, useTransition } from "react";
import { requestTranscriptReview } from "@/app/actions/requestTranscriptReview";
import DonateButton from "./DonateButton";

/**
 * Shown next to the Transcript heading whenever `Meeting.transcriptReviewed`
 * is falsy — every transcript here is AI-generated (speech recognition +
 * diarization) and none have had a human accuracy pass yet unless the
 * transcriber's review_status.json says otherwise (see
 * FIX-AI-SUMMARY-INLINE-TIMESTAMPS-001 for the related summary-citation
 * work this shipped alongside).
 *
 * Flow: collapsed warning -> click to expand an explanation -> "Request
 * Review" emails admin subscribers (requestTranscriptReview) -> confirmation
 * + a donate ask, since a review request is a natural moment to also ask
 * for support.
 */
export default function UnreviewedTranscriptNotice({
  meetingId,
}: {
  meetingId: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  const requestReview = () => {
    startTransition(async () => {
      try {
        await requestTranscriptReview(meetingId);
      } catch {
        // Fail open — still show confirmation so the visitor isn't stuck
        // staring at a dead button; worst case is a missed notification,
        // not a broken page.
      }
      setSent(true);
    });
  };

  return (
    <span
      className="ml-2 text-sm font-normal align-middle"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={(e) => {
          // This notice is expected to live inside a <summary> (the
          // Transcript section's collapse toggle) — stop the click from
          // also opening/closing that <details>.
          e.stopPropagation();
          e.preventDefault();
          setExpanded((v) => !v);
        }}
        className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 hover:underline"
        title="Click to learn more"
      >
        ⚠️ Unreviewed transcript
      </button>
      {expanded && (
        <span className="block mt-2 max-w-prose text-gray-600 dark:text-gray-400 font-normal">
          This transcript was generated automatically (speech recognition +
          speaker separation) and hasn&apos;t been checked by a human for
          accuracy yet. If you notice an error, you can ask us to take a
          look.
          <span className="block mt-2">
            {sent ? (
              <span className="space-y-2 block">
                <span className="block text-green-700 dark:text-green-400">
                  Thanks — we&apos;ll take a look.
                </span>
                <span className="block text-gray-500 dark:text-gray-400">
                  If this project is useful to you, consider supporting it:
                </span>
                <DonateButton className="mt-1" />
              </span>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  requestReview();
                }}
                disabled={isPending}
                className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                {isPending ? "Sending…" : "Request Review"}
              </button>
            )}
          </span>
        </span>
      )}
    </span>
  );
}
