import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCityByParams, getInterestArea } from "@/app/lib/cityData";
import SubscribeForm from "@/app/components/SubscribeForm";
import AIDisclaimer from "@/app/components/AIDisclaimer";
import CopyTimecode from "@/app/components/CopyTimecode";
import { canAutoSeek, buildTranscriptTimestampUrl, formatSeconds } from "@/app/lib/videoSeek";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ state: string; city: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state, city, slug } = await params;
  const area = await getInterestArea(state, city, slug);
  if (!area) return { title: "Not Found" };
  return { title: `${area.name} — Topics` };
}

function ConfidenceBadge({ confidence }: { confidence: number | null }) {
  if (confidence === null) return null;
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 80
      ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
      : pct >= 60
        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300"
        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${color}`}>
      {pct}%
    </span>
  );
}

export default async function TopicDetailPage({ params }: Props) {
  const { state, city: citySlug, slug } = await params;

  const [cityData, area] = await Promise.all([
    getCityByParams(state, citySlug),
    getInterestArea(state, citySlug, slug),
  ]);

  if (!cityData || !area) notFound();

  const discussedMeetings = area.meetings.filter((m) => m.summary);

  return (
    <main className="p-8 max-w-3xl">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link href={`/${state}/${citySlug}`} className="hover:underline">
          {cityData.name}
        </Link>
        {" / "}
        <Link href={`/${state}/${citySlug}/topics`} className="hover:underline">
          Topics
        </Link>
        {` / ${area.name}`}
      </nav>

      {/* ── Status hero (Living Brief) ── */}
      <section className="mb-8">
        <h1 className="text-3xl font-bold mb-3">{area.name}</h1>

        {area.description && (
          <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-prose">
            {area.description}
          </p>
        )}

        {area.statusSummary && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-5 mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
              Where it stands today
            </p>
            <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
              {area.statusSummary}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
          {area.meetingsDiscussed !== null && (
            <span>
              Discussed in{" "}
              <strong className="text-gray-700 dark:text-gray-300">
                {area.meetingsDiscussed}
              </strong>{" "}
              meeting{area.meetingsDiscussed !== 1 ? "s" : ""}
            </span>
          )}
          {area.mostRecentActivity && (
            <span>Last activity: {area.mostRecentActivity}</span>
          )}
        </div>
      </section>

      {/* ── Subscribe CTA (mobile-forward, from M7b) ── */}
      <section className="mb-8 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="font-semibold mb-1">Get updates on this topic</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          We&apos;ll email you when the {cityData.name} council discusses{" "}
          {area.name} again.
        </p>
        <SubscribeForm
          kind="TOPIC_IN_CITY_UPDATES"
          cityId={cityData.id}
          interestAreaId={area.id}
          topicName={area.name}
          bare
        />
      </section>

      {/* ── Meeting history timeline (Timeline Spine) ── */}
      {discussedMeetings.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-5">Meeting history</h2>
          <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-3 space-y-6">
            {discussedMeetings.map((m) => (
              <li key={m.meetingId} className="ml-6">
                {/* Timeline dot */}
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white dark:border-gray-900 bg-gray-400 dark:bg-gray-500" />

                <time className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                  {new Date(m.date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>

                <div className="flex items-center gap-2 mt-0.5 mb-1 flex-wrap">
                  <Link
                    href={
                      m.startTimeSeconds != null && canAutoSeek(m.videoProvider)
                        ? buildTranscriptTimestampUrl(m.slug, m.startTimeSeconds)
                        : `/transcripts/${m.slug}`
                    }
                    className="font-medium hover:underline text-sm"
                  >
                    {m.title}
                  </Link>
                  <ConfidenceBadge confidence={m.confidence} />
                  {m.startTimeSeconds != null && !canAutoSeek(m.videoProvider) && (
                    <CopyTimecode
                      seconds={m.startTimeSeconds}
                      label={m.timecodeLabel ?? formatSeconds(m.startTimeSeconds)}
                    />
                  )}
                </div>

                {m.summary && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {m.summary}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {discussedMeetings.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          No meeting history recorded yet for this topic.
        </p>
      )}

      {/* ── Contact council placeholder (from M7b "Take action") ── */}
      <section className="mb-8 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-5 text-sm text-gray-500 dark:text-gray-400">
        <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">
          Want to weigh in?
        </p>
        <p>
          Contact your {cityData.name} council members directly — agendas are
          posted before each meeting, and public comment is open.
        </p>
        <Link
          href={`/${state}/${citySlug}`}
          className="mt-2 inline-block text-gray-600 dark:text-gray-400 hover:underline"
        >
          View {cityData.name} council meetings →
        </Link>
      </section>

      <AIDisclaimer />
    </main>
  );
}
