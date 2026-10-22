import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getCityByParams,
  getMeetingsForCity,
  getLatestMeetingSummary,
  getUpcomingMeetingSlugs,
  getInterestAreaSummariesForCity,
} from "@/app/lib/cityData";
import Link from "next/link";
import MeetingFilter from "@/app/components/MeetingFilter";
import TopicCard from "@/app/components/TopicCard";
import SubscribeForm from "@/app/components/SubscribeForm";
import AIDisclaimer from "@/app/components/AIDisclaimer";
import { formatMeetingDate } from "@/app/lib/formatDate";
import { annotateTextPlain } from "@/app/lib/citations";
import { transcriptPath } from "@/app/lib/transcriptPath";

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

  const [meetings, latestMeeting, hotTopics] = await Promise.all([
    getMeetingsForCity(state, citySlug),
    getLatestMeetingSummary(state, citySlug),
    // FEAT-CITY-HOT-TOPICS-001: 5 is the product cap for this block; the
    // "See all topics →" link covers the rest. Zero-activity areas are
    // excluded by the query itself, not filtered here.
    getInterestAreaSummariesForCity(state, citySlug, 5),
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
            prefetch={false}
            href={transcriptPath(latestMeeting.slug)}
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

      {/* Hot topics: distinct from the /topics listing page (all curated
          areas, sortable/filterable) — this is a compact, curated-order
          preview of the ones with real activity, so a visitor sees what's
          actually being discussed without leaving the city page.
          FEAT-CITY-HOT-TOPICS-001. Renders nothing when the city has no
          interest areas yet, or none with real activity — see
          getInterestAreaSummariesForCity's `meetingsDiscussed: { gt: 0 }`
          filter. */}
      {hotTopics.length > 0 && (
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-1">
            What&rsquo;s being talked about
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Ongoing issues tracked across {cityData.name} city council meetings.
          </p>
          <ul className="space-y-4 max-w-3xl">
            {hotTopics.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={{
                  id: topic.id,
                  slug: topic.slug,
                  name: topic.name,
                  statusSummary: topic.statusSummary,
                  mostRecentActivity: topic.mostRecentActivity,
                  discussedCount: topic.meetingsDiscussed ?? 0,
                  lastDate: topic.lastDate,
                }}
                cityHref={`/${state}/${citySlug}`}
                headingLevel={3}
              />
            ))}
          </ul>
          <Link
            prefetch={false}
            href={`/${state}/${citySlug}/topics`}
            className="inline-block mt-3 text-xs text-blue-500 dark:text-blue-400"
          >
            See all topics →
          </Link>
        </section>
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
        {/* Rendered on the server in full (no Suspense fallback copy):
            MeetingFilter reads `q` from the URL in a small child of its
            own, so the cached HTML holds the list once and works without
            JS (FIX-CITY-PAGE-PAYLOAD-001). */}
        <MeetingFilter
          meetings={meetings}
          upcomingSlugs={upcomingSlugs}
          stateCode={state}
          citySlug={citySlug}
        />
      </section>

      <AIDisclaimer />
    </main>
  );
}
