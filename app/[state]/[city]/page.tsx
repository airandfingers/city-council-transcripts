import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getCityByParams,
  getMeetingsForCity,
} from "@/app/lib/cityData";
import MeetingCard from "@/app/components/MeetingCard";

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
      <h1 className="text-3xl font-bold mb-4">
        {cityData.name}, {cityData.stateName}
      </h1>

      <p className="mb-8 text-gray-700 dark:text-gray-300">{cityData.summary}</p>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Meetings</h2>
        <div className="flex flex-col gap-4">
          {meetings.map((meeting) => (
            <MeetingCard key={meeting.slug} meeting={meeting} />
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold mb-2">Topic Page Prototypes</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Wireframe explorations for a future &ldquo;topic&rdquo; page that tracks a single issue across all meetings.
        </p>
        <div className="flex flex-col gap-2">
          <a href="/topics/1" className="text-blue-600 dark:text-blue-400 hover:underline">1 · Timeline Spine</a>
          <a href="/topics/5" className="text-blue-600 dark:text-blue-400 hover:underline">5 · Stakeholder-Forward</a>
          <a href="/topics/7" className="text-blue-600 dark:text-blue-400 hover:underline">7 · Living Brief</a>
          <a href="/topics/m1" className="text-blue-600 dark:text-blue-400 hover:underline">M1 · Spine (mobile)</a>
          <a href="/topics/m4" className="text-blue-600 dark:text-blue-400 hover:underline">M4 · Feed (mobile)</a>
          <a href="/topics/m7b" className="text-blue-600 dark:text-blue-400 hover:underline">M7b · Brief + Action (mobile)</a>
        </div>
      </section>
    </main>
  );
}
