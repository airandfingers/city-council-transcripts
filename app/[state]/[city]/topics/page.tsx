import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCityByParams, getInterestAreasForCity } from "@/app/lib/cityData";
import AIDisclaimer from "@/app/components/AIDisclaimer";
import TopicsFilter from "@/app/components/TopicsFilter";

// Cache indefinitely; invalidated on demand by POST /api/revalidate's
// city-level call, which already revalidates this exact path (see
// app/api/revalidate/route.ts). Was 3600s, and — like every other route in
// this family before this fix — never actually cached anything, since it
// had no generateStaticParams (see below). Never touched by the original
// FIX-NEON-EGRESS-CLIENT-001 ISR pass; caught during
// FIX-NEON-EGRESS-MEASURE-001 review since /api/revalidate already
// invalidates it.
export const revalidate = false;

// REQUIRED — see app/transcripts/[...slug]/page.tsx's generateStaticParams
// comment. `return []` deliberate; dynamicParams defaults to true.
export async function generateStaticParams() {
  return [];
}

type Props = {
  params: Promise<{ state: string; city: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state, city } = await params;
  const cityData = await getCityByParams(state, city);
  if (!cityData) return { title: "Not Found" };
  return { title: `Topics — ${cityData.name}, ${cityData.stateName}` };
}

export default async function TopicsIndexPage({ params }: Props) {
  const { state, city: citySlug } = await params;
  const cityData = await getCityByParams(state, citySlug);
  if (!cityData) notFound();

  const areas = await getInterestAreasForCity(state, citySlug);

  // area.meetings is already ordered date-desc (see getInterestAreasForCity's
  // orderBy), so [0] is the most recent discussed meeting — the "last
  // updated" signal TopicsFilter's default sort uses.
  const topics = areas.map((area) => ({
    id: area.id,
    slug: area.slug,
    name: area.name,
    statusSummary: area.statusSummary,
    mostRecentActivity: area.mostRecentActivity,
    discussedCount: area.meetings.filter(
      (m) => m.confidence !== null && (m.confidence ?? 0) >= 0.5
    ).length,
    lastDate: area.meetings[0]?.date ?? null,
  }));

  return (
    <main className="p-8 max-w-4xl">
      <nav className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        <Link href={`/${state}/${citySlug}`} className="hover:underline">
          {cityData.name}
        </Link>
        {" / Topics"}
      </nav>

      <h1 className="text-3xl font-bold mb-2">Topics</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-prose">
        Ongoing issues, projects, and debates tracked across {cityData.name} city
        council meetings.
      </p>

      {topics.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">
          No topics are being tracked for {cityData.name} yet.
        </p>
      ) : (
        <TopicsFilter topics={topics} cityHref={`/${state}/${citySlug}`} />
      )}

      <AIDisclaimer />
    </main>
  );
}
