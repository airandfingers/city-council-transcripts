import Link from "next/link";
import { getSeedCities } from "@/app/lib/cityData";

export default function Home() {
  const cities = getSeedCities();

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">City Council Transcripts</h1>

      {/* City Cards Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">City Directory</h2>
        <div className="flex flex-col md:flex-row md:flex-wrap gap-4">
          {cities.map((city) => (
            <Link
              key={`${city.stateCode}-${city.citySlug}`}
              href={`/${city.stateCode}/${city.citySlug}`}
              aria-label={`View transcripts for ${city.cityName}, ${city.stateName}`}
              className="flex-1 md:basis-[calc(50%-0.5rem)] p-6 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors dark:border-gray-700 dark:hover:border-gray-500"
            >
              <h3 className="text-xl font-medium mb-2">
                {city.cityName}, {city.stateName}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">{city.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">About</h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
          City Council Transcripts provides easy access to local government
          meeting records. Browse transcripts from city council meetings to stay
          informed about decisions that affect your community.
        </p>
      </section>
    </main>
  );
}
