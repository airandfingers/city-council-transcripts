/**
 * City data layer with seed data.
 * This module provides dummy data for the city directory.
 * Functions can be swapped to DB calls in production.
 *
 * @module cityData
 */

/**
 * Represents a city in the directory.
 */
export type City = {
  /** Two-letter state code in lowercase (e.g., "ca") */
  stateCode: string;
  /** Full state name (e.g., "California") */
  stateName: string;
  /** Display name of the city (e.g., "Monterey Park") */
  cityName: string;
  /** URL-friendly slug (e.g., "monterey-park") */
  citySlug: string;
  /** Brief description of the city */
  summary: string;
};

/**
 * Represents a city council meeting.
 */
export type Meeting = {
  /** Unique identifier for the meeting */
  id: string;
  /** City slug this meeting belongs to */
  citySlug: string;
  /** State code this meeting belongs to */
  stateCode: string;
  /** Display title (e.g., "City Council Meeting - Friday, Feb 13, 2026") */
  title: string;
  /** Brief summary of meeting topics */
  summary: string;
  /** URL to the meeting transcript */
  transcriptUrl: string;
};

/**
 * Validates that a string is a valid slug format.
 * Valid slugs contain only lowercase letters, numbers, and hyphens.
 *
 * @param value - The string to validate
 * @returns True if the value is a valid slug, false otherwise
 */
function isValidSlug(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

/**
 * Validates that a string is a valid two-letter state code.
 *
 * @param value - The string to validate
 * @returns True if the value is a valid state code, false otherwise
 */
function isValidStateCode(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  return /^[a-z]{2}$/.test(value);
}

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
 *
 * @returns An array of all cities in the seed data
 * @example
 * const cities = getSeedCities();
 * // [{ stateCode: "ca", cityName: "Monterey Park", ... }, ...]
 */
export function getSeedCities(): City[] {
  return seedCities;
}

/**
 * Returns a city by state code and city slug, or null if not found.
 * Validates input format before searching.
 *
 * @param stateCode - Two-letter state code in lowercase (e.g., "ca")
 * @param citySlug - URL-friendly city slug (e.g., "monterey-park")
 * @returns The matching city object, or null if not found or inputs are invalid
 * @example
 * const city = getCityByParams("ca", "monterey-park");
 * if (city) {
 *   console.log(city.cityName); // "Monterey Park"
 * }
 */
export function getCityByParams(
  stateCode: string,
  citySlug: string
): City | null {
  // Validate input format
  if (!isValidStateCode(stateCode) || !isValidSlug(citySlug)) {
    return null;
  }

  return (
    seedCities.find(
      (city) => city.stateCode === stateCode && city.citySlug === citySlug
    ) ?? null
  );
}

/**
 * Returns all meetings for a given city.
 * Returns an empty array for invalid inputs or if no meetings exist.
 *
 * @param stateCode - Two-letter state code in lowercase (e.g., "ca")
 * @param citySlug - URL-friendly city slug (e.g., "monterey-park")
 * @returns An array of meetings for the city, or empty array if none found or inputs invalid
 * @example
 * const meetings = getMeetingsForCity("ca", "monterey-park");
 * // [{ id: "mp-2026-02-13", title: "City Council Meeting...", ... }, ...]
 */
export function getMeetingsForCity(
  stateCode: string,
  citySlug: string
): Meeting[] {
  // Return empty array for invalid inputs
  if (!isValidStateCode(stateCode) || !isValidSlug(citySlug)) {
    return [];
  }

  return seedMeetings.filter(
    (meeting) =>
      meeting.stateCode === stateCode && meeting.citySlug === citySlug
  );
}

/**
 * Returns static params for generateStaticParams in dynamic routes.
 * Used by Next.js App Router to pre-render city pages at build time.
 *
 * @returns An array of param objects with state and city slugs
 * @example
 * // In app/[state]/[city]/page.tsx:
 * export function generateStaticParams() {
 *   return getStaticCityParams();
 * }
 * // Returns: [{ state: "ca", city: "monterey-park" }, ...]
 */
export function getStaticCityParams(): Array<{ state: string; city: string }> {
  return seedCities.map((city) => ({
    state: city.stateCode,
    city: city.citySlug,
  }));
}
