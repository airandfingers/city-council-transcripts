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
      className="flex-1 md:basis-[calc(50%-0.5rem)] p-6 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors dark:border-gray-700 dark:hover:border-gray-500"
    >
      <h3 className="text-xl font-medium mb-2">
        {city.name}, {city.stateName}
      </h3>
      <p className="text-gray-600 dark:text-gray-400">{city.summary}</p>
    </Link>
  );
}
