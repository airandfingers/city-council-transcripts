"use server";

import { searchMeetingsForCity, type MeetingSearchResult } from "@/app/lib/cityData";

/**
 * Server Action wrapper around `searchMeetingsForCity` — the module it
 * lives in (`cityData.ts`) exports plain data-access functions used
 * directly from server components, not "use server" actions, so this thin
 * re-export is what MeetingFilter (a client component) actually calls.
 * See `searchMeetingsForCity`'s own doc comment for the search design
 * (FEAT-SEARCH-SERVERSIDE-SURFACE-001).
 */
export async function searchMeetings(
  stateCode: string,
  citySlug: string,
  query: string
): Promise<MeetingSearchResult[]> {
  return searchMeetingsForCity(stateCode, citySlug, query);
}
