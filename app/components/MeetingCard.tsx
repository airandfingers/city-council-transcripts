import Link from "next/link";
import type { Meeting } from "@/app/lib/cityData";

export type MeetingCardProps = {
  meeting: Meeting;
};

export default function MeetingCard({ meeting }: MeetingCardProps) {
  const href = `/transcripts/${meeting.slug
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
  const isPublished = meeting.status === "PUBLISHED";
  const dateStr = meeting.date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // The whole card is clickable (not just a small text link below the
  // summary) and styled with hover/focus affordances so it reads as an
  // interactive element rather than a static container — PoC testers
  // didn't realize these were clickable.
  return (
    <Link
      href={href}
      aria-label={
        isPublished
          ? `View summary and transcript for ${meeting.title}`
          : `View details for ${meeting.title}, ${dateStr}`
      }
      className="group block border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-400 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-medium mb-2">{meeting.title}</h3>
        <span
          aria-hidden="true"
          className="text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform shrink-0 mt-1"
        >
          →
        </span>
      </div>
      {meeting.logline ? (
        <p className="text-gray-600 dark:text-gray-400 mb-3">
          {meeting.logline}
        </p>
      ) : meeting.summary ? (
        <p className="text-gray-600 dark:text-gray-400 mb-3">
          {meeting.summary}
        </p>
      ) : null}
      {isPublished ? (
        <span className="inline-block text-sm font-medium text-blue-600 dark:text-blue-400">
          View summary &amp; transcript
        </span>
      ) : (
        <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
          {dateStr}
          {meeting.status === "SCHEDULED" && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              Upcoming meeting
            </span>
          )}
          {meeting.status === "OCCURRED" && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              Transcript pending
            </span>
          )}
          {meeting.status === "CANCELED" && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              Canceled
            </span>
          )}
        </span>
      )}
    </Link>
  );
}
