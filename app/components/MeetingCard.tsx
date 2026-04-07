import type { Meeting } from "@/app/lib/cityData";

export type MeetingCardProps = {
  meeting: Meeting;
};

export default function MeetingCard({ meeting }: MeetingCardProps) {
  return (
    <article className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <h3 className="text-lg font-medium mb-2">{meeting.title}</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-3">
        {meeting.summary}
      </p>
      <a
        href={`/transcripts/${meeting.slug.split("/").map(encodeURIComponent).join("/")}`}
        aria-label={`View full transcript for ${meeting.title}`}
        className="text-blue-600 dark:text-blue-400 hover:underline"
      >
        View full transcript
      </a>
    </article>
  );
}
