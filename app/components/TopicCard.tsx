import Link from "next/link";
import { formatMeetingDate } from "@/app/lib/formatDate";
import HighlightedText from "./HighlightedText";

export type TopicCardData = {
  id: number;
  slug: string;
  name: string;
  statusSummary: string | null;
  mostRecentActivity: string | null;
  discussedCount: number;
  /** Date of the most recent meeting that discussed this topic. Optional:
   * a caller with no per-meeting join (the city page's hot-topics block,
   * FEAT-CITY-HOT-TOPICS-001) may omit it, in which case the right-rail
   * date is simply not rendered. */
  lastDate?: Date | null;
};

/**
 * One topic card, shared by the /topics listing page (via TopicsFilter,
 * with search-token highlighting) and the city page's hot-topics block
 * (plain, no search context — FEAT-CITY-HOT-TOPICS-001). No "use client":
 * HighlightedText and formatMeetingDate are both server-safe, so a server
 * component can render this with zero added client JS.
 *
 * The `<li>` wrapper matches TopicsFilter's own pre-extraction convention
 * (its `<ul>` is the caller-provided list, one `<li>` per card) — both
 * callers still own their own `<ul>`.
 */
export default function TopicCard({
  topic,
  cityHref,
  tokens = [],
  headingLevel = 2,
}: {
  topic: TopicCardData;
  cityHref: string;
  tokens?: string[];
  /** The listing page nests cards under its own <h1>, so cards are <h2>
   * (the default). The city page's hot-topics block has its own <h2>
   * section heading, so cards there pass 3 to stay a valid outline. */
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return (
    <li>
      <Link
        href={`${cityHref}/topics/${topic.slug}`}
        className="block rounded-lg border border-gray-200 dark:border-gray-700 p-5 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Heading className="font-semibold text-lg leading-tight mb-1">
              <HighlightedText text={topic.name} tokens={tokens} />
            </Heading>
            {topic.statusSummary && (
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                <HighlightedText text={topic.statusSummary} tokens={tokens} />
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
            Last activity: <HighlightedText text={topic.mostRecentActivity} tokens={tokens} />
          </p>
        )}
      </Link>
    </li>
  );
}
