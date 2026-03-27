/**
 * Prisma-backed city data access.
 *
 * @module cityData
 */

import prisma from "@/app/lib/prisma";
import type { City, Meeting, TranscriptLine } from "@prisma/client";

export type { City, Meeting, TranscriptLine };

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

/**
 * Returns all cities for the directory.
 *
 * @returns An array of all cities
 * @example
 * const cities = await getCities();
 * // [{ stateCode: "ca", name: "Monterey Park", ... }, ...]
 */
export async function getCities(): Promise<City[]> {
  return prisma.city.findMany({
    orderBy: [{ stateCode: "asc" }, { name: "asc" }],
  });
}

/**
 * Returns a city by state code and city slug, or null if not found.
 * Validates input format before searching.
 *
 * @param stateCode - Two-letter state code in lowercase (e.g., "ca")
 * @param citySlug - URL-friendly city slug (e.g., "monterey-park")
 * @returns The matching city object, or null if not found or inputs are invalid
 * @example
 * const city = await getCityByParams("ca", "monterey-park");
 * if (city) {
 *   console.log(city.name); // "Monterey Park"
 * }
 */
export function getCityByParams(
  stateCode: string,
  citySlug: string
): Promise<City | null> {
  // Validate input format
  if (!isValidStateCode(stateCode) || !isValidSlug(citySlug)) {
    return Promise.resolve(null);
  }

  return prisma.city.findUnique({
    where: {
      stateCode_slug: {
        stateCode,
        slug: citySlug,
      },
    },
  });
}

/**
 * Returns all meetings for a given city.
 * Returns an empty array for invalid inputs or if no meetings exist.
 *
 * @param stateCode - Two-letter state code in lowercase (e.g., "ca")
 * @param citySlug - URL-friendly city slug (e.g., "monterey-park")
 * @returns An array of meetings for the city, or empty array if none found or inputs invalid
 * @example
 * const meetings = await getMeetingsForCity("ca", "monterey-park");
 * // [{ slug: "...", title: "City Council Meeting...", ... }, ...]
 */
export function getMeetingsForCity(
  stateCode: string,
  citySlug: string
): Promise<Meeting[]> {
  // Return empty array for invalid inputs
  if (!isValidStateCode(stateCode) || !isValidSlug(citySlug)) {
    return Promise.resolve([]);
  }

  return prisma.meeting.findMany({
    where: {
      city: {
        stateCode,
        slug: citySlug,
      },
    },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });
}

/**
 * Returns static params for generateStaticParams in dynamic routes.
 * Used by Next.js App Router to pre-render city pages at build time.
 *
 * @returns An array of param objects with state and city slugs
 * @example
 * // In app/[state]/[city]/page.tsx:
 * export async function generateStaticParams() {
 *   return await getStaticCityParams();
 * }
 * // Returns: [{ state: "ca", city: "monterey-park" }, ...]
 */
export async function getStaticCityParams(): Promise<
  Array<{ state: string; city: string }>
> {
  const cities = await prisma.city.findMany({
    select: {
      stateCode: true,
      slug: true,
    },
    orderBy: [{ stateCode: "asc" }, { slug: "asc" }],
  });

  return cities.map((city: { stateCode: string; slug: string }) => ({
    state: city.stateCode,
    city: city.slug,
  }));
}
