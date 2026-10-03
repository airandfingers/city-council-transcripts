"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatSeconds } from "@/app/lib/videoSeek";
import { areasAt, keyPointTexts, parseMomentSeconds, splitLead, topicAt, type MomentArea, type MomentTopic } from "@/app/lib/moment";

/**
 * Shown at the top of a meeting page opened at a specific moment (`?t=`,
 * the link every video description and closing card uses): the agenda item
 * being discussed then, its summary, key points and outcome, and the
 * ongoing issue it belongs to — so someone coming from a short clip can
 * learn what it was all about at a glance (FEAT-MOMENT-CARD-001).
 *
 * Client-side on purpose: the page HTML is cached once for every `?t=`
 * value, and this picks the moment from data already on the page — no
 * extra request and no database access per visit.
 */
export default function MomentCard({
  topics,
  areas,
  topicsBasePath,
}: {
  topics: MomentTopic[];
  areas: MomentArea[];
  /** e.g. "/co/fort-collins/topics" */
  topicsBasePath: string;
}) {
  const t = parseMomentSeconds(useSearchParams().get("t"));
  if (t == null) return null;
  const topic = topicAt(topics, t);
  if (!topic) return null;
  const points = keyPointTexts(topic.keyPoints);
  const { lead, rest } = splitLead(topic.summaryText ?? "");
  const related = areasAt(areas, t);

  return (
    <section
      aria-label="About this moment"
      className="mb-10 rounded-lg border-l-4 border-teal-500 bg-teal-50 dark:bg-teal-950/40 p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
        This moment · {formatSeconds(t)}
      </p>
      <h2 className="mt-1 text-xl font-semibold">{topic.title}</h2>
      {lead && <p className="mt-2 max-w-prose leading-relaxed text-gray-700 dark:text-gray-300">{lead}</p>}
      {rest && (
        <details className="mt-1 max-w-prose text-gray-700 dark:text-gray-300">
          <summary className="cursor-pointer text-sm text-blue-600 dark:text-blue-400">More</summary>
          <p className="mt-1 leading-relaxed">{rest}</p>
        </details>
      )}
      {points.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-300">
          {points.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      )}
      {topic.outcome && (
        <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
          <span className="font-semibold">Outcome:</span> {topic.outcome}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <a href="#video" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
          ▶ Play from {formatSeconds(t)}
        </a>
        {related.map((a) => (
          <Link key={a.slug} href={`${topicsBasePath}/${a.slug}`} className="text-blue-600 hover:underline dark:text-blue-400">
            Follow this issue: {a.name} →
          </Link>
        ))}
      </div>
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        AI-generated summary of the agenda item — the video and transcript below are the record.
      </p>
    </section>
  );
}
