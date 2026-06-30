import type { Metadata } from "next";
import { getCities } from "@/app/lib/cityData";
import CityCard from "@/app/components/CityCard";
import SubscribeForm from "@/app/components/SubscribeForm";
import AIDisclaimer from "@/app/components/AIDisclaimer";

export const metadata: Metadata = {
  title: "City Council Transcripts",
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const cities = await getCities();

  return (
    <main className="min-h-screen p-8">
      {/* Hero + site-updates form. On desktop they share a row, with the
          form's top padding aligning its text to the hero paragraph; on
          mobile the form stacks below the hero. Addresses PoC feedback that
          the homepage "felt flat" with "no call to action." */}
      <section className="mb-12 flex flex-col gap-6 md:flex-row md:items-start md:gap-10">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold mb-3">
            See what your city council actually decided
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Plain-language summaries of local government meetings — what was
            discussed, what was decided, and how each council member voted.
            No jargon, no digging through hours of video. Pick a city below to
            get started.
          </p>
        </div>
        <div className="w-full md:w-80 md:shrink-0 md:ml-auto">
          <SubscribeForm kind="SITE_UPDATES" />
        </div>
      </section>

      {/* City directory: equal-width cards in a grid. The "request a city"
          form sits in the grid as just another card. */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Choose a city</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cities.map((city) => (
            <CityCard
              key={`${city.stateCode}-${city.slug}`}
              city={city}
            />
          ))}

          {/* Request coverage for a city we don't have yet */}
          <div className="flex flex-col h-full rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-xl font-medium mb-2">Don&apos;t see your city?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Request that we tackle it next!
            </p>
            <div className="mt-auto">
              <SubscribeForm kind="CITY_COVERAGE_REQUEST" bare />
            </div>
          </div>
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
        <h3 className="text-lg font-semibold mt-6 mb-2">Our AI strategy</h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
          We try to keep this project&apos;s planetary footprint small. Our
          repeatable processes — transcription, summarization, and the rest
          of the data pipeline — run on a MacBook Air, from a room powered by
          solar panels at our house. We do use cloud LLMs for building and
          maintaining the code itself. We&apos;re still early on this and
          would love to keep improving our sustainability practice over time.
        </p>
      </section>

      <AIDisclaimer />
    </main>
  );
}
