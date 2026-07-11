import TabbedPanel from "./TabbedPanel";
import TimestampLink from "./TimestampLink";
import AnnotatedText from "./AnnotatedText";
import type { OffsetModel } from "@/app/lib/offset";

export type Bullet = {
  text: string;
  timecodeLabel?: string | null;
  startTimeSeconds?: number | null;
  speaker?: string | null;
  position?: string | null;
  references?: unknown;
};

export type Topic = {
  label: string;
  bullets: Bullet[];
  /** Plain-language explanation shown as a tooltip on the tab. */
  description?: string;
};

export default function TopicsPanel({
  topics: items,
  heading = "Topics Discussed",
  offsetModel = null,
}: {
  topics?: Topic[];
  heading?: string;
  offsetModel?: OffsetModel | null;
} = {}) {
  if (!items || items.length === 0) {
    return (
      <div>
        {heading && <h2 className="text-2xl font-semibold mb-4">{heading}</h2>}
        <p className="text-gray-500 dark:text-gray-400">
          No topic summaries are available for this meeting yet.
        </p>
      </div>
    );
  }

  const tabs = items.map((topic) => ({
    label: topic.label,
    description: topic.description,
    content: (
      <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
        {topic.bullets.map((b, i) => {
          const hasReferences =
            Array.isArray(b.references) && b.references.length > 0;
          return (
            <li key={i}>
              {b.speaker && <span className="font-medium">{b.speaker}: </span>}
              <AnnotatedText text={b.text} references={b.references} offsetModel={offsetModel} />
              {b.position && (
                <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  {b.position}
                </span>
              )}
              {!hasReferences && b.startTimeSeconds != null && (
                <span className="ml-1">
                  <TimestampLink
                    seconds={b.startTimeSeconds}
                    label={b.timecodeLabel ?? undefined}
                    offsetModel={offsetModel}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    ),
  }));

  return (
    <TabbedPanel
      tabs={tabs}
      heading={heading}
      // Fixed-height, scrollable content on desktop so the TL;DR stays compact;
      // natural height on mobile where vertical space is cheaper.
      contentClassName="md:h-[220px] md:overflow-y-auto pr-1"
    />
  );
}
