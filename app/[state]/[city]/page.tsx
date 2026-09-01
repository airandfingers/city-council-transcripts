import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getCityByParams,
  getMeetingsForCity,
  getLatestMeetingSummary,
  splitUpcomingMeetings,
} from "@/app/lib/cityData";
import Link from "next/link";
import MeetingFilter from "@/app/components/MeetingFilter";
import UpcomingMeetings from "@/app/components/UpcomingMeetings";
import SubscribeForm from "@/app/components/SubscribeForm";
import AIDisclaimer from "@/app/components/AIDisclaimer";
import { formatMeetingDate } from "@/app/lib/formatDate";

// Cache indefinitely; invalidated on demand by POST /api/revalidate on
// every meeting publish for this city (see app/transcripts/[...slug]/
// page.tsx for the full rationale — FIX-NEON-EGRESS-MEASURE-001).
export const revalidate = false;

// REQUIRED — see app/transcripts/[...slug]/page.tsx's generateStaticParams
// comment. Without this, `revalidate` above silently does nothing and
// every request re-renders from Neon; confirmed live in production that
// this was the case for /transcripts/* since PR #29 merged. `return []`
// is deliberate — do not populate it (reintroduces a build-time DB
// dependency); dynamicParams defaults to true so every city still renders
// and caches on first request.
export async function generateStaticParams() {
  return [];
}

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

  // Split out upcoming meetings for the dedicated subsection — see
  // splitUpcomingMeetings for why status alone isn't enough, and
  // UpcomingMeetings for the "next meeting(s) + expand" behavior.
  const { upcomingMeetings, pastMeetings } = splitUpcomingMeetings(meetings);

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
            Recent activity — updated{" "}
            {formatMeetingDate(cityData.updatedAt)}
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
              {formatMeetingDate(latestMeeting.date)}
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

      {/*
        Single "Meetings" section/header for both upcoming and past —
        upcoming isn't a separate top-level block, and this is single-
        column at every width (a side-by-side desktop column read badly
        with only a couple of short cards in it). The upcoming subsection
        sits right under the "Meetings" header, above the search/filter
        and past-meetings list, and stays collapsed the same way on
        mobile and desktop — see UpcomingMeetings. No SCHEDULED meetings
        at all -> no "Upcoming" subsection at all.
      */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Meetings</h2>
        {upcomingMeetings.length > 0 && (
          <div className="mb-8">
            <UpcomingMeetings meetings={upcomingMeetings} />
          </div>
        )}
        <MeetingFilter meetings={pastMeetings} />
      </section>

      <AIDisclaimer />
    </main>
  );
}
