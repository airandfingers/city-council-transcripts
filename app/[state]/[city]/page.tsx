import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  getCityByParams,
  getMeetingsForCity,
  getLatestMeetingSummary,
  getUpcomingMeetingSlugs,
} from "@/app/lib/cityData";
import Link from "next/link";
import MeetingFilter from "@/app/components/MeetingFilter";
import MeetingCard from "@/app/components/MeetingCard";
import type { MeetingCardData } from "@/app/lib/cityData";
import SubscribeForm from "@/app/components/SubscribeForm";
import AIDisclaimer from "@/app/components/AIDisclaimer";
import { formatMeetingDate } from "@/app/lib/formatDate";
import { annotateTextPlain } from "@/app/lib/citations";

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

  // Upcoming meetings stay in the same filterable list as everything
  // else — MeetingFilter groups them under an "Upcoming" subheader using
  // this set rather than raw status, since status alone isn't a safe
  // signal (see getUpcomingMeetingSlugs).
  const upcomingSlugs = getUpcomingMeetingSlugs(meetings);

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
              {annotateTextPlain(latestMeeting.logline, latestMeeting.tldrReferences)}
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
        Upcoming meetings are ordinary entries in the same searchable/
        sortable/filterable list as everything else — same MeetingCard,
        same size and shape, true siblings in one flex column — not a
        separate widget. MeetingFilter groups them under an "Upcoming"
        subheader using upcomingSlugs; see MeetingFilter for how.
      */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Meetings</h2>
        {/* MeetingFilter reads/writes the `q` search param (AC-4,
            FEAT-SEARCH-SERVERSIDE-SURFACE-001) via useSearchParams(), which
            requires a Suspense boundary around it in a statically-rendered
            route — this page is cached (see `revalidate` above), so the
            fallback below is literally what's in that cached HTML until a
            visitor's browser hydrates MeetingFilter, not just a brief
            build-time placeholder. Render the plain unfiltered list rather
            than a spinner/skeleton, so the page's core content (the
            meetings themselves) is present and functional without JS. */}
        <Suspense fallback={<MeetingListFallback meetings={meetings} />}>
          <MeetingFilter
            meetings={meetings}
            upcomingSlugs={upcomingSlugs}
            stateCode={state}
            citySlug={citySlug}
          />
        </Suspense>
      </section>

      <AIDisclaimer />
    </main>
  );
}

/**
 * Suspense fallback for MeetingFilter (see the comment at its call site).
 * Deliberately not a spinner/skeleton: this page is cached indefinitely
 * (`revalidate = false`), so this is what ships in that cached HTML until
 * a visitor's browser hydrates MeetingFilter — plain, newest-first, no
 * search/sort/status controls, no client JS required. Sorting matches
 * MeetingFilter's own default ("newest first"); grouping/collapsing
 * upcoming meetings is MeetingFilter-only polish, not worth duplicating
 * here for a fallback most visitors will only see for a moment.
 */
function MeetingListFallback({ meetings }: { meetings: MeetingCardData[] }) {
  const sorted = [...meetings].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      {sorted.map((meeting) => (
        <MeetingCard key={meeting.slug} meeting={meeting} />
      ))}
    </div>
  );
}
