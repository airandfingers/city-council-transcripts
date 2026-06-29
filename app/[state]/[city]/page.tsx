import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getCityByParams,
  getMeetingsForCity,
} from "@/app/lib/cityData";
import MeetingFilter from "@/app/components/MeetingFilter";
import SubscribeForm from "@/app/components/SubscribeForm";
import AIDisclaimer from "@/app/components/AIDisclaimer";

export const dynamic = "force-dynamic";

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

  const meetings = await getMeetingsForCity(state, citySlug);

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-1">
        {cityData.name}, {cityData.stateName}
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        City Council meetings for {cityData.name} — plain-language summaries
        plus full transcripts and video.
      </p>

      <p className="mb-8 text-gray-700 dark:text-gray-300 max-w-prose">{cityData.summary}</p>

      <div className="mb-10 max-w-md">
        <SubscribeForm
          kind="CITY_UPDATES"
          cityId={cityData.id}
          cityName={cityData.name}
        />
      </div>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Meetings</h2>
        <MeetingFilter meetings={meetings} />
      </section>

      <AIDisclaimer />
    </main>
  );
}
