import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCityByParams, getInterestAreasForCity } from "@/app/lib/cityData";
import AIDisclaimer from "@/app/components/AIDisclaimer";

export const dynamic = "force-dynamic";

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

      {areas.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">
          No topics are being tracked for {cityData.name} yet.
        </p>
      ) : (
        <ul className="space-y-4">
          {areas.map((area) => {
            const discussedCount = area.meetings.filter((m) => m.confidence !== null && (m.confidence ?? 0) >= 0.5).length;
            const lastDate = area.meetings[0]?.date;
            return (
              <li key={area.id}>
                <Link
                  href={`/${state}/${citySlug}/topics/${area.slug}`}
                  className="block rounded-lg border border-gray-200 dark:border-gray-700 p-5 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-lg leading-tight mb-1">
                        {area.name}
                      </h2>
                      {area.statusSummary && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {area.statusSummary}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0 text-sm text-gray-500 dark:text-gray-400">
                      {discussedCount > 0 && (
                        <div>{discussedCount} meeting{discussedCount !== 1 ? "s" : ""}</div>
                      )}
                      {lastDate && (
                        <div>
                          {new Date(lastDate).toLocaleDateString("en-US", {
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  {area.mostRecentActivity && (
                    <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                      Last activity: {area.mostRecentActivity}
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <AIDisclaimer />
    </main>
  );
}
