import type { InterestAreaWithMeetings } from "@/app/lib/cityData";
import SubscribeForm from "@/app/components/SubscribeForm";

export type InterestAreaCardProps = {
  area: InterestAreaWithMeetings;
  cityId: number;
};

function meetingHref(slug: string): string {
  return `/transcripts/${slug.split("/").map(encodeURIComponent).join("/")}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function InterestAreaCard({ area, cityId }: InterestAreaCardProps) {
  const discussed = area.meetingsDiscussed ?? area.meetings.length;
  const total = area.totalMeetings;

  return (
    <article className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <header className="mb-3">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h3 className="text-lg font-medium">{area.name}</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Discussed in {discussed}
            {typeof total === "number" ? ` of ${total}` : ""} meeting
            {discussed === 1 ? "" : "s"}
            {area.source === "llm_generated" ? " · auto-generated" : ""}
          </span>
        </div>
        {area.description && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {area.description}
          </p>
        )}
      </header>

      {area.statusSummary && (
        <section className="mb-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
            Status
          </h4>
          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">
            {area.statusSummary}
          </p>
        </section>
      )}

      {area.meetings.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
            Meetings
          </h4>
          <ul className="flex flex-col gap-2">
            {area.meetings.map((m) => (
              <li
                key={m.meetingId}
                className="border-l-2 border-gray-200 dark:border-gray-700 pl-3"
              >
                <a
                  href={meetingHref(m.slug)}
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                >
                  {formatDate(m.date)} — {m.title}
                </a>
                {m.summary && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                    {m.summary}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-4">
        <SubscribeForm
          kind="TOPIC_IN_CITY_UPDATES"
          cityId={cityId}
          interestAreaId={area.id}
          topicName={area.name}
        />
      </div>
    </article>
  );
}
