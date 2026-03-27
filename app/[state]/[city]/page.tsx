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
    </main>
  );
}
