import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCityByParams, getTopicDetail } from "@/app/lib/cityData";
import SubscribeForm from "@/app/components/SubscribeForm";
import AIDisclaimer from "@/app/components/AIDisclaimer";
import ShareButton from "@/app/components/ShareButton";
import TopicWorkspace from "@/app/components/TopicWorkspace";
import { isDormant } from "@/app/lib/topicDetail";
import { formatMeetingDate } from "@/app/lib/formatDate";

// Time-based, not moved to indefinite+invalidate like its siblings:
// interest-area rollups (write_interest_areas) are written by a separate
// path not tied to a single meeting or city-level revalidate call, so
// there is no invalidation trigger for this specific route yet — caching
// indefinitely with nothing to invalidate it would silently serve stale
// content forever (FIX-NEON-EGRESS-MEASURE-001).
export const revalidate = 3600;

// REQUIRED for the revalidate value above to do anything at all — see
// app/transcripts/[...slug]/page.tsx's generateStaticParams comment for
// the full explanation. This route had the same silent no-op as every
// other route in this family before this fix. `return []` deliberate;
// dynamicParams defaults to true so paths still render and cache on first
// request within the 3600s window.
export async function generateStaticParams() {
  return [];
}

type Props = {
  params: Promise<{ state: string; city: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state, city, slug } = await params;
  const topic = await getTopicDetail(state, city, slug);
  if (!topic) return { title: "Not Found" };
  return { title: `${topic.name} — Topics` };
}

/**
 * Topic detail page — wireframe direction 4, "Stacked Cards": one
 * scrolling column of meeting cards with a reference rail beside it.
 *
 * The page itself is the fixed part (breadcrumb, title band, summary,
 * disclaimer); everything that reacts to a click lives in TopicWorkspace.
 * The summary and "where it stands today" are passed *into* the workspace
 * as its reading column's first block rather than rendered above it, so
 * they lead the page on desktop and on mobile alike while the rail still
 * starts level with them on a wide screen.
 */
export default async function TopicDetailPage({ params }: Props) {
  const { state, city: citySlug, slug } = await params;

  const [cityData, topic] = await Promise.all([
    getCityByParams(state, citySlug),
    getTopicDetail(state, citySlug, slug),
  ]);

  if (!cityData || !topic) notFound();

  const cityHref = `/${state}/${citySlug}`;
  const dormant = isDormant(topic.lastDiscussed);
  const meetingCount = topic.meetingsDiscussed ?? topic.meetings.length;

  return (
    <main className="px-4 sm:px-8 py-6 max-w-7xl mx-auto">
      {/* ── Title band ── */}
      <header className="border-b border-gray-200 dark:border-gray-800 pb-4 mb-6">
        <nav className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          <Link href={cityHref} className="hover:underline">
            {cityData.name}
          </Link>
          {" › "}
          <Link href={`${cityHref}/topics`} className="hover:underline">
            Topics
          </Link>
          {" › "}
          <span className="text-gray-700 dark:text-gray-300">{topic.name}</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold leading-tight">{topic.name}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
              {meetingCount > 0 && (
                <span>
                  {meetingCount} meeting{meetingCount === 1 ? "" : "s"}
                </span>
              )}
              {topic.speakers.length > 0 && (
                <>
                  <span aria-hidden>·</span>
                  <span>{topic.speakers.length} voices</span>
                </>
              )}
              {topic.firstDiscussed && (
                <>
                  <span aria-hidden>·</span>
                  <span>First discussed {formatMeetingDate(topic.firstDiscussed)}</span>
                </>
              )}
              {topic.lastDiscussed && (
                <>
                  <span aria-hidden>·</span>
                  <span>Last activity {formatMeetingDate(topic.lastDiscussed)}</span>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Active vs dormant, from the last meeting that discussed the
                topic — the wireframes' dormancy edge state, so a page full
                of cards can't imply activity that stopped a year ago. */}
            <span
              title={
                dormant && topic.lastDiscussed
                  ? `No council activity since ${formatMeetingDate(topic.lastDiscussed)}`
                  : "Discussed by council in the last six months"
              }
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                dormant
                  ? "border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-300"
                  : "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200"
              }`}
            >
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${
                  dormant ? "bg-gray-400 dark:bg-gray-500" : "bg-amber-500"
                }`}
              />
              {dormant ? "Dormant" : "Active"}
            </span>
            <a
              href="#follow"
              className="rounded border border-gray-300 dark:border-gray-600 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
            >
              Follow
            </a>
            <ShareButton />
          </div>
        </div>
      </header>

      <TopicWorkspace
        meetings={topic.meetings}
        speakers={topic.speakers}
        publicComments={topic.publicComments}
        related={topic.related}
        cityHref={cityHref}
        /* The two slots are keyed because React serializes a client
           component's element-valued props as a list across the RSC
           boundary, and warns about unkeyed children if they aren't. */
        summarySlot={
          <section key="summary" className="mb-6">
            {topic.description && (
              <>
                <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">
                  Summary
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-prose">
                  {topic.description}
                </p>
              </>
            )}

            {topic.statusSummary && (
              <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 p-4">
                <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">
                  Where it stands today
                </h2>
                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                  {topic.statusSummary}
                </p>
              </div>
            )}
          </section>
        }
        followSlot={
          <section
            key="follow"
            id="follow"
            className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 scroll-mt-6"
          >
            <h2 className="text-sm font-semibold mb-1">Follow this topic</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Email me when {cityData.name} council takes this up again.
            </p>
            <SubscribeForm
              kind="TOPIC_IN_CITY_UPDATES"
              cityId={cityData.id}
              interestAreaId={topic.id}
              topicName={topic.name}
              hidePrompt
              bare
            />
          </section>
        }
      />

      <div className="mt-10 border-t border-gray-200 dark:border-gray-800 pt-6">
        <AIDisclaimer />
      </div>
    </main>
  );
}
