import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getCityByParams,
  getMeetingsForCity,
  getLatestMeetingSummary,
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

  // Split out upcoming (SCHEDULED) meetings for the dedicated column/section
  // — see UpcomingMeetings for the mobile "next meeting + expand" behavior
  // and the desktop 2nd-column placement below. Soonest-first, since that's
  // the meeting a visitor most likely wants.
  const upcomingMeetings = meetings
    .filter((m) => m.status === "SCHEDULED")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const pastMeetings = meetings.filter((m) => m.status !== "SCHEDULED");

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
        upcoming isn't a separate top-level block. Mobile: the upcoming
        subsection (next meeting + expand toggle) sits right under the
        "Meetings" header, above the search/filter and past-meetings list.
        Desktop (lg+): the two become equal-width columns side by side.
        No SCHEDULED meetings at all -> no split, no empty column — past
        meetings just take the full width.
      */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Meetings</h2>
        <div
          className={
            upcomingMeetings.length > 0
              ? "lg:grid lg:grid-cols-2 lg:items-start lg:gap-8"
              : undefined
          }
        >
          {upcomingMeetings.length > 0 && (
            <div className="mb-8 lg:mb-0 lg:order-2">
              <UpcomingMeetings meetings={upcomingMeetings} />
            </div>
          )}
          <div className="min-w-0 lg:order-1">
            <MeetingFilter meetings={pastMeetings} />
          </div>
        </div>
      </section>

      <AIDisclaimer />
    </main>
  );
}
