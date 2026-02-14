import { notFound } from "next/navigation";
import {
  getCityByParams,
  getMeetingsForCity,
  getStaticCityParams,
} from "@/app/lib/cityData";

export function generateStaticParams() {
  return getStaticCityParams();
}

type Props = {
  params: Promise<{ state: string; city: string }>;
};

export default async function CityPage({ params }: Props) {
  const { state, city: citySlug } = await params;
  const cityData = getCityByParams(state, citySlug);

  if (!cityData) {
    notFound();
  }

  const meetings = getMeetingsForCity(state, citySlug);

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-4">
        {cityData.cityName}, {cityData.stateName}
      </h1>

      <p className="mb-8 text-gray-700 dark:text-gray-300">{cityData.summary}</p>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Meetings</h2>
        <div className="flex flex-col gap-4">
          {meetings.map((meeting) => (
            <article
              key={meeting.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <h3 className="text-lg font-medium mb-2">{meeting.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-3">
                {meeting.summary}
              </p>
              <a
                href={meeting.transcriptUrl}
                aria-label={`View full transcript for ${meeting.title}`}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                View full transcript
              </a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
