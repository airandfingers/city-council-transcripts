import Link from "next/link";
import type { City } from "@/app/lib/cityData";

export type CityCardProps = {
  city: City;
};

export default function CityCard({ city }: CityCardProps) {
  return (
    <Link
      href={`/${city.stateCode}/${city.slug}`}
      aria-label={`View transcripts for ${city.name}, ${city.stateName}`}
      className="group flex flex-col h-full p-6 border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 transition-all dark:border-gray-700 dark:hover:border-blue-500"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-medium mb-2">
          {city.name}, {city.stateName}
        </h3>
        <span
          aria-hidden="true"
          className="text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform shrink-0 mt-1"
        >
          →
        </span>
      </div>
      <p className="text-gray-600 dark:text-gray-400">{city.summary}</p>
      <span className="inline-block mt-auto pt-3 text-sm font-medium text-blue-600 dark:text-blue-400">
        View meetings
      </span>
    </Link>
  );
}
