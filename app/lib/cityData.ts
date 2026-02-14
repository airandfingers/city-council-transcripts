/**
 * City data layer with seed data.
 * This module provides dummy data for the city directory.
 * Functions can be swapped to DB calls in production.
 */

export type City = {
  stateCode: string; // "ca"
  stateName: string; // "California"
  cityName: string; // "Monterey Park"
  citySlug: string; // "monterey-park"
  summary: string; // 2-sentence lorem
};

export type Meeting = {
  id: string;
  citySlug: string;
  stateCode: string;
  title: string; // "City Council Meeting - Friday, Feb 13, 2026"
  summary: string;
  transcriptUrl: string; // "#" for now
};

const seedCities: City[] = [
  {
    stateCode: "ca",
    stateName: "California",
    cityName: "Monterey Park",
    citySlug: "monterey-park",
    summary:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  },
  {
    stateCode: "co",
    stateName: "Colorado",
    cityName: "Fort Collins",
    citySlug: "fort-collins",
    summary:
      "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris. Duis aute irure dolor in reprehenderit in voluptate velit.",
  },
];

const seedMeetings: Meeting[] = [
  {
    id: "mp-2026-02-13",
    citySlug: "monterey-park",
    stateCode: "ca",
    title: "City Council Meeting - Friday, Feb 13, 2026",
    summary:
      "Discussion of annual budget allocations and infrastructure improvements for the downtown area.",
    transcriptUrl: "#",
  },
  {
    id: "mp-2026-01-27",
    citySlug: "monterey-park",
    stateCode: "ca",
    title: "City Council Meeting - Monday, Jan 27, 2026",
    summary:
      "Review of community safety initiatives and parks department proposals.",
    transcriptUrl: "#",
  },
  {
    id: "fc-2026-02-13",
    citySlug: "fort-collins",
    stateCode: "co",
    title: "City Council Meeting - Friday, Feb 13, 2026",
    summary:
      "Comprehensive planning session for sustainable development and transit expansion.",
    transcriptUrl: "#",
  },
];

/**
 * Returns all seed cities for the directory.
 */
export function getSeedCities(): City[] {
  return seedCities;
}

/**
 * Returns a city by state code and city slug, or null if not found.
 */
export function getCityByParams(
  stateCode: string,
  citySlug: string
): City | null {
  return (
    seedCities.find(
      (city) => city.stateCode === stateCode && city.citySlug === citySlug
    ) ?? null
  );
}

/**
 * Returns all meetings for a given city.
 */
export function getMeetingsForCity(
  stateCode: string,
  citySlug: string
): Meeting[] {
  return seedMeetings.filter(
    (meeting) =>
      meeting.stateCode === stateCode && meeting.citySlug === citySlug
  );
}

/**
 * Returns static params for generateStaticParams in dynamic routes.
 */
export function getStaticCityParams(): Array<{ state: string; city: string }> {
  return seedCities.map((city) => ({
    state: city.stateCode,
    city: city.citySlug,
  }));
}
