import type { Metadata } from "next";
import Link from "next/link";
import { getSharedTopics } from "@/app/lib/cityData";
import AIDisclaimer from "@/app/components/AIDisclaimer";

export const metadata: Metadata = {
  title: "Topics across cities",
};

// Dynamic for the same reason as the home page (see app/page.tsx): no
// dynamic segments, so ISR would prerender at build time and couple every
// deploy to the database. getSharedTopics() is cached in the data layer until
// /api/revalidate fires its tag, so a view doesn't touch Neon.
export const dynamic = "force-dynamic";

export default async function SharedTopicsPage() {
  const topics = await getSharedTopics();

  return (
    <main className="p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Topics</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-prose">
        Issues tracked in more than one city. Pick a city to see what its council has said about each one.
      </p>

      {topics.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No topics are tracked in more than one city yet.</p>
      ) : (
        <ul className="flex flex-col gap-6">
          {topics.map((topic) => (
            <li
              key={topic.slug}
              className="rounded-lg border border-gray-200 dark:border-gray-800 p-5"
            >
              <h2 className="text-xl font-semibold">{topic.name}</h2>
              {topic.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-prose">{topic.description}</p>
              )}
              <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                {topic.cities.map((city) => (
                  <li key={`${city.stateCode}/${city.citySlug}`}>
                    <Link
                      prefetch={false}
                      href={`/${city.stateCode}/${city.citySlug}/topics/${topic.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                    >
                      {city.cityName}, {city.stateCode.toUpperCase()}
                      <span className="text-gray-500 dark:text-gray-400">
                        {city.meetingsDiscussed > 0
                          ? `· ${city.meetingsDiscussed} ${city.meetingsDiscussed === 1 ? "meeting" : "meetings"}`
                          : "· not yet discussed"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      <AIDisclaimer />
    </main>
  );
}
