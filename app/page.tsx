import type { Metadata } from "next";
import { getCities } from "@/app/lib/cityData";
import CityCard from "@/app/components/CityCard";

export const metadata: Metadata = {
  title: "City Council Transcripts",
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const cities = await getCities();

  return (
    <main className="min-h-screen p-8">
      {/* Hero: states the purpose plainly and gives a clear first action,
          addressing PoC feedback that the homepage "felt flat" with
          "no call to action" and an unclear sense of what the site does. */}
      <section className="mb-12 max-w-2xl">
        <h1 className="text-3xl font-bold mb-3">
          See what your city council actually decided
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Plain-language summaries of local government meetings — what was
          discussed, what was decided, and how each council member voted.
          No jargon, no digging through hours of video. Pick a city below to
          get started.
        </p>
      </section>

      {/* City Cards Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Choose a city</h2>
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
      <section id="about">
        <h2 className="text-2xl font-semibold mb-4">About</h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
          Counciloris gives you easy access to local government meeting
          records, with the real data straight from the source — not
          secondhand coverage. Read a short summary of any meeting, see how
          council members voted, or dig into the full transcript and video
          for proof of exactly what was said.
        </p>
      </section>
    </main>
  );
}
