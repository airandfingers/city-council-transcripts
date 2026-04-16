import TabbedPanel from "./TabbedPanel";

export type Topic = {
  label: string;
  bullets: string[];
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
        {topic.bullets.map((bullet, i) => (
          <li key={i}>{bullet}</li>
        ))}
      </ul>
    ),
  }));

  return <TabbedPanel tabs={tabs} heading={heading} />;
}
