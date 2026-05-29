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
      <div className="mx-auto max-w-[800px]">
        <h1 className="text-3xl font-bold mb-6">City Council Transcripts</h1>

        <section className="mb-10">
          <SubscribeForm kind="SITE_UPDATES" />
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">City Directory</h2>
          <div className="flex flex-col gap-4">
            {cities.map((city) => (
              <div
                key={`${city.stateCode}-${city.slug}`}
                className="flex flex-col md:flex-row gap-4 items-stretch"
              >
                <CityCard city={city} className="flex-1" />
                <div className="w-full md:w-72 md:flex-shrink-0">
                  <SubscribeForm
                    kind="CITY_UPDATES"
                    cityId={city.id}
                    cityName={city.name}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <p className="text-base font-medium mb-2">
              Don&apos;t see your city? Request that we tackle it next!
            </p>
            <SubscribeForm kind="CITY_COVERAGE_REQUEST" />
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">About</h2>
          <p className="text-gray-600 dark:text-gray-400">
            City Council Transcripts provides easy access to local government
            meeting records. Browse transcripts from city council meetings to stay
            informed about decisions that affect your community.
          </p>
        </section>

        <AIDisclaimer />
      </div>
    </main>
  );
}
