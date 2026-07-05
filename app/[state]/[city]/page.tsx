import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getCityByParams,
  getMeetingsForCity,
  getLatestMeetingSummary,
} from "@/app/lib/cityData";
import Link from "next/link";
import MeetingFilter from "@/app/components/MeetingFilter";
import SubscribeForm from "@/app/components/SubscribeForm";
import AIDisclaimer from "@/app/components/AIDisclaimer";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ state: string; city: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state, city: citySlug } = await params;
  const cityData = await getCityByParams(state, citySlug);
  if (!cityData) return { title: "City Not Found" };
  return { title: `${cityData.name}, ${cityData.stateName}` };
}

export default async function CityPage({ params }: Props) {
  const { state, city: citySlug } = await params;
  const cityData = await getCityByParams(state, citySlug);

  if (!cityData) {
    notFound();
  }

  const [meetings, latestMeeting] = await Promise.all([
    getMeetingsForCity(state, citySlug),
    getLatestMeetingSummary(state, citySlug),
  ]);

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-1">
        {cityData.name}, {cityData.stateName}
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        City Council meetings for {cityData.name} — plain-language summaries
        plus full transcripts and video.
      </p>

      {cityData.recentMeetingsSummary ? (
        <div className="mb-6 rounded-lg border border-gray-200 dark:border-gray-700 p-4 max-w-prose">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
            Recent activity
          </p>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {cityData.recentMeetingsSummary}
          </p>
        </div>
      ) : (
        latestMeeting?.logline && (
          <Link
            href={`/transcripts/${latestMeeting.slug}`}
            className="block mb-6 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-gray-400 dark:hover:border-gray-500 transition-colors max-w-prose"
          >
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Latest meeting —{" "}
              {latestMeeting.date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                timeZone: "UTC",
              })}
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {latestMeeting.logline}
            </p>
            <span className="inline-block mt-1 text-xs text-blue-500 dark:text-blue-400">
              Read the full summary →
            </span>
          </Link>
        )
      )}

      <p className="mb-8 text-gray-700 dark:text-gray-300 max-w-prose">{cityData.summary}</p>

      <div className="mb-10 max-w-md">
        <SubscribeForm
          kind="CITY_UPDATES"
          cityId={cityData.id}
          cityName={cityData.name}
        />
      </div>

      <div className="mb-6">
        <Link
          href={`/${state}/${citySlug}/topics`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
        >
          <span aria-hidden="true">📋</span>
          View tracked topics for {cityData.name}
        </Link>
      </div>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Meetings</h2>
        <MeetingFilter meetings={meetings} />
      </section>

      <AIDisclaimer />
    </main>
  );
}
