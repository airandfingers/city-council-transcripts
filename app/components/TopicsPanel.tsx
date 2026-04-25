import TabbedPanel from "./TabbedPanel";
import TimestampLink from "./TimestampLink";

export type Bullet = {
  text: string;
  timecodeLabel?: string | null;
  startTimeSeconds?: number | null;
  speaker?: string | null;
  position?: string | null;
};

export type Topic = {
  label: string;
  bullets: Bullet[];
};

export default function TopicsPanel({
  topics: items,
  heading = "Topics Discussed",
}: {
  topics?: Topic[];
  heading?: string;
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
    content: (
      <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
        {topic.bullets.map((b, i) => (
          <li key={i}>
            {b.speaker && <span className="font-medium">{b.speaker}: </span>}
            {b.text}
            {b.position && (
              <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                {b.position}
              </span>
            )}
            {b.startTimeSeconds != null && (
              <span className="ml-1">
                <TimestampLink
                  seconds={b.startTimeSeconds}
                  label={b.timecodeLabel ?? undefined}
                />
              </span>
            )}
          </li>
        ))}
      </ul>
    ),
  }));

  return <TabbedPanel tabs={tabs} heading={heading} />;
}
