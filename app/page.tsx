import { getCities } from "@/app/lib/cityData";
import CityCard from "@/app/components/CityCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const cities = await getCities();

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">City Council Transcripts</h1>

      {/* City Cards Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">City Directory</h2>
        <div className="flex flex-col md:flex-row md:flex-wrap gap-4">
          {cities.map((city) => (
            <CityCard
              key={`${city.stateCode}-${city.slug}`}
              city={city}
            />
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
